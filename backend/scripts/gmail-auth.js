/**
 * Gmail OAuth Authorization Script
 * 
 * This script performs the OAuth flow to get a refresh token from Google.
 * Run with: npm run auth:gmail
 * 
 * Steps:
 * 1. Opens a browser with Google login
 * 2. You authorize the app
 * 3. Token is saved to ../gmail-token.json
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');
const logger = require('../utils/logger');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../gmail-token.json');
const REDIRECT_PORT = 3001;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

let authCode = null;
let server = null;

// Start local server to catch OAuth callback
const startCallbackServer = () => {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.end('Authorization denied. You can close this window.');
        logger.error(`Authorization error: ${error}`);
        process.exit(1);
      }

      if (code) {
        authCode = code;
        res.end('Authorization successful! You can close this window.');
        resolve();
      }
    });

    server.listen(REDIRECT_PORT, () => {
      logger.info(`Callback server started on port ${REDIRECT_PORT}`);
    });
  });
};

// Get OAuth client
const getOAuthClient = () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    logger.error(`credentials.json not found at ${CREDENTIALS_PATH}`);
    logger.error('Download it from Google Cloud Console and place it in backend/ folder');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
  );

  return oauth2Client;
};

// Main authorization flow
const authorize = async () => {
  try {
    logger.info('Starting Gmail OAuth authorization...');

    const oauth2Client = getOAuthClient();

    // Start callback server
    await startCallbackServer();

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    logger.info(`\n${'='.repeat(80)}`);
    logger.info('🔗 AUTHORIZATION URL:');
    logger.info(authUrl);
    logger.info(`${'='.repeat(80)}\n`);
    logger.info('📋 Instructions:');
    logger.info('1. Copy the URL above');
    logger.info('2. Paste it into your browser');
    logger.info('3. Login with anjaaniaditi@gmail.com');
    logger.info('4. Click "Allow" to grant permissions');
    logger.info('5. You\'ll be redirected back automatically\n');
    
    // Try to open browser automatically (optional)
    try {
      const open = (await import('open')).default;
      await open(authUrl);
      logger.info('✅ Browser opening...\n');
    } catch (e) {
      logger.warn('Could not open browser automatically. Please copy and paste the URL above.\n');
    }

    // Wait for authorization code
    logger.info('Waiting for authorization...');
    
    // Add timeout
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authorization timeout (5 minutes)')), 5 * 60 * 1000);
    });

    try {
      await Promise.race([
        new Promise(resolve => {
          const checkCode = setInterval(() => {
            if (authCode) {
              clearInterval(checkCode);
              resolve();
            }
          }, 100);
        }),
        timeout
      ]);
    } catch (err) {
      logger.error(err.message);
      process.exit(1);
    }

    // Exchange code for tokens
    logger.info('Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(authCode);
    
    // Save tokens
    const tokenData = {
      type: 'authorized_user',
      client_id: oauth2Client._clientId,
      client_secret: oauth2Client._clientSecret,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    };

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
    logger.info(`✅ Tokens saved to ${TOKEN_PATH}`);
    logger.info(`\n📋 Your refresh_token: ${tokens.refresh_token}\n`);
    logger.info('✨ Gmail OAuth setup complete!');
    logger.info('\nNext steps:');
    logger.info('1. Your token has been saved to gmail-token.json');
    logger.info('2. Update .env with EMAIL_SERVICE=gmail-api');
    logger.info('3. Restart your backend server');
    logger.info('4. Test OTP email sending');

    process.exit(0);
  } catch (error) {
    logger.error('Authorization failed:', error.message);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
};

// Run if executed directly
if (require.main === module) {
  authorize();
}

module.exports = { authorize };
