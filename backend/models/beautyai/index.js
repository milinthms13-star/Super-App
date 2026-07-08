/**
 * BeautyAI Models Index
 * Central export for all beauty AI database models
 */

const BeautyPlan = require('./BeautyPlan');
const BeautyTip = require('./BeautyTip');
const BeautyProgressLog = require('./BeautyProgressLog');
const BeautySubscriptionRule = require('./BeautySubscriptionRule');
const BeautyUsageQuota = require('./BeautyUsageQuota');
const BeautyConsentAudit = require('./BeautyConsentAudit');
const BeautyOpsEvent = require('./BeautyOpsEvent');
const BeautySelfie = require('./BeautySelfie');

module.exports = {
  BeautyPlan,
  BeautyTip,
  BeautyProgressLog,
  BeautySubscriptionRule,
  BeautyUsageQuota,
  BeautyConsentAudit,
  BeautyOpsEvent,
  BeautySelfie,
};
