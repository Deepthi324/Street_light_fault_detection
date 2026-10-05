const axios = require("axios");

const BASE_URL = "http://localhost:4003";

async function reproduceUpdate() {
    try {
        console.log("1. Logging in as Authority (test.auth1770823330841@example.com)...");
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: "test.auth1770823330841@example.com",
            password: "password",
        });

        const token = loginRes.data.token;
        const user = loginRes.data.user;
        console.log("Logged in:", user.email, "Role:", user.role);

        if (user.role !== 'authority') {
            console.error("ERROR: Expected role 'authority', got", user.role);
            return;
        }

        console.log("\n2. Fetching complaints...");
        const complaintsRes = await axios.get(`${BASE_URL}/api/complaints`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const complaints = complaintsRes.data;
        console.log(`Found ${complaints.length} complaints.`);

        if (complaints.length === 0) {
            console.log("No complaints found to update.");
            return;
        }

        const complaintToUpdate = complaints[0];
        console.log(`\n3. Attempting to update complaint #${complaintToUpdate.id}...`);

        try {
            const updateRes = await axios.put(
                `${BASE_URL}/api/complaints/${complaintToUpdate.id}/status`,
                {
                    status: "OPEN",
                    authority_response: "Test response from reproduction script"
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            console.log("Update SUCCESS:", updateRes.data);
        } catch (err) {
            console.error("Update FAILED:");
            if (err.response) {
                console.error("Status:", err.response.status);
                console.error("Data:", err.response.data);
            } else {
                console.error(err.message);
            }
        }

    } catch (err) {
        if (err.response) {
            console.error("Login/Fetch FAILED:", err.response.status, err.response.data);
        } else {
            console.error("Error:", err.message);
        }
    }
}

reproduceUpdate();
