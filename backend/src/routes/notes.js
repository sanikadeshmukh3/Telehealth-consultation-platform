import express from "express";
import ConsultationNote from "../models/ConsultationNote.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/:consultationId", requireAuth, async (req, res) => {
  try {
    const note = await ConsultationNote.findOne({ consultation: req.params.consultationId });
    if (!note) {
      return res.status(404).json({ error: "No note found for this consultation yet" });
    }
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

router.patch("/:consultationId/approve", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const { finalSOAP, actionItems } = req.body;

    const note = await ConsultationNote.findOne({ consultation: req.params.consultationId });
    if (!note) {
      return res.status(404).json({ error: "No note found for this consultation" });
    }

    note.finalSOAP = finalSOAP;
    if (actionItems) note.actionItems = actionItems;
    note.status = "approved";
    note.reviewedBy = req.user.id;
    note.reviewedAt = new Date();

    await note.save();
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve note" });
  }
});

export default router;