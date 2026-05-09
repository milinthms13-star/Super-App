const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Get Gmail Refresh Token
 * Run: node scripts/get-gmail-refresh-token.js
 * 
 * Then follow the browser instructions to get your refresh token
 */

const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');

if (!fs.existsSync(CREDENTIALS_PATH)) {
  logger.error(`credentials.json not found at ${CREDENTIALS_PATH}`);
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret } = credentials.installed;

const AUTHORIZATION_URL = `https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&access_type=offline&include_granted_scopes=true&response_type=code&client_id=${client_id}&redirect_uri=http://localhost:3000`;

console.log('\n' + '='.repeat(80));
console.log('📧 GMAIL REFRESH TOKEN GENERATOR');
console.log('='.repeat(80));
console.log('\n⏯️  STEP 1: Copy and open this URL in your browser:');
console.log('\n' + AUTHORIZATION_URL);
console.log('\n' + '='.repeat(80));
console.log('\n⏯️  STEP 2: After clicking "Allow", you\'ll get redirected with a code in the URL');
console.log('    Example: http://localhost:3000/?code=4/0AX...');
console.log('\n⏯️  STEP 3: Copy the "code=" part from the URL');
console.log('\n' + '='.repeat(80));
console.log('\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📝 Paste the authorization code here: ', async (code) => {
  rl.close();

  if (!code || code.length < 10) {
    logger.error('Invalid code. Code should be at least 10 characters.');
    process.exit(1);
  }

  try {
    logger.info('\n🔄 Exchanging code for refresh token...\n');

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: client_id,
      client_secret: client_secret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'http://localhost:3000',
    });

    const { refresh_token, access_token } = response.data;

    if (!refresh_token) {
      logger.error('❌ No refresh token in response. Make sure you select "offline" access.');
      process.exit(1);
    }

    // Save to gmail-token.json
    const tokenPath = path.join(__dirname, '../gmail-token.json');
    const tokenData = {
      type: 'authorized_user',
      client_id: client_id,
      client_secret: client_secret,
      refresh_token: refresh_token,
      access_token: access_token,
    };

    fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Your refresh token has been saved.');
    console.log('='.repeat(80));
    console.log('\n📋 YOUR REFRESH TOKEN:');
    console.log(`\n${refresh_token}\n`);
    console.log('='.repeat(80));
    console.log('\n✨ NEXT STEPS:');
    console.log('1. Token saved to: backend/gmail-token.json');
    console.log('2. Update your .env:');
    console.log('   EMAIL_SERVICE=gmail-api');
    console.log('   GMAIL_USER=maalu9198@gmail.com');
    console.log('   EMAIL_FROM=maalu9198@gmail.com');
    console.log('3. Restart backend: npm run dev');
    console.log('4. Test OTP email sending\n');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error exchanging code for token:');
    logger.error(error.response?.data || error.message);
    process.exit(1);
  }
});
