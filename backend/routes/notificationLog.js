const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", requireAuth, async (req, res) => {
  try {
    let query = "SELECT * FROM notification_log";
    const params = [];

    if (req.user.role === 'maintenance') {
      if (!req.user.maintenance_team_id) return res.json([]);
      query += " WHERE team_id = ?";
      params.push(req.user.maintenance_team_id);
    } else if (req.user.role === 'citizen') {
      if (!req.user.email) return res.json([]);
      query += " WHERE recipient = ?";
      params.push(req.user.email);
    } else if (req.user.role !== 'authority') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    query += " ORDER BY created_at DESC";
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error("Error fetching notification log:", e);
    res.status(500).json({ message: "Failed to fetch notification log" });
  }
});

router.get("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM notification_log WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Notification not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error fetching notification:", e);
    res.status(500).json({ message: "Failed to fetch notification" });
  }
});

router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { type, recipient, message, sent_at } = req.body;
    const [r] = await db.query(
      "INSERT INTO notification_log (type, recipient, message, sent_at) VALUES (?, ?, ?, ?)",
      [type || null, recipient || null, message || null, sent_at || null]
    );
    const [rows] = await db.query("SELECT * FROM notification_log WHERE id = ?", [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Error creating notification:", e);
    res.status(500).json({ message: "Failed to create notification" });
  }
});

router.put("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { type, recipient, team_id, message, sent_at, is_read } = req.body;
    const id = req.params.id;
    const updates = [];
    const params = [];
    if (type !== undefined) { updates.push("type = ?"); params.push(type); }
    if (recipient !== undefined) { updates.push("recipient = ?"); params.push(recipient); }
    if (team_id !== undefined) { updates.push("team_id = ?"); params.push(team_id); }
    if (message !== undefined) { updates.push("message = ?"); params.push(message); }
    if (sent_at !== undefined) { updates.push("sent_at = ?"); params.push(sent_at); }
    if (is_read !== undefined) { updates.push("is_read = ?"); params.push(is_read); }
    if (!updates.length) return res.status(400).json({ message: "No fields to update" });
    params.push(id);
    const [r] = await db.query("UPDATE notification_log SET " + updates.join(", ") + " WHERE id = ?", params);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Notification not found" });
    const [rows] = await db.query("SELECT * FROM notification_log WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (e) {
    console.error("Error updating notification:", e);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// Add PUT /:id/read for both Authority and Maintenance
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const [existing] = await db.query("SELECT * FROM notification_log WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ message: "Notification not found" });

    // Maintenance can only mark their own team's notifications as read
    if (req.user.role === 'maintenance' && existing[0].team_id !== req.user.maintenance_team_id) {
      return res.status(403).json({ message: "Unauthorized: not assigned to your team" });
    }

    await db.query("UPDATE notification_log SET is_read = 1 WHERE id = ?", [id]);
    res.json({ success: true, message: "Notification marked as read" });
  } catch (e) {
    console.error("Error marking notification as read:", e);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM notification_log WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Notification not found" });
    res.status(204).send();
  } catch (e) {
    console.error("Error deleting notification:", e);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

module.exports = router;
