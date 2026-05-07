const logger = require('../utils/logger');

let snsClient;

const getSNSClient = () => {
  if (snsClient) {
    return snsClient;
  }

  try {
    // Optional dependency: not every environment installs AWS SNS support.
    const AWS = require('aws-sdk');
    snsClient = new AWS.SNS({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    return snsClient;
  } catch (error) {
    logger.warn(`AWS SNS SDK unavailable: ${error.message}`);
    return null;
  }
};

/**
 * Send SMS via AWS SNS or Twilio
 * @param {string} phoneNumber - Phone number in E.164 format or standard format
 * @param {string} message - SMS message text
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
exports.sendSMS = async (phoneNumber, message) => {
  try {
    // Use AWS SNS
    if (process.env.SMS_PROVIDER === 'aws' || !process.env.SMS_PROVIDER) {
      const sns = getSNSClient();
      if (sns) {
        return await sendSMSViaSNS(sns, phoneNumber, message);
      }

      logger.warn(`AWS SNS unavailable, simulating SMS to ${phoneNumber}`);
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        message: 'SMS sent (simulated)',
      };
    }

    // Use Twilio
    if (process.env.SMS_PROVIDER === 'twilio') {
      return await sendSMSViaTwilio(phoneNumber, message);
    }

    // Fallback
    logger.warn(`SMS Provider not configured, simulating SMS to ${phoneNumber}`);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      message: 'SMS sent (simulated)',
    };
  } catch (error) {
    logger.error(`sendSMS error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send SMS via AWS SNS
 */
async function sendSMSViaSNS(sns, phoneNumber, message) {
  try {
    // Format phone number to E.164 format if needed
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      // Assume Indian number if no country code
      if (phoneNumber.length === 10) {
        formattedPhone = `+91${phoneNumber}`;
      } else {
        formattedPhone = `+${phoneNumber}`;
      }
    }

    const params = {
      Message: message,
      PhoneNumber: formattedPhone,
      MessageAttributes: {
        AWS_SNS_SMS_TYPE: {
          StringValue: 'Transactional',
          DataType: 'String',
        },
        AWS_SNS_SMS_SENDER_ID: {
          StringValue: 'NilaHub',
          DataType: 'String',
        },
      },
    };

    const result = await sns.publish(params).promise();

    logger.info(`SMS sent to ${formattedPhone}: ${result.MessageId}`);
    return {
      success: true,
      messageId: result.MessageId,
      message: 'SMS sent successfully',
    };
  } catch (error) {
    logger.error(`AWS SNS SMS error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMSViaTwilio(phoneNumber, message) {
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Format phone number
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.length === 10) {
        formattedPhone = `+91${phoneNumber}`;
      } else {
        formattedPhone = `+${phoneNumber}`;
      }
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    logger.info(`Twilio SMS sent to ${formattedPhone}: ${result.sid}`);
    return {
      success: true,
      messageId: result.sid,
      message: 'SMS sent successfully',
    };
  } catch (error) {
    logger.error(`Twilio SMS error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send bulk SMS to multiple recipients
 */
exports.sendBulkSMS = async (phoneNumbers, message) => {
  try {
    const results = await Promise.all(
      phoneNumbers.map((phone) => exports.sendSMS(phone, message))
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info(`Bulk SMS sent: ${successful} successful, ${failed} failed`);
    return {
      success: failed === 0,
      sent: successful,
      failed,
      results,
    };
  } catch (error) {
    logger.error(`sendBulkSMS error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send WhatsApp message (via Twilio or similar)
 */
exports.sendWhatsApp = async (phoneNumber, message) => {
  try {
    // TODO: Implement WhatsApp integration
    // For now, fall back to SMS
    logger.warn('WhatsApp integration not yet implemented, using SMS instead');
    return exports.sendSMS(phoneNumber, message);
  } catch (error) {
    logger.error(`sendWhatsApp error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Make voice call (emergency alert)
 */
exports.makeCall = async (phoneNumber, message, voiceUrl) => {
  try {
    // TODO: Implement voice call integration with Twilio
    logger.warn('Voice call integration not yet implemented');
    return {
      success: false,
      error: 'Voice call not yet implemented',
    };
  } catch (error) {
    logger.error(`makeCall error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};
