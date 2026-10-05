const db = require('./db');

async function check() {
    try {
        console.log("Checking maintenance_team columns:");
        const [rows] = await db.query("SHOW COLUMNS FROM maintenance_team");
        rows.forEach(r => console.log(r.Field));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
