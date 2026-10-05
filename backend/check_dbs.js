const mysql = require("mysql2/promise");

async function checkDbs() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "kinnera@5"
        });
        const [rows] = await connection.execute("SHOW DATABASES");
        console.log("Databases found:", rows.map(r => r.Database).join(", "));
    } catch (err) {
        console.error("Error listing databases:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkDbs();
