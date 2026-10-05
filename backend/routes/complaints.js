const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

// We introspect table columns once so the INSERT can match your actual schema.
// This makes the API review-safe and prevents "Unknown column ..." issues if your
// column names differ slightly from our initial assumptions.
let cachedComplaintColumns = null;

async function getCitizenComplaintColumns() {
  if (cachedComplaintColumns) return cachedComplaintColumns;

  const [rows] = await db.query("SHOW COLUMNS FROM citizen_complaint");
  cachedComplaintColumns = rows.map((r) => r.Field);
  return cachedComplaintColumns;
}

function pickFirstExistingColumn(existingColumns, candidates) {
  return candidates.find((c) => existingColumns.includes(c)) || null;
}

// GET /api/complaints — list; citizen: by user_id, authority: all
router.get("/", requireAuth, requireRole("citizen", "authority"), async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    const userId = req.user?.id || "";

    console.log("[GET /api/complaints] User role:", role);
    console.log("[GET /api/complaints] User ID:", userId);

    let sql = `
      SELECT c.complaint_id as id, c.user_id, c.pole_id, c.complaint_text as description, 
             c.status as status, c.authority_response, c.complaint_time as created_at,
             u.full_name as citizen_name, u.email as contact, u.phone as phone,
             p.pole_id as pole_number
      FROM citizen_complaint c
      LEFT JOIN system_users u ON u.id = c.user_id
      LEFT JOIN light_pole p ON p.id = c.pole_id
    `;
    const params = [];
    if (role === "citizen" && userId) {
      sql += " WHERE c.user_id = ?";
      params.push(userId);
    }
    sql += " ORDER BY c.complaint_time DESC";

    console.log("[GET /api/complaints] SQL:", sql);
    console.log("[GET /api/complaints] Params:", params);

    const [rows] = await db.query(sql, params);

    console.log("[GET /api/complaints] Found", rows.length, "complaints");
    if (rows.length > 0) {
      console.log("[GET /api/complaints] First complaint user_id:", rows[0].user_id);
    }

    res.json(rows);
  } catch (e) {
    console.error("Error fetching complaints:", e);
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
});

// GET /api/complaints/:id — single complaint (citizen own, authority any)
router.get("/:id", requireAuth, requireRole("citizen", "authority"), async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    const userId = req.user?.id || "";

    let sql = `
      SELECT c.complaint_id as id, c.user_id, c.pole_id, c.complaint_text as description, 
             c.status, c.complaint_time as created_at, c.authority_response, c.response_time,
             u.full_name as citizen_name, u.email as contact, u.phone as phone,
             p.pole_id as pole_number
      FROM citizen_complaint c
      LEFT JOIN system_users u ON u.id = c.user_id
      LEFT JOIN light_pole p ON p.id = c.pole_id
      WHERE c.complaint_id = ?
    `;
    const [rows] = await db.query(sql, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Complaint not found" });
    const row = rows[0];
    if (role === "citizen" && row.user_id !== parseInt(userId)) {
      return res.status(403).json({ message: "Invalid role or unauthorized access" });
    }
    res.json(row);
  } catch (e) {
    console.error("Error fetching complaint:", e);
    res.status(500).json({ message: "Failed to fetch complaint" });
  }
});

// POST /api/complaints — create (citizen only)
router.post("/", requireAuth, requireRole("citizen"), async (req, res) => {
  console.log("\n[POST /api/complaints] req.body =", req.body);
  console.log("[POST /api/complaints] User ID:", req.user?.id);

  const description = req.body.description || req.body.details || req.body.complaint_text;
  const pole_id_input = req.body.pole_id || req.body.poleId || req.body.light_pole_id;
  const user_id = req.user?.id;

  if (!description) {
    return res.status(400).json({ message: "Description is required" });
  }

  if (!user_id) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    // 1. Resolve numeric id from pole_id_input (which might be "POLE-101" or "101")
    let poleInternalId = null;

    // Look up by pole_id (the string label)
    const [poleRows] = await db.query(
      "SELECT id FROM light_pole WHERE pole_id = ?",
      [String(pole_id_input)]
    );

    if (poleRows.length > 0) {
      poleInternalId = poleRows[0].id;
    } else {
      // Fallback: Try looking up by the numeric id if input is just digits
      const digits = String(pole_id_input).replace(/\D/g, "");
      if (digits.length > 0) {
        const [idRows] = await db.query(
          "SELECT id FROM light_pole WHERE id = ?",
          [Number(digits)]
        );
        if (idRows.length > 0) {
          poleInternalId = idRows[0].id;
        }
      }
    }

    if (!poleInternalId) {
      return res.status(400).json({
        message: `Invalid Pole ID: '${pole_id_input}' not found in system. Please check the label on the pole.`
      });
    }

    const sql = `
      INSERT INTO citizen_complaint (user_id, pole_id, complaint_text, status, complaint_time)
      VALUES (?, ?, ?, 'PENDING', NOW())
    `;

    const params = [user_id, poleInternalId, description];

    console.log("[POST /api/complaints] SQL:", sql);
    console.log("[POST /api/complaints] Resolved Pole ID:", poleInternalId);

    const [result] = await db.query(sql, params);

    res.status(201).json({
      message: "Complaint created successfully",
      complaint_id: result.insertId
    });
  } catch (error) {
    console.error("Error inserting complaint:", error);
    res.status(500).json({ message: "Internal server error while creating complaint." });
  }
});

// DELETE /api/complaints/:id — delete own complaint (citizen only)
router.delete("/:id", requireAuth, requireRole("citizen"), async (req, res) => {
  try {
    const userId = req.user?.id || "";

    // First check if complaint exists and belongs to this citizen
    const [rows] = await db.query(
      "SELECT complaint_id, user_id FROM citizen_complaint WHERE complaint_id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (rows[0].user_id !== parseInt(userId)) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own complaints" });
    }

    // Delete the complaint
    await db.query("DELETE FROM citizen_complaint WHERE complaint_id = ?", [req.params.id]);

    res.json({ message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Error deleting complaint:", error);
    res.status(500).json({ message: "Failed to delete complaint" });
  }
});

// PUT /api/complaints/:id/status — authority updates complaint status and response
router.put("/:id/status", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { status, authority_response } = req.body;
    const authorityId = req.user?.id;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Valid status values
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "DECLINED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Check if complaint exists
    const [checkRows] = await db.query(
      "SELECT complaint_id, status FROM citizen_complaint WHERE complaint_id = ?",
      [req.params.id]
    );

    if (!checkRows.length) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Update complaint with status, response, and timestamp
    const sql = `
      UPDATE citizen_complaint 
      SET status = ?, 
          authority_response = ?, 
          response_time = NOW(),
          authority_id = ?
      WHERE complaint_id = ?
    `;

    console.log(`[complaints/status] Updating complaint ${req.params.id}. New status: ${status}, Response: ${authority_response}`);

    const [result] = await db.query(sql, [status.toUpperCase(), authority_response || null, authorityId, req.params.id]);

    if (result.affectedRows === 0) {
      console.log(`[complaints/status] FAILED: No complaint found with id ${req.params.id}`);
      return res.status(404).json({ success: false, message: "Complaint not found or you don't have permission" });
    }

    console.log(`[complaints/status] SUCCESS: Complaint ${req.params.id} updated.`);
    res.json({
      success: true,
      message: "Complaint status updated successfully",
      complaint_id: req.params.id,
      status: status.toUpperCase(),
      authority_response: authority_response || null
    });
  } catch (error) {
    console.error("Error updating complaint status:", error);
    res.status(500).json({ message: "Failed to update complaint status" });
  }
});

// GET /api/complaints/stats/summary — authority gets complaint statistics
router.get("/stats/summary", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'DECLINED' THEN 1 ELSE 0 END) as declined
      FROM citizen_complaint
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error("Error fetching complaint stats:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

module.exports = router;

