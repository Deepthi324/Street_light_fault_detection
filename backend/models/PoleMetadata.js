const mongoose = require('mongoose');

const poleMetadataSchema = new mongoose.Schema({
    pole_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    foundation_type: {
        type: String,
        default: 'Concrete'
    },
    pole_material: {
        type: String,
        default: 'Galvanized Steel'
    },
    electrical_provider: {
        type: String,
        default: 'City Grid'
    },
    structural_audit_date: {
        type: Date,
        default: Date.now
    },
    foundation_depth_m: {
        type: Number,
        default: 1.5
    },
    extended_notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('PoleMetadata', poleMetadataSchema);
