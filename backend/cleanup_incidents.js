const mysql = require("mysql2/promise");

async function cleanupIncidents() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "kinnera@5",
            database: "streetlight_db"
        });

        console.log("🧹 Cleaning up automated 'SYSTEM' incidents to reset the dashboard...");

        const [result] = await connection.execute(
            "DELETE FROM incident WHERE reported_by = 'SYSTEM' AND status = 'Open'"
        );

        console.log(`✅ Successfully cleared ${result.affectedRows} open automated incidents.`);
    } catch (err) {
        console.error("❌ Cleanup failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

cleanupIncidents();
