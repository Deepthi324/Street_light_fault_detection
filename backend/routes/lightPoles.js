const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const PoleMetadata = require("../models/PoleMetadata");
const { syncAllToNeo4j } = require("../utils/neo4jSync");

// Returns all light poles
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM light_pole ORDER BY pole_id");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching light poles:", error);
    res.status(500).json({ message: "Failed to fetch light poles" });
  }
});

// GET /api/light-poles/:id
router.get("/:id", async (req, res) => {
  try {
    // THIS IS THE SQL QUERYING AND FILTERING
    const [rows] = await db.query("SELECT * FROM light_pole WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Light pole not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching light pole:", error);
    res.status(500).json({ message: "Failed to fetch light pole" });
  }
});

// POST /api/light-poles (Authority Only)
router.post("/", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { pole_id, location, latitude, longitude, status, installation_date } = req.body;

    if (!pole_id) return res.status(400).json({ message: "pole_id is required" });

    const [result] = await db.query(
      "INSERT INTO light_pole (pole_id, location, latitude, longitude, status, installation_date) VALUES (?, ?, ?, ?, ?, ?)",
      [pole_id, location || null, latitude || null, longitude || null, status || "Active", installation_date || null]
    );

    const [newPole] = await db.query("SELECT * FROM light_pole WHERE id = ?", [result.insertId]);

    // Automatically create a sensor device for this new pole
    try {
      await db.query(
        "INSERT INTO sensor_device (device_id, light_pole_id, type, status) VALUES (?, ?, ?, ?)",
        [`SN-${result.insertId}`, result.insertId, 'Motion', 'Active']
      );
      console.log(`✅ Automatic sensor created for Pole #${pole_id}`);
    } catch (sensorErr) {
      console.error("Failed to auto-create sensor for new pole:", sensorErr);
    }

    // Automatically create Pole Metadata in MongoDB
    try {
      await PoleMetadata.create({
        pole_id: String(pole_id),
        foundation_type: 'Concrete (Standard)',
        pole_material: 'Galvanized Steel',
        electrical_provider: 'Municipal Grid',
        extended_notes: 'Automatically initialized during pole registration.'
      });
      console.log(`✅ MongoDB Metadata initialized for Pole #${pole_id}`);
    } catch (mongoErr) {
      console.error("Failed to initialize MongoDB metadata for new pole:", mongoErr);
    }

    res.status(201).json(newPole[0]);
    syncAllToNeo4j(); // Sync graph in background
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Pole ID already exists" });
    }
    console.error("Error creating light pole:", error);
    res.status(500).json({ message: "Failed to create light pole" });
  }
});

// PUT /api/light-poles/:id (Authority Only)
router.put("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const { pole_id, location, latitude, longitude, status, installation_date } = req.body;
    const id = req.params.id;

    const updates = [];
    const params = [];

    if (pole_id !== undefined) { updates.push("pole_id = ?"); params.push(pole_id); }
    if (location !== undefined) { updates.push("location = ?"); params.push(location); }
    if (latitude !== undefined) { updates.push("latitude = ?"); params.push(latitude); }
    if (longitude !== undefined) { updates.push("longitude = ?"); params.push(longitude); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (installation_date !== undefined) { updates.push("installation_date = ?"); params.push(installation_date); }

    if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

    params.push(id);
    const [result] = await db.query(`UPDATE light_pole SET ${updates.join(", ")} WHERE id = ?`, params);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Light pole not found" });

    const [updatedPole] = await db.query("SELECT * FROM light_pole WHERE id = ?", [id]);
    res.json(updatedPole[0]);
    syncAllToNeo4j(); // Sync graph in background
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Pole ID already exists" });
    }
    console.error("Error updating light pole:", error);
    res.status(500).json({ message: "Failed to update light pole" });
  }
});

// DELETE /api/light-poles/:id (Authority Only)
router.delete("/:id", requireAuth, requireRole("authority"), async (req, res) => {
  try {
    const [pole] = await db.query("SELECT pole_id FROM light_pole WHERE id = ?", [req.params.id]);
    const [result] = await db.query("DELETE FROM light_pole WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Light pole not found" });

    // NEW: Automatically delete Metadata from MongoDB
    if (pole && pole[0]) {
      try {
        await PoleMetadata.deleteOne({ pole_id: String(pole[0].pole_id) });
        console.log(`✅ MongoDB Metadata removed for Pole ID: ${pole[0].pole_id}`);
      } catch (mongoErr) {
        console.error("Failed to remove MongoDB metadata during pole deletion:", mongoErr);
      }
    }

    res.status(204).send();
    syncAllToNeo4j(); // Sync graph in background
  } catch (error) {
    console.error("Error deleting light pole:", error);
    res.status(500).json({ message: "Failed to delete light pole" });
  }
});

// Calling procedure for sp_GetPoleSummary
router.get("/:id/summary", async (req, res) => {
  try {
    const [rows] = await db.query("CALL sp_GetPoleSummary(?)", [req.params.id]);
    
    // In mysql2, for CALL procedures, the first result set is rows[0]
    const data = (rows && rows[0] && rows[0][0]) ? rows[0][0] : null;
    
    if (!data) {
      return res.status(404).json({ message: "Pole summary not found" });
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error calling sp_GetPoleSummary:", error);
    res.status(500).json({ message: "Failed to fetch pole summary from DBMS" });
  }
});

module.exports = router;


