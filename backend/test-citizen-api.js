const { signToken } = require('./middleware/auth');
const db = require('./db');

async function testAPI() {
    try {
        // Find a citizen in the database
        const [citizens] = await db.query("SELECT * FROM system_users WHERE role = 'citizen' LIMIT 1");
        if (citizens.length === 0) {
            console.log("No citizens found in DB.");
            process.exit(1);
        }

        const citizen = citizens[0];
        console.log("Found citizen:", citizen.email);

        // Sign token
        const token = signToken({
            id: citizen.id,
            email: citizen.email,
            role: citizen.role
        });

        console.log("Generated token for citizen ID:", citizen.id);

        // Call the API using fetch (Node 18+)
        console.log("Calling API http://localhost:4003/api/complaints...");
        let response = await fetch('http://localhost:4003/api/complaints', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        let data = await response.json();

        if (data.length === 0) {
            console.log("No complaints found for citizen, inserting one...");
            // Find a valid pole_id first
            const [poles] = await db.query("SELECT id FROM light_pole LIMIT 1");
            if (poles.length > 0) {
                await db.query(`INSERT INTO citizen_complaint (user_id, pole_id, complaint_text, status, complaint_time) VALUES (?, ?, 'Test PENDING complaint', 'PENDING', NOW())`, [citizen.id, poles[0].id]);

                // Re-fetch
                response = await fetch('http://localhost:4003/api/complaints', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                data = await response.json();
            } else {
                console.log("No light poles found to attach complaint to.");
            }
        }

        console.log("API Response:", JSON.stringify(data, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

testAPI();
