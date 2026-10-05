const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "street-light-dbms-secret-change-in-prod";

/**
 * Verify JWT from Authorization: Bearer <token> and attach req.user.
 * ALSO refreshes maintenance_team_id and role from the database so
 * routes always work with fresh data (not stale JWT values).
 */
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: token required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Refresh critical fields from the database so they're never stale
    try {
      const [rows] = await db.query(
        "SELECT role, maintenance_team_id FROM system_users WHERE id = ?",
        [decoded.id]
      );
      if (rows.length > 0) {
        req.user.role = rows[0].role;
        req.user.maintenance_team_id = rows[0].maintenance_team_id;
      }
    } catch (dbErr) {
      // If DB lookup fails, fall back to JWT values (don't block the request)
      console.warn("Warning: Could not refresh user from DB:", dbErr.message);
    }

    next();
  } catch (e) {
    console.error(`[Auth Error] Token verification failed: ${e.message}`, { token: token ? token.substring(0, 20) + '...' : 'null' });
    return res.status(401).json({ success: false, message: `Unauthorized: invalid or expired token (${e.message})` });
  }
}

/**
 * Use after requireAuth. Restrict to given roles.
 * @param {string[]} allowed - e.g. ['authority', 'maintenance']
 */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const role = String(req.user.role).toLowerCase();
    if (!allowed.map((r) => r.toLowerCase()).includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Invalid role or unauthorized access. Expected: ${allowed.join(', ')}, Got: ${role}`
      });
    }
    next();
  };
}

function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { requireAuth, requireRole, signToken, JWT_SECRET };

