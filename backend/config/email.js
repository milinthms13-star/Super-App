/**
 * Email Service Configuration
 * Supports multiple email providers (Gmail, SendGrid, Nodemailer SMTP)
 */

module.exports = {
  // Provider: 'gmail' | 'sendgrid' | 'smtp'
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  
  // Gmail Configuration
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',  // Use app-specific password, not main Gmail password
  },
  
  // SendGrid Configuration
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@nilahub.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'NilaHub Reminders',
  },
  
  // SMTP Configuration (Generic)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,  // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.SMTP_FROM_EMAIL || 'noreply@nilahub.com',
    fromName: process.env.SMTP_FROM_NAME || 'NilaHub Reminders',
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
    const provider = process.env.EMAIL_PROVIDER || 'smtp';
    
    switch (provider) {
      case 'gmail':
        return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
      case 'sendgrid':
        return !!process.env.SENDGRID_API_KEY;
      case 'smtp':
      default:
        return !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    }
  }
};
