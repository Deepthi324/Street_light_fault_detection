const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { syncAllToNeo4j } = require("../utils/neo4jSync");

// Returns incidents with team name and pole label via JOINs
router.get("/", requireAuth, async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    let sql = `
      SELECT i.*, 
             mt.name AS team_name,
             lp.pole_id AS pole_label,
             lp.location AS pole_location,
             (SELECT id FROM maintenance_activity WHERE incident_id = i.id ORDER BY created_at DESC LIMIT 1) as activity_id
      FROM incident i
      LEFT JOIN maintenance_team mt ON mt.id = i.team_id
      LEFT JOIN light_pole lp ON lp.id = i.light_pole_id
    `;
    let params = [];


    const { filter } = req.query;

    if (filter === 'high-frequency') {
      // Finds incidents for poles that have had more than 3 incidents total
      sql += ` WHERE i.light_pole_id IN (
        SELECT light_pole_id FROM (
          SELECT light_pole_id FROM incident GROUP BY light_pole_id HAVING COUNT(*) > 3
        ) as sub
      )`;
    }

    sql += " ORDER BY i.created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});

// Uses a procedure to handle assignment, activity, and history in one transaction
router.post("/:id/assign", requireAuth, async (req, res) => {
  try {
    const incidentId = req.params.id;
    const { team_id, notes } = req.body;
    const userId = req.user.id;

    if (!team_id) {
      return res.status(400).json({ message: "team_id is required" });
    }

    // Calling the procedure sp_AssignIncidentToTeam(incident_id, team_id, user_id, notes)
    await db.query("CALL sp_AssignIncidentToTeam(?, ?, ?, ?)", [
      incidentId,
      team_id,
      userId,
      notes || 'Team assigned via stored procedure'
    ]);

    res.json({ message: "Assignment successful via DBMS Stored Procedure" });
    syncAllToNeo4j(); // Sync graph in background
  } 
  //Exception handling for Failed Assigning Team
  catch (error) {
    console.error("Error executing sp_AssignIncidentToTeam:", error);
    res.status(500).json({ message: "Failed to assign team via stored procedure", error: error.message });
  }
});

// Create a new incident (authority can create from complaints)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { light_pole_id, reported_by, type, priority, status } = req.body;

    if (!light_pole_id) {
      return res.status(400).json({ message: "light_pole_id is required" });
    }

    const [result] = await db.query(
      "INSERT INTO incident (light_pole_id, reported_by, type, priority, status) VALUES (?, ?, ?, ?, ?)",
      [light_pole_id, reported_by, type, priority || 'Medium', status || 'Open']
    );

    const [rows] = await db.query("SELECT * FROM incident WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
    syncAllToNeo4j(); // Sync graph in background
  } catch (error) {
    console.error("Error creating incident:", error);
    res.status(500).json({ message: "Failed to create incident" });
  }
});

// Update an existing incident (supports team_id for assignment)
router.put("/:id", async (req, res) => {
  try {
    const { light_pole_id, reported_by, type, priority, status, team_id } = req.body;
    const updates = [];
    const params = [];

    if (light_pole_id !== undefined) { updates.push("light_pole_id = ?"); params.push(light_pole_id); }
    if (reported_by !== undefined) { updates.push("reported_by = ?"); params.push(reported_by); }
    if (type !== undefined) { updates.push("type = ?"); params.push(type); }
    if (priority !== undefined) { updates.push("priority = ?"); params.push(priority); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (team_id !== undefined) { updates.push("team_id = ?"); params.push(team_id); }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(req.params.id);
    const [result] = await db.query(`UPDATE incident SET ${updates.join(", ")} WHERE id = ?`, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Incident not found" });
    }

    const [rows] = await db.query("SELECT * FROM incident WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
    syncAllToNeo4j(); // Sync graph in background
  } catch (error) {
    console.error("Error updating incident:", error);
    res.status(500).json({ message: "Failed to update incident" });
  }
});

// Delete an incident
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM incident WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Incident not found" });
    }
    res.json({ message: "Incident deleted successfully" });
    syncAllToNeo4j(); // Sync graph in background
  } catch (error) {
    console.error("Error deleting incident:", error);
    res.status(500).json({ message: "Failed to delete incident" });
  }
});

// Calling procedure for sp_GetMonthlySystemReport
router.get("/monthly-report", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query("CALL sp_GetMonthlySystemReport()");
    
    // In mysql2, the first result set is in rows[0]
    const reportData = (rows && rows[0] && rows[0][0]) ? rows[0][0] : null;
    
    if (!reportData) {
      return res.status(404).json({ message: "Monthly report not generated" });
    }
    
    res.json(reportData);
  } catch (error) {
    console.error("Error fetching monthly report:", error);
    res.status(500).json({ message: "Failed to fetch monthly system report" });
  }
});

module.exports = router;


