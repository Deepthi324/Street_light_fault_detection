const db = require("./db");

async function run() {
    try {
        // 1. Check the citizen_complaint table structure
        console.log("=== citizen_complaint table structure ===");
        const [cols] = await db.query("SHOW COLUMNS FROM citizen_complaint");
        console.log(cols.map(c => `${c.Field} (${c.Type})`).join("\n"));

        // 2. Check the light_pole table structure
        console.log("\n=== light_pole table structure ===");
        const [poleCols] = await db.query("SHOW COLUMNS FROM light_pole");
        console.log(poleCols.map(c => `${c.Field} (${c.Type})`).join("\n"));

        // 3. Check some actual data
        console.log("\n=== Sample complaints ===");
        const [complaints] = await db.query("SELECT complaint_id, user_id, pole_id FROM citizen_complaint LIMIT 5");
        console.log(complaints);

        // 4. Check some light_pole data
        console.log("\n=== Sample light_poles ===");
        const [poles] = await db.query("SELECT id, pole_id FROM light_pole LIMIT 5");
        console.log(poles);

        // 5. Try to run the exact query that the route uses
        console.log("\n=== Running the exact GET /api/complaints query ===");
        const sql = `
      SELECT c.complaint_id as id, c.user_id, c.pole_id, c.complaint_text as description, 
             c.status as status, c.authority_response, c.complaint_time as created_at,
             u.full_name as citizen_name, u.email as contact, u.phone as phone,
             p.pole_id as pole_number
      FROM citizen_complaint c
      LEFT JOIN system_users u ON u.id = c.user_id
      LEFT JOIN light_pole p ON p.pole_id = c.pole_id
      WHERE c.user_id = ?
      ORDER BY c.complaint_time DESC
    `;
        const [rows] = await db.query(sql, [11]);
        console.log("Results for user_id=11:", rows);

        // 6. Also try for user_id=6
        const [rows6] = await db.query(sql, [6]);
        console.log("\nResults for user_id=6:", rows6.length, "complaints");

        // 7. Try the query without the user filter (authority view)
        const sqlAll = `
      SELECT c.complaint_id as id, c.user_id, c.pole_id, c.complaint_text as description, 
             c.status as status, c.authority_response, c.complaint_time as created_at,
             u.full_name as citizen_name, u.email as contact, u.phone as phone,
             p.pole_id as pole_number
      FROM citizen_complaint c
      LEFT JOIN system_users u ON u.id = c.user_id
      LEFT JOIN light_pole p ON p.pole_id = c.pole_id
      ORDER BY c.complaint_time DESC
    `;
        const [rowsAll] = await db.query(sqlAll);
        console.log("\nAll complaints count:", rowsAll.length);
        if (rowsAll.length > 0) {
            console.log("First complaint:", rowsAll[0]);
        }

    } catch (err) {
        console.error("ERROR:", err.message);
        console.error("SQL State:", err.sqlState);
        console.error("SQL Message:", err.sqlMessage);
    } finally {
        process.exit(0);
    }
}

run();
