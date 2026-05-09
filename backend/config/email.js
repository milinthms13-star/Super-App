/**
 * Email Service Configuration
 * Supports multiple email providers (Gmail, SendGrid, Nodemailer SMTP)
 */

const normalizeProvider = () => {
  const rawProvider = String(process.env.EMAIL_SERVICE || process.env.EMAIL_PROVIDER || 'smtp')
    .trim()
    .toLowerCase();

  if (rawProvider === 'gmail') {
    return 'smtp';
  }

  return rawProvider;
};

const provider = normalizeProvider();

module.exports = {
  // Provider: 'gmail-api' | 'sendgrid' | 'ses' | 'smtp'
  provider,
  
  // Gmail Configuration
  gmail: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '',  // Use app-specific password, not main Gmail password
  },
  
  // SendGrid Configuration
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@nilahub.com',
    fromName: process.env.SENDGRID_FROM_NAME || process.env.EMAIL_FROM_NAME || 'NilaHub Reminders',
  },

  // AWS SES Configuration
  ses: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@nilahub.com',
    fromName: process.env.EMAIL_FROM_NAME || 'NilaHub',
  },
  
  // SMTP Configuration (Generic)
  smtp: {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true' || false,  // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER || '',
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'noreply@nilahub.com',
    fromName: process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'NilaHub Reminders',
  },
  
  // Email Configuration
  from: process.env.EMAIL_FROM || 'noreply@nilahub.com',
  fromName: process.env.EMAIL_FROM_NAME || 'NilaHub',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@nilahub.com',
  
  // Rate limiting
  rateLimit: {
    maxEmails: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW || '3600000', 10),  // 1 hour
  },
  
  // Graceful fallback for development/testing
  isConfigured: () => {
    const activeProvider = normalizeProvider();
    
    switch (activeProvider) {
      case 'gmail-api':
        return !!(process.env.GMAIL_USER || process.env.EMAIL_USER);
      case 'sendgrid':
        return !!process.env.SENDGRID_API_KEY;
      case 'ses':
        return !!(
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY &&
          process.env.EMAIL_FROM
        );
      case 'smtp':
      default:
        return !!(
          (process.env.EMAIL_USER || process.env.SMTP_USER) &&
          (process.env.EMAIL_PASS || process.env.SMTP_PASSWORD)
        );
    }
  }
};
