const logger = require('../utils/logger');
const { purgeExpiredHealthcareRecords } = require('../services/healthcareRetentionService');

let retentionTimer = null;

const isEnabled = () => {
  return ['1', 'true', 'yes', 'on'].includes(
    String(process.env.HEALTHCARE_RETENTION_PURGE_ENABLED || 'true').toLowerCase()
  );
};

const getIntervalMs = () => {
  const configured = Number(process.env.HEALTHCARE_RETENTION_PURGE_INTERVAL_MS || 6 * 60 * 60 * 1000);
  if (!Number.isFinite(configured) || configured < 5 * 60 * 1000) {
    return 6 * 60 * 60 * 1000;
  }
  return configured;
};

const runOnce = async () => {
  try {
    const result = await purgeExpiredHealthcareRecords({ limit: 500 });
    logger.info(
      `Healthcare retention purge: scanned=${result.scanned}, purged=${result.purged}, s3Deleted=${result.s3Deleted}, s3DeleteFailed=${result.s3DeleteFailed}`
    );
  } catch (error) {
    logger.warn(`Healthcare retention purge failed: ${error.message}`);
  }
};

const startHealthcareRetentionScheduler = () => {
  if (!isEnabled()) {
    logger.info('Healthcare retention purge scheduler is disabled by env.');
    return;
  }
  if (retentionTimer) {
    return;
  }
  const intervalMs = getIntervalMs();
  retentionTimer = setInterval(() => {
    void runOnce();
  }, intervalMs);
  retentionTimer.unref?.();
  void runOnce();
  logger.info(`Healthcare retention purge scheduler started (interval ${intervalMs} ms).`);
};

const stopHealthcareRetentionScheduler = () => {
  if (!retentionTimer) {
    return;
  }
  clearInterval(retentionTimer);
  retentionTimer = null;
  logger.info('Healthcare retention purge scheduler stopped.');
};

module.exports = {
  startHealthcareRetentionScheduler,
  stopHealthcareRetentionScheduler,
};
