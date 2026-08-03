import express from "express";
import Consultation from "../models/Consultation.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Book a consultation. Either a patient booking with a provider, or an
// admin/provider creating one on a patient's behalf — role isn't restricted
// here since either side may initiate scheduling.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { patientId, providerId, scheduledFor, reasonForVisit } = req.body;

    if (!patientId || !providerId || !scheduledFor) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const consultation = await Consultation.create({
      patient: patientId,
      provider: providerId,
      scheduledFor,
      reasonForVisit,
    });

    res.status(201).json(consultation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to book consultation" });
  }
});

// List consultations for the logged-in user (as either patient or provider).
router.get("/", requireAuth, async (req, res) => {
  try {
    const consultations = await Consultation.find({
      $or: [{ patient: req.user.id }, { provider: req.user.id }],
    })
      .populate("patient", "name email")
      .populate("provider", "name email specialty")
      .sort({ scheduledFor: -1 });

    res.json(consultations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

export default router;
