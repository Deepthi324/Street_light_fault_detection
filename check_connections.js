const db = require('./backend/db');
const connectMongoDB = require('./backend/mongoDb');
const mongoose = require('mongoose');

async function check() {
    console.log('--- Checking MySQL ---');
    try {
        const [rows] = await db.query('SELECT 1');
        console.log('✅ MySQL connected');
    } catch (err) {
        console.error('❌ MySQL error:', err.message);
    }

    console.log('\n--- Checking MongoDB ---');
    try {
        const connected = await connectMongoDB();
        if (connected) {
            console.log('✅ MongoDB connected');
            await mongoose.disconnect();
        } else {
            console.log('❌ MongoDB connection failed');
        }
    } catch (err) {
        console.error('❌ MongoDB error:', err.message);
    }
}

check();
