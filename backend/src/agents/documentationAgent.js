import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import TranscriptChunk from "../models/TranscriptChunk.js";
import ConsultationNote from "../models/ConsultationNote.js";

// Structured output schema — forces the model to return exactly this shape
// instead of freeform text we'd have to parse ourselves.
const soapUpdateSchema = z.object({
  subjective: z.string().describe(
    "Patient-reported symptoms, history, and context. Full merged text, not just what's new."
  ),
  objective: z.string().describe("Observable/measurable findings mentioned."),
  assessment: z.string().describe("Clinical impression based on the conversation so far."),
  plan: z.string().describe("Next steps: treatment, referrals, follow-up."),
  actionItems: z
    .array(
      z.object({
        type: z.enum(["prescription", "referral", "lab_order", "follow_up", "other"]),
        detail: z.string(),
      })
    )
    .describe("Concrete action items mentioned or implied in the conversation."),
  agentFlags: z
    .array(z.string())
    .describe(
      "Anything uncertain that needs provider verification — e.g. an unclear medication name or ambiguous symptom."
    ),
});

// Lazy-initialized for the same reason as the Deepgram client: this file is
// imported before dotenv.config() runs in server.js, so reading
// process.env.ANTHROPIC_API_KEY at module load time would get undefined.
let model = null;
function getModel() {
  if (!model) {
    model = new ChatAnthropic({
      model: "claude-sonnet-4-5",
      temperature: 0, // clinical documentation should be consistent, not creative
      apiKey: process.env.ANTHROPIC_API_KEY,
    }).withStructuredOutput(soapUpdateSchema);
  }
  return model;
}

/**
 * The core agent loop for one room: pick up any transcript chunks that
 * haven't been processed yet, merge them into the existing draft note
 * (not overwrite it), and save the result.
 *
 * Returns null if there's nothing new to process (avoids a wasted API call
 * and a no-op DB write every 30s when no one's spoken).
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

  const result = await getModel().invoke(prompt);

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

  await TranscriptChunk.updateMany(
    { _id: { $in: newChunks.map((c) => c._id) } },
    { $set: { processedByAgent: true } }
  );

  return note;
}