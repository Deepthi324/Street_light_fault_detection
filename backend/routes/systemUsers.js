const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const { requireAuth, requireRole } = require("../middleware/auth");

// GET /api/system-users - List all users
router.get("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT u.id, u.full_name, u.email, u.phone, u.role, u.maintenance_team_id, u.is_active, u.created_at, t.name AS team_name " +
      "FROM system_users u LEFT JOIN maintenance_team t ON t.id = u.maintenance_team_id ORDER BY u.id"
    );
    res.json(rows);
  } catch (e) {
    console.error("Error fetching system users:", e);
    res.status(500).json({ message: "Failed to fetch system users" });
  }
});

// GET /api/system-users/:id - Get single user
router.get("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT u.id, u.full_name, u.email, u.phone, u.role, u.maintenance_team_id, u.is_active, u.created_at, t.name AS team_name " +
      "FROM system_users u LEFT JOIN maintenance_team t ON t.id = u.maintenance_team_id WHERE u.id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "System user not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error fetching system user:", e);
    res.status(500).json({ message: "Failed to fetch system user" });
  }
});

// POST /api/system-users - Create user (Authority only)
router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { full_name, email, password, role, phone, maintenance_team_id } = req.body;
    if (!full_name || !email || !password || !role)
      return res.status(400).json({ message: "full_name, email, password, and role are required" });
    if (!["citizen", "maintenance", "authority"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const [ex] = await db.query("SELECT id FROM system_users WHERE email = ?", [email]);
    if (ex.length) return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      "INSERT INTO system_users (full_name, email, password_hash, role, phone, maintenance_team_id, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
      [String(full_name).trim(), String(email).trim(), hash, role, phone ? String(phone).trim() : null, maintenance_team_id != null ? Number(maintenance_team_id) : null]
    );

    const [rows] = await db.query(
      "SELECT u.id, u.full_name, u.email, u.phone, u.role, u.maintenance_team_id, u.is_active, u.created_at, t.name AS team_name " +
      "FROM system_users u LEFT JOIN maintenance_team t ON t.id = u.maintenance_team_id WHERE u.id = ?",
      [r.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Error creating system user:", e);
    res.status(500).json({ message: "Failed to create system user" });
  }
});

// PUT /api/system-users/:id - Update user details
router.put("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const id = req.params.id;
    const { full_name, email, role, maintenance_team_id, password, phone } = req.body;
    const updates = [];
    const params = [];
    if (full_name !== undefined) { updates.push("full_name = ?"); params.push(String(full_name).trim()); }
    if (email !== undefined) { updates.push("email = ?"); params.push(String(email).trim()); }
    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone ? String(phone).trim() : null); }
    if (role !== undefined) {
      if (!["citizen", "maintenance", "authority"].includes(role)) return res.status(400).json({ message: "Invalid role" });
      updates.push("role = ?"); params.push(role);
    }
    if (maintenance_team_id !== undefined) {
      updates.push("maintenance_team_id = ?");
      params.push(maintenance_team_id != null ? Number(maintenance_team_id) : null);
    }
    if (password !== undefined && String(password).trim().length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?"); params.push(hash);
    }
    if (!updates.length) return res.status(400).json({ message: "No fields to update" });

    params.push(id);
    const [r] = await db.query("UPDATE system_users SET " + updates.join(", ") + " WHERE id = ?", params);

    if (r.affectedRows === 0) return res.status(404).json({ message: "System user not found" });

    const [rows] = await db.query(
      "SELECT u.id, u.full_name, u.email, u.phone, u.role, u.maintenance_team_id, u.is_active, u.created_at, t.name AS team_name " +
      "FROM system_users u LEFT JOIN maintenance_team t ON t.id = u.maintenance_team_id WHERE u.id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error("Error updating system user:", e);
    res.status(500).json({ message: "Failed to update system user" });
  }
});

// PUT /api/system-users/:id/status - Block/Unblock user
router.put("/:id/status", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: "is_active boolean required" });
    }

    const [r] = await db.query("UPDATE system_users SET is_active = ? WHERE id = ?", [is_active, req.params.id]);

    if (r.affectedRows === 0) return res.status(404).json({ message: "System user not found" });

    res.json({ message: `User ${is_active ? 'unblocked' : 'blocked'} successfully`, id: req.params.id, is_active });
  } catch (e) {
    console.error("Error updating user status:", e);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

// DELETE /api/system-users/:id - Delete user
router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM system_users WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "System user not found" });
    res.status(204).send();
  } catch (e) {
    console.error("Error deleting system user:", e);
    res.status(500).json({ message: "Failed to delete system user" });
  }
});

module.exports = router;
