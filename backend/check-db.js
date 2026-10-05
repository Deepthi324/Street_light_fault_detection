const db = require('./db');

async function check() {
    try {
        console.log("Checking maintenance_team columns:");
        const [rows] = await db.query("SHOW COLUMNS FROM maintenance_team");
        console.log(rows);

        console.log("Checking system_users columns:");
        const [rows2] = await db.query("SHOW COLUMNS FROM system_users");
        console.log(rows2);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
