const db = require('./db');
const SensorReading = require('./models/SensorReading');
const PowerReading = require('./models/PowerReading');

const startSimulator = async () => {
    console.log('🚀 Sensor Simulator Starting...');

    // 1. Fetch existing sensor devices from MySQL
    const getDevices = async () => {
        try {
            const [rows] = await db.query(
                "SELECT d.id, d.device_id, d.light_pole_id, d.type, p.pole_id " +
                "FROM sensor_device d LEFT JOIN light_pole p ON p.id = d.light_pole_id"
            );
            if (rows.length === 0) {
                console.warn('⚠️ No sensor devices found in MySQL. Add some to see live data.');
            }
            return rows;
        } catch (err) {
            console.error('❌ Error fetching devices from MySQL for simulator:', err.message);
            return [];
        }
    };

    // 2. Function to automatically report a fault in MySQL
    const reportAutomaticFault = async (poleId, sensorType, value, unit) => {
        try {
            // Check if there's already an active (Open or In Progress) incident for this pole
            const [existing] = await db.query(
                "SELECT id FROM incident WHERE light_pole_id = (SELECT id FROM light_pole WHERE pole_id = ? OR id = ?) AND status NOT IN ('Completed', 'Resolved')",
                [poleId, poleId]
            );

            if (existing.length > 0) {
                // Already has an active incident, don't create duplicate
                return;
            }

            // COOLDOWN: Check if an incident was completed in the last 1 hour
            const [recent] = await db.query(
                "SELECT id FROM incident WHERE light_pole_id = (SELECT id FROM light_pole WHERE pole_id = ? OR id = ?) AND status = 'Completed' AND updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
                [poleId, poleId]
            );

            if (recent.length > 0) {
                // Pole was recently fixed, skip simulated failure for now
                return;
            }

            // Get the actual light_pole record ID (since poleId might be the alphanumeric label)
            const [pole] = await db.query("SELECT id FROM light_pole WHERE pole_id = ? OR id = ?", [poleId, poleId]);
            if (pole.length === 0) return;

            const actualId = pole[0].id;

            // Dynamic priority based on sensor type
            let priority = 'Low';
            const sType = sensorType.toLowerCase();
            if (sType === 'power' || sType === 'energy') priority = 'High';
            else if (sType === 'light') priority = 'Medium';

            // Create new incident
            await db.query(
                "INSERT INTO incident (light_pole_id, reported_by, type, priority, status) VALUES (?, ?, ?, ?, ?)",
                [actualId, 'SYSTEM', `${sensorType} Failure`, priority, 'Open']
            );

            console.log(`🚨 SYSTEM: Automatic Fault Detected for Pole #${poleId} (${value}${unit}). Incident logged.`);
        } catch (err) {
            console.error('❌ Error reporting automatic fault to MySQL:', err.message);
        }
    };

    const generateReading = (device) => {
        const type = device.type || 'Light';
        let value, unit, status;

        if (type.toLowerCase() === 'light') {
            // Lowered failure probability to 2% for realism
            const isFailing = Math.random() < 0.02;
            value = isFailing ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 600) + 400;
            unit = 'Lux';
            status = value < 100 ? 'Critical' : value < 300 ? 'Warning' : 'Normal';
        } else if (type.toLowerCase() === 'power' || type.toLowerCase() === 'energy') {
            // Lowered failure probability to 2% for realism
            const isSpiking = Math.random() < 0.02;
            value = isSpiking ? Math.floor(Math.random() * 200) + 450 : Math.floor(Math.random() * 150) + 100;
            unit = 'Watts';
            status = value > 450 ? 'Critical' : value > 350 ? 'Warning' : 'Normal';
        } else if (type.toLowerCase() === 'voltage') {
            value = Math.floor(Math.random() * 40) + 210;
            unit = 'volts';
            status = (value < 220 || value > 240) ? 'Warning' : 'Normal';
        } else {
            // Motion or other sensors
            const isFailing = Math.random() < 0.02;
            value = isFailing ? 0 : Math.floor(Math.random() * 50) + 10;
            unit = 'events';
            status = (isFailing || value === 0) ? 'Critical' : 'Normal';
        }

        return {
            device_id: device.device_id,
            pole_id: device.pole_id || device.light_pole_id,
            sensor_type: type,
            value,
            unit,
            status,
            recorded_at: new Date()
        };
    };

    // Run the simulator every 10 seconds for a steady flow
    setInterval(async () => {
        const devices = await getDevices();
        if (devices.length === 0) return;

        // Pick a random device to generate a reading for
        const randomDevice = devices[Math.floor(Math.random() * devices.length)];
        const reading = generateReading(randomDevice);

        try {
            const newReading = new SensorReading(reading);
            await newReading.save();
            console.log(`📡 MongoDB: Generated ${reading.sensor_type} (${reading.value}${reading.unit}) - Status: ${reading.status} for Pole #${reading.pole_id}`);

            // If it's Power/Energy, ALSO save to the dedicated collection
            if (reading.sensor_type.toLowerCase() === 'power' || reading.sensor_type.toLowerCase() === 'energy') {
                const powerData = new PowerReading({
                    pole_id: reading.pole_id,
                    device_id: reading.device_id,
                    value: reading.value,
                    unit: reading.unit,
                    status: reading.status,
                    recorded_at: reading.recorded_at
                });
                await powerData.save();
            }

            // AUTOMATIC FAULT DETECTION LOGIC
            if (reading.status === 'Critical') {
                await reportAutomaticFault(reading.pole_id, reading.sensor_type, reading.value, reading.unit);
            }
        } catch (err) {
            console.error('❌ Error saving simulated reading to MongoDB:', err.message);
        }
    }, 5000);
};

module.exports = startSimulator;
