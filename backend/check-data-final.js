const db = require('./db');

async function checkData() {
    try {
        console.log('--- System Users ---');
        const [users] = await db.query('SELECT role, COUNT(*) as count FROM system_users GROUP BY role');
        console.table(users);

        console.log('\n--- Complaints ---');
        const [complaints] = await db.query('SELECT status, COUNT(*) as count FROM citizen_complaints GROUP BY status');
        console.table(complaints);

        console.log('\n--- Incidents ---');
        const [incidents] = await db.query('SELECT severity, COUNT(*) as count FROM incident_log GROUP BY severity');
        console.table(incidents);

        process.exit(0);
    } catch (err) {
        console.error('❌ Data check error:', err.message);
        process.exit(1);
    }
}

checkData();
