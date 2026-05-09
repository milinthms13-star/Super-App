/**
 * Fraud Detection Controller - Phase 10 REST Endpoints
 * Fraud detection and case management endpoints
 */

const { validationResult } = require('express-validator');
const FraudDetectionService = require('../services/FraudDetectionService');

class FraudDetectionController {
  async detectFraud(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { orderId, userId, fraudData } = req.body;

      const result = await FraudDetectionService.detectFraud(orderId, userId, fraudData);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Fraud detection failed',
        errors: [error.message],
      });
    }
  }

  async getFraudCaseDetails(req, res) {
    try {
      const { fraudId } = req.params;

      const result = await FraudDetectionService.getFraudCaseDetails(fraudId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve fraud case details',
        errors: [error.message],
      });
    }
  }

  async escalateCase(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { fraudId } = req.params;
      const { escalationLevel, reason, escalatedTo } = req.body;

      const result = await FraudDetectionService.escalateCase(fraudId, escalationLevel, reason, escalatedTo);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to escalate case',
        errors: [error.message],
      });
    }
  }

  async resolveFraudCase(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { fraudId } = req.params;
      const { outcome, disposition } = req.body;

      const result = await FraudDetectionService.resolveFraudCase(fraudId, outcome, disposition);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to resolve fraud case',
        errors: [error.message],
      });
    }
  }

  async listFraudCases(req, res) {
    try {
      const filters = {
        userId: req.query.userId,
        riskLevel: req.query.riskLevel,
        status: req.query.status,
        fraudType: req.query.fraudType,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await FraudDetectionService.listFraudCases(filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to list fraud cases',
        errors: [error.message],
      });
    }
  }
}

module.exports = new FraudDetectionController();
