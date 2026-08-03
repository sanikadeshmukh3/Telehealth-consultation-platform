import mongoose from "mongoose";

const transcriptChunkSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
    },

    speaker: {
      type: String,
      enum: ["patient", "provider", "unknown"],
      default: "unknown",
    },

    text: { type: String, required: true },

    // Seconds since the call started, not a wall-clock timestamp — makes it
    // trivial to reconstruct "what was said 2 minutes into the call"
    // regardless of when the call actually happened.
    offsetSeconds: { type: Number, required: true },

    // Whether the agent loop has already read/incorporated this chunk into
    // a draft update, so we don't reprocess the same text repeatedly.
    processedByAgent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transcriptChunkSchema.index({ consultation: 1, offsetSeconds: 1 });

export default mongoose.model("TranscriptChunk", transcriptChunkSchema);
