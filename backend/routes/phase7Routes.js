/**
 * Phase 7 Routes
 * ML Fraud Detection and Advanced Alert Management
 */

const express = require('express');
const router = express.Router();
const MLFraudController = require('../controllers/MLFraudController');
const FraudAlertController = require('../controllers/FraudAlertController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getTransactionScoreValidation,
  createModelValidation,
  listAlertsValidation,
  acknowledgeAlertValidation,
  escalateAlertValidation,
  investigateAlertValidation,
  recordActionValidation,
  resolveAlertValidation,
  dismissAlertValidation,
  getUserPatternsValidation,
  getUserAnomaliesValidation,
  getStatisticsValidation,
} = require('../middleware/Phase7Validations');

/**
 * ML Model Endpoints
 */

/**
 * GET /api/v1/fraud/ml/models
 * List available ML models
 */
router.get('/fraud/ml/models', authenticateToken, MLFraudController.listModels.bind(MLFraudController));

/**
 * POST /api/v1/fraud/ml/models
 * Create new ML model
 */
router.post(
  '/fraud/ml/models',
  authenticateToken,
  createModelValidation,
  MLFraudController.createModel.bind(MLFraudController)
);

/**
 * POST /api/v1/fraud/ml/score
 * Get ML fraud score for transaction
 */
router.post(
  '/fraud/ml/score',
  authenticateToken,
  getTransactionScoreValidation,
  MLFraudController.getTransactionScore.bind(MLFraudController)
);

/**
 * Behavioral Pattern Endpoints
 */

/**
 * GET /api/v1/fraud/patterns/:userId
 * Get behavioral patterns for user
 */
router.get(
  '/fraud/patterns/:userId',
  authenticateToken,
  getUserPatternsValidation,
  MLFraudController.getUserPatterns.bind(MLFraudController)
);

/**
 * GET /api/v1/fraud/patterns/:userId/anomalies
 * Get behavioral anomalies for user
 */
router.get(
  '/fraud/patterns/:userId/anomalies',
  authenticateToken,
  getUserAnomaliesValidation,
  MLFraudController.getUserAnomalies.bind(MLFraudController)
);

/**
 * Fraud Alert Endpoints
 */

/**
 * GET /api/v1/fraud/alerts
 * List fraud alerts
 */
router.get(
  '/fraud/alerts',
  authenticateToken,
  listAlertsValidation,
  FraudAlertController.listAlerts.bind(FraudAlertController)
);

/**
 * GET /api/v1/fraud/alerts/:alertId
 * Get alert details
 */
router.get(
  '/fraud/alerts/:alertId',
  authenticateToken,
  FraudAlertController.getAlert.bind(FraudAlertController)
);

/**
 * POST /api/v1/fraud/alerts/:alertId/acknowledge
 * Acknowledge alert
 */
router.post(
  '/fraud/alerts/:alertId/acknowledge',
  authenticateToken,
  acknowledgeAlertValidation,
  FraudAlertController.acknowledgeAlert.bind(FraudAlertController)
);

/**
 * POST /api/v1/fraud/alerts/:alertId/escalate
 * Escalate alert
 */
router.post(
  '/fraud/alerts/:alertId/escalate',
  authenticateToken,
  escalateAlertValidation,
  FraudAlertController.escalateAlert.bind(FraudAlertController)
);

/**
 * POST /api/v1/fraud/alerts/:alertId/investigate
 * Start investigation
 */
router.post(
  '/fraud/alerts/:alertId/investigate',
  authenticateToken,
  investigateAlertValidation,
  FraudAlertController.investigateAlert.bind(FraudAlertController)
);

/**
 * POST /api/v1/fraud/alerts/:alertId/action
 * Record action on alert
 */
router.post(
  '/fraud/alerts/:alertId/action',
  authenticateToken,
  recordActionValidation,
  FraudAlertController.recordAction.bind(FraudAlertController)
);

/**
 * POST /api/v1/fraud/alerts/:alertId/resolve
 * Resolve alert
 */
router.post(
  '/fraud/alerts/:alertId/resolve',
  authenticateToken,
  resolveAlertValidation,
  FraudAlertController.resolveAlert.bind(FraudAlertController)
);

/**
 * POST /api/v1/fraud/alerts/:alertId/dismiss
 * Dismiss alert as false positive
 */
router.post(
  '/fraud/alerts/:alertId/dismiss',
  authenticateToken,
  dismissAlertValidation,
  FraudAlertController.dismissAlert.bind(FraudAlertController)
);

/**
 * GET /api/v1/fraud/alerts/statistics
 * Get fraud alert statistics
 */
router.get(
  '/fraud/alerts/statistics',
  authenticateToken,
  getStatisticsValidation,
  FraudAlertController.getStatistics.bind(FraudAlertController)
);

module.exports = router;
