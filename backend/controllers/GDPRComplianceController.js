/**
 * GDPR Compliance Controller - Phase 10 REST Endpoints
 * GDPR compliance and user data management endpoints
 */

const { validationResult } = require('express-validator');
const GDPRComplianceService = require('../services/GDPRComplianceService');

class GDPRComplianceController {
  async initializeCompliance(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId, userEmail, userCountry } = req.body;

      const result = await GDPRComplianceService.initializeUserCompliance(userId, userEmail, userCountry);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize GDPR compliance',
        errors: [error.message],
      });
    }
  }

  async updateConsent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId } = req.params;
      const { consentType, agreed, version } = req.body;

      const result = await GDPRComplianceService.updateConsent(userId, consentType, agreed, version);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update consent',
        errors: [error.message],
      });
    }
  }

  async requestDataExport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId } = req.params;
      const { format } = req.body;

      const result = await GDPRComplianceService.requestDataExport(userId, format || 'json');

      return res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to request data export',
        errors: [error.message],
      });
    }
  }

  async requestDataErasure(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId } = req.params;
      const { reason } = req.body;

      const result = await GDPRComplianceService.requestDataErasure(userId, reason);

      return res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to request data erasure',
        errors: [error.message],
      });
    }
  }

  async getComplianceStatus(req, res) {
    try {
      const { userId } = req.params;

      const result = await GDPRComplianceService.getComplianceStatus(userId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve compliance status',
        errors: [error.message],
      });
    }
  }

  async recordBreach(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId } = req.params;
      const breachData = req.body;

      const result = await GDPRComplianceService.recordBreachNotification(userId, breachData);

      return res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to record breach notification',
        errors: [error.message],
      });
    }
  }

  async addAuditEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId } = req.params;
      const { eventType, description, performedBy } = req.body;
      const ipAddress = req.ip;

      const result = await GDPRComplianceService.addAuditEvent(userId, eventType, description, performedBy, ipAddress);

      return res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to record audit event',
        errors: [error.message],
      });
    }
  }
}

module.exports = new GDPRComplianceController();
