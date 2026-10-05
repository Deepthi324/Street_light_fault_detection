const { signToken } = require('./middleware/auth');
const axios = require('axios');

const USER_ID = 12; // Buddy3 (Authority)
const USER_EMAIL = 'buddy1234567@gmail.com';
const USER_ROLE = 'authority';
const PORT = 4003;

// Generate a fresh token
const token = signToken({
    id: USER_ID,
    email: USER_EMAIL,
    role: USER_ROLE
});

console.log('Generated Authority Token:', token);

async function testComplaintList() {
    try {
        console.log(`\nFetching complaints from http://localhost:${PORT}/api/complaints...`);
        const response = await axios.get(
            `http://localhost:${PORT}/api/complaints`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log('Response Status:', response.status);
        console.log('Total Complaints Fetched:', response.data.length);
        console.log('Complaints IDs:', response.data.map(c => c.id));

    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testComplaintList();
