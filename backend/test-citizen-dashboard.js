const axios = require('axios');

async function testCitizenAPI() {
    const BASE_URL = 'http://localhost:4003/api';

    try {
        console.log("1. Logging in as citizen@gmail.com...");
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'citizen@gmail.com',
            password: 'citizen123'
        });

        const token = loginRes.data.token;
        const user = loginRes.data.data;
        console.log("Logged in user:", user);

        console.log("\n2. Fetching complaints...");
        const complaintsRes = await axios.get(`${BASE_URL}/complaints`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Complaints received:", complaintsRes.data.length);
        if (complaintsRes.data.length > 0) {
            console.log("First complaint:", complaintsRes.data[0]);
        }
    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
    }
}

testCitizenAPI();
