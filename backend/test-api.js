// Test script to verify API integration
const API_BASE_URL = 'http://localhost:4003/api';

async function testSignup() {
  console.log('🧪 Testing signup API...');

  const testData = {
    fullName: "Script Test",
    email: "script@test.com",
    password: "123456",
    confirmPassword: "123456",
    role: "citizen"
  };

  try {
    console.log('📤 Sending request to:', `${API_BASE_URL}/auth/signup`);
    console.log('📤 Request data:', testData);

    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', response.headers);

    const data = await response.json();
    console.log('📥 Response data:', data);

    if (response.ok) {
      console.log('✅ SUCCESS: User created');
    } else {
      console.log('❌ FAILED:', data.message);
    }

  } catch (error) {
    console.error('❌ NETWORK ERROR:', error);
  }
}

// Run test
testSignup();
