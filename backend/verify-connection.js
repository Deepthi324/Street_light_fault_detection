
const BASE_URL = 'http://localhost:4003/api';

async function testBackend() {
    const authorityEmail = `auth_${Date.now()}@city.gov`;
    const authorityPass = 'password123';

    console.log('1. Creating a new Authority user...');
    let token;

    try {
        const signupAuthRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Authority',
                email: authorityEmail,
                password: authorityPass,
                confirmPassword: authorityPass,
                role: 'authority'
            })
        });

        if (!signupAuthRes.ok) {
            console.log('   Signup failed, trying login...');
            const loginRes = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authorityEmail, password: authorityPass })
            });

            if (!loginRes.ok) {
                console.error('❌ CRITICAL: Could not create or login as Authority.', await loginRes.text());
                return;
            }
            const loginData = await loginRes.json();
            token = loginData.token;
        } else {
            const signupData = await signupAuthRes.json();
            token = signupData.token;
            console.log('✅ Authority created per test run.');
        }

        console.log('✅ Authority Token obtained.');

        console.log('\n2. Fetching System Users (Verification Step)...');
        const usersRes = await fetch(`${BASE_URL}/system-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!usersRes.ok) {
            console.error('❌ Fetch users failed:', await usersRes.text());
            return;
        }

        const users = await usersRes.json();
        console.log(`✅ Fetched ${users.length} users successfully.`);

        console.log('\n3. Creating a new Citizen user...');
        const citizenEmail = `citizen_${Date.now()}@example.com`;
        const signupCitizenRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Citizen',
                email: citizenEmail,
                password: 'password123',
                confirmPassword: 'password123',
                role: 'citizen'
            })
        });

        if (!signupCitizenRes.ok) {
            console.error('❌ Citizen Signup failed:', await signupCitizenRes.text());
            return;
        }
        console.log('✅ Citizen created successfully.');

        console.log('\n4. Verifying new citizen appears in Authority list...');
        const verifyRes = await fetch(`${BASE_URL}/system-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const updatedUsers = await verifyRes.json();
        const found = updatedUsers.find(u => u.email === citizenEmail);

        if (found) {
            console.log(`✅ SUCCESS: New citizen (${found.email}) found in Authority list.`);
            console.log(`backend checks passed! connection is good.`);
        } else {
            console.log('Current list:', updatedUsers.map(u => u.email));
            console.error('❌ FAILURE: New citizen NOT found in list.');
        }
    } catch (err) {
        console.error('Exec error:', err);
    }
}

testBackend();
