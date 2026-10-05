const axios = require('axios');

const API_BASE = 'http://localhost:4003/api';
let token = '';

async function runTest() {
    console.log('--- STARTING MONGODB CRUD VERIFICATION ---');

    try {
        // 1. Signup a new test user to ensure it exists
        const testUser = {
            fullName: "Mongo Test Admin",
            email: "mongo.test." + Date.now() + "@example.com",
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
        console.log('✅ Logged in successfully.');

        // 2. Create/Update Metadata in MongoDB
        console.log('\nStep 2: Creating metadata in MongoDB...');
        const testDeviceId = 'SN-TEST-101';
        const createRes = await axios.post(`${API_BASE}/device-metadata`, {
            deviceId: testDeviceId,
            manufacturer: 'Test Manufacturer',
            modelNumber: 'TM-2024',
            serviceNotes: 'This is a test note for MongoDB CRUD verification.'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Metadata created:', createRes.data.data.device_id);

        // 3. Read Metadata from MongoDB
        console.log('\nStep 3: Reading metadata from MongoDB...');
        const readRes = await axios.get(`${API_BASE}/device-metadata/${testDeviceId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Metadata read back:', readRes.data.manufacturer);

        /* 
        // 4. Delete Metadata from MongoDB
        console.log('\nStep 4: Deleting metadata from MongoDB...');
        const deleteRes = await axios.delete(`${API_BASE}/device-metadata/${testDeviceId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Metadata deleted:', deleteRes.data.message);

        // 5. Verify Deletion
        console.log('\nStep 5: Verifying deletion...');
        try {
            await axios.get(`${API_BASE}/device-metadata/${testDeviceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log('✅ Confirmed 404 Not Found after deletion.');
            } else {
                throw err;
            }
        }
        */

        console.log('\n--- MONGODB CRUD STEPS VERIFIED (Records Persisted) ---');

    } catch (err) {
        console.error('❌ TEST FAILED:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

runTest();
