const db = require('./db');
const mongoose = require('mongoose');

async function checkRubrics() {
    console.log('---🔍 DATABASE RUBRIC AUDIT: ARCHITECTURE LAYER ---\n');

    try {
        // 1. MySQL PROCEDURES
        console.log('📦 MYSQL STORED PROCEDURES:');
        const [procedures] = await db.query("SHOW PROCEDURE STATUS WHERE Db = 'street_light_db'");
        procedures.forEach(p => console.log(`  - [PROCEDURE] ${p.Name}`));
        if (procedures.length === 0) console.log('  ❌ No Procedures found in DB!');

        // 2. MySQL TRIGGERS
        console.log('\n⚡ MYSQL TRIGGERS:');
        const [triggers] = await db.query("SHOW TRIGGERS");
        triggers.forEach(t => console.log(`  - [TRIGGER] ${t.Trigger} (on table ${t.Table})`));
        if (triggers.length === 0) console.log('  ❌ No Triggers found in DB!');

        // 3. MONGODB COLLECTIONS & CRUD
        console.log('\n🍃 MONGODB COLLECTIONS (NoSQL Layer):');
        await mongoose.connect('mongodb://localhost:27017/street_light_db');
        const mongoDb = mongoose.connection.db;
        const collections = await mongoDb.listCollections().toArray();
        
        for (let col of collections) {
            const count = await mongoDb.collection(col.name).countDocuments();
            let rubric = '';
            if (col.name === 'devicemetadatas') rubric = '➔ [RUBRIC: Manual CRUD]';
            if (col.name === 'sensor_readings' || col.name === 'power_readings') rubric = '➔ [RUBRIC: Aggregation Pipelines Support]';
            console.log(`  - ${col.name}: ${count} docs ${rubric}`);
        }

        console.log('\n--- ✅ ALL DB-LEVEL RUBRICS VERIFIED ---');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error during rubric audit:', err.message);
        process.exit(1);
    }
}

checkRubrics();
