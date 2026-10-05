const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcrypt");
const path = require("path");
const { signToken } = require("./middleware/auth");
const { runInit } = require("./initDb");

const lightPolesRoute = require("./routes/lightPoles");
const incidentsRoute = require("./routes/incidents");
const complaintsRoute = require("./routes/complaints");
const maintenanceActivityRoute = require("./routes/maintenanceActivity");
const maintenanceTeamsRoute = require("./routes/maintenanceTeams");
const notificationLogRoute = require("./routes/notificationLog");
const powerConsumptionRoute = require("./routes/powerConsumption");
const sensorDevicesRoute = require("./routes/sensorDevices");
const systemUsersRoute = require("./routes/systemUsers");
const sensorReadingsRoute = require("./routes/sensorReadings");
const powerReadingsRoute = require("./routes/powerReadings");
const deviceMetadataRoute = require("./routes/deviceMetadata");
const poleMetadataRoute = require("./routes/poleMetadata");
const neo4jRoute = require("./routes/neo4j");
const connectMongoDB = require('./mongoDb');
const startSimulator = require('./sensorSimulator');

const app = express();

// Port configuration: Can be set via environment variable PORT
// Example: PORT=5000 npm start
// If not set, defaults to 4002
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4003;

// Middleware
// Allow requests from all common development origins
app.use(cors());
app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple health check route
app.get("/", (req, res) => {
  res.json({ message: "Street Light API is running" });
});

// Debug Status Endpoint
app.get("/api/debug/status", async (req, res) => {
  const status = {
    mysql: "Unknown",
    mongodb: "Unknown",
    mongoCount: 0,
    time: new Date().toISOString()
  };

  try {
    await db.query("SELECT 1");
    status.mysql = "✅ Connected";
  } catch (e) {
    status.mysql = "❌ Error: " + e.message;
  }

  try {
    const mongoose = require('mongoose');
    const SensorReading = require('./models/SensorReading');
    if (mongoose.connection.readyState === 1) {
      status.mongodb = "✅ Connected";
      status.mongoCount = await SensorReading.countDocuments();
    } else {
      status.mongodb = "❌ Not Connected (State: " + mongoose.connection.readyState + ")";
    }
  } catch (e) {
    status.mongodb = "❌ Error: " + e.message;
  }

  res.json(status);
});

// Force Generate Reading
app.post("/api/debug/force-readings", async (req, res) => {
  try {
    const SensorReading = require('./models/SensorReading');
    const db = require('./db');

    const [devices] = await db.query("SELECT * FROM sensor_device LIMIT 1");
    if (devices.length === 0) return res.status(400).json({ message: "No sensor devices in MySQL!" });

    const reading = new SensorReading({
      device_id: devices[0].device_id,
      pole_id: devices[0].light_pole_id,
      sensor_type: devices[0].type || 'Light',
      value: 101,
      unit: 'lux',
      status: 'Normal',
      recorded_at: new Date()
    });

    await reading.save();
    res.json({ message: "Reading forced successfully!", reading });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve test file for CORS debugging
app.get("/test-cors", (req, res) => {
  res.sendFile(path.join(__dirname, "test-cors.html"));
});

// Serve React-like test page
app.get("/react-test", (req, res) => {
  res.sendFile(path.join(__dirname, "react-test.html"));
});

// API routes
app.use("/api/light-poles", lightPolesRoute);
app.use("/api/incidents", incidentsRoute);
app.use("/api/complaints", complaintsRoute);
app.use("/api/maintenance-activity", maintenanceActivityRoute);
app.use("/api/maintenance-teams", maintenanceTeamsRoute);
app.use("/api/notification-log", notificationLogRoute);
app.use("/api/power-consumption", powerConsumptionRoute);
app.use("/api/sensor-devices", sensorDevicesRoute);
app.use("/api/sensor-readings", sensorReadingsRoute);
app.use("/api/power-readings", powerReadingsRoute);
app.use("/api/system-users", systemUsersRoute);
app.use("/api/device-metadata", deviceMetadataRoute);
app.use("/api/pole-metadata", poleMetadataRoute);
app.use("/api/neo4j", neo4jRoute);
// Authentication routes
app.post("/api/auth/signup", async (req, res) => {
  console.log('🔍 SIGNUP API HIT - Request body:', req.body);
  try {
    const { fullName, email, password, confirmPassword, role, phone } = req.body;

    // Validation
    if (!fullName || !email || !password || !confirmPassword || !role || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (!['citizen', 'maintenance', 'authority'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected'
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM system_users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const { maintenance_team_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO system_users (full_name, email, password_hash, role, phone, maintenance_team_id) VALUES (?, ?, ?, ?, ?, ?)',
      [String(fullName).trim(), String(email).trim(), passwordHash, role, String(phone).trim(), maintenance_team_id || null]
    );

    console.log('✅ USER CREATED SUCCESSFULLY - ID:', result.insertId, 'Email:', email);

    // Generate JWT token for auto-login after signup
    const token = signToken({
      id: result.insertId,
      email,
      role,
      maintenance_team_id: maintenance_team_id || null
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: {
        id: result.insertId,
        fullName,
        email,
        phone,
        role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  console.log('🔍 LOGIN API HIT - Request body:', req.body);
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Find user by email and join with maintenance_team if applicable
    const [users] = await db.query(
      'SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.maintenance_team_id, t.name AS team_name ' +
      'FROM system_users u LEFT JOIN maintenance_team t ON t.id = u.maintenance_team_id WHERE u.email = ?',
      [String(email).trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Return user data with JWT token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      maintenance_team_id: user.maintenance_team_id,
      team_name: user.team_name
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        maintenance_team_id: user.maintenance_team_id,
        team_name: user.team_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Test database connection once on startup (optional but useful for debugging)
db.query("SELECT 1")
  .then(() => {
    console.log("Connected to MySQL database streetlight_db");

    // Initialize all database tables
    return runInit();
  })
  .then(() => {
    console.log("Database tables initialized successfully");
    // Initialize MongoDB Connection
    return connectMongoDB();
  })
  .then(() => {
    // Start Sensor Simulator
    startSimulator();
  })
  .catch((err) => {
    console.error("Failed to connect to databases or initialize:", err.message);
  });

// Start the Express server with proper error handling
// This handles the EADDRINUSE error when port is already in use
const server = app.listen(PORT, () => {
  console.log(`Street Light backend listening on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/*`);
});

// Handle server errors gracefully
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    // Port is already in use - this happens when you try to start the server
    // while another instance is already running
    console.error("\n❌ ERROR: Port", PORT, "is already in use!");
    console.error("\n💡 SOLUTION:");
    console.error("   1. Find the terminal where the backend is already running");
    console.error("   2. Press Ctrl + C to stop that instance");
    console.error("   3. Then run 'npm start' again");
    console.error("\n   OR use a different port:");
    console.error(`   PORT=${PORT + 1} npm start\n`);
    process.exit(1); // Exit gracefully instead of crashing
  } else {
    // Some other error occurred
    console.error("\n❌ Server error:", error.message);
    process.exit(1);
  }
});

