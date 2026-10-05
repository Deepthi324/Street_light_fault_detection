const db = require("./db");

async function fix() {
    try {
        console.log("Starting DB Fix...");
        const [columns] = await db.query("DESCRIBE notification_log");
        const existing = columns.map(c => c.Field);

        if (!existing.includes("is_read")) {
            console.log("Adding is_read column...");
            await db.query("ALTER TABLE notification_log ADD COLUMN is_read BOOLEAN DEFAULT 0");
        }

        if (!existing.includes("team_id")) {
            console.log("Adding team_id column...");
            await db.query("ALTER TABLE notification_log ADD COLUMN team_id INT NULL");
            await db.query("ALTER TABLE notification_log ADD FOREIGN KEY (team_id) REFERENCES maintenance_team(id) ON DELETE CASCADE");
        }

        console.log("DB Fix Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("DB Fix Failed:", err);
        process.exit(1);
    }
}

fix();
