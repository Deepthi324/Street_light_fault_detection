const mongoose = require('mongoose');
const db = require('./db');
const SensorReading = require('./models/SensorReading');

async function debug() {
    console.log('🔍 Starting MongoDB Debug Script...');

    try {
        // 1. Test MySQL
        const [rows] = await db.query("SELECT COUNT(*) as count FROM sensor_device");
        console.log(`✅ MySQL Connected. Sensor devices count: ${rows[0].count}`);

        // 2. Test MongoDB Connection
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/street_light_db');
        console.log('✅ MongoDB Connected successfully.');

        // 3. Try manual insert
        console.log('✍️ Attempting manual insert into MongoDB...');
        const testReading = new SensorReading({
            device_id: 'DEBUG_TEST',
            pole_id: '1',
            sensor_type: 'Light',
            value: 500,
            unit: 'lux',
            status: 'Normal',
            recorded_at: new Date()
        });
        await testReading.save();
        console.log('✅ Manual insert successful.');

        // 4. Check collection
        const count = await SensorReading.countDocuments();
        console.log(`📊 Total docs in sensor_readings: ${count}`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Debug failed:', err.message);
        process.exit(1);
    }
}

debug();
