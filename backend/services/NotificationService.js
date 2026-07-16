/**
 * Unified Notification Service
 * Handles email, SMS, WhatsApp, and push notifications
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../utils/logger');
const NotificationPreference = require('../models/NotificationPreference');

// Email transporter (using Gmail SMTP, configure for your provider)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// SMS Service (using Twilio, MSG91, or similar)
const sendSMS = async (phoneNumber, message) => {
  try {
    if (!process.env.SMS_API_KEY || !process.env.SMS_SENDER_ID) {
      logger.warn('SMS service not configured');
      return { success: false, reason: 'not_configured' };
    }

    // Example using MSG91 (Indian SMS service)
    const response = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        flow_id: process.env.MSG91_FLOW_ID,
        sender: process.env.SMS_SENDER_ID,
        mobiles: phoneNumber.replace(/\D/g, ''),
        message: message,
      },
      {
        headers: {
          authkey: process.env.SMS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, response: response.data };
  } catch (error) {
    logger.error('SMS send failed:', error.message);
    return { success: false, error: error.message };
  }
};

// WhatsApp Service (using WhatsApp Business API)
const sendWhatsApp = async (phoneNumber, message, templateName = null) => {
  try {
    if (!process.env.WHATSAPP_BUSINESS_API_KEY) {
      logger.warn('WhatsApp service not configured');
      return { success: false, reason: 'not_configured' };
    }

    const whatsappService = require('./whatsappService');
    
    if (templateName) {
      return await whatsappService.sendTemplateMessage(phoneNumber, templateName, {
        message,
      });
    }
    
    return await whatsappService.sendMessage(phoneNumber, message);
  } catch (error) {
    logger.error('WhatsApp send failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Check if notification should be sent based on user preferences
const shouldSendNotification = async (userId, channel, notificationType) => {
  try {
    const prefs = await NotificationPreference.findOne({ userId });
    
    if (!prefs) {
      return true; // Default to sending if no preferences set
    }

    // Check if channel is enabled
    if (!prefs[channel]?.enabled) {
      return false;
    }

    // Check if specific notification type is enabled
    if (prefs[channel][notificationType] === false) {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHours?.enabled && (channel === 'sms' || channel === 'push')) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { startTime, endTime } = prefs.quietHours;

      if (startTime < endTime) {
        if (currentTime >= startTime && currentTime < endTime) {
          return false;
        }
      } else {
        if (currentTime >= startTime || currentTime < endTime) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking notification preferences:', error);
    return true; // Default to sending on error
  }
};

// Send Email Notification
const sendEmailNotification = async (userId, email, subject, htmlContent, textContent) => {
  try {
    const shouldSend = await shouldSendNotification(userId, 'email', 'enabled');
    
    if (!shouldSend) {
      logger.info(`Email notification skipped for user ${userId} due to preferences`);
      return { success: false, reason: 'user_preference' };
    }

    const mailOptions = {
      from: `${process.env.APP_NAME || 'SoulMatch'} <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    logger.info(`Email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Email send failed to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Notification Templates
const templates = {
  newMatch: {
    email: {
      subject: (data) => `🎉 New Match Found: ${data.matchName}`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">You Have a New Match! 💕</h2>
          <p>Hi ${data.userName},</p>
          <p>We found someone special who matches your preferences!</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">${data.matchName}, ${data.matchAge}</h3>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${data.matchLocation}</p>
            <p style="margin: 5px 0;"><strong>Profession:</strong> ${data.matchProfession}</p>
            <p style="margin: 5px 0;"><strong>Education:</strong> ${data.matchEducation}</p>
            <p style="margin: 5px 0;"><strong>Match Score:</strong> ${data.matchScore}%</p>
          </div>
          <a href="${data.profileUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">View Profile</a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Not interested? <a href="${data.unsubscribeUrl}">Manage notification preferences</a>
          </p>
        </div>
      `,
      text: (data) => `Hi ${data.userName}, you have a new match: ${data.matchName}, ${data.matchAge} from ${data.matchLocation}. Match score: ${data.matchScore}%. View profile: ${data.profileUrl}`,
    },
    sms: (data) => `New match on SoulMatch! ${data.matchName}, ${data.matchAge} from ${data.matchLocation}. Match score: ${data.matchScore}%. View: ${data.profileUrl}`,
    whatsapp: (data) => `🎉 *New Match Found!*\n\n${data.matchName}, ${data.matchAge}\n📍 ${data.matchLocation}\n💼 ${data.matchProfession}\n🎓 ${data.matchEducation}\n\n*Match Score:* ${data.matchScore}%\n\nView Profile: ${data.profileUrl}`,
  },
  interestReceived: {
    email: {
      subject: (data) => `💌 ${data.senderName} sent you an interest`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">Someone is Interested in You! 💌</h2>
          <p>Hi ${data.receiverName},</p>
          <p><strong>${data.senderName}</strong> has expressed interest in your profile!</p>
          ${data.message ? `<div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #e91e63;">
            <p style="margin: 0; font-style: italic;">"${data.message}"</p>
          </div>` : ''}
          <div style="margin: 20px 0;">
            <a href="${data.profileUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px;">View Profile</a>
            <a href="${data.respondUrl}" style="display: inline-block; background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Respond Now</a>
          </div>
        </div>
      `,
      text: (data) => `${data.senderName} sent you an interest on SoulMatch! ${data.message ? `Message: "${data.message}". ` : ''}View profile: ${data.profileUrl}`,
    },
    sms: (data) => `${data.senderName} sent you an interest on SoulMatch! View profile & respond: ${data.profileUrl}`,
    whatsapp: (data) => `💌 *New Interest Received!*\n\n${data.senderName} is interested in your profile!\n\n${data.message ? `Message: "${data.message}"\n\n` : ''}View & Respond: ${data.profileUrl}`,
  },
  interestAccepted: {
    email: {
      subject: (data) => `✅ ${data.accepterName} accepted your interest!`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4caf50;">Great News! Your Interest was Accepted! ✅</h2>
          <p>Hi ${data.senderName},</p>
          <p><strong>${data.accepterName}</strong> has accepted your interest! You can now start chatting.</p>
          <div style="margin: 20px 0;">
            <a href="${data.chatUrl}" style="display: inline-block; background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Chatting</a>
          </div>
          <p style="color: #666; font-size: 14px;">Tip: Start with a friendly greeting and ask about their interests!</p>
        </div>
      `,
      text: (data) => `Good news! ${data.accepterName} accepted your interest on SoulMatch. Start chatting: ${data.chatUrl}`,
    },
    sms: (data) => `${data.accepterName} accepted your interest! Start chatting on SoulMatch: ${data.chatUrl}`,
    whatsapp: (data) => `✅ *Interest Accepted!*\n\n${data.accepterName} accepted your interest!\n\nYou can now start chatting: ${data.chatUrl}`,
  },
  messageReceived: {
    email: {
      subject: (data) => `💬 New message from ${data.senderName}`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196f3;">New Message! 💬</h2>
          <p>Hi ${data.receiverName},</p>
          <p><strong>${data.senderName}</strong> sent you a message:</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0;">${data.messagePreview}</p>
          </div>
          <a href="${data.chatUrl}" style="display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reply Now</a>
        </div>
      `,
      text: (data) => `New message from ${data.senderName}: "${data.messagePreview}". Reply: ${data.chatUrl}`,
    },
    sms: (data) => `New message from ${data.senderName} on SoulMatch. Reply: ${data.chatUrl}`,
    whatsapp: (data) => `💬 *New Message*\n\nFrom: ${data.senderName}\n"${data.messagePreview}"\n\nReply: ${data.chatUrl}`,
  },
  dailyDigest: {
    email: {
      subject: (data) => `Your Daily Match Digest - ${data.newMatchCount} new matches`,
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">Your Daily Match Digest 📊</h2>
          <p>Hi ${data.userName},</p>
          <p>Here's what happened in the last 24 hours:</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>🎯 New Matches:</strong> ${data.newMatchCount}</p>
            <p><strong>👁️ Profile Views:</strong> ${data.profileViews}</p>
            <p><strong>💌 Interests Received:</strong> ${data.interestsReceived}</p>
            <p><strong>💬 New Messages:</strong> ${data.newMessages}</p>
          </div>
          ${data.topMatches && data.topMatches.length > 0 ? `
            <h3>Top Matches for You:</h3>
            ${data.topMatches.map(match => `
              <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0;">${match.name}, ${match.age}</h4>
                <p style="margin: 5px 0;">${match.location} | ${match.profession}</p>
                <p style="margin: 5px 0;"><strong>Match Score:</strong> ${match.matchScore}%</p>
                <a href="${match.profileUrl}" style="color: #e91e63;">View Profile →</a>
              </div>
            `).join('')}
          ` : ''}
          <a href="${data.dashboardUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">View Dashboard</a>
        </div>
      `,
      text: (data) => `Daily Digest: ${data.newMatchCount} new matches, ${data.profileViews} profile views, ${data.interestsReceived} interests. View dashboard: ${data.dashboardUrl}`,
    },
  },
};

// Main notification function
const sendNotification = async (userId, notificationType, data, channels = ['email', 'sms', 'whatsapp']) => {
  const results = {};

  try {
    const template = templates[notificationType];
    
    if (!template) {
      logger.error(`Unknown notification type: ${notificationType}`);
      return { success: false, error: 'Unknown notification type' };
    }

    // Send email
    if (channels.includes('email') && data.email) {
      const shouldSend = await shouldSendNotification(userId, 'email', notificationType);
      if (shouldSend && template.email) {
        results.email = await sendEmailNotification(
          userId,
          data.email,
          template.email.subject(data),
          template.email.html(data),
          template.email.text(data)
        );
      }
    }

    // Send SMS
    if (channels.includes('sms') && data.phone) {
      const shouldSend = await shouldSendNotification(userId, 'sms', notificationType);
      if (shouldSend && template.sms) {
        results.sms = await sendSMS(data.phone, template.sms(data));
      }
    }

    // Send WhatsApp
    if (channels.includes('whatsapp') && data.phone) {
      const shouldSend = await shouldSendNotification(userId, 'whatsapp', notificationType);
      if (shouldSend && template.whatsapp) {
        results.whatsapp = await sendWhatsApp(data.phone, template.whatsapp(data));
      }
    }

    return { success: true, results };
  } catch (error) {
    logger.error('Notification send failed:', error);
    return { success: false, error: error.message, results };
  }
};

module.exports = {
  sendNotification,
  sendEmailNotification,
  sendSMS,
  sendWhatsApp,
  shouldSendNotification,
  templates,
};
