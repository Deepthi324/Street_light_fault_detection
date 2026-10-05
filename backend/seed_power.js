const mysql = require("mysql2/promise");

async function seedPowerData() {
    let connection;
    try {
        // MySQL uses streetlight_db (no underscore)
        connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "kinnera@5",
            database: "streetlight_db"
        });

        console.log("🌱 Seeding historical power data into MySQL (streetlight_db)...");

        // Clear existing data to avoid duplicates
        await connection.execute("DELETE FROM power_consumption");

        // Get pole IDs
        const [poles] = await connection.execute("SELECT id FROM light_pole LIMIT 10");
        if (poles.length === 0) {
            console.log("No poles found in streetlight_db, skipping seed.");
            return;
        }

        const today = new Date();
        for (const pole of poles) {
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateString = date.toISOString().split('T')[0];
                const kwh = (Math.random() * 5 + 3).toFixed(2);

                await connection.execute(
                    "INSERT INTO power_consumption (light_pole_id, record_date, kwh) VALUES (?, ?, ?)",
                    [pole.id, dateString, kwh]
                );
            }
        }

        console.log("✅ Successfully seeded historical power data.");
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

seedPowerData();
