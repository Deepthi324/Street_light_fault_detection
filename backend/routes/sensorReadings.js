const express = require('express');
const router = express.Router();
const SensorReading = require('../models/SensorReading');
const { requireAuth } = require('../middleware/auth');

// Get the latest 20 sensor readings from MongoDB
router.get('/live', requireAuth, async (req, res) => {
    try {
        const { type } = req.query;
        let query = {};
                // THIS IS THE FILTERING LOGIC

        if (type) {
            if (type.toLowerCase() === 'power') {
                query.sensor_type = { $in: [/power/i, /energy/i] };
            } else {
                query.sensor_type = new RegExp(type, 'i');
            }
        }
// THIS IS THE QUERYING LOGIC
        const readings = await SensorReading.find(query)
            .sort({ recorded_at: -1 })
            .limit(type ? 10 : 20); // 10 if specific type, 20 if all
        res.json(readings);
    } catch (error) {
        console.error('Error fetching live readings:', error);
        res.status(500).json({ message: 'Failed to fetch live sensor readings' });
    }
});

//sensor-readings Used by the simulator to insert new data

router.post('/', async (req, res) => {
    try {
        const newReading = new SensorReading(req.body);
        await newReading.save();
        res.status(201).json(newReading);
    } catch (error) {
        console.error('Error storing sensor reading:', error);
        res.status(500).json({ message: 'Failed to store sensor reading' });
    }
});

// MongoDB Aggregation Pipeline

router.get('/analytics', async (req, res) => {
    try {
        const stats = await SensorReading.aggregate([
            // 1: Filter for last 24 hours
            { 
                $match: { 
                    recorded_at: { $gte: new Date(Date.now() - 24*60*60*1000) } 
                } 
            },
            // 2: Group by sensor type and calculate aggregates
            {
                $group: {
                    _id: "$sensor_type",
                    avgValue: { $avg: "$value" },
                    maxValue: { $max: "$value" },
                    minValue: { $min: "$value" },
                    count: { $sum: 1 }
                }
            },
            // 3: Pretty format the output
            {
                $project: {
                    type: "$_id",
                    average: { $round: ["$avgValue", 2] },
                    maximum: "$maxValue",
                    minimum: "$minValue",
                    totalReadings: "$count",
                    _id: 0
                }
            },
            // 4: Sort by total readings descending
            { $sort: { totalReadings: -1 } }
        ]);

        res.json({
            period: "Last 24 Hours",
            data: stats,
            timestamp: new Date()
        });
    } 
    // Exception handling for pipeline
    catch (error) {
        console.error('Pipeline Error:', error);
        res.status(500).json({ message: 'Failed to run analytics pipeline', error: error.message });
    }
});

module.exports = router;
