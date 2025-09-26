import express from "express";
import { db } from "../db/connection.js";
import authenticateJWT from "../middleware/authentication.js";

const router = express.Router();

// GET /api/admin/notifications
// Returns all notifications, newest first
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const notes = await db
      .collection("notifications")
      .find({})
      .sort({ timestamp: -1 })
      .toArray();
    res.json(notes);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ error: "Could not load notifications" });
  }
});

export default router;
