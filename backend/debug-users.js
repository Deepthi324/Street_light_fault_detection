const db = require('./db');

async function debug() {
    try {
        const [rows] = await db.query("SELECT id, email, created_at FROM system_users");
        console.log("Total Users:", rows.length);
        rows.forEach(r => console.log(r));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
