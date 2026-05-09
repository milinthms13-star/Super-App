/**
 * User Data Export Controller - Phase 10 REST Endpoints
 * GDPR user data export request and download endpoints
 */

const { validationResult } = require('express-validator');
const UserDataExportService = require('../services/UserDataExportService');

class UserDataExportController {
  async createExportRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId, userEmail, format, scope, customFields } = req.body;

      const result = await UserDataExportService.createExportRequest(
        userId,
        userEmail,
        format || 'json',
        scope || 'all',
        customFields || []
      );

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create export request',
        errors: [error.message],
      });
    }
  }

  async getExportStatus(req, res) {
    try {
      const { exportId } = req.params;

      const result = await UserDataExportService.getExportStatus(exportId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve export status',
        errors: [error.message],
      });
    }
  }

  async startProcessing(req, res) {
    try {
      const { exportId } = req.params;

      const result = await UserDataExportService.startExportProcessing(exportId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to start export processing',
        errors: [error.message],
      });
    }
  }

  async completeProcessing(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { exportId } = req.params;
      const { totalRecords, totalSize, fileName, checksum } = req.body;

      const result = await UserDataExportService.completeExportProcessing(
        exportId,
        totalRecords,
        totalSize,
        fileName,
        checksum
      );

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to complete export processing',
        errors: [error.message],
      });
    }
  }

  async markAsFailed(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { exportId } = req.params;
      const { reason } = req.body;

      const result = await UserDataExportService.markExportAsFailed(exportId, reason);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to mark export as failed',
        errors: [error.message],
      });
    }
  }

  async downloadExportFile(req, res) {
    try {
      const { exportId } = req.params;
      const ipAddress = req.ip;

      const result = await UserDataExportService.downloadExportFile(exportId, ipAddress);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to download export file',
        errors: [error.message],
      });
    }
  }

  async getUserExports(req, res) {
    try {
      const { userId } = req.params;
      const filters = {
        status: req.query.status,
        limit: parseInt(req.query.limit) || 20,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await UserDataExportService.getUserExports(userId, filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user exports',
        errors: [error.message],
      });
    }
  }

  async cancelExportRequest(req, res) {
    try {
      const { exportId } = req.params;

      const result = await UserDataExportService.cancelExportRequest(exportId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel export request',
        errors: [error.message],
      });
    }
  }
}

module.exports = new UserDataExportController();
