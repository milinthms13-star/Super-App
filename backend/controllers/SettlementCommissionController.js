/**
 * Settlement & Commission Controller - Phase 12
 * REST API endpoints for settlements and commissions
 */

const InstantSettlementService = require('../services/InstantSettlementService');
const CommissionService = require('../services/CommissionService');
const { validationResult } = require('express-validator');

class SettlementCommissionController {
  // ============= INSTANT SETTLEMENT ENDPOINTS =============

  /**
   * POST /api/v1/settlements
   * Create settlement request
   */
  static async createSettlement(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const settlement = await InstantSettlementService.createSettlementRequest(req.body);

      res.status(201).json({
        success: true,
        settlementId: settlement.settlementId,
        netAmount: settlement.netAmount,
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/settlements/:settlementId
   * Get settlement details
   */
  static async getSettlement(req, res) {
    try {
      const settlement = await InstantSettlementService.getSettlement(
        req.params.settlementId
      );

      if (!settlement) {
        return res.status(404).json({
          success: false,
          error: 'Settlement not found',
        });
      }

      res.json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/settlements/:settlementId/approve
   * Approve settlement
   */
  static async approveSettlement(req, res) {
    try {
      const settlement = await InstantSettlementService.approveSettlement(
        req.params.settlementId,
        req.user?.id || 'admin',
        req.body.notes
      );

      res.json({
        success: true,
        message: 'Settlement approved',
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/settlements/:settlementId/reject
   * Reject settlement
   */
  static async rejectSettlement(req, res) {
    try {
      const settlement = await InstantSettlementService.rejectSettlement(
        req.params.settlementId,
        req.body.reason
      );

      res.json({
        success: true,
        message: 'Settlement rejected',
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/settlements/:settlementId/process
   * Process settlement
   */
  static async processSettlement(req, res) {
    try {
      const settlement = await InstantSettlementService.processSettlement(
        req.params.settlementId
      );

      res.json({
        success: true,
        message: 'Settlement processing initiated',
        data: settlement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/settlements/user/:userId
   * Get user settlements
   */
  static async getUserSettlements(req, res) {
    try {
      const settlements = await InstantSettlementService.getPendingSettlements(
        req.params.userId
      );

      res.json({
        success: true,
        count: settlements.length,
        data: settlements,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/settlements/user/:userId/stats
   * Get settlement statistics
   */
  static async getSettlementStats(req, res) {
    try {
      const stats = await InstantSettlementService.getSettlementStats(
        req.params.userId
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ============= COMMISSION ENDPOINTS =============

  /**
   * POST /api/v1/commissions
   * Create commission
   */
  static async createCommission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const commission = await CommissionService.createCommission(req.body);

      res.status(201).json({
        success: true,
        commissionId: commission.commissionId,
        payableAmount: commission.payableAmount,
        data: commission,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/commissions/:commissionId
   * Get commission details
   */
  static async getCommission(req, res) {
    try {
      const commission = await CommissionService.getCommission(req.params.commissionId);

      if (!commission) {
        return res.status(404).json({
          success: false,
          error: 'Commission not found',
        });
      }

      res.json({
        success: true,
        data: commission,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/commissions/:commissionId/approve
   * Approve commission
   */
  static async approveCommission(req, res) {
    try {
      const commission = await CommissionService.approveCommission(
        req.params.commissionId,
        req.user?.id || 'admin',
        req.body.notes
      );

      res.json({
        success: true,
        message: 'Commission approved',
        data: commission,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/commissions/:commissionId/hold
   * Hold commission
   */
  static async holdCommission(req, res) {
    try {
      const commission = await CommissionService.holdCommission(
        req.params.commissionId,
        req.body.reason,
        req.body.holdDays || 7
      );

      res.json({
        success: true,
        message: 'Commission held',
        data: commission,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/commissions/restaurant/:restaurantId
   * Get restaurant commissions
   */
  static async getRestaurantCommissions(req, res) {
    try {
      const commissions = await CommissionService.getRestaurantCommissions(
        req.params.restaurantId,
        req.query.status,
        {
          page: req.query.page || 1,
          limit: req.query.limit || 20,
        }
      );

      res.json({
        success: true,
        count: commissions.length,
        data: commissions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/commissions/restaurant/:restaurantId/stats
   * Get restaurant commission statistics
   */
  static async getRestaurantStats(req, res) {
    try {
      const stats = await CommissionService.getCommissionStats(
        req.params.restaurantId,
        req.query.period || 'month'
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = SettlementCommissionController;
