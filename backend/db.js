// Simple MySQL connection using mysql2
// Adjust user/password/host if needed for your local MySQL setup.

const mysql = require("mysql2");

// Create a connection pool so multiple queries can run efficiently.
// You can still override these using environment variables (recommended for production).
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  // Default local password; override with DB_PASSWORD env var if needed.
  password: process.env.DB_PASSWORD || "kinnera@5",
  database: process.env.DB_NAME || "streetlight_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisified pool for convenient async/await usage
const db = pool.promise();

module.exports = db;

