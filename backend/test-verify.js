const axios = require('axios');

async function testFullAuthFlow() {
  const api = axios.create({ baseURL: 'https://lovemarriage-api.onrender.com/api', timeout: 30000 });
  const email = `test_${Date.now()}@example.com`;

  try {
    console.log(`[1] Sending OTP for ${email}...`);
    const sendRes = await api.post('/auth/send-otp', { email });
    console.log('✅ Send Response:', sendRes.data);

    // Instead of reading the logs, we can just guess the OTP if we had a backdoor.
    // We don't have a backdoor. So I will add a temporary backdoor route to auth.js to fetch the OTP from the cache!
    
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  }
}

testFullAuthFlow();
