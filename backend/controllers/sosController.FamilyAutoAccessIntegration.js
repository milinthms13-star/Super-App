/**
 * Family Auto-Access Integration with SOS Module
 * Example: How to integrate family auto-access with your existing SOS features
 * 
 * File: backend/controllers/sosController.Integration.js
 * This file shows how to modify your existing SOS controller to use family auto-access
 */

const FamilyAccessService = require('../services/FamilyAccessService');
const logger = require('../utils/logger');

/**
 * EXAMPLE 1: Auto-Share Location in SOS Tracking
 * Modify your existing SOS location sharing to check family auto-access first
 */
exports.getSOSLocation = async (req, res) => {
  try {
    const { targetUserId } = req.params; // User being tracked
    const requesterId = req.user._id; // User requesting location
    
    // Step 1: Check if requester has auto-access via family
    const accessResult = await FamilyAccessService.verifyLocationSharingAccess(
      requesterId,
      targetUserId
    );

    if (accessResult.granted) {
      // Step 2: Auto-grant access - location can be shared immediately!
      const targetUser = await User.findById(targetUserId);
      const location = targetUser?.lastKnownLocation || {};

      return res.json({
        success: true,
        granted: true,
        reason: 'family_auto_access', // Different from explicit consent!
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        },
        metadata: {
          shareMethod: 'family_auto_access',
          updateInterval: accessResult.updateInterval,
          realTime: accessResult.realTime,
        },
      });
    } else {
      // Step 3: If not in family, require explicit consent
      return res.status(403).json({
        granted: false,
        reason: accessResult.reason,
        requiresConsent: true,
        message: 'Location access requires explicit consent',
      });
    }
  } catch (error) {
    logger.error('Error in getSOSLocation:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 2: Auto-Grant Camera Access via Family
 */
exports.getCameraFeed = async (req, res) => {
  try {
    const { targetUserId } = req.params; // User's camera
    const requesterId = req.user._id; // User requesting camera access
    
    // Check camera auto-access
    const accessResult = await FamilyAccessService.verifyCameraAccess(
      requesterId,
      targetUserId
    );

    if (accessResult.granted) {
      // Auto-grant based on family permissions
      const cameraPermissions = accessResult.permissions;

      // Return camera feed based on family permissions
      const cameraData = {
        enabled: cameraPermissions.enabled,
        liveView: cameraPermissions.liveView,
        canSnapshot: cameraPermissions.snapshot,
        canRecord: cameraPermissions.recordVideo,
        maxRecordingDuration: cameraPermissions.maxRecordingDuration,
      };

      // If permissions allow, return actual feed
      if (cameraPermissions.liveView) {
        // Get actual camera feed from device/service
        const feed = await getCameraFeedFromDevice(targetUserId);
        cameraData.feed = feed;
      }

      return res.json({
        success: true,
        granted: true,
        reason: 'family_auto_access',
        camera: cameraData,
        metadata: {
          shareMethod: 'family_auto_access',
          familyAdmin: true, // User is accessing family member's data
        },
      });
    } else {
      return res.status(403).json({
        granted: false,
        reason: accessResult.reason,
        message: 'Camera access not allowed',
      });
    }
  } catch (error) {
    logger.error('Error in getCameraFeed:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 3: Send SOS Alert with Auto-Location Sharing
 * When user triggers SOS, automatically share location with family members
 */
exports.triggerSOS = async (req, res) => {
  try {
    const userId = req.user._id;
    const { contactIds, message, type } = req.body;

    // Step 1: Get user's location
    const userLocation = req.body.location || {};

    // Step 2: Get all family members who have location access
    const familyMembersWithAccess = await FamilyAccessService
      .getFamilyMembersWithLocationAccess(userId);

    // Step 3: Separate family from non-family contacts
    const familyMemberIds = familyMembersWithAccess.map(m => m.memberId.toString());
    const familyContacts = contactIds.filter(id => familyMemberIds.includes(id.toString()));
    const nonFamilyContacts = contactIds.filter(id => !familyMemberIds.includes(id.toString()));

    const sosResult = {
      success: true,
      sosTriggered: true,
      timestamp: new Date(),
      notifications: {
        family: {
          count: familyContacts.length,
          shared: 'location_and_camera', // Auto-shared via family auto-access
          contacts: familyContacts,
        },
        others: {
          count: nonFamilyContacts.length,
          shared: 'location_only_if_consented', // Regular consent-based
          contacts: nonFamilyContacts,
        },
      },
    };

    // Step 4: Send notifications to family (with auto-location)
    for (const familyContactId of familyContacts) {
      const familyMember = familyMembersWithAccess.find(m => 
        m.memberId.toString() === familyContactId.toString()
      );

      sendSOSNotification({
        recipientId: familyContactId,
        type: 'SOS_FAMILY_ALERT',
        message: message,
        location: userLocation, // Auto-included for family
        camera: true, // Can access camera
        autoAccess: true,
        relationship: familyMember.relationship,
      });
    }

    // Step 5: Send notifications to non-family (location if consented)
    for (const contactId of nonFamilyContacts) {
      sendSOSNotification({
        recipientId: contactId,
        type: 'SOS_ALERT',
        message: message,
        location: null, // Requires consent
        autoAccess: false,
      });
    }

    return res.json(sosResult);
  } catch (error) {
    logger.error('Error triggering SOS:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 4: Track Multiple Family Members
 * Get location of all family members who allow auto-access
 */
exports.trackFamilyMembers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all family members with location access
    const familyMembers = await FamilyAccessService
      .getFamilyMembersWithLocationAccess(userId);

    // Fetch location of each member
    const locations = {};
    for (const member of familyMembers) {
      const memberDoc = await User.findById(member.memberId);
      if (memberDoc?.lastKnownLocation) {
        locations[member.memberId] = {
          ...memberDoc.lastKnownLocation,
          relationship: member.relationship,
          autoAccess: true,
          shareMethod: 'family_auto_access',
        };
      }
    }

    return res.json({
      success: true,
      familyLocations: locations,
      count: Object.keys(locations).length,
    });
  } catch (error) {
    logger.error('Error tracking family members:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 5: Emergency Mode
 * When emergencies are enabled, auto-share everything with family
 */
exports.enableEmergencyMode = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's families
    const families = await FamilyAccessService.getUserFamilies(userId);

    // Enable emergency sharing for all families
    const emergencyNotifications = [];

    for (const family of families) {
      // Notify all family members of emergency
      const familyMembers = family.members.filter(m => 
        m.userId.toString() !== userId && m.status === 'active'
      );

      for (const member of familyMembers) {
        emergencyNotifications.push({
          recipientId: member.userId,
          type: 'EMERGENCY_MODE_ENABLED',
          message: `Emergency mode enabled by ${family.adminId}`,
          sharing: {
            location: true,
            camera: true,
            activity: true,
            realtime: true,
          },
          timestamp: new Date(),
        });
      }
    }

    // Send all notifications
    for (const notification of emergencyNotifications) {
      // Send notification to user
      sendNotification(notification);
    }

    return res.json({
      success: true,
      emergencyEnabled: true,
      notificationsSent: emergencyNotifications.length,
    });
  } catch (error) {
    logger.error('Error enabling emergency mode:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 6: Contact Groups Integration
 * Convert contact group into a family group for easy management
 */
exports.convertContactGroupToFamily = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, groupName } = req.body;

    // Get existing contact group
    const ContactGroupService = require('../services/contactGroupService');
    const contactGroup = await ContactGroupService.getGroup(groupId, userId);

    // Extract member IDs from contact group
    const memberIds = contactGroup.contacts || [];

    // Create family from contact group
    const family = await FamilyAccessService.createFamilyGroup(
      userId,
      groupName || `Family from ${contactGroup.name}`,
      memberIds,
      {
        location: { enabled: true, realTime: true, updateInterval: 30 },
        camera: { enabled: true, liveView: true },
      }
    );

    return res.json({
      success: true,
      message: 'Contact group converted to family',
      family,
    });
  } catch (error) {
    logger.error('Error converting contact group:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 7: Verify Location Permission Middleware
 * Use this middleware to protect location endpoints
 */
exports.verifyLocationPermission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;

    // Check auto-access first
    const hasAutoAccess = await FamilyAccessService.hasAutoLocationAccess(
      userId,
      targetUserId
    );

    if (hasAutoAccess) {
      // Auto-grant - set in request
      req.locationAccess = {
        granted: true,
        method: 'family_auto_access',
      };
      return next();
    }

    // Check explicit consent (your existing logic)
    const hasExplicitConsent = await checkExplicitLocationConsent(userId, targetUserId);

    if (hasExplicitConsent) {
      req.locationAccess = {
        granted: true,
        method: 'explicit_consent',
      };
      return next();
    }

    // No access
    return res.status(403).json({
      granted: false,
      message: 'No permission to access location',
    });
  } catch (error) {
    logger.error('Error in verifyLocationPermission:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * EXAMPLE 8: Monitor Family Activity
 * Log all family member activities for audit trail
 */
exports.logFamilyActivity = async (userId, targetUserId, action) => {
  try {
    const hasAutoAccess = await FamilyAccessService.hasAutoLocationAccess(
      userId,
      targetUserId
    );

    if (hasAutoAccess) {
      // Log this access via family auto-access
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        performedBy: userId,
        targetUser: targetUserId,
        action: action,
        accessMethod: 'family_auto_access',
        timestamp: new Date(),
      });

      logger.info(
        `Family auto-access: ${userId} accessed ${targetUserId} for ${action}`
      );
    }
  } catch (error) {
    logger.error('Error logging family activity:', error);
  }
};

// Export integration utilities
module.exports = {
  getSOSLocation: exports.getSOSLocation,
  getCameraFeed: exports.getCameraFeed,
  triggerSOS: exports.triggerSOS,
  trackFamilyMembers: exports.trackFamilyMembers,
  enableEmergencyMode: exports.enableEmergencyMode,
  convertContactGroupToFamily: exports.convertContactGroupToFamily,
  verifyLocationPermission: exports.verifyLocationPermission,
  logFamilyActivity: exports.logFamilyActivity,
};
