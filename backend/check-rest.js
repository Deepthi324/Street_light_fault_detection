const db = require('./db');

async function check() {
    try {
        console.log("Checking light_pole columns:");
        const [rows] = await db.query("SHOW COLUMNS FROM light_pole");
        rows.forEach(r => console.log(r.Field));

        console.log("Checking incident columns:");
        const [rows2] = await db.query("SHOW COLUMNS FROM incident");
        rows2.forEach(r => console.log(r.Field));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
