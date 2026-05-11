const FamilyAccessService = require('../services/FamilyAccessService');
const logger = require('../utils/logger');

/**
 * FamilyAccessController
 * Handles API endpoints for family access management
 */
class FamilyAccessController {
  /**
   * POST /api/family/create
   * Create a new family group
   */
  static async createFamilyGroup(req, res) {
    try {
      const userId = req.user?._id;
      const { familyName, memberIds, accessPermissions } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!familyName) {
        return res.status(400).json({ error: 'Family name is required' });
      }

      const familyGroup = await FamilyAccessService.createFamilyGroup(
        userId,
        familyName,
        memberIds || [],
        accessPermissions || {}
      );

      res.status(201).json({
        success: true,
        message: 'Family group created successfully',
        family: familyGroup,
      });
    } catch (error) {
      logger.error('Error creating family group:', error);
      res.status(500).json({
        error: error.message || 'Failed to create family group',
      });
    }
  }

  /**
   * GET /api/family/list
   * Get all families for the logged-in user
   */
  static async getUserFamilies(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const families = await FamilyAccessService.getUserFamilies(userId);

      res.json({
        success: true,
        families,
        count: families.length,
      });
    } catch (error) {
      logger.error('Error fetching user families:', error);
      res.status(500).json({
        error: error.message || 'Failed to fetch families',
      });
    }
  }

  /**
   * GET /api/family/:groupId
   * Get specific family group details
   */
  static async getFamilyGroup(req, res) {
    try {
      const userId = req.user?._id;
      const { groupId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required' });
      }

      const family = await FamilyAccessService.getFamilyGroup(groupId, userId);

      res.json({
        success: true,
        family,
      });
    } catch (error) {
      logger.error('Error fetching family group:', error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        error: error.message || 'Failed to fetch family group',
      });
    }
  }

  /**
   * POST /api/family/:groupId/members
   * Add a member to a family group
   */
  static async addFamilyMember(req, res) {
    try {
      const userId = req.user?._id;
      const { groupId } = req.params;
      const { memberId, relationship } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!groupId || !memberId) {
        return res.status(400).json({
          error: 'Group ID and member ID are required',
        });
      }

      const family = await FamilyAccessService.addFamilyMember(
        groupId,
        userId,
        memberId,
        relationship || 'other'
      );

      res.json({
        success: true,
        message: 'Member added successfully',
        family,
      });
    } catch (error) {
      logger.error('Error adding family member:', error);
      res.status(error.message?.includes('unauthorized') ? 403 : 500).json({
        error: error.message || 'Failed to add family member',
      });
    }
  }

  /**
   * DELETE /api/family/:groupId/members/:memberId
   * Remove a member from family group
   */
  static async removeFamilyMember(req, res) {
    try {
      const userId = req.user?._id;
      const { groupId, memberId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const family = await FamilyAccessService.removeFamilyMember(groupId, userId, memberId);

      res.json({
        success: true,
        message: 'Member removed successfully',
        family,
      });
    } catch (error) {
      logger.error('Error removing family member:', error);
      res.status(403).json({
        error: error.message || 'Failed to remove family member',
      });
    }
  }

  /**
   * PATCH /api/family/:groupId/permissions
   * Update access permissions
   */
  static async updateAccessPermissions(req, res) {
    try {
      const userId = req.user?._id;
      const { groupId } = req.params;
      const permissions = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const family = await FamilyAccessService.updateAccessPermissions(
        groupId,
        userId,
        permissions
      );

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        family,
      });
    } catch (error) {
      logger.error('Error updating permissions:', error);
      res.status(403).json({
        error: error.message || 'Failed to update permissions',
      });
    }
  }

  /**
   * PATCH /api/family/:groupId/members/:memberId/disable-access
   * Disable auto-access for a specific member
   */
  static async disableAutoAccessForMember(req, res) {
    try {
      const userId = req.user?._id;
      const { groupId, memberId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const family = await FamilyAccessService.disableAutoAccessForMember(
        groupId,
        userId,
        memberId
      );

      res.json({
        success: true,
        message: 'Auto-access disabled successfully',
        family,
      });
    } catch (error) {
      logger.error('Error disabling auto-access:', error);
      res.status(403).json({
        error: error.message || 'Failed to disable auto-access',
      });
    }
  }

  /**
   * GET /api/family/access/location/:targetUserId
   * Check if current user has auto-access to target user's location
   */
  static async checkLocationAccess(req, res) {
    try {
      const userId = req.user?._id;
      const { targetUserId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const accessResult = await FamilyAccessService.verifyLocationSharingAccess(
        userId,
        targetUserId
      );

      res.json({
        success: true,
        accessResult,
      });
    } catch (error) {
      logger.error('Error checking location access:', error);
      res.status(500).json({
        error: error.message || 'Failed to check location access',
      });
    }
  }

  /**
   * GET /api/family/access/camera/:targetUserId
   * Check if current user has auto-access to target user's camera
   */
  static async checkCameraAccess(req, res) {
    try {
      const userId = req.user?._id;
      const { targetUserId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const accessResult = await FamilyAccessService.verifyCameraAccess(
        userId,
        targetUserId
      );

      res.json({
        success: true,
        accessResult,
      });
    } catch (error) {
      logger.error('Error checking camera access:', error);
      res.status(500).json({
        error: error.message || 'Failed to check camera access',
      });
    }
  }

  /**
   * GET /api/family/members/location-access
   * Get all family members with location access
   */
  static async getFamilyMembersWithLocationAccess(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const members = await FamilyAccessService.getFamilyMembersWithLocationAccess(userId);

      res.json({
        success: true,
        members,
        count: members.length,
      });
    } catch (error) {
      logger.error('Error fetching family members with location access:', error);
      res.status(500).json({
        error: error.message || 'Failed to fetch family members',
      });
    }
  }

  /**
   * GET /api/family/members/camera-access
   * Get all family members with camera access
   */
  static async getFamilyMembersWithCameraAccess(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const members = await FamilyAccessService.getFamilyMembersWithCameraAccess(userId);

      res.json({
        success: true,
        members,
        count: members.length,
      });
    } catch (error) {
      logger.error('Error fetching family members with camera access:', error);
      res.status(500).json({
        error: error.message || 'Failed to fetch family members',
      });
    }
  }
}

// Export routes
const express = require('express');
const router = express.Router();

router.post('/create', FamilyAccessController.createFamilyGroup);
router.get('/list', FamilyAccessController.getUserFamilies);
router.get('/:groupId', FamilyAccessController.getFamilyGroup);
router.post('/:groupId/members', FamilyAccessController.addFamilyMember);
router.delete('/:groupId/members/:memberId', FamilyAccessController.removeFamilyMember);
router.patch('/:groupId/permissions', FamilyAccessController.updateAccessPermissions);
router.patch(
  '/:groupId/members/:memberId/disable-access',
  FamilyAccessController.disableAutoAccessForMember
);
router.get('/access/location/:targetUserId', FamilyAccessController.checkLocationAccess);
router.get('/access/camera/:targetUserId', FamilyAccessController.checkCameraAccess);
router.get('/members/location-access', FamilyAccessController.getFamilyMembersWithLocationAccess);
router.get('/members/camera-access', FamilyAccessController.getFamilyMembersWithCameraAccess);

module.exports = { controller: FamilyAccessController, routes: router };
