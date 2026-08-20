import Anthropic from "@anthropic-ai/sdk";
import TranscriptChunk from "../models/TranscriptChunk.js";
import ConsultationNote from "../models/ConsultationNote.js";

// Lazy-initialized for the same reason as the Deepgram client: this file is
// imported before dotenv.config() runs in server.js, so reading
// process.env.ANTHROPIC_API_KEY at module load time would get undefined.
let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Using Claude's tool-use feature to force structured JSON output, rather
// than asking for JSON in prose and hoping it parses cleanly. Claude is
// required to call this "tool" with arguments matching this exact schema.
const soapUpdateTool = {
  name: "update_soap_note",
  description: "Records the updated SOAP note based on new transcript content.",
  input_schema: {
    type: "object",
    properties: {
      subjective: {
        type: "string",
        description: "Patient-reported symptoms, history, and context. Full merged text, not just what's new.",
      },
      objective: {
        type: "string",
        description: "Observable/measurable findings mentioned.",
      },
      assessment: {
        type: "string",
        description: "Clinical impression based on the conversation so far.",
      },
      plan: {
        type: "string",
        description: "Next steps: treatment, referrals, follow-up.",
      },
      actionItems: {
        type: "array",
        description: "Concrete action items mentioned or implied in the conversation.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["prescription", "referral", "lab_order", "follow_up", "other"],
            },
            detail: { type: "string" },
          },
          required: ["type", "detail"],
        },
      },
      agentFlags: {
        type: "array",
        description: "Anything uncertain that needs provider verification.",
        items: { type: "string" },
      },
    },
    required: ["subjective", "objective", "assessment", "plan", "actionItems", "agentFlags"],
  },
};

/**
 * The core agent loop for one room: pick up any transcript chunks that
 * haven't been processed yet, merge them into the existing draft note
 * (not overwrite it), and save the result.
 *
 * Returns null if there's nothing new to process.
 */
export async function updateDraftNote(roomId) {
  const newChunks = await TranscriptChunk.find({
    consultation: roomId,
    processedByAgent: false,
  }).sort({ offsetSeconds: 1 });

  if (newChunks.length === 0) return null;

  let note = await ConsultationNote.findOne({ consultation: roomId });
  if (!note) {
    note = await ConsultationNote.create({ consultation: roomId });
  }

  const transcriptText = newChunks.map((c) => `[${c.speaker}] ${c.text}`).join("\n");

  const prompt = `You are a clinical documentation assistant listening to a live telehealth consultation.

Below is the CURRENT DRAFT of the SOAP note (may be empty if this is early in the call), followed by NEW TRANSCRIPT captured since the last update.

Update the SOAP note by incorporating the new transcript into the existing draft — merge and refine, don't discard prior content. Only include information actually stated in the transcript; never invent clinical details. If something is ambiguous (e.g. an unclear medication name or symptom), note it in agentFlags rather than guessing at what was meant.

CURRENT DRAFT:
Subjective: ${note.draftSOAP.subjective || "(empty)"}
Objective: ${note.draftSOAP.objective || "(empty)"}
Assessment: ${note.draftSOAP.assessment || "(empty)"}
Plan: ${note.draftSOAP.plan || "(empty)"}

NEW TRANSCRIPT:
${transcriptText}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [soapUpdateTool],
    tool_choice: { type: "tool", name: "update_soap_note" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUseBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolUseBlock) {
    throw new Error("Claude did not return a tool_use block as expected");
  }
  const result = toolUseBlock.input;

  note.draftSOAP = {
    subjective: result.subjective,
    objective: result.objective,
    assessment: result.assessment,
    plan: result.plan,
  };
  note.actionItems = result.actionItems.map((item) => ({ ...item, status: "suggested" }));
  note.agentFlags = result.agentFlags;
  note.revisionCount += 1;
  await note.save();
  console.log(`Saved ConsultationNote for consultation=${note.consultation} id=${note._id} revision=${note.revisionCount}`);

  await TranscriptChunk.updateMany(
    { _id: { $in: newChunks.map((c) => c._id) } },
    { $set: { processedByAgent: true } }
  );

  return note;
}