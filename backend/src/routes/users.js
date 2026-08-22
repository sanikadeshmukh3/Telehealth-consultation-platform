import express from "express";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Provider-only: patients shouldn't get a directory of other patients.
router.get("/patients", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" })
      .select("name email")
      .sort({ name: 1 });
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

export default router;