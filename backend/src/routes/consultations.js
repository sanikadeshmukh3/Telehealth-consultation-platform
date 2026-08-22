import express from "express";
import Consultation from "../models/Consultation.js";
import ConsultationNote from "../models/ConsultationNote.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Book a consultation.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { patientId, providerId, scheduledFor, reasonForVisit } = req.body;

    // A provider booking a visit is always booking themselves as the
    // provider — trusting a client-supplied providerId would let any
    // logged-in provider schedule a visit "as" someone else. Symmetric
    // handling leaves room for patient-initiated booking later.
    const resolvedProviderId = req.user.role === "provider" ? req.user.id : providerId;
    const resolvedPatientId = req.user.role === "patient" ? req.user.id : patientId;

    if (!resolvedPatientId || !resolvedProviderId || !scheduledFor) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const consultation = await Consultation.create({
      patient: resolvedPatientId,
      provider: resolvedProviderId,
      scheduledFor,
      reasonForVisit,
    });

    const populated = await consultation.populate([
      { path: "patient", select: "name email" },
      { path: "provider", select: "name email specialty" },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to book consultation" });
  }
});

// List consultations for the logged-in user (as either patient or
// provider), with a lightweight note summary attached to each so the
// frontend can show status/outcome without a second round trip per row.
router.get("/", requireAuth, async (req, res) => {
  try {
    const consultations = await Consultation.find({
      $or: [{ patient: req.user.id }, { provider: req.user.id }],
    })
      .populate("patient", "name email")
      .populate("provider", "name email specialty")
      .sort({ scheduledFor: -1 });

    const ids = consultations.map((c) => c._id);
    const notes = await ConsultationNote.find({ consultation: { $in: ids } }).select(
      "consultation status draftSOAP finalSOAP",
    );
    const notesByConsultation = new Map(notes.map((n) => [String(n.consultation), n]));

    const withSummary = consultations.map((c) => {
      const note = notesByConsultation.get(String(c._id));
      const outcome =
        note?.finalSOAP?.plan ||
        note?.draftSOAP?.plan ||
        note?.draftSOAP?.subjective ||
        null;
      return {
        ...c.toObject(),
        noteStatus: note?.status || null,
        outcome,
      };
    });

    res.json(withSummary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

export default router;