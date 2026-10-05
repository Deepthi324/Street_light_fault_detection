const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testPoleCreation() {
    // Generate a test token
    const { signToken } = require('./middleware/auth');
    const token = signToken({ id: 12, email: 'test.authority@example.com', role: 'authority' });

    console.log('Testing POST /api/light-poles...\n');

    const poleData = {
        pole_id: 999,
        location: "Debug Test Location",
        latitude: 12.776,
        longitude: 77.596,
        status: "Active"
    };

    try {
        const response = await fetch('http://localhost:4003/api/light-poles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(poleData)
        });

        console.log('Response Status:', response.status, response.statusText);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('Response Data:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log('Response Text:', text.substring(0, 500));
        }

        if (response.ok) {
            console.log('\n✅ SUCCESS - Light pole created!');
        } else {
            console.log('\n❌ FAILED - Got error response');
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

testPoleCreation();
