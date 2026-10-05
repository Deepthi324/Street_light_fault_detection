const express = require('express');
const router = express.Router();
const DeviceMetadata = require('../models/DeviceMetadata');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET all metadata (Optional, for admin view)
router.get('/', requireAuth, requireRole('authority'), async (req, res) => {
    try {
        const metadata = await DeviceMetadata.find();
        res.json(metadata);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching metadata', error: err.message });
    }
});

// GET metadata for a specific device.id (from MySQL)
// Note: We use deviceId (the string key, not the auto-inc ID)
router.get('/:deviceId', requireAuth, async (req, res) => {
    try {
        const metadata = await DeviceMetadata.findOne({ device_id: String(req.params.deviceId) });
        if (!metadata) {
            return res.status(404).json({ message: 'No extended metadata found for this device' });
        }
        res.json(metadata);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching device metadata', error: err.message });
    }
});

// POST - Create or Update (Upsert)
router.post('/', requireAuth, requireRole('authority'), async (req, res) => {
    const { deviceId, manufacturer, modelNumber, installationDate, warrantyExpiry, serviceNotes, firmwareVersion, deploymentLocation } = req.body;

    if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });

    try {
        // We use device_id as the unique key
        const filter = { device_id: String(deviceId) };
        const update = {
            manufacturer,
            model_number: modelNumber,
            installation_date: installationDate,
            warranty_expiry: warrantyExpiry,
            service_notes: serviceNotes,
            firmware_version: firmwareVersion,
            deployment_location: deploymentLocation,
            updated_at: new Date()
        };

        const options = { new: true, upsert: true, setDefaultsOnInsert: true };
        const metadata = await DeviceMetadata.findOneAndUpdate(filter, update, options);

        res.status(201).json({
            success: true,
            message: 'Device metadata saved successfully',
            data: metadata
        });
    } catch (err) {
        console.error('MongoDB CRUD Error:', err);
        res.status(500).json({ message: 'Error saving metadata', error: err.message });
    }
});

// DELETE
router.delete('/:deviceId', requireAuth, requireRole('authority'), async (req, res) => {
    try {
        const result = await DeviceMetadata.deleteOne({ device_id: String(req.params.deviceId) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Metadata not found' });
        }
        res.json({ message: 'Device metadata deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting metadata', error: err.message });
    }
});

module.exports = router;
