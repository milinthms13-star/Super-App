const logger = require('./logger');

/**
 * Send push notification via browser/mobile (Firebase Cloud Messaging or Web Push API)
 * @param {string} pushToken - FCM token or subscription endpoint
 * @param {Object} notification - Notification data {title, body, icon, badge}
 * @param {string} reminderId - Reminder ID for tracking
 * @returns {Promise<Object>}
 */
const sendPushNotification = async (pushToken, notification, reminderId) => {
  if (!process.env.FCM_SERVER_KEY && !process.env.VAPID_PUBLIC_KEY) {
    logger.warn('Push notification config missing');
    return { success: false, status: 'config-missing', error: 'Push notifications not configured' };
  }

  try {
    // If FCM token (Firebase Cloud Messaging)
    if (process.env.FCM_SERVER_KEY && pushToken.includes(':')) {
      return await sendFCMNotification(pushToken, notification, reminderId);
    }

    // If Web Push subscription endpoint
    if (pushToken.includes('https')) {
      return await sendWebPushNotification(pushToken, notification, reminderId);
    }

    return { success: false, status: 'invalid-format', error: 'Invalid push token format' };
  } catch (error) {
    logger.error('Push notification send failed', {
      error: error.message,
      reminderId
    });

    return {
      success: false,
      error: error.message,
      status: 'failed'
    };
  }
};

/**
 * Send Firebase Cloud Messaging notification
 */
async function sendFCMNotification(fcmToken, notification, reminderId) {
  const axios = require('axios');

  try {
    const response = await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      {
        to: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/logo192.png',
          badge: notification.badge || '/badge-72x72.png',
          click_action: `${process.env.FRONTEND_URL}/reminders`
        },
        data: {
          reminderId,
          click_action: `${process.env.FRONTEND_URL}/reminders`
        }
      },
      {
        headers: {
          'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    logger.info('FCM notification sent successfully', { reminderId, messageId: response.data.message_id });
    return {
      success: true,
      messageId: response.data.message_id,
      status: 'sent'
    };
  } catch (error) {
    logger.error('FCM send failed', {
      error: error.response?.data || error.message,
      reminderId
    });

    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: 'failed'
    };
  }
}

/**
 * Send Web Push notification (using Web Push protocol)
 */
async function sendWebPushNotification(subscription, notification, reminderId) {
  try {
    const webpush = require('web-push');

    // Configure VAPID
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:notifications@malabarbazaar.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/logo192.png',
      badge: notification.badge || '/badge-72x72.png',
      tag: `reminder-${reminderId}`,
      requireInteraction: true,
      data: {
        reminderId,
        click_action: `${process.env.FRONTEND_URL}/reminders`
      }
    });

    await webpush.sendNotification(subscription, pushPayload);

    logger.info('Web push notification sent successfully', { reminderId });
    return {
      success: true,
      status: 'sent'
    };
  } catch (error) {
    logger.error('Web push send failed', {
      error: error.message,
      reminderId
    });

    return {
      success: false,
      error: error.message,
      status: 'failed'
    };
  }
}

module.exports = { sendPushNotification };
