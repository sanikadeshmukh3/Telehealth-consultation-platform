import mongoose from "mongoose";
import crypto from "crypto";

const consultationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    scheduledFor: { type: Date, required: true },

    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },

    // Unique identifier both peers join in Socket.io/WebRTC signaling (step 3).
    // Generated automatically so callers never need to invent one themselves.
    roomId: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
    },

    startedAt: { type: Date },
    endedAt: { type: Date },

    // Reason for the visit, entered at booking time — this is what the
    // pre-consultation intake agent (item #1 from our earlier discussion)
    // would populate/expand on before the call.
    reasonForVisit: { type: String, trim: true },
  },
  { timestamps: true }
);

consultationSchema.index({ patient: 1, scheduledFor: -1 });
consultationSchema.index({ provider: 1, scheduledFor: -1 });

export default mongoose.model("Consultation", consultationSchema);
