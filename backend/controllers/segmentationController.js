/**
 * Segmentation Controller - Phase 14
 * Handle user segmentation by behavior, RFM, and cohorts
 */

const UserSegmentationService = require('../services/userSegmentationService');
const logger = require('../services/logger');

class SegmentationController {
  /**
   * GET /api/v1/segmentation/behavioral
   * Get behavioral segments
   */
  static async getBehavioralSegments(req, res) {
    try {
      const segments = await UserSegmentationService.getBehavioralSegments();

      return res.json({
        success: true,
        data: segments
      });
    } catch (error) {
      logger.error('Error getting behavioral segments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get behavioral segments'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/rfm
   * Get RFM segments
   */
  static async getRFMSegments(req, res) {
    try {
      const segments = await UserSegmentationService.getRFMSegments();

      return res.json({
        success: true,
        data: segments
      });
    } catch (error) {
      logger.error('Error getting RFM segments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get RFM segments'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/cohort
   * Get cohort analysis
   */
  static async getCohortAnalysis(req, res) {
    try {
      const cohorts = await UserSegmentationService.getCohortAnalysis();

      return res.json({
        success: true,
        data: cohorts
      });
    } catch (error) {
      logger.error('Error getting cohort analysis:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get cohort analysis'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/:type/users/:segmentName
   * Get users in segment
   */
  static async getSegmentUsers(req, res) {
    try {
      const { type, segmentName } = req.params;
      const { limit = 100 } = req.query;

      const validTypes = ['behavioral', 'rfm', 'cohort'];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid segment type'
        });
      }

      const users = await UserSegmentationService.getSegmentUsers(type, segmentName, parseInt(limit));

      return res.json({
        success: true,
        data: {
          segmentType: type,
          segmentName,
          userCount: users.length,
          users
        }
      });
    } catch (error) {
      logger.error('Error getting segment users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get segment users'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/behavioral/vip
   * Get VIP segment
   */
  static async getVIPSegment(req, res) {
    try {
      const segments = await UserSegmentationService.getBehavioralSegments();
      const vipUsers = segments.segments.vip;

      return res.json({
        success: true,
        data: vipUsers
      });
    } catch (error) {
      logger.error('Error getting VIP segment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get VIP segment'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/behavioral/loyal
   * Get loyal customer segment
   */
  static async getLoyalSegment(req, res) {
    try {
      const segments = await UserSegmentationService.getBehavioralSegments();
      const loyalUsers = segments.segments.loyal;

      return res.json({
        success: true,
        data: loyalUsers
      });
    } catch (error) {
      logger.error('Error getting loyal segment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get loyal segment'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/behavioral/at-risk
   * Get at-risk segment
   */
  static async getAtRiskSegment(req, res) {
    try {
      const segments = await UserSegmentationService.getBehavioralSegments();
      const atRiskUsers = segments.segments.inactive;

      return res.json({
        success: true,
        data: atRiskUsers
      });
    } catch (error) {
      logger.error('Error getting at-risk segment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get at-risk segment'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/rfm/champions
   * Get RFM champions
   */
  static async getChampions(req, res) {
    try {
      const segments = await UserSegmentationService.getRFMSegments();
      const champions = segments.segments['Champions'] || [];

      return res.json({
        success: true,
        data: {
          segmentName: 'Champions',
          users: champions
        }
      });
    } catch (error) {
      logger.error('Error getting champions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get champions'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/analysis
   * Get overall segmentation analysis
   */
  static async getSegmentationAnalysis(req, res) {
    try {
      const [behavioral, rfm, cohort] = await Promise.all([
        UserSegmentationService.getBehavioralSegments(),
        UserSegmentationService.getRFMSegments(),
        UserSegmentationService.getCohortAnalysis()
      ]);

      const analysis = {
        timestamp: new Date(),
        behavioral: {
          type: 'behavioral',
          segmentCount: Object.keys(behavioral.segments).length,
          totalUsers: behavioral.totalUsers,
          segments: behavioral.segments
        },
        rfm: {
          type: 'rfm',
          segmentCount: Object.keys(rfm.segments).length,
          segments: rfm.segments
        },
        cohort: {
          type: 'cohort',
          cohortCount: Object.keys(cohort.cohorts).length,
          cohorts: cohort.cohorts
        }
      };

      return res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error getting segmentation analysis:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get segmentation analysis'
      });
    }
  }

  /**
   * POST /api/v1/segmentation/export/:type
   * Export segment data
   */
  static async exportSegmentData(req, res) {
    try {
      const { type } = req.params;
      const { format = 'json' } = req.query;

      const analysis = await UserSegmentationService.getSegmentAnalysis(type);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="segments-${type}.csv"`);
        return res.send('userId,email,segment,value\n');
      }

      return res.json({
        success: true,
        data: analysis,
        format
      });
    } catch (error) {
      logger.error('Error exporting segment data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export segment data'
      });
    }
  }

  /**
   * GET /api/v1/segmentation/summary
   * Get segmentation summary
   */
  static async getSegmentationSummary(req, res) {
    try {
      const behavioral = await UserSegmentationService.getBehavioralSegments();

      const summary = {
        timestamp: new Date(),
        totalUsers: behavioral.totalUsers,
        segments: {
          vip: behavioral.segments.vip.count,
          loyal: behavioral.segments.loyal.count,
          occasional: behavioral.segments.occasional.count,
          inactive: behavioral.segments.inactive.count,
          dormant: behavioral.segments.dormant.count
        },
        distribution: {
          vip: ((behavioral.segments.vip.count / behavioral.totalUsers) * 100).toFixed(2) + '%',
          loyal: ((behavioral.segments.loyal.count / behavioral.totalUsers) * 100).toFixed(2) + '%',
          occasional: ((behavioral.segments.occasional.count / behavioral.totalUsers) * 100).toFixed(2) + '%',
          inactive: ((behavioral.segments.inactive.count / behavioral.totalUsers) * 100).toFixed(2) + '%',
          dormant: ((behavioral.segments.dormant.count / behavioral.totalUsers) * 100).toFixed(2) + '%'
        }
      };

      return res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting segmentation summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get segmentation summary'
      });
    }
  }
}

module.exports = SegmentationController;
