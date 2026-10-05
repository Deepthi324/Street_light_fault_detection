const express = require('express');
const router = express.Router();
const PowerReading = require('../models/PowerReading');
const { requireAuth } = require('../middleware/auth');

// Get the latest 10 power readings
router.get('/live', requireAuth, async (req, res) => {
    try {
        const readings = await PowerReading.find()
            .sort({ recorded_at: -1 })
            .limit(10);
        res.json(readings);
    } catch (error) {
        console.error('Error fetching live power readings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
