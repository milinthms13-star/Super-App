/**
 * PCI DSS Compliance Controller - Phase 10 REST Endpoints
 * PCI DSS compliance management endpoints
 */

const { validationResult } = require('express-validator');
const PCIDSSComplianceService = require('../services/PCIDSSComplianceService');

class PCIDSSComplianceController {
  async createComplianceRecord(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { organizationName, assessmentYear } = req.body;

      const result = await PCIDSSComplianceService.createComplianceRecord(organizationName, assessmentYear);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create compliance record',
        errors: [error.message],
      });
    }
  }

  async updateRequirementStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { complianceId, requirementId } = req.params;
      const { status, findings, remediation } = req.body;

      const result = await PCIDSSComplianceService.updateRequirementStatus(
        complianceId,
        requirementId,
        status,
        findings,
        remediation
      );

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update requirement status',
        errors: [error.message],
      });
    }
  }

  async getComplianceStatus(req, res) {
    try {
      const { complianceId } = req.params;

      const result = await PCIDSSComplianceService.getComplianceStatus(complianceId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve compliance status',
        errors: [error.message],
      });
    }
  }

  async scheduleAudit(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { complianceId } = req.params;
      const { auditDate, auditorName, auditorCertification } = req.body;

      const result = await PCIDSSComplianceService.scheduleAudit(
        complianceId,
        auditDate,
        auditorName,
        auditorCertification
      );

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to schedule audit',
        errors: [error.message],
      });
    }
  }

  async recordIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { complianceId } = req.params;
      const { incidentDate, incidentType, description, cardsAffected } = req.body;

      const result = await PCIDSSComplianceService.recordIncident(
        complianceId,
        incidentDate,
        incidentType,
        description,
        cardsAffected
      );

      return res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to record incident',
        errors: [error.message],
      });
    }
  }

  async getCertificationDetails(req, res) {
    try {
      const { complianceId } = req.params;

      const result = await PCIDSSComplianceService.getCertificationDetails(complianceId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve certification details',
        errors: [error.message],
      });
    }
  }
}

module.exports = new PCIDSSComplianceController();
