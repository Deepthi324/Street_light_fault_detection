const db = require('./db');

async function debug() {
    try {
        console.log('Connecting to database...');
        const [rows] = await db.query("SELECT id, full_name, email, role, maintenance_team_id FROM system_users");
        console.log("====================\n");
        console.log(JSON.stringify(rows, null, 2));
        require('fs').writeFileSync('debug_output.json', JSON.stringify(rows, null, 2));
        console.log("Written to debug_output.json");
        console.log("\n====================\n");
        process.exit(0);
    } catch (e) {
        console.error("Debug Error:", e);
        process.exit(1);
    }
}

debug();
