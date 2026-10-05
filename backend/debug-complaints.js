const db = require('./db');

async function debug() {
    try {
        console.log('Connecting to database...');
        const [rows] = await db.query("SELECT * FROM citizen_complaint");
        console.log("====================\n");
        console.log(`Total Complaints in DB: ${rows.length}`);
        require('fs').writeFileSync('debug_complaints.json', JSON.stringify(rows, null, 2));
        console.log("Written to debug_complaints.json");
        console.log("\n====================\n");
        process.exit(0);
    } catch (e) {
        console.error("Debug Error:", e);
        process.exit(1);
    }
}

debug();
