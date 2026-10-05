const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { syncAllToNeo4j } = require("../utils/neo4jSync");

// GET /api/maintenance-teams
router.get("/", requireAuth, requireRole("authority", "maintenance"), async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    let sql = "SELECT * FROM maintenance_team";
    let params = [];

    // maintenance users to see all teams as per requirement

    sql += " ORDER BY name";
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("Error fetching maintenance teams:", e);
    res.status(500).json({ message: "Failed to fetch maintenance teams" });
  }
});

// Calling procedure for sp_GetTeamPerformance
router.get("/performance", async (req, res) => {
  try {
    console.log("[DEBUG] Fetching Team Performance from Stored Procedure...");
    const [rows] = await db.query("CALL sp_GetTeamPerformance()");
    
    // In mysql2, for CALL procedures, the first result set is rows[0]
    const data = rows[0] || [];
    res.json(data);
  } catch (e) {
    console.error("Error calling sp_GetTeamPerformance:", e);
    res.status(500).json({ message: "Failed to fetch performance report" });
  }
});

// GET /api/maintenance-teams/:id
router.get("/:id", requireAuth, requireRole("authority", "maintenance"), async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    const id = req.params.id;

    if (role === 'maintenance' && parseInt(id) !== req.user.maintenance_team_id) {
      return res.status(403).json({ message: "Unauthorized: you can only view your own team's details" });
    }

    const [rows] = await db.query("SELECT * FROM maintenance_team WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Maintenance team not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error fetching maintenance team:", e);
    res.status(500).json({ message: "Failed to fetch maintenance team" });
  }
});

// POST /api/maintenance-teams
router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { name, area, contact } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });
    const [r] = await db.query(
      "INSERT INTO maintenance_team (name, area, contact) VALUES (?, ?, ?)",
      [String(name).trim(), area ? String(area) : null, contact ? String(contact) : null]
    );
    const [rows] = await db.query("SELECT * FROM maintenance_team WHERE id = ?", [r.insertId]);
    res.status(201).json(rows[0]);
    syncAllToNeo4j(); // Sync graph in background
  } catch (e) {
    console.error("Error creating maintenance team:", e);
    res.status(500).json({ message: "Failed to create maintenance team" });
  }
});

// PUT /api/maintenance-teams/:id
router.put("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { name, area, contact } = req.body;
    const id = req.params.id;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push("name = ?"); params.push(String(name).trim()); }
    if (area !== undefined) { updates.push("area = ?"); params.push(area); }
    if (contact !== undefined) { updates.push("contact = ?"); params.push(contact); }
    if (!updates.length) return res.status(400).json({ message: "No fields to update" });
    params.push(id);
    const [r] = await db.query(`UPDATE maintenance_team SET ${updates.join(", ")} WHERE id = ?`, params);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Maintenance team not found" });
    const [rows] = await db.query("SELECT * FROM maintenance_team WHERE id = ?", [id]);
    res.json(rows[0]);
    syncAllToNeo4j(); // Sync graph in background
  } catch (e) {
    console.error("Error updating maintenance team:", e);
    res.status(500).json({ message: "Failed to update maintenance team" });
  }
});

// DELETE /api/maintenance-teams/:id
router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM maintenance_team WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Maintenance team not found" });
    res.status(204).send();
  } catch (e) {
    console.error("Error deleting maintenance team:", e);
    res.status(500).json({ message: "Failed to delete maintenance team" });
  }
});


module.exports = router;
