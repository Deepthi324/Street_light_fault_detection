const express = require('express');
const router = express.Router();
const PoleMetadata = require('../models/PoleMetadata');
const { requireAuth, requireRole } = require('../middleware/auth');

// 1. GET metadata by pole_id
router.get('/:poleId', requireAuth, async (req, res) => {
    try {
        const metadata = await PoleMetadata.findOne({ pole_id: String(req.params.poleId) });
        if (!metadata) return res.status(404).json({ message: "No metadata found for this pole." });
        res.json(metadata);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. CREATE or UPDATE metadata
router.post('/', requireAuth, requireRole("authority"), async (req, res) => {
    try {
        const { poleId, foundationType, poleMaterial, electricalProvider, foundationDepth, structuralAuditDate, notes } = req.body;
        
        const update = {
            foundation_type: foundationType,
            pole_material: poleMaterial,
            electrical_provider: electricalProvider,
            foundation_depth_m: foundationDepth,
            structural_audit_date: structuralAuditDate,
            extended_notes: notes
        };

        const metadata = await PoleMetadata.findOneAndUpdate(
            { pole_id: String(poleId) },
            { $set: update },
            { new: true, upsert: true }
        );

        res.json(metadata);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. DELETE metadata
router.delete('/:poleId', requireAuth, requireRole("authority"), async (req, res) => {
    try {
        await PoleMetadata.deleteOne({ pole_id: String(req.params.poleId) });
        res.json({ message: 'Metadata deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
