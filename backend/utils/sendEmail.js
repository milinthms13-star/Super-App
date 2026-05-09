/**
 * Email Service Utility
 * Supports Gmail, SendGrid, and Generic SMTP
 */

const nodemailer = require('nodemailer');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const emailConfig = require('../config/email');
const logger = require('./logger');

let transporter = null;

const RENDER_RESTRICTED_SMTP_PORTS = new Set([25, 465, 587]);

const isRenderSmtpPortRestricted = () => {
  return (
    String(process.env.RENDER || '').toLowerCase() === 'true' &&
    emailConfig.provider === 'smtp' &&
    RENDER_RESTRICTED_SMTP_PORTS.has(Number(emailConfig.smtp.port))
  );
};

/**
 * Initialize email transporter based on configuration
 */
const initializeTransporter = () => {
  if (transporter) {
    return transporter;
  }

  try {
    const provider = emailConfig.provider;

    switch (provider) {
      case 'ses': {
        if (!emailConfig.ses.accessKeyId || !emailConfig.ses.secretAccessKey || !emailConfig.ses.fromEmail) {
          logger.warn('AWS SES not configured - email delivery will be skipped');
          return null;
        }

        transporter = new SESClient({
          region: emailConfig.ses.region,
          credentials: {
            accessKeyId: emailConfig.ses.accessKeyId,
            secretAccessKey: emailConfig.ses.secretAccessKey,
          },
        });

        logger.info(`Email transporter initialized with AWS SES (${emailConfig.ses.region})`);
        break;
      }

      case 'sendgrid': {
        if (!emailConfig.sendgrid.apiKey) {
          logger.warn('SendGrid not configured - email delivery will be skipped');
          return null;
        }

        const sgTransport = require('nodemailer-sendgrid-transport');
        transporter = nodemailer.createTransport(
          sgTransport({
            auth: {
              api_key: emailConfig.sendgrid.apiKey,
            },
          })
        );

        logger.info('Email transporter initialized with SendGrid');
        break;
      }

      case 'smtp':
      default: {
        if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
          logger.warn('SMTP not configured - email delivery will be skipped');
          return null;
        }

        transporter = nodemailer.createTransport({
          host: emailConfig.smtp.host,
          port: emailConfig.smtp.port,
          secure: emailConfig.smtp.secure,
          auth: emailConfig.smtp.auth,
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 8000,
          dnsTimeout: 4000,
        });

        logger.info(`Email transporter initialized with SMTP (${emailConfig.smtp.host}:${emailConfig.smtp.port})`);
        break;
      }
    }

    return transporter;
  } catch (error) {
    logger.error('Error initializing email transporter:', error);
    return null;
  }
};

/**
 * Get sender email address
 */
const getSenderEmail = () => {
  const provider = emailConfig.provider;

  switch (provider) {
    case 'sendgrid':
      return emailConfig.sendgrid.fromEmail;
    case 'ses':
      return emailConfig.ses.fromEmail;
    case 'smtp':
    default:
      return emailConfig.smtp.from;
  }
};

/**
 * Get sender name
 */
const getSenderName = () => {
  const provider = emailConfig.provider;

  switch (provider) {
    case 'sendgrid':
      return emailConfig.sendgrid.fromName;
    case 'ses':
      return emailConfig.ses.fromName;
    case 'smtp':
      return emailConfig.smtp.fromName;
    default:
      return emailConfig.fromName;
  }
};

/**
 * Send email reminder
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @param {string} textContent - Plain text fallback
 * @param {string} reminderId - Reminder ID for tracking
 * @returns {Promise<Object>} - Send result with status
 */
const sendEmail = async (to, subject, htmlContent, textContent = '', reminderId = '') => {
  const emailTransporter = initializeTransporter();

  if (!emailTransporter) {
    logger.warn('Email transporter not configured - email skipped');
    return {
      success: false,
      status: 'config-missing',
      error: 'Email service not configured',
    };
  }

  try {
    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      logger.warn(`Invalid email address: ${to}`);
      return {
        success: false,
        status: 'invalid-email',
        error: 'Invalid email address',
      };
    }

    const mailOptions = {
      from: `${getSenderName()} <${getSenderEmail()}>`,
      to: to,
      subject: subject,
      text: textContent || stripHtml(htmlContent),
      html: htmlContent,
      replyTo: emailConfig.replyTo,
    };

    let info;

    if (emailConfig.provider === 'ses') {
      info = await emailTransporter.send(new SendEmailCommand({
        Source: getSenderEmail(),
        Destination: { ToAddresses: [to] },
        ReplyToAddresses: emailConfig.replyTo ? [emailConfig.replyTo] : undefined,
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlContent },
            Text: { Data: textContent || stripHtml(htmlContent) },
          },
        },
      }));
    } else {
      info = await emailTransporter.sendMail(mailOptions);
    }

    logger.info('Email sent successfully', {
      messageId: info.messageId || info.MessageId,
      to: to,
      reminderId: reminderId,
    });

    return {
      success: true,
      status: 'sent',
      messageId: info.messageId || info.MessageId,
    };
  } catch (error) {
    const errorMessage = isRenderSmtpPortRestricted()
      ? `SMTP email delivery on port ${emailConfig.smtp.port} can fail on Render free web services. Switch EMAIL_SERVICE to ses or gmail-api.`
      : error.message;

    logger.error('Email send failed', {
      error: errorMessage,
      to: to,
      reminderId: reminderId,
    });

    return {
      success: false,
      status: 'failed',
      error: errorMessage,
    };
  }
};

/**
 * Strip HTML tags from content
 */
const stripHtml = (html) => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Build reminder email HTML
 */
const buildReminderEmailHtml = (reminder, timeUntilDue) => {
  const priorityColor = reminder.priority === 'High' ? '#dc3545' : reminder.priority === 'Medium' ? '#ffc107' : '#28a745';

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .reminder-box { background: white; padding: 15px; border-left: 4px solid ${priorityColor}; margin: 15px 0; }
          .reminder-title { font-size: 18px; font-weight: bold; color: #333; margin: 0 0 10px 0; }
          .reminder-desc { font-size: 14px; color: #666; margin: 0 0 10px 0; }
          .reminder-time { font-size: 14px; color: #667eea; font-weight: bold; }
          .reminder-priority { font-size: 12px; color: white; background: ${priorityColor}; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 10px; }
          .footer { background: #f0f0f0; padding: 15px; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none; }
          .cta-button { background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📌 ${reminder.title}</h1>
            <p style="margin: 5px 0 0 0;">Reminder from NilaHub</p>
          </div>
          
          <div class="content">
            <div class="reminder-box">
              ${reminder.description ? `<p class="reminder-desc">${reminder.description}</p>` : ''}
              <p class="reminder-time">⏰ ${timeUntilDue}</p>
              <span class="reminder-priority">${reminder.priority} Priority</span>
            </div>

            ${reminder.category ? `
              <p><strong>Category:</strong> ${reminder.category}</p>
            ` : ''}
            
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              This is an automated reminder. Please mark as complete or snooze when you're done.
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">
              © ${new Date().getFullYear()} NilaHub. All rights reserved.<br>
              <a href="https://nilahub.com" style="color: #667eea;">Visit NilaHub</a> | 
              <a href="mailto:support@nilahub.com" style="color: #667eea;">Contact Support</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  buildReminderEmailHtml,
  initializeTransporter,
  isConfigured: () => emailConfig.isConfigured(),
};
