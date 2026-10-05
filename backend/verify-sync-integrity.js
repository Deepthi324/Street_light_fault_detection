const axios = require('axios');
const mongoose = require('mongoose');
const DeviceMetadata = require('./models/DeviceMetadata');

const API_BASE = 'http://localhost:4003/api';

async function verify() {
    console.log('--- 🛡️ VERIFYING CROSS-DB SYNCHRONIZATION (via API) ---');
    const testDeviceId = 'SYNC-API-TEST-' + Date.now();
    let token = '';

    try {
        await mongoose.connect('mongodb://localhost:27017/street_light_db');
        console.log('✅ Connected to MongoDB');

        // 1. Auth Signup & Login
        const testUser = {
            fullName: "Sync Test Admin",
            email: "sync.test." + Date.now() + "@example.com",
            password: "password123",
            confirmPassword: "password123",
            phone: "9998887776",
            role: "authority"
        };
        
        console.log('Step 1a: Creating test authority user...');
        await axios.post(`${API_BASE}/auth/signup`, testUser);
        
        console.log('Step 1b: Logging in...');
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        token = loginRes.data.token;
        console.log('✅ Logged in.');

        // 2. Create in API
        console.log(`Step 2: Creating device ${testDeviceId} via API...`);
        const createRes = await axios.post(`${API_BASE}/sensor-devices`, {
            device_id: testDeviceId,
            light_pole_id: 1,
            type: 'Motion',
            status: 'Active'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const mysqlId = createRes.data.id;
        console.log('✅ MySQL record created via API.');

        // 3. Check MongoDB immediately
        console.log('Step 3: Checking for automatic MongoDB metadata shell...');
        const metadata = await DeviceMetadata.findOne({ device_id: testDeviceId });
        
        if (metadata) {
            console.log('✅ SUCCESS: MongoDB metadata shell found!');
            console.log('   Service Notes:', metadata.service_notes);
        } else {
            throw new Error('❌ FAILURE: MongoDB metadata shell NOT found.');
        }

        // 4. Cleanup
        console.log('\nStep 4: Cleaning up test data via API...');
        await axios.delete(`${API_BASE}/sensor-devices/${mysqlId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const deletedMeta = await DeviceMetadata.findOne({ device_id: testDeviceId });
        if (!deletedMeta) {
            console.log('✅ SUCCESS: MongoDB metadata also cleaned up automatically.');
        } else {
            console.log('⚠️ WARNING: MongoDB metadata remained after MySQL delete.');
        }

        console.log('\n--- VERIFICATION PASSED ---');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ VERIFICATION FAILED:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

verify();
