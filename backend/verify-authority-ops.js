const db = require('./db');

// Use 4003 as 4002 is busy
const BASE_URL = 'http://localhost:4003/api';
let authToken = '';
let createdUserId = null;
let createdIncidentId = null;
let maintenanceTeamId = null;

// Mock data
const mockUser = {
    fullName: "Test Authority",
    email: "test.auth" + Date.now() + "@example.com",
    password: "password123",
    confirmPassword: "password123",
    phone: "1234567890",
    role: "authority"
};

const mockIncident = {
    light_pole_id: 1,
    reported_by: "system_test",
    type: "Test Issue",
    priority: "High",
    status: "Open"
};

async function api(method, url, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
}

async function runVerification() {
    try {
        console.log("Starting Verification on Port 4003...");

        // 0. Ensure a maintenance team exists for assignment test
        console.log("0. Checking Maintenance Teams...");
        const [teams] = await db.query("SELECT id FROM maintenance_team LIMIT 1");
        if (teams.length > 0) {
            maintenanceTeamId = teams[0].id;
        } else {
            const [res] = await db.query("INSERT INTO maintenance_team (name, area, contact) VALUES ('Alpha Team', 'North', '1234567890')");
            maintenanceTeamId = res.insertId;
        }
        console.log("   - Maintenance Team ID:", maintenanceTeamId);

        // 1. Signup/Login
        console.log("1. Creating Test Authority User...");

        try {
            const signupRes = await api('POST', 'http://localhost:4003/api/auth/signup', mockUser);
            if (!signupRes.success) {
                throw new Error(signupRes.message || "Signup failed");
            }
            createdUserId = signupRes.data.id;
            authToken = signupRes.token;
            console.log("   - Signup successful. Token received.");
        } catch (e) {
            console.log("   - Signup failed: " + e.message);
            if (e.message.includes("Email already registered")) {
                console.log("   - Attempting login instead...");
                try {
                    const loginRes = await api('POST', 'http://localhost:4003/api/auth/login', {
                        email: mockUser.email,
                        password: mockUser.password
                    });
                    authToken = loginRes.token;
                    createdUserId = loginRes.data.id;
                    console.log("   - Login successful. Token received.");
                } catch (loginErr) {
                    console.error("   ! Critical: Login also failed: " + loginErr.message);
                    process.exit(1);
                }
            } else {
                console.error("   ! Critical: verify server is running on 4003.", e);
                process.exit(1);
            }
        }

        // 2. Test User Management
        console.log("2. Testing User Management (CRUD)...");
        // Create Staff
        const newStaff = {
            full_name: "Test Staff",
            email: "staff" + Date.now() + "@example.com",
            password: "password123",
            role: "maintenance",
            maintenance_team_id: maintenanceTeamId
        };

        let staffId;
        try {
            const createRes = await api('POST', `${BASE_URL}/system-users`, newStaff, authToken);
            staffId = createRes.id;
            console.log("   - Created Staff User ID:", staffId);
        } catch (e) { console.error("   ! Failed to create user:", e.message); }

        if (staffId) {
            // Update
            try {
                await api('PUT', `${BASE_URL}/system-users/${staffId}`, { full_name: "Updated Staff Name" }, authToken);
                console.log("   - Updated Staff User");
            } catch (e) { console.error("   ! Failed to update user:", e.message); }

            // Delete
            try {
                await api('DELETE', `${BASE_URL}/system-users/${staffId}`, null, authToken);
                console.log("   - Deleted Staff User");
            } catch (e) { console.error("   ! Failed to delete user:", e.message); }
        }

        // 3. Test Incidents
        console.log("3. Testing Incidents...");
        // Ensure pole
        const [polls] = await db.query("SELECT id FROM light_pole LIMIT 1");
        let poleId = 1;
        if (polls.length > 0) poleId = polls[0].id;
        else {
            const [res] = await db.query("INSERT INTO light_pole (pole_id, location, status) VALUES ('POLE-TEST', 'Test Loc', 'Active')");
            poleId = res.insertId;
        }

        mockIncident.light_pole_id = poleId;

        try {
            const incRes = await api('POST', `${BASE_URL}/incidents`, mockIncident, authToken);
            createdIncidentId = incRes.id;
            console.log("   - Incident Created ID:", createdIncidentId);
        } catch (e) { console.error("   ! Failed to create incident:", e.message); }

        if (createdIncidentId) {
            // Assign Team (Maintenance Activity)
            console.log("4. Testing Team Assignment...");
            try {
                const assignRes = await api('POST', `${BASE_URL}/maintenance-activity`, {
                    incident_id: createdIncidentId,
                    team_id: maintenanceTeamId,
                    status: "Pending",
                    notes: "Verification Assignment"
                }, authToken);
                console.log("   - Team Assigned. Activity ID:", assignRes.id);
            } catch (e) { console.error("   ! Failed to assign team:", e.message); }
        }

        console.log("Verification Complete.");
        process.exit(0);

    } catch (e) {
        console.error("Verification Script Error:", e);
        process.exit(1);
    }
}

runVerification();
