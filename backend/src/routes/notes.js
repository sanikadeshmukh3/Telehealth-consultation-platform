import express from "express";
import ConsultationNote from "../models/ConsultationNote.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Fetch the current note for a room — used to load existing state when
// the review panel mounts (e.g. after a page refresh).
router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    const note = await ConsultationNote.findOne({ consultation: req.params.roomId });
    if (!note) {
      return res.status(404).json({ error: "No note found for this room yet" });
    }
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// Provider approves the note: their edited version becomes finalSOAP,
// status moves to "approved", and we record who/when for an audit trail.
// Restricted to providers only — patients shouldn't be able to self-approve
// their own clinical documentation.
router.patch("/:roomId/approve", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const { finalSOAP, actionItems } = req.body;

    const note = await ConsultationNote.findOne({ consultation: req.params.roomId });
    if (!note) {
      return res.status(404).json({ error: "No note found for this room" });
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