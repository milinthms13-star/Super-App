const queue = require('../lib/queue');
const User = require('../models/User');
const SosIncident = require('../models/SosIncident');
const { sendSMS, sendWhatsApp, sendLinkUpMessage } = require('../services/sosNotificationService');
const voiceCallService = require('../services/voiceCallService');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 3;

queue.process(async (job) => {
  if (!job || !job.name || job.name !== 'sos-notifications') return;
  const { incidentId, payload } = job.data || job;
  logger.info('Processing SOS notification job', { incidentId });

  const incident = await SosIncident.findById(incidentId);
  if (!incident) {
    logger.error('SOS incident not found for notification job', { incidentId });
    return;
  }

  const recipients = (payload && payload.recipients) || [];

  incident.alertQueueStatus = 'processing';
  incident.lastDispatchedAt = new Date();
  await incident.save();

  for (const rec of recipients) {
    const baseDelivery = {
      to: rec.phone || '',
      channel: '',
      status: 'queued',
      timestamp: new Date(),
    };

    for (const channel of rec.channels || []) {
      const delivery = { ...baseDelivery, channel, to: rec.phone || '' };
      try {
        if (channel === 'SMS' && rec.phone) {
          delivery.type = 'sms';
          const result = await sendSMS(rec.phone, payload.message);
          delivery.status = result.status || (result.success ? 'sent' : 'failed');
          delivery.providerResponse = result;
        } else if (channel === 'WhatsApp' && rec.phone) {
          delivery.type = 'whatsapp';
          const result = await sendWhatsApp(rec.phone, payload.message);
          delivery.status = result.status || (result.success ? 'sent' : 'failed');
          delivery.providerResponse = result;
        } else if (channel === 'LinkUp') {
          delivery.type = 'linkup';
          const recipient = await User.findOne({ phone: rec.phone.trim() });
          if (!recipient) {
            delivery.status = 'failed';
            delivery.error = 'LINKUP_USER_NOT_FOUND';
          } else {
            await sendLinkUpMessage({
              senderId: payload.userId,
              recipientId: recipient._id,
              content: payload.message,
            });
            delivery.status = 'sent';
          }
        } else if (channel === 'Call' && rec.phone) {
          delivery.type = 'call';
          const result = await voiceCallService.initiateVoiceCall({
            reminderId: incidentId.toString(),
            recipientPhoneNumber: rec.phone,
            voiceMessage: payload.voiceMessage || `Emergency alert: ${payload.reason}`,
            messageType: 'text',
            senderName: payload.userName || 'SOS',
          });
          delivery.status = result.status || (result.success ? 'sent' : 'failed');
          delivery.providerResponse = result;
        } else {
          delivery.status = 'failed';
          delivery.error = `Unsupported channel ${channel}`;
        }

        incident.notificationsSent.push(delivery);
        await incident.save();
      } catch (err) {
        logger.error('Failed to deliver sos notification', { incidentId, rec, channel, err });
        incident.notificationsSent.push({
          ...delivery,
          status: 'failed',
          error: String(err.message || err),
        });
        await incident.save();
      }
    }
  }

  incident.alertQueueStatus = 'completed';
  await incident.save();
  logger.info('Completed SOS notification job', { incidentId });
});
