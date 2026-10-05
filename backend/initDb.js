
//Database initialization for Smart Street Light Fault Detection System.


const db = require("./db");

async function runInit() {
  try {
    await db.query("SELECT 1");
  } catch (e) {
    console.error("DB not ready:", e.message);
    return;
  }

  const run = async (sql) => {
    try {
      await db.query(sql);
    } catch (e) {
      if (e.code !== "ER_TABLE_EXISTS_ERROR" && !e.message?.includes("already exists")) {
        console.warn("Init SQL warning:", e.message);
      }
    }
  };

  await run(`
    CREATE TABLE IF NOT EXISTS light_pole (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pole_id VARCHAR(32) UNIQUE NOT NULL,
      location VARCHAR(255),
      latitude DECIMAL(10,6),
      longitude DECIMAL(10,6),
      status VARCHAR(64) DEFAULT 'Active',
      installation_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS maintenance_team (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      area VARCHAR(128),
      contact VARCHAR(128),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS system_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NULL,
      role ENUM('citizen', 'maintenance', 'authority') NOT NULL,
      maintenance_team_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (maintenance_team_id) REFERENCES maintenance_team(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS incident (
      id INT AUTO_INCREMENT PRIMARY KEY,
      light_pole_id INT NOT NULL,
      reported_by VARCHAR(255),
      type VARCHAR(64),
      priority VARCHAR(32) DEFAULT 'Medium',
      status VARCHAR(32) DEFAULT 'Open',
      team_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (light_pole_id) REFERENCES light_pole(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS citizen_complaint (
      complaint_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      pole_id INT NULL,
      complaint_text TEXT NOT NULL,
      status VARCHAR(32) DEFAULT 'OPEN',
      authority_response TEXT,
      response_time DATETIME NULL,
      authority_id INT NULL,
      complaint_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE,
      FOREIGN KEY (pole_id) REFERENCES light_pole(id) ON DELETE SET NULL,
      FOREIGN KEY (authority_id) REFERENCES system_users(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS team_member (
      member_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      team_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES maintenance_team(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS maintenance_activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      incident_id INT NOT NULL,
      pole_id INT NULL,
      team_id INT NULL,
      status VARCHAR(64) DEFAULT 'Pending',
      notes TEXT,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incident(id) ON DELETE CASCADE,
      FOREIGN KEY (pole_id) REFERENCES light_pole(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES maintenance_team(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS maintenance_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      activity_id INT NOT NULL,
      status VARCHAR(64),
      notes TEXT,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES maintenance_activity(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES system_users(id) ON DELETE set NULL
    )
  `);

  // Migration for existing installations
  await run("ALTER TABLE maintenance_activity ADD COLUMN pole_id INT NULL;");
  await run("ALTER TABLE maintenance_activity ADD FOREIGN KEY (pole_id) REFERENCES light_pole(id) ON DELETE SET NULL;");

  await run(`
    CREATE TABLE IF NOT EXISTS sensor_device (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(32) UNIQUE NOT NULL,
      light_pole_id INT NOT NULL,
      type VARCHAR(64),
      status VARCHAR(32) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (light_pole_id) REFERENCES light_pole(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS power_consumption (
      id INT AUTO_INCREMENT PRIMARY KEY,
      light_pole_id INT NOT NULL,
      record_date DATE NOT NULL,
      kwh DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (light_pole_id) REFERENCES light_pole(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(64),
      recipient VARCHAR(255),
      team_id INT NULL,
      message TEXT,
      is_read BOOLEAN DEFAULT 0,
      sent_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES maintenance_team(id) ON DELETE CASCADE
    )
  `);

  // Ensure columns exist for existing installations
  await run("ALTER TABLE notification_log ADD COLUMN is_read BOOLEAN DEFAULT 0;");
  await run("ALTER TABLE notification_log ADD COLUMN team_id INT NULL;");
  await run("ALTER TABLE notification_log ADD FOREIGN KEY (team_id) REFERENCES maintenance_team(id) ON DELETE CASCADE;");

  // System users migration
  await run("ALTER TABLE system_users ADD COLUMN phone VARCHAR(20) NULL;");

  // Light pole migration
  await run("ALTER TABLE light_pole ADD COLUMN installation_date DATE;");

  // Incident migration
  await run("ALTER TABLE incident ADD COLUMN team_id INT;");
  await run("ALTER TABLE incident ADD CONSTRAINT fk_incident_team_id FOREIGN KEY (team_id) REFERENCES maintenance_team(id) ON DELETE SET NULL;");

  

  // 1. TRIGGER that Sync Incident Status on Maintenance Completion
  await run("DROP TRIGGER IF EXISTS trg_maintenance_complete_sync");
  await run(`
    CREATE TRIGGER trg_maintenance_complete_sync
    AFTER UPDATE ON maintenance_activity
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
        UPDATE incident SET status = 'Completed', updated_at = NOW()
        WHERE id = NEW.incident_id;
      END IF;
    END
  `);

  // 2. TRIGGER for High Priority Incident Notification which automatically alerts authorities when a critical fault is logged.
  await run("DROP TRIGGER IF EXISTS trg_high_priority_notification");
  await run(`
    CREATE TRIGGER trg_high_priority_notification
    AFTER INSERT ON incident
    FOR EACH ROW
    BEGIN
      IF NEW.priority = 'High' THEN
        INSERT INTO notification_log (type, recipient, message, created_at)
        VALUES ('Critical', 'authority', CONCAT('CRITICAL FAULT: high priority incident #', NEW.id, ' reported at pole #', NEW.light_pole_id), NOW());
      END IF;
    END
  `);

  //Procedures:
  //1. Procedure for to Get Team Performance Report
  await run("DROP PROCEDURE IF EXISTS sp_GetTeamPerformance");
  await run(`
    CREATE PROCEDURE sp_GetTeamPerformance()
    BEGIN
      SELECT 
        t.id, 
        t.name, 
        (SELECT COUNT(*) FROM maintenance_activity WHERE team_id = t.id) as total_tasks,
        (SELECT COUNT(*) FROM maintenance_activity WHERE team_id = t.id AND status = 'Completed') as completed_tasks,
        (SELECT COUNT(*) FROM maintenance_activity WHERE team_id = t.id AND status IN ('Pending', 'In Progress', 'In_Progress')) as active_tasks
      FROM maintenance_team t
      ORDER BY completed_tasks DESC;
    END
  `);

  // 2.  Procedure for Assign Incident to Team 
  await run("DROP PROCEDURE IF EXISTS sp_AssignIncidentToTeam");
  await run(`
    CREATE PROCEDURE sp_AssignIncidentToTeam(
      IN p_incident_id INT,
      IN p_team_id INT,
      IN p_user_id INT,
      IN p_notes TEXT
    )
    BEGIN
      DECLARE EXIT HANDLER FOR SQLEXCEPTION 
      BEGIN
        ROLLBACK;
        RESIGNAL;
      END;

      START TRANSACTION;
        UPDATE incident SET team_id = p_team_id, status = 'In Progress', updated_at = NOW() WHERE id = p_incident_id;
        INSERT INTO maintenance_activity (incident_id, team_id, status, notes, started_at) 
        VALUES (p_incident_id, p_team_id, 'In Progress', p_notes, NOW());
        INSERT INTO maintenance_history (activity_id, status, notes, updated_by)
        VALUES (LAST_INSERT_ID(), 'In Progress', p_notes, p_user_id);
        INSERT INTO notification_log (type, recipient, message, created_at)
        VALUES ('Info', 'maintenance', CONCAT('Urgent: Assigned to Incident #', p_incident_id), NOW());
      COMMIT;
    END
  `);

  // 3.Procedure to Get Pole Summary
  await run("DROP PROCEDURE IF EXISTS sp_GetPoleSummary");
  await run(`
    CREATE PROCEDURE sp_GetPoleSummary(IN p_pole_id INT)
    BEGIN
      SELECT 
        p.pole_id as label,
        p.status as current_status,
        (SELECT COUNT(*) FROM incident WHERE light_pole_id = p.id) as total_incidents,
        (SELECT COUNT(*) FROM citizen_complaint WHERE pole_id = p.id) as total_complaints,
        (SELECT IFNULL(SUM(kwh), 0) FROM power_consumption WHERE light_pole_id = p.id) as total_kwh,
        (SELECT type FROM sensor_device WHERE light_pole_id = p.id LIMIT 1) as sensor_type
      FROM light_pole p
      WHERE p.id = p_pole_id;
    END
  `);

  // 4.  Procedure forMonthly System Performance Report
  await run("DROP PROCEDURE IF EXISTS sp_GetMonthlySystemReport");
  await run(`
    CREATE PROCEDURE sp_GetMonthlySystemReport()
    BEGIN
      SELECT 
        DATE_FORMAT(NOW(), '%M %Y') as report_month,
        (SELECT COUNT(*) FROM light_pole) as total_infrastructure,
        (SELECT COUNT(*) FROM incident WHERE MONTH(created_at) = MONTH(NOW())) as faults_this_month,
        (SELECT COUNT(*) FROM citizen_complaint WHERE status = 'RESOLVED' AND MONTH(complaint_time) = MONTH(NOW())) as resolved_complaints,
        (SELECT IFNULL(SUM(kwh), 0) FROM power_consumption WHERE MONTH(record_date) = MONTH(NOW())) as total_energy_kwh;
    END
  `);

  console.log("InitDb: Advanced DBMS features (Triggers/Procedures) ready.");
}

module.exports = { runInit };
