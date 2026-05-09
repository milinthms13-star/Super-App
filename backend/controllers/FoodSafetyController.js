/**
 * Food Safety Controller - Phase 9 Feature B
 * REST endpoints for food safety compliance and certification
 */

const FoodSafetyService = require('../services/FoodSafetyService');

class FoodSafetyController {
  /**
   * POST /api/phase9/safety
   * Create food safety record
   */
  static async createSafetyRecord(req, res) {
    try {
      const { restaurantId } = req.body;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await FoodSafetyService.createSafetyRecord(restaurantId);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/safety/:restaurantId/fssai
   * Update FSSAI certification
   */
  static async updateFSSAI(req, res) {
    try {
      const { restaurantId } = req.params;
      const fssaiData = req.body;

      if (!fssaiData.licenseNumber) {
        return res.status(400).json({
          success: false,
          message: 'FSSAI license number is required',
        });
      }

      const result = await FoodSafetyService.updateFSSAICertification(restaurantId, fssaiData);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/safety/:restaurantId/hygiene-inspection
   * Record hygiene inspection
   */
  static async recordHygieneInspection(req, res) {
    try {
      const { restaurantId } = req.params;
      const inspectionData = req.body;

      if (!inspectionData.inspectionScore) {
        return res.status(400).json({
          success: false,
          message: 'Inspection score is required',
        });
      }

      const result = await FoodSafetyService.recordHygieneInspection(restaurantId, inspectionData);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/safety/:restaurantId/staff-training
   * Update staff training records
   */
  static async updateStaffTraining(req, res) {
    try {
      const { restaurantId } = req.params;
      const trainingData = req.body;

      if (trainingData.foodHandlersCertified === undefined) {
        return res.status(400).json({
          success: false,
          message: 'foodHandlersCertified count is required',
        });
      }

      const result = await FoodSafetyService.updateStaffTraining(restaurantId, trainingData);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/safety/:restaurantId/quality-test
   * Record quality control test
   */
  static async recordQualityTest(req, res) {
    try {
      const { restaurantId } = req.params;
      const testData = req.body;

      if (!testData.testType || !testData.status) {
        return res.status(400).json({
          success: false,
          message: 'testType and status are required',
        });
      }

      const result = await FoodSafetyService.recordQualityTest(restaurantId, testData);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/safety/:restaurantId/complaint
   * Record complaint
   */
  static async recordComplaint(req, res) {
    try {
      const { restaurantId } = req.params;
      const complaintData = req.body;

      if (!complaintData.type || !complaintData.description) {
        return res.status(400).json({
          success: false,
          message: 'type and description are required',
        });
      }

      const result = await FoodSafetyService.recordComplaint(restaurantId, complaintData);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/safety/:restaurantId/compliance-score
   * Calculate compliance score
   */
  static async calculateComplianceScore(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await FoodSafetyService.calculateComplianceScore(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/safety/:restaurantId/details
   * Get compliance details
   */
  static async getComplianceDetails(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await FoodSafetyService.getComplianceDetails(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/safety/:restaurantId/is-compliant
   * Check if restaurant is compliant
   */
  static async isCompliant(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await FoodSafetyService.isCompliant(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = FoodSafetyController;
