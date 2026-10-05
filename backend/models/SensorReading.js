const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
    device_id: String,
    pole_id: String,
    sensor_type: String,   // "Light", "Power", "Voltage"
    value: Number,
    unit: String,          // "lux", "watts", "volts"
    status: {
        type: String,
        enum: ["Normal", "Warning", "Critical"],
        default: "Normal"
    },
    recorded_at: {
        type: Date,
        default: Date.now
    }
});

// TTL index to automatically remove readings older than 24 hours
sensorReadingSchema.index({ recorded_at: 1 }, { expireAfterSeconds: 86400 });

const SensorReading = mongoose.model('SensorReading', sensorReadingSchema, 'sensor_readings');

module.exports = SensorReading;
