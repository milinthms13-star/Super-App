module.exports = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',  // Your Twilio number e.g. '+15551234567'
  
  // Graceful fallback for development/testing
  isConfigured: () => {
    return !!(process.env.TWILIO_ACCOUNT_SID && 
              process.env.TWILIO_AUTH_TOKEN && 
              process.env.TWILIO_PHONE_NUMBER);
  }
};
