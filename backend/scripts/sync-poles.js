const db = require('../db');
const mongoose = require('mongoose');
const PoleMetadata = require('../models/PoleMetadata');
const connectMongoDB = require('../mongoDb');

async function sync() {
    console.log('--- 🚦 POLE METADATA SYNC: MySQL -> MongoDB ---');
    try {
        // 1. Connect to MongoDB
        await connectMongoDB();

        // 2. Fetch all poles from MySQL
        const [poles] = await db.query("SELECT pole_id FROM light_pole");
        console.log(`Found ${poles.length} poles in MySQL.`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const pole of poles) {
            const exists = await PoleMetadata.findOne({ pole_id: String(pole.pole_id) });
            
            if (!exists) {
                await PoleMetadata.create({
                    pole_id: String(pole.pole_id),
                    foundation_type: 'Concrete (Standard)',
                    pole_material: 'Galvanized Steel',
                    electrical_provider: 'Municipal Grid',
                    extended_notes: 'Automatically indexed from MySQL ledger.'
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`--- SYNC COMPLETE ---`);
        console.log(`Created: ${createdCount} new metadata shells.`);
        console.log(`Skipped: ${skippedCount} (already exists).`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Sync Failed:', err);
        process.exit(1);
    }
}

sync();
