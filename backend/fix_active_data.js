const db = require("./db");

async function fixActiveStatus() {
    try {
        console.log("Setting all users to is_active = TRUE...");
        // UPDATE all users whose is_active is NULL or FALSE (if we assume everyone should be active initially)
        // Safest is to set is_active = 1 for everyone since we just added the column.
        const [result] = await db.query("UPDATE system_users SET is_active = TRUE WHERE is_active IS NULL OR is_active = 0");
        console.log(`✅ Updated ${result.affectedRows} users to Active.`);
    } catch (err) {
        console.error("❌ Fix failed:", err);
    } finally {
        process.exit();
    }
}

fixActiveStatus();
