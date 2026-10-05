const mongoose = require('mongoose');

const powerReadingSchema = new mongoose.Schema({
    pole_id: String,
    device_id: String,
    value: Number,         // Watts
    unit: { type: String, default: 'Watts' },
    status: String,        // Normal, Warning, Critical
    recorded_at: {
        type: Date,
        default: Date.now
    }
});

// TTL index to keep data 24h
powerReadingSchema.index({ recorded_at: 1 }, { expireAfterSeconds: 86400 });

const PowerReading = mongoose.model('PowerReading', powerReadingSchema, 'power_readings');

module.exports = PowerReading;
