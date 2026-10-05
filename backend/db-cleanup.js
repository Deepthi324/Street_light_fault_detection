const db = require('./db');

async function cleanup() {
    console.log('---🧹 DATABASE RUBRIC CLEANUP START ---');

    // Master list of rubrics we actually use
    const usedProcedures = [
        'sp_GetTeamPerformance',
        'sp_AssignIncidentToTeam',
        'sp_GetPoleSummary',
        'sp_GetMonthlySystemReport'
    ];
    const usedTriggers = [
        'trg_maintenance_complete_sync',
        'trg_high_priority_notification'
    ];

    try {
        // 1. Audit Procedures
        console.log('\nChecking Stored Procedures...');
        const [procedures] = await db.query("SHOW PROCEDURE STATUS WHERE Db = 'street_light_db'");
        for (let p of procedures) {
            if (!usedProcedures.includes(p.Name)) {
                console.log(`  🗑️  Dropping unused procedure: ${p.Name}`);
                await db.query(`DROP PROCEDURE IF EXISTS ${p.Name}`);
            } else {
                console.log(`  ✅ Keeping used procedure: ${p.Name}`);
            }
        }

        // 2. Audit Triggers
        console.log('\nChecking Database Triggers...');
        const [triggers] = await db.query("SHOW TRIGGERS");
        for (let t of triggers) {
            if (!usedTriggers.includes(t.Trigger)) {
                console.log(`  🗑️  Dropping unused trigger: ${t.Trigger}`);
                await db.query(`DROP TRIGGER IF EXISTS ${t.Trigger}`);
            } else {
                console.log(`  ✅ Keeping used trigger: ${t.Trigger}`);
            }
        }

        console.log('\n--- ✅ DATABASE CLEANUP COMPLETE ---');
        process.exit(0);

    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
        process.exit(1);
    }
}

cleanup();
