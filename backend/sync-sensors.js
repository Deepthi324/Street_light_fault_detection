const db = require('./db');

async function syncSensors() {
    console.log('🔄 Starting Sensor Synchronization...');

    try {
        // 1. Find all poles that don't have a sensor yet
        const [missingPoles] = await db.query(`
      SELECT p.id, p.pole_id 
      FROM light_pole p 
      LEFT JOIN sensor_device s ON s.light_pole_id = p.id 
      WHERE s.id IS NULL
    `);

        if (missingPoles.length === 0) {
            console.log('✅ All light poles already have sensors. No sync needed.');
            process.exit(0);
        }

        console.log(`📡 Found ${missingPoles.length} poles missing sensors. Adding them now...`);

        for (const pole of missingPoles) {
            await db.query(
                "INSERT INTO sensor_device (device_id, light_pole_id, type, status) VALUES (?, ?, ?, ?)",
                [`SN-${pole.id}`, pole.id, 'Motion', 'Active']
            );
            console.log(`✅ Added sensor for Pole ID: ${pole.pole_id} (internally id: ${pole.id})`);
        }

        console.log('🎉 Synchronization Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Sync failed:', err.message);
        process.exit(1);
    }
}

syncSensors();
