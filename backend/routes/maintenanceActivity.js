const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

// GET /api/maintenance-activity/:id/history
// Returns history logs for a specific maintenance activity
router.get("/:id/history", requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT h.id, h.activity_id, h.status, h.notes, h.created_at, u.full_name as updated_by_name
      FROM maintenance_history h
      LEFT JOIN system_users u ON h.updated_by = u.id
      WHERE h.activity_id = ?
      ORDER BY h.created_at DESC
    `;
    const [rows] = await db.query(query, [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching maintenance history:", error);
    res.status(500).json({ message: "Failed to fetch maintenance history" });
  }
});

// GET /api/maintenance-activity
// Returns activities with incident & team details for rich dashboard display
router.get("/", requireAuth, async (req, res) => {
  try {
    // Requested JOIN query for full history visibility
    const query = `
      SELECT m.id AS activity_id,
             i.type AS issue,
             i.id AS incident_id,
             p.pole_id AS pole_label,
             p.id AS pole_id,
             t.name AS team_name,
             m.team_id,
             m.status,
             m.notes,
             m.started_at AS start_time,
             m.completed_at AS end_time
      FROM maintenance_activity m
      LEFT JOIN maintenance_team t ON m.team_id = t.id
      LEFT JOIN incident i ON m.incident_id = i.id
      LEFT JOIN light_pole p ON (COALESCE(m.pole_id, i.light_pole_id)) = p.id
      ORDER BY m.started_at DESC, m.created_at DESC
    `;

    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching maintenance activity:", error);
    res.status(500).json({ message: "Failed to fetch maintenance activity" });
  }
});

// POST /api/maintenance-activity (Authority Only)
router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { incident_id, team_id, status, notes } = req.body;

    if (!incident_id) {
      return res.status(400).json({ message: "incident_id is required" });
    }

    const [result] = await db.query(
      "INSERT INTO maintenance_activity (incident_id, team_id, status, notes, started_at) VALUES (?, ?, ?, ?, NOW())",
      [incident_id, team_id, status || 'Pending', notes]
    );

    // AUTOMATIC NOTIFICATION: Trigger notification for the assigned team
    if (team_id) {
      try {
        await db.query(
          "INSERT INTO notification_log (type, team_id, message, is_read, created_at) VALUES (?, ?, ?, ?, NOW())",
          ['Info', team_id, `New maintenance assignment: Incident #${incident_id}. Notes: ${notes || 'None'}`, 0]
        );
      } catch (notifError) {
        console.error("Error triggering automatic notification:", notifError);
        // We don't fail the main request if notification fails, just log it.
      }
    }

    // Insert initial history record
    try {
      await db.query(
        "INSERT INTO maintenance_history (activity_id, status, notes, updated_by) VALUES (?, ?, ?, ?)",
        [result.insertId, status || 'Pending', notes || 'Task Assigned', req.user.id]
      );
    } catch (histErr) {
      console.error("Failed to insert initial history log:", histErr);
    }

    const [rows] = await db.query("SELECT * FROM maintenance_activity WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating maintenance activity:", error);
    res.status(500).json({ message: "Failed to create maintenance activity" });
  }
});

// PUT /api/maintenance-activity/:id (Authority or Assigned Maintenance Team)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { team_id, status, notes, completed_at } = req.body;
    const id = req.params.id;

    // 1. Fetch existing activity with team info for notification
    const [existing] = await db.query(
      "SELECT ma.*, mt.name AS team_name FROM maintenance_activity ma " +
      "LEFT JOIN maintenance_team mt ON mt.id = ma.team_id WHERE ma.id = ?",
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ message: "Maintenance activity not found" });

    // 2. PERMISSION RULE: Only assigned team or authority can modify
    if (req.user.role === 'maintenance' && Number(existing[0].team_id) !== Number(req.user.maintenance_team_id)) {
      return res.status(403).json({ message: "Unauthorized action: this activity is not assigned to your team" });
    }

    const updates = [];
    const params = [];

    if (req.user.role === 'authority') {
      if (team_id !== undefined) { updates.push("team_id = ?"); params.push(team_id); }
    }

    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }

    if (completed_at !== undefined) {
      updates.push("completed_at = ?");
      params.push(completed_at);
    } else if (status === 'Completed' && !existing[0].completed_at) {
      updates.push("completed_at = NOW()");
    }

    if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

    params.push(id);

    // Update the maintenance activity
    await db.query(`UPDATE maintenance_activity SET ${updates.join(", ")} WHERE id = ?`, params);

    // Insert history record
    try {
      await db.query(
        "INSERT INTO maintenance_history (activity_id, status, notes, updated_by) VALUES (?, ?, ?, ?)",
        [id, status || existing[0].status, notes || '', req.user.id]
      );
    } catch (histErr) {
      console.error("Failed to insert history log:", histErr);
    }

    // MANUAL TRIGGER LOGIC: If status changed to Completed, update related tables
    if (status === 'Completed' && existing[0].status !== 'Completed') {
      try {
        // Update incident
        await db.query("UPDATE incident SET status = 'Completed', updated_at = NOW() WHERE id = ?", [existing[0].incident_id]);

        // Update citizen_complaint if applicable
        await db.query(`
          UPDATE citizen_complaint 
          SET status = 'RESOLVED', response_time = NOW() 
          WHERE pole_id = (SELECT light_pole_id FROM incident WHERE id = ?) 
          AND status != 'RESOLVED'
        `, [existing[0].incident_id]);
      } catch (triggerErr) {
        console.error("Failed executing manual trigger completion logic:", triggerErr);
      }
    }

    // 3. TASK UPDATE WORKFLOW: Insert notification for authority
    try {
      // Find an authority user to notify (or send a general one if specific authority_id isn't known)
      // Usually, there's a specific system notification for authorities
      const [authorities] = await db.query("SELECT id FROM system_users WHERE role = 'authority' LIMIT 1");
      const authorityId = authorities.length > 0 ? authorities[0].id : null;

      const teamName = req.user.team_name || existing[0].team_name || 'Maintenance Team';
      const notificationMsg = `Maintenance task #${id} updated to "${status || existing[0].status}" by Team ${teamName}`;

      await db.query(
        "INSERT INTO notification_log (recipient, message, type, created_at) VALUES (?, ?, ?, NOW())",
        ['authority', notificationMsg, 'MaintenanceUpdate']
      );
    } catch (notifErr) {
      console.error("Failed to send authority notification:", notifErr);
    }

    const [rows] = await db.query("SELECT * FROM maintenance_activity WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating maintenance activity:", error);
    res.status(500).json({ message: "Failed to update maintenance activity" });
  }
});

// DELETE /api/maintenance-activity/:id (Authority Only)
router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM maintenance_activity WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Maintenance activity not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting maintenance activity:", error);
    res.status(500).json({ message: "Failed to delete maintenance activity" });
  }
});

module.exports = router;

