const db = require('./db');
const { runInit } = require('./initDb');

async function reinit() {
    try {
        console.log("Forcing Re-initialization of Authority tables...");

        await db.query("SET FOREIGN_KEY_CHECKS = 0");

        const tables = [
            'citizen_complaint',
            'maintenance_activity',
            'incident',
            'sensor_device',
            'power_consumption',
            'notification_log',
            'system_users',
            'maintenance_team',
            'light_pole'
        ];

        for (const t of tables) {
            console.log(`Dropping ${t}...`);
            await db.query(`DROP TABLE IF EXISTS ${t}`);
        }

        await db.query("SET FOREIGN_KEY_CHECKS = 1");

        console.log("Running initDb...");
        await runInit();

        console.log("Reinit Complete.");
        process.exit(0);
    } catch (e) {
        console.error("Reinit Failed:", e);
        process.exit(1);
    }
}

reinit();
