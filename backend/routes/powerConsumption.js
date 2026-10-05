const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const baseSql = "SELECT pc.id, pc.light_pole_id, pc.record_date, pc.kwh, pc.created_at, p.pole_id FROM power_consumption pc LEFT JOIN light_pole p ON p.id = pc.light_pole_id";

router.get("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query(baseSql + " ORDER BY pc.record_date DESC, pc.light_pole_id");
    const total = rows.reduce((sum, r) => sum + Number(r.kwh || 0), 0);
    res.json({ 
      data: rows, 
      total_consumption: total.toFixed(1) + " kWh" 
    });
  } catch (e) {
    console.error("Error fetching power consumption:", e);
    res.status(500).json({ message: "Failed to fetch power consumption" });
  }
});

router.get("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query(baseSql + " WHERE pc.id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Power consumption record not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error fetching power consumption:", e);
    res.status(500).json({ message: "Failed to fetch power consumption" });
  }
});

router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { light_pole_id, record_date, kwh } = req.body;
    if (!light_pole_id || !record_date) return res.status(400).json({ message: "light_pole_id and record_date are required" });
    const [r] = await db.query(
      "INSERT INTO power_consumption (light_pole_id, record_date, kwh) VALUES (?, ?, ?)",
      [Number(light_pole_id), String(record_date), kwh != null ? Number(kwh) : 0]
    );
    const [rows] = await db.query(baseSql + " WHERE pc.id = ?", [r.insertId]);
    res.status(201).json(rows[0] || { id: r.insertId, light_pole_id, record_date, kwh: kwh != null ? Number(kwh) : 0 });
  } catch (e) {
    console.error("Error creating power consumption:", e);
    res.status(500).json({ message: "Failed to create power consumption" });
  }
});

router.put("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { light_pole_id, record_date, kwh } = req.body;
    const id = req.params.id;
    const updates = [];
    const params = [];
    if (light_pole_id !== undefined) { updates.push("light_pole_id = ?"); params.push(Number(light_pole_id)); }
    if (record_date !== undefined) { updates.push("record_date = ?"); params.push(record_date); }
    if (kwh !== undefined) { updates.push("kwh = ?"); params.push(Number(kwh)); }
    if (!updates.length) return res.status(400).json({ message: "No fields to update" });
    params.push(id);
    const [r] = await db.query("UPDATE power_consumption SET " + updates.join(", ") + " WHERE id = ?", params);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Power consumption record not found" });
    const [rows] = await db.query(baseSql + " WHERE pc.id = ?", [id]);
    res.json(rows[0]);
  } catch (e) {
    console.error("Error updating power consumption:", e);
    res.status(500).json({ message: "Failed to update power consumption" });
  }
});

router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM power_consumption WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Power consumption record not found" });
    res.status(204).send();
  } catch (e) {
    console.error("Error deleting power consumption:", e);
    res.status(500).json({ message: "Failed to delete power consumption" });
  }
});

module.exports = router;
