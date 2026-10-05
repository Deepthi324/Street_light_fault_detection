const mongoose = require('mongoose');

const check = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/street_light_db');
        console.log('Connected to MongoDB');
        const db = mongoose.connection.db;
        
        const collections = await db.listCollections().toArray();
        for (let col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`Collection: ${col.name}, Count: ${count}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
