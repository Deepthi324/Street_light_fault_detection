const mysql = require("mysql2/promise");

async function fixPriorities() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "kinnera@5",
            database: "streetlight_db"
        });

        console.log("🛠️  Retroactively fixing incident priorities for realism...");

        // 1. High Priority (Energy/Power)
        const [res1] = await connection.execute(
            "UPDATE incident SET priority = 'High' WHERE type LIKE '%Energy%' OR type LIKE '%Power%'"
        );
        console.log(`- Updated ${res1.affectedRows} High priority incidents.`);

        // 2. Medium Priority (Light/Bulb)
        const [res2] = await connection.execute(
            "UPDATE incident SET priority = 'Medium' WHERE type LIKE '%Light%' OR type LIKE '%Bulb%'"
        );
        console.log(`- Updated ${res2.affectedRows} Medium priority incidents.`);

        // 3. Low Priority (Motion/Damaged/Wiring/Others)
        const [res3] = await connection.execute(
            "UPDATE incident SET priority = 'Low' WHERE priority = 'High' AND (type LIKE '%Motion%' OR type LIKE '%damaged%' OR type LIKE '%wiring%' OR type LIKE '%fusion%')"
        );
        console.log(`- Updated ${res3.affectedRows} Low priority incidents.`);

        // 4. Default any remaining 'High' that don't match critical criteria to 'Medium' or 'Low'
        // For this specific project, if it's not Energy, it's probably Medium.
        const [res4] = await connection.execute(
            "UPDATE incident SET priority = 'Low' WHERE reported_by = 'SYSTEM' AND type LIKE '%Motion%'"
        );

        console.log("✅ Retroactive priority fix complete!");

    } catch (err) {
        console.error("❌ Fix failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixPriorities();
