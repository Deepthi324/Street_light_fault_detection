const express = require("express");
const router = express.Router();
const db = require("../db");
const DeviceMetadata = require("../models/DeviceMetadata");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT d.id, d.device_id, d.light_pole_id, d.type, d.status, d.created_at, p.pole_id " +
      "FROM sensor_device d LEFT JOIN light_pole p ON p.id = d.light_pole_id ORDER BY d.device_id"
    );
    res.json(rows);
  } catch (e) {
    console.error("Error fetching sensor devices:", e);
    res.status(500).json({ message: "Failed to fetch sensor devices" });
  }
});

router.get("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT d.id, d.device_id, d.light_pole_id, d.type, d.status, d.created_at, p.pole_id " +
      "FROM sensor_device d LEFT JOIN light_pole p ON p.id = d.light_pole_id WHERE d.id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Sensor device not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error fetching sensor device:", e);
    res.status(500).json({ message: "Failed to fetch sensor device" });
  }
});

router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { device_id, light_pole_id, type, status } = req.body;
    if (!device_id || !String(device_id).trim()) return res.status(400).json({ message: "device_id is required" });
    if (!light_pole_id) return res.status(400).json({ message: "light_pole_id is required" });
    const [r] = await db.query(
      "INSERT INTO sensor_device (device_id, light_pole_id, type, status) VALUES (?, ?, ?, ?)",
      [String(device_id).trim(), Number(light_pole_id), type || null, status || "Active"]
    );
    const [rows] = await db.query(
      "SELECT d.id, d.device_id, d.light_pole_id, d.type, d.status, d.created_at, p.pole_id " +
      "FROM sensor_device d LEFT JOIN light_pole p ON p.id = d.light_pole_id WHERE d.id = ?",
      [r.insertId]
    );

    // CROSS-DB SYNC: Create shell metadata in MongoDB 
    try {
      await DeviceMetadata.create({ 
        device_id: String(device_id).trim(),
        service_notes: 'System generated shell on creation.' 
      });
    } catch (mongoErr) {
      console.warn("⚠️ MySQL success, but MongoDB shell creation failed:", mongoErr.message);
    }

    res.status(201).json(rows[0] || { id: r.insertId, device_id, light_pole_id, type, status: status || "Active" });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Device ID already exists" });
    console.error("Error creating sensor device:", e);
    res.status(500).json({ message: "Failed to create sensor device" });
  }
});

router.put("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { device_id, light_pole_id, type, status } = req.body;
    const id = req.params.id;
    const updates = [];
    const params = [];
    if (device_id !== undefined) { updates.push("device_id = ?"); params.push(String(device_id).trim()); }
    if (light_pole_id !== undefined) { updates.push("light_pole_id = ?"); params.push(Number(light_pole_id)); }
    if (type !== undefined) { updates.push("type = ?"); params.push(type); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (!updates.length) return res.status(400).json({ message: "No fields to update" });
    params.push(id);
    const [r] = await db.query("UPDATE sensor_device SET " + updates.join(", ") + " WHERE id = ?", params);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Sensor device not found" });
    const [rows] = await db.query(
      "SELECT d.id, d.device_id, d.light_pole_id, d.type, d.status, d.created_at, p.pole_id " +
      "FROM sensor_device d LEFT JOIN light_pole p ON p.id = d.light_pole_id WHERE d.id = ?",
      [id]
    );

    //  CROSS-DB SYNC: Update device_id in MongoDB if it changed 
    if (device_id !== undefined && rows.length > 0) {
       try {
         await DeviceMetadata.findOneAndUpdate(
           { device_id: String(params[0]) }, // Old device_id might be needed if we don't have it, but here we just upsert/set
           { device_id: String(device_id).trim() },
           { upsert: true }
         );
       } catch (mongoErr) {
         console.warn("⚠️ MongoDB sync failed on update:", mongoErr.message);
       }
    }

    res.json(rows[0]);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Device ID already exists" });
    console.error("Error updating sensor device:", e);
    res.status(500).json({ message: "Failed to update sensor device" });
  }
});

router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [device] = await db.query("SELECT device_id FROM sensor_device WHERE id = ?", [req.params.id]);
    const [r] = await db.query("DELETE FROM sensor_device WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Sensor device not found" });

    // --- CROSS-DB SYNC: Cleanup MongoDB metadata ---
    if (device.length > 0) {
      try {
        await DeviceMetadata.deleteOne({ device_id: String(device[0].device_id) });
      } catch (mongoErr) {
        console.warn("⚠️ MongoDB cleanup failed on delete:", mongoErr.message);
      }
    }

    res.status(204).send();
  } catch (e) {
    console.error("Error deleting sensor device:", e);
    res.status(500).json({ message: "Failed to delete sensor device" });
  }
});

module.exports = router;
