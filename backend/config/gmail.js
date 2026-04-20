const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = path.join(__dirname, 'gmail-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

let oauth2Client = null;
let transporter = null;

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
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
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
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      logger.error('Gmail credentials.json not found. Please download it from Google Cloud Console.');
      return false;
    }

    const content = fs.readFileSync(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;

    oauth2Client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      key.redirect_uris[0]
    );

    // Try to load saved credentials
    const savedAuth = loadSavedCredentials();
    if (savedAuth) {
      oauth2Client = savedAuth;
      logger.info('Gmail OAuth loaded from saved token');
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
  if (!oauth2Client) return null;
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
};

// Handle authorization callback
const handleAuthCallback = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    saveCredentials(oauth2Client);
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
    if (!oauth2Client || !oauth2Client.credentials.access_token) {
      throw new Error('Gmail OAuth not authorized');
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailContent = `To: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}`;
    const base64Email = Buffer.from(emailContent).toString('base64');

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
  if (!oauth2Client || !oauth2Client.credentials.access_token) {
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

module.exports = {
  initializeGmailAuth,
  getAuthUrl,
  handleAuthCallback,
  sendEmailViaGmail,
  createGmailTransporter,
};
