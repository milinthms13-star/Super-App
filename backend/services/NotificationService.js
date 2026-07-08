const logger = require('../utils/logger');

// Twilio for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// SendGrid for Email
const sgMail = process.env.SENDGRID_API_KEY
  ? require('@sendgrid/mail')
  : null;

if (sgMail && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// WhatsApp via Twilio
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@malabarbazaar.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Malabar Bazaar Finance';

const NotificationTemplates = {
  LEAD_RECEIVED: {
    sms: (data) => `Dear ${data.name}, your loan application ${data.leadId} for ₹${data.amount} has been received. We'll contact you within 24 hours. - Malabar Bazaar`,
    email: {
      subject: (data) => `Loan Application Received - ${data.leadId}`,
      html: (data) => `
        <h2>Thank You for Your Application!</h2>
        <p>Dear ${data.name},</p>
        <p>Your loan application has been successfully received.</p>
        <p><strong>Application Details:</strong></p>
        <ul>
          <li>Lead ID: ${data.leadId}</li>
          <li>Loan Type: ${data.loanCategory}</li>
          <li>Amount: ₹${data.amount}</li>
          <li>Applied On: ${new Date(data.createdAt).toLocaleString()}</li>
        </ul>
        <p>Our consultant will contact you within 24 hours to proceed with your application.</p>
        <p>You can track your application status anytime.</p>
        <br>
        <p>Best regards,<br>Malabar Bazaar Finance Team</p>
      `,
    },
    whatsapp: (data) => `🎉 Your loan application ${data.leadId} for ₹${data.amount} received!\n\nWe'll reach out within 24 hours.\n\nTrack status: [Link]\n\n- Malabar Bazaar`,
  },

  DOCUMENTS_PENDING: {
    sms: (data) => `Dear ${data.name}, please upload pending documents for ${data.leadId}. Upload now to process faster. - Malabar Bazaar`,
    email: {
      subject: (data) => `Action Required: Upload Documents - ${data.leadId}`,
      html: (data) => `
        <h2>Documents Required</h2>
        <p>Dear ${data.name},</p>
        <p>To proceed with your loan application ${data.leadId}, we need the following documents:</p>
        <ul>
          ${(data.pendingDocs || []).map(doc => `<li>${doc}</li>`).join('')}
        </ul>
        <p>Please upload these documents at your earliest convenience to avoid delays.</p>
        <p><a href="${data.uploadLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Documents</a></p>
        <br>
        <p>Best regards,<br>Malabar Bazaar Finance Team</p>
      `,
    },
    whatsapp: (data) => `📄 Action needed for ${data.leadId}!\n\nPlease upload:\n${(data.pendingDocs || []).join('\n')}\n\nUpload: [Link]\n\n- Malabar Bazaar`,
  },

  CONSULTANT_ASSIGNED: {
    sms: (data) => `Dear ${data.name}, consultant ${data.consultantName} (${data.consultantPhone}) has been assigned to ${data.leadId}. Expect a call soon. - Malabar Bazaar`,
    email: {
      subject: (data) => `Consultant Assigned - ${data.leadId}`,
      html: (data) => `
        <h2>Consultant Assigned to Your Application</h2>
        <p>Dear ${data.name},</p>
        <p>Good news! Your loan application has been assigned to our expert consultant.</p>
        <p><strong>Consultant Details:</strong></p>
        <ul>
          <li>Name: ${data.consultantName}</li>
          <li>Phone: ${data.consultantPhone}</li>
          <li>Application: ${data.leadId}</li>
        </ul>
        <p>Your consultant will reach out to you shortly to discuss your application and guide you through the next steps.</p>
        <br>
        <p>Best regards,<br>Malabar Bazaar Finance Team</p>
      `,
    },
    whatsapp: (data) => `👤 Consultant assigned to ${data.leadId}!\n\n${data.consultantName}\n📞 ${data.consultantPhone}\n\nExpect a call soon.\n\n- Malabar Bazaar`,
  },

  STATUS_UPDATE: {
    sms: (data) => `Dear ${data.name}, ${data.leadId} status: ${data.statusLabel}. ${data.note || ''} - Malabar Bazaar`,
    email: {
      subject: (data) => `Application Update - ${data.leadId}`,
      html: (data) => `
        <h2>Application Status Update</h2>
        <p>Dear ${data.name},</p>
        <p>Your loan application ${data.leadId} has been updated.</p>
        <p><strong>Current Status:</strong> ${data.statusLabel}</p>
        ${data.note ? `<p><strong>Note:</strong> ${data.note}</p>` : ''}
        <p>Track your application for more details.</p>
        <br>
        <p>Best regards,<br>Malabar Bazaar Finance Team</p>
      `,
    },
    whatsapp: (data) => `📊 Update for ${data.leadId}\n\nStatus: ${data.statusLabel}\n${data.note ? `\nNote: ${data.note}` : ''}\n\n- Malabar Bazaar`,
  },

  APPROVED: {
    sms: (data) => `🎉 Congratulations ${data.name}! ${data.leadId} for ₹${data.amount} approved by ${data.institutionName}. Contact ${data.consultantName} for next steps. - Malabar Bazaar`,
    email: {
      subject: (data) => `🎉 Loan Application Approved - ${data.leadId}`,
      html: (data) => `
        <h2 style="color: green;">🎉 Congratulations! Your Loan is Approved!</h2>
        <p>Dear ${data.name},</p>
        <p>We're delighted to inform you that your loan application has been approved!</p>
        <p><strong>Approval Details:</strong></p>
        <ul>
          <li>Lead ID: ${data.leadId}</li>
          <li>Amount: ₹${data.amount}</li>
          <li>Approved By: ${data.institutionName}</li>
          <li>Consultant: ${data.consultantName} (${data.consultantPhone})</li>
        </ul>
        <p>Please contact your consultant to proceed with the final documentation and disbursement process with ${data.institutionName}.</p>
        <br>
        <p>Best regards,<br>Malabar Bazaar Finance Team</p>
      `,
    },
    whatsapp: (data) => `🎉 Congratulations!\n\n${data.leadId} APPROVED!\n\nAmount: ₹${data.amount}\nBy: ${data.institutionName}\n\nContact ${data.consultantName}\n📞 ${data.consultantPhone}\n\n- Malabar Bazaar`,
  },

  REJECTED: {
    sms: (data) => `Dear ${data.name}, ${data.leadId} could not be approved at this time. ${data.reason || 'Contact consultant for options.'} - Malabar Bazaar`,
    email: {
      subject: (data) => `Application Update - ${data.leadId}`,
      html: (data) => `
        <h2>Application Update</h2>
        <p>Dear ${data.name},</p>
        <p>Thank you for your interest in our loan services.</p>
        <p>After careful review, we regret to inform you that your application ${data.leadId} could not be approved at this time.</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        <p>Please don't be discouraged. You can:</p>
        <ul>
          <li>Improve your credit score and reapply</li>
          <li>Consider alternative loan options</li>
          <li>Contact our consultant for guidance</li>
        </ul>
        <p>We're here to help you find the right financial solution.</p>
        <br>
        <p>Best regards,<br>Malabar Bazaar Finance Team</p>
      `,
    },
    whatsapp: (data) => `Dear ${data.name},\n\n${data.leadId} update:\n\n${data.reason || 'Could not be approved at this time.'}\n\nContact consultant for options.\n\n- Malabar Bazaar`,
  },

  SLA_REMINDER_CONSULTANT: {
    sms: (data) => `⚠️ SLA Alert: ${data.overdueCount} overdue leads. Please take action. - Malabar Bazaar Admin`,
    email: {
      subject: (data) => `⚠️ SLA Alert: ${data.overdueCount} Overdue Leads`,
      html: (data) => `
        <h2 style="color: red;">⚠️ SLA Alert</h2>
        <p>Dear Consultant,</p>
        <p>You have <strong>${data.overdueCount}</strong> leads that are overdue for action.</p>
        <ul>
          <li>Overdue: ${data.overdueCount}</li>
          <li>Due Soon: ${data.dueSoonCount}</li>
          <li>Without SLA: ${data.withoutSlaCount}</li>
        </ul>
        <p>Please log in to the system and take necessary actions to maintain our service standards.</p>
        <br>
        <p>Malabar Bazaar Admin</p>
      `,
    },
  },
};

class NotificationService {
  async sendSMS(phone, message) {
    if (!twilioClient) {
      logger.warn('Twilio not configured, skipping SMS');
      return { success: false, reason: 'twilio-not-configured' };
    }

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE,
        to: formattedPhone,
      });

      logger.info(`SMS sent to ${phone}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error(`SMS send failed to ${phone}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendEmail(to, subject, html, fromName = SENDGRID_FROM_NAME) {
    if (!sgMail) {
      logger.warn('SendGrid not configured, skipping email');
      return { success: false, reason: 'sendgrid-not-configured' };
    }

    try {
      const msg = {
        to,
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: fromName,
        },
        subject,
        html,
      };

      await sgMail.send(msg);
      logger.info(`Email sent to ${to}: ${subject}`);
      return { success: true };
    } catch (error) {
      logger.error(`Email send failed to ${to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsApp(phone, message) {
    if (!twilioClient || !TWILIO_WHATSAPP) {
      logger.warn('Twilio WhatsApp not configured, skipping');
      return { success: false, reason: 'whatsapp-not-configured' };
    }

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${TWILIO_WHATSAPP}`,
        to: `whatsapp:${formattedPhone}`,
      });

      logger.info(`WhatsApp sent to ${phone}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error(`WhatsApp send failed to ${phone}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendNotification(type, channels, data) {
    const template = NotificationTemplates[type];
    if (!template) {
      logger.warn(`No template found for notification type: ${type}`);
      return { success: false, reason: 'template-not-found' };
    }

    const results = {};

    if (channels.includes('sms') && data.phone && template.sms) {
      results.sms = await this.sendSMS(data.phone, template.sms(data));
    }

    if (channels.includes('email') && data.email && template.email) {
      const { subject, html } = template.email;
      results.email = await this.sendEmail(
        data.email,
        subject(data),
        html(data)
      );
    }

    if (channels.includes('whatsapp') && data.phone && data.whatsappOptIn && template.whatsapp) {
      results.whatsapp = await this.sendWhatsApp(data.phone, template.whatsapp(data));
    }

    return results;
  }

  async notifyLeadReceived(lead, userEmail = '') {
    return this.sendNotification('LEAD_RECEIVED', ['sms', 'email'], {
      name: lead.fullName,
      phone: lead.phone,
      email: userEmail,
      leadId: lead.leadId,
      amount: lead.amount,
      loanCategory: lead.loanCategory,
      createdAt: lead.createdAt,
    });
  }

  async notifyDocumentsPending(lead, pendingDocs = [], userEmail = '') {
    return this.sendNotification('DOCUMENTS_PENDING', ['sms', 'email', 'whatsapp'], {
      name: lead.fullName,
      phone: lead.phone,
      email: userEmail,
      leadId: lead.leadId,
      pendingDocs,
      whatsappOptIn: lead.whatsappOptIn,
      uploadLink: `${process.env.APP_URL || 'https://malabarbazaar.com'}/finance#apply`,
    });
  }

  async notifyConsultantAssigned(lead, userEmail = '') {
    return this.sendNotification('CONSULTANT_ASSIGNED', ['sms', 'email', 'whatsapp'], {
      name: lead.fullName,
      phone: lead.phone,
      email: userEmail,
      leadId: lead.leadId,
      consultantName: lead.consultant?.name || '',
      consultantPhone: lead.consultant?.phone || '',
      whatsappOptIn: lead.whatsappOptIn,
    });
  }

  async notifyStatusUpdate(lead, statusLabel, note = '', userEmail = '') {
    return this.sendNotification('STATUS_UPDATE', ['sms', 'email', 'whatsapp'], {
      name: lead.fullName,
      phone: lead.phone,
      email: userEmail,
      leadId: lead.leadId,
      statusLabel,
      note,
      whatsappOptIn: lead.whatsappOptIn,
    });
  }

  async notifyApproved(lead, userEmail = '') {
    return this.sendNotification('APPROVED', ['sms', 'email', 'whatsapp'], {
      name: lead.fullName,
      phone: lead.phone,
      email: userEmail,
      leadId: lead.leadId,
      amount: lead.amount,
      institutionName: lead.institution?.name || 'Our partner',
      consultantName: lead.consultant?.name || '',
      consultantPhone: lead.consultant?.phone || '',
      whatsappOptIn: lead.whatsappOptIn,
    });
  }

  async notifyRejected(lead, reason = '', userEmail = '') {
    return this.sendNotification('REJECTED', ['sms', 'email'], {
      name: lead.fullName,
      phone: lead.phone,
      email: userEmail,
      leadId: lead.leadId,
      reason,
      whatsappOptIn: lead.whatsappOptIn,
    });
  }

  async notifySLAAlert(consultantEmail, slaData) {
    return this.sendNotification('SLA_REMINDER_CONSULTANT', ['email'], {
      email: consultantEmail,
      ...slaData,
    });
  }
}

module.exports = new NotificationService();
