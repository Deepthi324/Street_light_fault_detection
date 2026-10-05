const db = require('./db');

async function check() {
    try {
        const [rows] = await db.query("SHOW TABLES");
        console.log("Tables:");
        rows.forEach(r => console.log(Object.values(r)[0]));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
