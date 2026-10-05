const db = require("./db");

async function runMigration() {
    try {
        console.log("Checking if 'is_active' column exists in 'system_users'...");
        const [columns] = await db.query("SHOW COLUMNS FROM system_users LIKE 'is_active'");

        if (columns.length === 0) {
            console.log("Adding 'is_active' column...");
            await db.query("ALTER TABLE system_users ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
            console.log("✅ 'is_active' column added successfully.");
        } else {
            console.log("ℹ️ 'is_active' column already exists.");
        }
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        process.exit();
    }
}

runMigration();
