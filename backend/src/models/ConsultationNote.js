import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["prescription", "referral", "lab_order", "follow_up", "other"],
      required: true,
    },
    detail: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["suggested", "approved", "rejected"],
      default: "suggested",
    },
  },
  { _id: false },
);

const soapSchema = new mongoose.Schema(
  {
    subjective: { type: String, default: "" }, // patient-reported symptoms/history
    objective: { type: String, default: "" }, // observable/measurable findings
    assessment: { type: String, default: "" }, // provider's clinical judgment
    plan: { type: String, default: "" }, // next steps
  },
  { _id: false },
);

const consultationNoteSchema = new mongoose.Schema(
  {
    // NOTE: temporarily a String instead of an ObjectId ref, matching the same
    // fix applied to TranscriptChunk — revert once real consultations are wired up.
    consultation: {
      type: String,
      required: true,
      unique: true,
    },

    // The agent's in-progress draft, updated repeatedly during the call.
    draftSOAP: { type: soapSchema, default: () => ({}) },

    // The doctor's edited/approved version. Starts empty; populated when
    // status moves to "approved". Keeping this separate from draftSOAP
    // preserves an audit trail of what the AI produced vs. what the
    // provider actually signed off on.
    finalSOAP: { type: soapSchema, default: () => ({}) },

    actionItems: [actionItemSchema],

    // Lets the agent flag its own uncertainty (e.g. "patient mentioned a
    // medication name I couldn't confidently match to their chart") so the
    // reviewing provider knows exactly where to look closer, rather than
    // re-reading the entire note line by line every time.
    agentFlags: [{ type: String, trim: true }],

    status: {
      type: String,
      enum: ["draft", "pending_review", "approved"],
      default: "draft",
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },

    // Tracks how many times the agent loop has updated the draft during
    // the call — useful for debugging/demoing the agentic behavior, and for
    // rate-limiting how often we re-invoke it.
    revisionCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("ConsultationNote", consultationNoteSchema);
