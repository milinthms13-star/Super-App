const queue = require('../lib/queue');

const QUEUE_NAME = 'sos-notifications';

async function enqueueNotificationJob(incidentId, payload = {}) {
  return queue.add(QUEUE_NAME, { incidentId, payload });
}

module.exports = { enqueueNotificationJob, QUEUE_NAME };
