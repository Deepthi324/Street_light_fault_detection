const db = require('./db');

async function check() {
    try {
        const [complaintColumns] = await db.query("DESCRIBE citizen_complaint");
        console.log("--- citizen_complaint ---");
        complaintColumns.forEach(c => console.log(c.Field));

        const [poleColumns] = await db.query("DESCRIBE light_pole");
        console.log("\n--- light_pole ---");
        poleColumns.forEach(c => console.log(c.Field));

        const [userColumns] = await db.query("DESCRIBE system_users");
        console.log("\n--- system_users ---");
        userColumns.forEach(c => console.log(c.Field));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
