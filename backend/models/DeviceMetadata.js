const mongoose = require('mongoose');

const deviceMetadataSchema = new mongoose.Schema({
    device_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deployment_location: {
        type: String,
        default: 'Not Specified'
    },
    manufacturer: {
        type: String,
        default: 'Not Specified'
    },
    model_number: {
        type: String,
        default: 'Unknown'
    },
    installation_date: {
        type: Date,
        default: Date.now
    },
    warranty_expiry: {
        type: Date
    },
    service_notes: {
        type: String,
        default: ''
    },
    firmware_version: {
        type: String,
        default: '1.0.0'
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('DeviceMetadata', deviceMetadataSchema);
