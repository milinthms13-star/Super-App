const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = path.join(__dirname, 'gmail-token.json');
const CREDENTIALS_PATHS = [
  process.env.GMAIL_CREDENTIALS_PATH
    ? path.resolve(process.cwd(), process.env.GMAIL_CREDENTIALS_PATH)
    : null,
  path.join(__dirname, '../credentials.json'),
  path.join(__dirname, '../../credentials.json'),
].filter(Boolean);

let oauth2Client = null;
let transporter = null;

const hasValue = (value) => value && !String(value).includes('your-');

const getExistingCredentialsPath = () => {
  return CREDENTIALS_PATHS.find((candidatePath) => fs.existsSync(candidatePath)) || null;
};

const getOAuthClientConfig = () => {
  if (hasValue(process.env.GMAIL_CLIENT_ID) && hasValue(process.env.GMAIL_CLIENT_SECRET)) {
    return {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost',
    };
  }

  const credentialsPath = getExistingCredentialsPath();
  if (!credentialsPath) {
    return null;
  }

  const content = fs.readFileSync(credentialsPath);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;

  return {
    clientId: key.client_id,
    clientSecret: key.client_secret,
    redirectUri: key.redirect_uris?.[0] || 'http://localhost',
    credentialsPath,
  };
};

const ensureOAuthClient = () => {
  if (oauth2Client) {
    return oauth2Client;
  }

  const config = getOAuthClientConfig();
  if (!config) {
    return null;
  }

  oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  return oauth2Client;
};

const loadSavedToken = () => {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return null;
    }

    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    logger.warn('Failed to load saved Gmail token:', err.message);
    return null;
  }
};

// Load or create token
const loadSavedCredentials = () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const content = fs.readFileSync(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    }
  } catch (err) {
    logger.warn('Failed to load saved credentials:', err.message);
  }
  return null;
};

// Save token for later use
const saveCredentials = (client) => {
  try {
    const config = getOAuthClientConfig();
    if (!config) {
      throw new Error('Gmail OAuth client credentials are not configured');
    }

    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
  } catch (err) {
    logger.error('Failed to save credentials:', err);
  }
};

// Initialize Gmail OAuth
const initializeGmailAuth = async () => {
  try {
    const client = ensureOAuthClient();
    if (!client) {
      logger.error(
        'Gmail OAuth credentials not found. Set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET or place credentials.json in backend/.'
      );
      return false;
    }

    if (hasValue(process.env.GMAIL_REFRESH_TOKEN)) {
      client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });
      logger.info('Gmail OAuth initialized from environment refresh token');
      return true;
    }

    const savedAuth = loadSavedCredentials();
    if (savedAuth) {
      oauth2Client = savedAuth;
      logger.info('Gmail OAuth loaded from saved token');
      return true;
    }

    const savedToken = loadSavedToken();
    if (savedToken?.refresh_token || savedToken?.access_token) {
      client.setCredentials(savedToken);
      logger.info('Gmail OAuth initialized from token file');
      return true;
    }

    // Need authorization
    logger.warn('Gmail OAuth not authorized. Run: npm run auth:gmail');
    return false;

  } catch (err) {
    logger.error('Failed to initialize Gmail OAuth:', err);
    return false;
  }
};

// Get authorization URL (for first-time setup)
const getAuthUrl = () => {
  const client = ensureOAuthClient();
  if (!client) return null;
  
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
};

// Handle authorization callback
const handleAuthCallback = async (code) => {
  try {
    const client = ensureOAuthClient();
    if (!client) {
      throw new Error('Gmail OAuth client is not configured');
    }

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    saveCredentials(client);
    logger.info('Gmail OAuth authorized successfully');
    return true;
  } catch (err) {
    logger.error('Failed to authorize Gmail:', err);
    return false;
  }
};

// Send email via Gmail API
const sendEmailViaGmail = async (to, subject, html) => {
  try {
    const initialized = await initializeGmailAuth();
    if (!initialized || !oauth2Client) {
      throw new Error('Gmail OAuth is not configured for email delivery');
    }

    const credentials = oauth2Client.credentials || {};
    if (!credentials.refresh_token && !credentials.access_token) {
      throw new Error('Gmail OAuth not authorized');
    }

    await oauth2Client.getAccessToken();

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailContent = `To: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}`;
    const base64Email = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    const message = {
      raw: base64Email,
    };

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: message,
    });

    logger.info(`Email sent via Gmail API to ${to}, messageId: ${result.data.id}`);
    return true;

  } catch (err) {
    logger.error('Failed to send email via Gmail API:', err.message);
    throw err;
  }
};

// Create nodemailer transporter for Gmail
const createGmailTransporter = () => {
  if (!oauth2Client) {
    return null;
  }

  const credentials = oauth2Client.credentials || {};
  if (!credentials.refresh_token && !credentials.access_token) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: oauth2Client.credentials.refresh_token,
    },
  });
};

const hasGmailClientConfig = () => {
  return !!ensureOAuthClient();
};

const hasGmailDeliveryConfig = () => {
  if (!hasValue(process.env.GMAIL_USER)) {
    return false;
  }

  if (
    hasValue(process.env.GMAIL_CLIENT_ID) &&
    hasValue(process.env.GMAIL_CLIENT_SECRET) &&
    hasValue(process.env.GMAIL_REFRESH_TOKEN)
  ) {
    return true;
  }

  return hasGmailClientConfig() && fs.existsSync(TOKEN_PATH);
};

module.exports = {
  initializeGmailAuth,
  getAuthUrl,
  handleAuthCallback,
  sendEmailViaGmail,
  createGmailTransporter,
  hasGmailClientConfig,
  hasGmailDeliveryConfig,
};
