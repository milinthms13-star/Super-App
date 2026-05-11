const FamilyAccess = require('../models/FamilyAccess');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * FamilyAccessService
 * Manages family relationships and automatic access to location and camera
 * When a family admin grants access, all family members get automatic access without further consent
 */
class FamilyAccessService {
  /**
   * Create a new family group
   * @param {string} adminId - Admin user ID
   * @param {string} familyName - Name of the family group
   * @param {Array} memberIds - Initial member IDs to add
   * @param {Object} accessPermissions - Access permission settings
   * @returns {Object} Created family access record
   */
  static async createFamilyGroup(
    adminId,
    familyName,
    memberIds = [],
    accessPermissions = {}
  ) {
    try {
      if (!familyName || familyName.trim().length === 0) {
        throw new Error('Family name is required');
      }

      // Default access permissions
      const defaultPermissions = {
        location: {
          enabled: true,
          updateInterval: 30,
          realTime: true,
          accuracy: 'high',
        },
        camera: {
          enabled: true,
          liveView: true,
          snapshot: true,
          recordVideo: false,
          maxRecordingDuration: 5,
        },
        activity: { enabled: true },
        smsAlerts: { enabled: true },
        pushNotifications: { enabled: true },
      };

      // Merge with provided permissions
      const finalPermissions = {
        ...defaultPermissions,
        ...accessPermissions,
      };

      // Create members array with admin
      const membersArray = [
        {
          userId: adminId,
          role: 'admin',
          relationship: 'self',
          autoAccessEnabled: true,
          status: 'active',
        },
      ];

      // Add other members
      if (Array.isArray(memberIds) && memberIds.length > 0) {
        for (const memberId of memberIds) {
          // Verify user exists
          const user = await User.findById(memberId);
          if (!user) {
            logger.warn(`User ${memberId} not found, skipping from family group`);
            continue;
          }

          membersArray.push({
            userId: memberId,
            email: user.email,
            phone: user.phone,
            name: user.name || user.username,
            role: 'member',
            autoAccessEnabled: true,
            status: 'active',
          });
        }
      }

      const familyAccess = new FamilyAccess({
        adminId,
        familyName: familyName.trim(),
        members: membersArray,
        accessPermissions: finalPermissions,
        emergencySettings: {
          autoAlertOnEmergency: true,
          shareLocationOnSOS: true,
          shareVideoOnSOS: true,
          emergencyContacts: [],
        },
      });

      await familyAccess.save();
      logger.info(
        `Created family group '${familyName}' (ID: ${familyAccess.familyGroupId}) with ${membersArray.length} members`
      );

      return familyAccess;
    } catch (error) {
      logger.error('Failed to create family group:', error);
      throw error;
    }
  }

  /**
   * Add a member to a family group
   * @param {string} groupId - Family group ID (MongoDB _id)
   * @param {string} adminId - Admin ID (for authorization)
   * @param {string} memberId - Member user ID to add
   * @param {string} relationship - Relationship type
   * @returns {Object} Updated family access record
   */
  static async addFamilyMember(groupId, adminId, memberId, relationship = 'other') {
    try {
      // Verify admin owns the group
      const group = await FamilyAccess.findOne({ _id: groupId, adminId });
      if (!group) {
        throw new Error('Family group not found or unauthorized');
      }

      // Check if member already exists
      const existingMember = group.members.find((m) => m.userId.toString() === memberId);
      if (existingMember) {
        throw new Error('User is already a member of this family group');
      }

      // Get user details
      const user = await User.findById(memberId);
      if (!user) {
        throw new Error('User not found');
      }

      // Add member with auto-access enabled
      group.members.push({
        userId: memberId,
        email: user.email,
        phone: user.phone,
        name: user.name || user.username,
        role: 'member',
        relationship,
        autoAccessEnabled: true,
        status: 'active',
      });

      // Log activity
      group.activityLog.push({
        action: 'member_added',
        performedBy: adminId,
        targetUser: memberId,
        details: { relationship },
        timestamp: new Date(),
      });

      await group.save();
      logger.info(`Added member ${memberId} to family group ${groupId}`);

      return group;
    } catch (error) {
      logger.error('Failed to add family member:', error);
      throw error;
    }
  }

  /**
   * Get family members for a user (all families they belong to)
   * @param {string} userId - User ID
   * @returns {Array} Array of family groups user belongs to
   */
  static async getUserFamilies(userId) {
    try {
      const families = await FamilyAccess.find({
        $or: [
          { adminId: userId },
          { 'members.userId': userId },
        ],
        isActive: true,
      })
        .populate('adminId', 'name email phone')
        .populate('members.userId', 'name email phone')
        .populate('emergencySettings.emergencyContacts', 'name email phone');

      return families;
    } catch (error) {
      logger.error('Failed to get user families:', error);
      throw error;
    }
  }

  /**
   * Check if a user has auto-access to another user's location
   * Used to determine if location can be shared without explicit consent
   * @param {string} requesterId - User ID requesting access
   * @param {string} targetUserId - User ID whose location is requested
   * @returns {boolean} True if auto-access is enabled
   */
  static async hasAutoLocationAccess(requesterId, targetUserId) {
    try {
      // Find family groups containing both users
      const family = await FamilyAccess.findOne({
        isActive: true,
        'members.userId': requesterId,
        $and: [
          { 'members.userId': targetUserId },
        ],
      });

      if (!family) {
        return false;
      }

      // Check if auto-access is enabled for location
      if (!family.accessPermissions.location.enabled) {
        return false;
      }

      // Check if both users have auto-access enabled in their member records
      const requesterMember = family.members.find((m) => m.userId.toString() === requesterId);
      const targetMember = family.members.find((m) => m.userId.toString() === targetUserId);

      return (
        requesterMember?.autoAccessEnabled &&
        targetMember?.autoAccessEnabled &&
        requesterMember?.status === 'active' &&
        targetMember?.status === 'active'
      );
    } catch (error) {
      logger.error('Failed to check auto location access:', error);
      return false;
    }
  }

  /**
   * Check if a user has auto-access to another user's camera
   * @param {string} requesterId - User ID requesting access
   * @param {string} targetUserId - User ID whose camera is requested
   * @returns {boolean} True if auto-access is enabled
   */
  static async hasAutoCameraAccess(requesterId, targetUserId) {
    try {
      // Find family groups containing both users
      const family = await FamilyAccess.findOne({
        isActive: true,
        'members.userId': requesterId,
        $and: [
          { 'members.userId': targetUserId },
        ],
      });

      if (!family) {
        return false;
      }

      // Check if auto-access is enabled for camera
      if (!family.accessPermissions.camera.enabled) {
        return false;
      }

      // Check if both users have auto-access enabled
      const requesterMember = family.members.find((m) => m.userId.toString() === requesterId);
      const targetMember = family.members.find((m) => m.userId.toString() === targetUserId);

      return (
        requesterMember?.autoAccessEnabled &&
        targetMember?.autoAccessEnabled &&
        requesterMember?.status === 'active' &&
        targetMember?.status === 'active'
      );
    } catch (error) {
      logger.error('Failed to check auto camera access:', error);
      return false;
    }
  }

  /**
   * Get all family members who have auto-access to a user's location
   * @param {string} userId - User ID
   * @returns {Array} Array of member IDs with auto-access
   */
  static async getFamilyMembersWithLocationAccess(userId) {
    try {
      const families = await FamilyAccess.find({
        isActive: true,
        'members.userId': userId,
        'accessPermissions.location.enabled': true,
      });

      const accessibleMembers = [];

      for (const family of families) {
        const targetMember = family.members.find((m) => m.userId.toString() === userId);

        if (
          targetMember?.autoAccessEnabled &&
          targetMember?.status === 'active'
        ) {
          // Add all other active members with auto-access
          family.members.forEach((member) => {
            if (
              member.userId.toString() !== userId &&
              member.autoAccessEnabled &&
              member.status === 'active'
            ) {
              accessibleMembers.push({
                memberId: member.userId,
                relationship: member.relationship,
                familyGroup: family.familyGroupId,
              });
            }
          });
        }
      }

      return accessibleMembers;
    } catch (error) {
      logger.error('Failed to get family members with location access:', error);
      return [];
    }
  }

  /**
   * Get all family members who have auto-access to a user's camera
   * @param {string} userId - User ID
   * @returns {Array} Array of member IDs with auto-access
   */
  static async getFamilyMembersWithCameraAccess(userId) {
    try {
      const families = await FamilyAccess.find({
        isActive: true,
        'members.userId': userId,
        'accessPermissions.camera.enabled': true,
      });

      const accessibleMembers = [];

      for (const family of families) {
        const targetMember = family.members.find((m) => m.userId.toString() === userId);

        if (
          targetMember?.autoAccessEnabled &&
          targetMember?.status === 'active'
        ) {
          // Add all other active members with auto-access
          family.members.forEach((member) => {
            if (
              member.userId.toString() !== userId &&
              member.autoAccessEnabled &&
              member.status === 'active'
            ) {
              accessibleMembers.push({
                memberId: member.userId,
                relationship: member.relationship,
                cameraPermissions: family.accessPermissions.camera,
                familyGroup: family.familyGroupId,
              });
            }
          });
        }
      }

      return accessibleMembers;
    } catch (error) {
      logger.error('Failed to get family members with camera access:', error);
      return [];
    }
  }

  /**
   * Update access permissions for a family group
   * @param {string} groupId - Family group ID
   * @param {string} adminId - Admin ID (for authorization)
   * @param {Object} permissions - New permissions
   * @returns {Object} Updated family access record
   */
  static async updateAccessPermissions(groupId, adminId, permissions) {
    try {
      const group = await FamilyAccess.findOne({ _id: groupId, adminId });
      if (!group) {
        throw new Error('Family group not found or unauthorized');
      }

      // Update location permissions
      if (permissions.location) {
        group.accessPermissions.location = {
          ...group.accessPermissions.location,
          ...permissions.location,
        };
      }

      // Update camera permissions
      if (permissions.camera) {
        group.accessPermissions.camera = {
          ...group.accessPermissions.camera,
          ...permissions.camera,
        };
      }

      // Log activity
      group.activityLog.push({
        action: 'permissions_updated',
        performedBy: adminId,
        details: permissions,
        timestamp: new Date(),
      });

      await group.save();
      logger.info(`Updated access permissions for family group ${groupId}`);

      return group;
    } catch (error) {
      logger.error('Failed to update access permissions:', error);
      throw error;
    }
  }

  /**
   * Disable auto-access for a specific member
   * @param {string} groupId - Family group ID
   * @param {string} adminId - Admin ID (for authorization)
   * @param {string} memberId - Member ID to disable access
   * @returns {Object} Updated family access record
   */
  static async disableAutoAccessForMember(groupId, adminId, memberId) {
    try {
      const group = await FamilyAccess.findOne({ _id: groupId, adminId });
      if (!group) {
        throw new Error('Family group not found or unauthorized');
      }

      const member = group.members.find((m) => m.userId.toString() === memberId);
      if (!member) {
        throw new Error('Member not found in family group');
      }

      member.autoAccessEnabled = false;

      // Log activity
      group.activityLog.push({
        action: 'auto_access_disabled',
        performedBy: adminId,
        targetUser: memberId,
        timestamp: new Date(),
      });

      await group.save();
      logger.info(`Disabled auto-access for member ${memberId} in family group ${groupId}`);

      return group;
    } catch (error) {
      logger.error('Failed to disable auto-access:', error);
      throw error;
    }
  }

  /**
   * Remove a member from the family group
   * @param {string} groupId - Family group ID
   * @param {string} adminId - Admin ID (for authorization)
   * @param {string} memberId - Member ID to remove
   * @returns {Object} Updated family access record
   */
  static async removeFamilyMember(groupId, adminId, memberId) {
    try {
      const group = await FamilyAccess.findOne({ _id: groupId, adminId });
      if (!group) {
        throw new Error('Family group not found or unauthorized');
      }

      const memberIndex = group.members.findIndex((m) => m.userId.toString() === memberId);
      if (memberIndex === -1) {
        throw new Error('Member not found in family group');
      }

      // Mark as removed rather than delete
      group.members[memberIndex].status = 'removed';

      // Log activity
      group.activityLog.push({
        action: 'member_removed',
        performedBy: adminId,
        targetUser: memberId,
        timestamp: new Date(),
      });

      await group.save();
      logger.info(`Removed member ${memberId} from family group ${groupId}`);

      return group;
    } catch (error) {
      logger.error('Failed to remove family member:', error);
      throw error;
    }
  }

  /**
   * Get family group details
   * @param {string} groupId - Family group ID
   * @param {string} userId - User ID (must be member or admin)
   * @returns {Object} Family access record
   */
  static async getFamilyGroup(groupId, userId) {
    try {
      const group = await FamilyAccess.findOne({
        _id: groupId,
        $or: [
          { adminId: userId },
          { 'members.userId': userId },
        ],
      })
        .populate('adminId', 'name email phone')
        .populate('members.userId', 'name email phone')
        .populate('emergencySettings.emergencyContacts', 'name email phone');

      if (!group) {
        throw new Error('Family group not found or access denied');
      }

      return group;
    } catch (error) {
      logger.error('Failed to get family group:', error);
      throw error;
    }
  }

  /**
   * Verify location sharing is allowed via family auto-access
   * Called before returning location data
   * @param {string} requesterId - User requesting location
   * @param {string} targetUserId - User whose location is requested
   * @returns {Object} Access result with details
   */
  static async verifyLocationSharingAccess(requesterId, targetUserId) {
    try {
      const hasAccess = await this.hasAutoLocationAccess(requesterId, targetUserId);

      if (!hasAccess) {
        return {
          granted: false,
          reason: 'not_in_same_family',
          requiresExplicitConsent: true,
        };
      }

      // Get location update interval from family settings
      const family = await FamilyAccess.findOne({
        isActive: true,
        'members.userId': requesterId,
        $and: [
          { 'members.userId': targetUserId },
        ],
      });

      return {
        granted: true,
        reason: 'family_auto_access',
        updateInterval: family?.accessPermissions.location.updateInterval || 30,
        realTime: family?.accessPermissions.location.realTime !== false,
        accuracy: family?.accessPermissions.location.accuracy || 'high',
      };
    } catch (error) {
      logger.error('Failed to verify location sharing access:', error);
      return {
        granted: false,
        reason: 'verification_error',
        requiresExplicitConsent: true,
      };
    }
  }

  /**
   * Verify camera access is allowed via family auto-access
   * @param {string} requesterId - User requesting camera access
   * @param {string} targetUserId - User whose camera is requested
   * @returns {Object} Access result with details
   */
  static async verifyCameraAccess(requesterId, targetUserId) {
    try {
      const hasAccess = await this.hasAutoCameraAccess(requesterId, targetUserId);

      if (!hasAccess) {
        return {
          granted: false,
          reason: 'not_in_same_family',
          requiresExplicitConsent: true,
        };
      }

      // Get camera permissions from family settings
      const family = await FamilyAccess.findOne({
        isActive: true,
        'members.userId': requesterId,
        $and: [
          { 'members.userId': targetUserId },
        ],
      });

      return {
        granted: true,
        reason: 'family_auto_access',
        permissions: family?.accessPermissions.camera || {},
      };
    } catch (error) {
      logger.error('Failed to verify camera access:', error);
      return {
        granted: false,
        reason: 'verification_error',
        requiresExplicitConsent: true,
      };
    }
  }
}

module.exports = FamilyAccessService;
