/**
 * Reconciliation Controller - Phase 11 Payment Processing
 * Handles API endpoints for reconciliation operations
 */

const ReconciliationService = require('../services/ReconciliationService');
const logger = require('../utils/logger');

class ReconciliationController {
  /**
   * Initiate reconciliation
   * POST /api/v1/reconciliations
   */
  static async initiateReconciliation(req, res) {
    try {
      const { gateway, reconciliationType, startDate, endDate } = req.body;

      const reconciliation = await ReconciliationService.initiateReconciliation({
        gateway,
        reconciliationType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      res.status(201).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation initiated successfully',
      });
    } catch (error) {
      logger.error('Error initiating reconciliation:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Execute reconciliation
   * POST /api/v1/reconciliations/:reconciliationId/execute
   */
  static async executeReconciliation(req, res) {
    try {
      const { reconciliationId } = req.params;

      const reconciliation = await ReconciliationService.executeReconciliation(reconciliationId);

      res.status(200).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation executed successfully',
      });
    } catch (error) {
      logger.error('Error executing reconciliation:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get reconciliation details
   * GET /api/v1/reconciliations/:reconciliationId
   */
  static async getReconciliationDetails(req, res) {
    try {
      const { reconciliationId } = req.params;

      const reconciliation = await ReconciliationService.getReconciliationDetails(reconciliationId);

      res.status(200).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation details retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching reconciliation details:', error);
      res.status(404).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get reconciliations for gateway
   * GET /api/v1/reconciliations/gateway/:gatewayName
   */
  static async getReconciliationsByGateway(req, res) {
    try {
      const { gatewayName } = req.params;
      const { page, limit, status } = req.query;

      const result = await ReconciliationService.getReconciliationsByGateway(gatewayName, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
      });

      res.status(200).json({
        success: true,
        data: result.reconciliations,
        pagination: result.pagination,
        message: 'Gateway reconciliations retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching reconciliations:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Approve reconciliation
   * POST /api/v1/reconciliations/:reconciliationId/approve
   */
  static async approveReconciliation(req, res) {
    try {
      const { reconciliationId } = req.params;
      const { approvedBy, notes } = req.body;

      const reconciliation = await ReconciliationService.approveReconciliation(reconciliationId, {
        approvedBy,
        notes,
      });

      res.status(200).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation approved successfully',
      });
    } catch (error) {
      logger.error('Error approving reconciliation:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Reject reconciliation
   * POST /api/v1/reconciliations/:reconciliationId/reject
   */
  static async rejectReconciliation(req, res) {
    try {
      const { reconciliationId } = req.params;
      const { reason } = req.body;

      const reconciliation = await ReconciliationService.rejectReconciliation(reconciliationId, {
        reason,
      });

      res.status(200).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation rejected successfully',
      });
    } catch (error) {
      logger.error('Error rejecting reconciliation:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Resolve discrepancy
   * POST /api/v1/reconciliations/:reconciliationId/discrepancies/:index/resolve
   */
  static async resolveDiscrepancy(req, res) {
    try {
      const { reconciliationId, index } = req.params;
      const { reason } = req.body;

      const reconciliation = await ReconciliationService.resolveDiscrepancy(
        reconciliationId,
        parseInt(index),
        { reason }
      );

      res.status(200).json({
        success: true,
        data: reconciliation,
        message: 'Discrepancy resolved successfully',
      });
    } catch (error) {
      logger.error('Error resolving discrepancy:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Generate reconciliation report
   * GET /api/v1/reconciliations/:reconciliationId/report
   */
  static async generateReport(req, res) {
    try {
      const { reconciliationId } = req.params;

      const report = await ReconciliationService.generateReport(reconciliationId);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Reconciliation report generated successfully',
      });
    } catch (error) {
      logger.error('Error generating reconciliation report:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get reconciliation summary
   * GET /api/v1/reconciliations/:reconciliationId/summary
   */
  static async getReconciliationSummary(req, res) {
    try {
      const { reconciliationId } = req.params;

      const reconciliation = await ReconciliationService.getReconciliationDetails(reconciliationId);

      const summary = {
        reconciliationId: reconciliation.reconciliationId,
        gateway: reconciliation.gateway,
        status: reconciliation.status,
        period: {
          startDate: reconciliation.startDate,
          endDate: reconciliation.endDate,
        },
        summary: reconciliation.summary,
        gatewayData: reconciliation.gatewayData,
        internalData: reconciliation.internalData,
      };

      res.status(200).json({
        success: true,
        data: summary,
        message: 'Reconciliation summary retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching reconciliation summary:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }
}

module.exports = ReconciliationController;
