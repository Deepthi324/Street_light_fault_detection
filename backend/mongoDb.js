const mongoose = require('mongoose');

const connectMongoDB = async () => {
    try {
        console.log('📡 Connecting to MongoDB at mongodb://localhost:27017/street_light_db ...');
        await mongoose.connect('mongodb://localhost:27017/street_light_db');
        console.log('✅ MongoDB Connected and Ready');
        return true;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        return false;
    }
};

module.exports = connectMongoDB;
