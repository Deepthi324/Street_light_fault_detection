const db = require('../db');
const mongoose = require('mongoose');
const DeviceMetadata = require('../models/DeviceMetadata');

async function sync() {
    console.log('--- DB SYNC: MySQL -> MongoDB Metadata ---');
    try {
        await mongoose.connect('mongodb://localhost:27017/street_light_db');
        console.log('✅ MongoDB Connected');

        // 1. Fetch all devices from MySQL
        const [devices] = await db.query("SELECT device_id FROM sensor_device");
        console.log(`Found ${devices.length} devices in MySQL.`);

        for (let device of devices) {
            const devId = String(device.device_id);
            
            // Check if exists in MongoDB
            const existing = await DeviceMetadata.findOne({ device_id: devId });
            
            if (!existing) {
                console.log(`  ➕ Creating missing metadata shell for device: ${devId}`);
                await DeviceMetadata.create({
                    device_id: devId,
                    service_notes: 'Automatically generated shell for existing MySQL record.'
                });
            } else {
                console.log(`  ✅ Metadata already exists for device: ${devId}`);
            }
        }

        console.log('\n--- SYNC COMPLETE ---');
        process.exit(0);

    } catch (err) {
        console.error('❌ Sync failed:', err.message);
        process.exit(1);
    }
}

sync();
