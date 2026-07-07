const nodemailer = require('nodemailer');
const twilio = require('twilio');

const EMAIL_FROM = process.env.HEALTHCARE_EMAIL_FROM || 'noreply@malabarbazaar.com';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let emailTransporter = null;
let twilioClient = null;

const initializeEmailTransporter = () => {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[HealthcareNotificationService] Email credentials not configured. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const initializeTwilioClient = () => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[HealthcareNotificationService] Twilio credentials not configured. SMS notifications disabled.');
    return null;
  }

  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

const getEmailTransporter = () => {
  if (!emailTransporter) {
    emailTransporter = initializeEmailTransporter();
  }
  return emailTransporter;
};

const getTwilioClient = () => {
  if (!twilioClient) {
    twilioClient = initializeTwilioClient();
  }
  return twilioClient;
};

// Email Templates
const emailTemplates = {
  appointmentBooked: ({ patientName, doctorName, appointmentDate, appointmentTime }) => ({
    subject: 'Appointment Confirmed - Malabar Bazaar Healthcare',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Appointment Confirmed</h2>
        <p>Dear ${patientName},</p>
        <p>Your appointment has been successfully booked.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
        </div>
        <p>Please arrive 10 minutes early for your appointment.</p>
        <p>Best regards,<br>Malabar Bazaar Healthcare Team</p>
      </div>
    `,
  }),

  appointmentReminder: ({ patientName, doctorName, appointmentDate, appointmentTime }) => ({
    subject: 'Appointment Reminder - Tomorrow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Appointment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a reminder about your upcoming appointment.</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
        </div>
        <p>Please don't forget to bring any relevant medical records.</p>
        <p>Best regards,<br>Malabar Bazaar Healthcare Team</p>
      </div>
    `,
  }),

  prescriptionReady: ({ patientName, doctorName, prescriptionNumber }) => ({
    subject: 'Your Prescription is Ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Prescription Ready</h2>
        <p>Dear ${patientName},</p>
        <p>Dr. ${doctorName} has issued your prescription.</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Prescription Number:</strong> ${prescriptionNumber}</p>
        </div>
        <p>You can now order your medicines through our pharmacy delivery service.</p>
        <p>Best regards,<br>Malabar Bazaar Healthcare Team</p>
      </div>
    `,
  }),

  labReportReady: ({ patientName, testName, reportDate }) => ({
    subject: 'Your Lab Report is Ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Lab Report Available</h2>
        <p>Dear ${patientName},</p>
        <p>Your lab report is now available.</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Test:</strong> ${testName}</p>
          <p><strong>Report Date:</strong> ${reportDate}</p>
        </div>
        <p>Please log in to your account to view and download your report.</p>
        <p>Best regards,<br>Malabar Bazaar Healthcare Team</p>
      </div>
    `,
  }),

  pharmacyOrderShipped: ({ patientName, orderNumber, trackingUrl }) => ({
    subject: 'Your Medicine Order is Out for Delivery',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Order Shipped</h2>
        <p>Dear ${patientName},</p>
        <p>Your pharmacy order is out for delivery.</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          ${trackingUrl ? `<p><a href="${trackingUrl}" style="color: #2c5aa0;">Track Your Order</a></p>` : ''}
        </div>
        <p>Expected delivery today.</p>
        <p>Best regards,<br>Malabar Bazaar Healthcare Team</p>
      </div>
    `,
  }),

  emergencyAlert: ({ patientName, incidentType, location }) => ({
    subject: 'URGENT: Emergency Alert',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Emergency Alert</h2>
        <p><strong>URGENT NOTIFICATION</strong></p>
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Incident Type:</strong> ${incidentType}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
        <p>This is an automated emergency alert. Please take immediate action.</p>
        <p>Emergency Response Team</p>
      </div>
    `,
  }),

  videoConsultationLink: ({ patientName, doctorName, meetingUrl, scheduledTime }) => ({
    subject: 'Video Consultation Link - Join Your Appointment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Video Consultation Ready</h2>
        <p>Dear ${patientName},</p>
        <p>Your video consultation with Dr. ${doctorName} is scheduled for ${scheduledTime}.</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Join Meeting:</strong></p>
          <a href="${meetingUrl}" style="display: inline-block; background-color: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Join Video Consultation</a>
        </div>
        <p>Please ensure you have a stable internet connection and your camera/microphone are working.</p>
        <p>Best regards,<br>Malabar Bazaar Healthcare Team</p>
      </div>
    `,
  }),
};

// SMS Templates
const smsTemplates = {
  appointmentBooked: ({ patientName, doctorName, appointmentDate, appointmentTime }) =>
    `Hi ${patientName}, your appointment with ${doctorName} is confirmed for ${appointmentDate} at ${appointmentTime}. - Malabar Bazaar Healthcare`,

  appointmentReminder: ({ patientName, doctorName, appointmentDate, appointmentTime }) =>
    `Reminder: Your appointment with ${doctorName} is tomorrow at ${appointmentTime}. Please arrive 10 mins early. - Malabar Bazaar Healthcare`,

  prescriptionReady: ({ patientName, prescriptionNumber }) =>
    `Hi ${patientName}, your prescription ${prescriptionNumber} is ready. Order medicines from our pharmacy. - Malabar Bazaar Healthcare`,

  labReportReady: ({ patientName, testName }) =>
    `Hi ${patientName}, your ${testName} report is ready. Log in to view. - Malabar Bazaar Healthcare`,

  pharmacyOrderShipped: ({ patientName, orderNumber }) =>
    `Hi ${patientName}, your order ${orderNumber} is out for delivery. Expected today. - Malabar Bazaar Healthcare`,

  emergencyAlert: ({ patientName, incidentType, location }) =>
    `URGENT: Emergency alert for ${patientName}. Type: ${incidentType}. Location: ${location}. Immediate action required.`,

  videoConsultationLink: ({ patientName, doctorName, meetingUrl }) =>
    `Hi ${patientName}, join your video consultation with Dr. ${doctorName}: ${meetingUrl} - Malabar Bazaar Healthcare`,
};

const sendEmail = async ({ to, templateName, data }) => {
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.warn('[HealthcareNotificationService] Email not sent - transporter not configured');
    return { sent: false, reason: 'Email not configured' };
  }

  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const { subject, html } = template(data);

    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error('[HealthcareNotificationService] Email send error:', error);
    return { sent: false, reason: error.message };
  }
};

const sendSMS = async ({ to, templateName, data }) => {
  const client = getTwilioClient();
  if (!client) {
    console.warn('[HealthcareNotificationService] SMS not sent - Twilio not configured');
    return { sent: false, reason: 'SMS not configured' };
  }

  try {
    const template = smsTemplates[templateName];
    if (!template) {
      throw new Error(`SMS template '${templateName}' not found`);
    }

    const body = template(data);

    await client.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to,
      body,
    });

    return { sent: true };
  } catch (error) {
    console.error('[HealthcareNotificationService] SMS send error:', error);
    return { sent: false, reason: error.message };
  }
};

const sendNotification = async ({ type, channel, to, templateName, data }) => {
  const results = {
    email: { sent: false },
    sms: { sent: false },
  };

  if (channel === 'email' || channel === 'both') {
    results.email = await sendEmail({ to, templateName, data });
  }

  if (channel === 'sms' || channel === 'both') {
    results.sms = await sendSMS({ to, templateName, data });
  }

  return results;
};

module.exports = {
  sendEmail,
  sendSMS,
  sendNotification,
  emailTemplates,
  smsTemplates,
};
