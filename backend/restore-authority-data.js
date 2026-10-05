const fs = require('fs');
const db = require('./db');
const bcrypt = require('bcrypt');

async function restore() {
    try {
        console.log('--- RESTORING AUTHORITY DATA ---');

        // 1. Load JSON files
        const usersJson = JSON.parse(fs.readFileSync('users_db.json', 'utf8'));
        const complaintsJson = JSON.parse(fs.readFileSync('debug_complaints.json', 'utf8'));

        const saltRounds = 10;
        const defaultPassword = await bcrypt.hash('password123', saltRounds);

        // 2. Sync Users
        console.log('Syncing Users...');
        for (const u of usersJson) {
            const [existing] = await db.query('SELECT id FROM system_users WHERE email = ?', [u.email]);
            if (existing.length === 0) {
                console.log(`  Adding missing user: ${u.email} (${u.role})`);
                await db.query(
                    'INSERT INTO system_users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    [u.full_name, u.email, defaultPassword, u.role]
                );
            }
        }

        // 3. Sync Complaints
        console.log('\nSyncing Complaints...');
        // We'll map them by text and user email if possible, or just the text
        for (const c of complaintsJson) {
            const [existing] = await db.query('SELECT complaint_id FROM citizen_complaint WHERE complaint_text = ?', [c.complaint_text]);
            if (existing.length === 0) {
                // Find a valid user_id (if the one in JSON is not in DB)
                const [userRows] = await db.query('SELECT id FROM system_users LIMIT 1');
                const defaultUserId = userRows[0].id;

                // Find a valid pole_id (if the one in JSON is not in DB)
                const [poleRows] = await db.query('SELECT id FROM light_pole LIMIT 1');
                const defaultPoleId = poleRows[0].id;

                console.log(`  Adding missing complaint: ${c.complaint_text.slice(0, 30)}...`);
                await db.query(
                    'INSERT INTO citizen_complaint (user_id, pole_id, complaint_text, status, complaint_time, authority_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [c.user_id || defaultUserId, c.pole_id || defaultPoleId, c.complaint_text, c.status || 'OPEN', c.complaint_time || new Date(), c.authority_id || null]
                );
            }
        }

        console.log('\n✅ Restoration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Restoration Failed:', err.message);
        process.exit(1);
    }
}

restore();
