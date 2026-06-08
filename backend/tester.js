const axios = require('axios');
const api = axios.create({ baseURL: 'https://lovemarriage-api.onrender.com/api', timeout: 60000 });

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function simulateUser(email, firstName) {
  console.log(`\n=== Testing User: ${email} ===`);
  try {
    // 1. Send OTP
    console.log('[1] Requesting OTP...');
    const start = Date.now();
    await api.post('/auth/send-otp', { email });
    console.log(`✅ OTP Sent (${Date.now() - start}ms)`);

    // We can't automatically get the OTP from email in this script without access to the DB/Render logs
    // But we know the OTP is generated. We'll stop here for the fully automated test.
    // To fully test verify-otp, we would need to read the OTP from the Render logs or the database.
    console.log('✅ Send OTP stage passed!');
    return true;
  } catch (err) {
    console.error(`❌ Error for ${email}:`, err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
    return false;
  }
}

async function main() {
  console.log('Waking up server...');
  try { await axios.get('https://lovemarriage-api.onrender.com/health', { timeout: 60000 }); } catch (e) {}

  await simulateUser('alice_tester@example.com', 'Alice');
  await simulateUser('bob_tester@example.com', 'Bob');
  await simulateUser('charlie_tester@example.com', 'Charlie');
  console.log('\n✅ All automated tests finished.');
}

main();
