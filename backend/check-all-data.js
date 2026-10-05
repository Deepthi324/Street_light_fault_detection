const db = require('./db');

async function checkData() {
    try {
        const tables = [
            'light_pole',
            'maintenance_team',
            'system_users',
            'incident',
            'citizen_complaint',
            'team_member',
            'maintenance_activity',
            'sensor_device',
            'power_consumption'
        ];

        console.log('--- Database Table Counts ---');
        for (const table of tables) {
            try {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`${table.padEnd(25)}: ${rows[0].count}`);
            } catch (e) {
                console.log(`${table.padEnd(25)}: ❌ Error: ${e.message}`);
            }
        }

        console.log('\n--- Authority User Details ---');
        const [authUsers] = await db.query("SELECT id, full_name, email, role FROM system_users WHERE role = 'authority'");
        console.table(authUsers);

        process.exit(0);
    } catch (err) {
        console.error('❌ Data check error:', err.message);
        process.exit(1);
    }
}

checkData();
