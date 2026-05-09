/**
 * SafetyAndEmergencyService.js
 * Phase 8: Safety & Emergency Management
 * Handles SOS alerts, emergency contacts, safety ratings, ride sharing verification
 */

const SOSAlert = require('../../models/SOSAlert');
const EmergencyContact = require('../../models/EmergencyContact');
const SafetyRating = require('../../models/SafetyRating');
const UserProfile = require('../../models/UserProfile');
const RideRequest = require('../../models/RideRequest');

class SafetyAndEmergencyService {
  /**
   * Create/add emergency contact
   */
  static async addEmergencyContact(userId, contactData) {
    try {
      const {
        firstName,
        lastName,
        relationship,
        phoneNumber,
        email,
        isPrimary,
      } = contactData;

      // Validation
      if (!firstName || !phoneNumber) {
        return {
          success: false,
          message: 'First name and phone number are required',
        };
      }

      const contact = new EmergencyContact({
        userId,
        firstName,
        lastName,
        relationship,
        phoneNumber,
        email,
        isPrimary,
        verificationStatus: 'pending',
        createdAt: new Date(),
      });

      await contact.save();

      // If primary, unset other primary contacts
      if (isPrimary) {
        await EmergencyContact.updateMany(
          { userId, _id: { $ne: contact._id } },
          { isPrimary: false }
        );
      }

      return {
        success: true,
        message: 'Emergency contact added successfully',
        data: {
          contactId: contact._id,
          firstName: contact.firstName,
          phoneNumber: contact.phoneNumber,
        },
      };
    } catch (error) {
      throw new Error(`Error adding emergency contact: ${error.message}`);
    }
  }

  /**
   * Get emergency contacts for user
   */
  static async getEmergencyContacts(userId) {
    try {
      const contacts = await EmergencyContact.find({ userId })
        .select('-userId')
        .sort({ isPrimary: -1, createdAt: -1 })
        .lean();

      return {
        success: true,
        data: contacts,
        count: contacts.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving emergency contacts: ${error.message}`);
    }
  }

  /**
   * Update emergency contact
   */
  static async updateEmergencyContact(contactId, userId, updateData) {
    try {
      const contact = await EmergencyContact.findOne({
        _id: contactId,
        userId,
      });

      if (!contact) {
        throw new Error('Emergency contact not found');
      }

      Object.assign(contact, updateData);
      contact.updatedAt = new Date();

      // If setting as primary, unset other primary contacts
      if (updateData.isPrimary) {
        await EmergencyContact.updateMany(
          { userId, _id: { $ne: contactId } },
          { isPrimary: false }
        );
      }

      await contact.save();

      return {
        success: true,
        message: 'Emergency contact updated successfully',
        data: contact,
      };
    } catch (error) {
      throw new Error(`Error updating emergency contact: ${error.message}`);
    }
  }

  /**
   * Delete emergency contact
   */
  static async deleteEmergencyContact(contactId, userId) {
    try {
      const result = await EmergencyContact.deleteOne({
        _id: contactId,
        userId,
      });

      if (result.deletedCount === 0) {
        throw new Error('Emergency contact not found');
      }

      return {
        success: true,
        message: 'Emergency contact deleted successfully',
      };
    } catch (error) {
      throw new Error(`Error deleting emergency contact: ${error.message}`);
    }
  }

  /**
   * Trigger SOS alert
   */
  static async triggerSOSAlert(userId, alertData) {
    try {
      const {
        latitude,
        longitude,
        reason,
        rideId,
        description,
      } = alertData;

      // Validation
      if (!latitude || !longitude || !reason) {
        return {
          success: false,
          message: 'Location (latitude, longitude) and reason are required',
        };
      }

      // Create SOS alert
      const alert = new SOSAlert({
        userId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        reason,
        description,
        rideId,
        status: 'active',
        severity: this.calculateSeverity(reason),
        emergencyContactsNotified: [],
        responderDetails: null,
        createdAt: new Date(),
      });

      await alert.save();

      // Get emergency contacts and notify them
      const contacts = await EmergencyContact.find({ userId });
      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

      if (primaryContact) {
        alert.emergencyContactsNotified.push({
          contactId: primaryContact._id,
          phoneNumber: primaryContact.phoneNumber,
          notificationTime: new Date(),
          status: 'pending',
        });
      }

      // Notify nearby responders (could trigger push notifications)
      await this.notifyNearbyResponders(alert);

      await alert.save();

      return {
        success: true,
        message: 'SOS alert triggered successfully',
        data: {
          alertId: alert._id,
          severity: alert.severity,
          status: alert.status,
          contactsNotified: alert.emergencyContactsNotified.length,
        },
      };
    } catch (error) {
      throw new Error(`Error triggering SOS alert: ${error.message}`);
    }
  }

  /**
   * Calculate severity based on reason
   */
  static calculateSeverity(reason) {
    const severityMap = {
      accident: 'critical',
      harassment: 'high',
      mechanical_issue: 'medium',
      medical_emergency: 'critical',
      threat: 'high',
      lost: 'medium',
      other: 'low',
    };
    return severityMap[reason] || 'medium';
  }

  /**
   * Notify nearby responders (police, ambulance, etc.)
   */
  static async notifyNearbyResponders(alert) {
    try {
      // This would integrate with emergency services API
      // For now, just logging the alert
      console.log(`SOS Alert ${alert._id} severity: ${alert.severity}`);

      if (alert.severity === 'critical' || alert.severity === 'high') {
        // Trigger immediate notifications to responders
        // Could call emergency API or notification service
        console.log(`Critical SOS - Notifying emergency services for alert ${alert._id}`);
      }
    } catch (error) {
      console.error('Error notifying responders:', error.message);
    }
  }

  /**
   * Get SOS alert status
   */
  static async getSOSAlertStatus(alertId, userId = null) {
    try {
      let query = { _id: alertId };
      if (userId) {
        query.userId = userId;
      }

      const alert = await SOSAlert.findOne(query)
        .populate('userId', 'firstName lastName phone')
        .populate('rideId', 'source destination fare');

      if (!alert) {
        throw new Error('SOS alert not found');
      }

      return {
        success: true,
        data: alert,
      };
    } catch (error) {
      throw new Error(`Error retrieving SOS alert: ${error.message}`);
    }
  }

  /**
   * Close SOS alert
   */
  static async closeSOSAlert(alertId, userId) {
    try {
      const alert = await SOSAlert.findOne({
        _id: alertId,
        userId,
      });

      if (!alert) {
        throw new Error('SOS alert not found');
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();

      await alert.save();

      return {
        success: true,
        message: 'SOS alert closed',
        data: alert,
      };
    } catch (error) {
      throw new Error(`Error closing SOS alert: ${error.message}`);
    }
  }

  /**
   * Rate safety of a ride/user
   */
  static async rateUserSafety(raterId, ratedUserId, rideId, ratingData) {
    try {
      const {
        safetyRating, // 1-5
        behavior, // 'aggressive', 'rude', 'normal', 'polite', 'helpful'
        comments,
        reportViolation,
      } = ratingData;

      // Validation
      if (!safetyRating || safetyRating < 1 || safetyRating > 5) {
        return {
          success: false,
          message: 'Safety rating must be between 1 and 5',
        };
      }

      const rating = new SafetyRating({
        raterId,
        ratedUserId,
        rideId,
        safetyRating,
        behavior,
        comments,
        reportViolation: reportViolation || false,
        status: reportViolation ? 'pending_review' : 'completed',
        createdAt: new Date(),
      });

      await rating.save();

      // Update user's safety score
      await this.updateUserSafetyScore(ratedUserId);

      return {
        success: true,
        message: 'Safety rating submitted successfully',
        data: {
          ratingId: rating._id,
          safetyRating: rating.safetyRating,
        },
      };
    } catch (error) {
      throw new Error(`Error rating user safety: ${error.message}`);
    }
  }

  /**
   * Update user's safety score
   */
  static async updateUserSafetyScore(userId) {
    try {
      const ratings = await SafetyRating.find({ ratedUserId: userId });

      if (ratings.length === 0) {
        return;
      }

      const averageRating =
        ratings.reduce((sum, r) => sum + r.safetyRating, 0) / ratings.length;
      const violationCount = ratings.filter((r) => r.reportViolation).length;

      const userProfile = await UserProfile.findById(userId);
      if (userProfile) {
        userProfile.safetyScore = Math.round(averageRating * 10) / 10;
        userProfile.safetyViolations = violationCount;
        await userProfile.save();
      }
    } catch (error) {
      console.error('Error updating user safety score:', error.message);
    }
  }

  /**
   * Get user safety ratings
   */
  static async getUserSafetyRatings(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const ratings = await SafetyRating.find({ ratedUserId: userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('raterId', 'firstName lastName')
        .lean();

      const total = await SafetyRating.countDocuments({
        ratedUserId: userId,
      });

      return {
        success: true,
        data: ratings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving safety ratings: ${error.message}`);
    }
  }

  /**
   * Verify trusted contacts (for ride sharing)
   */
  static async addTrustedContact(userId, trustedContactData) {
    try {
      const {
        contactUserId,
        relationship,
        canShareRides,
        canViewLocation,
      } = trustedContactData;

      // Validation
      if (!contactUserId) {
        return {
          success: false,
          message: 'Contact user ID is required',
        };
      }

      // Check if contact exists
      const contactUser = await UserProfile.findById(contactUserId);
      if (!contactUser) {
        return {
          success: false,
          message: 'Contact user not found',
        };
      }

      const userProfile = await UserProfile.findById(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Add to trusted contacts
      if (!userProfile.trustedContacts) {
        userProfile.trustedContacts = [];
      }

      const existingContact = userProfile.trustedContacts.find(
        (c) => c.contactUserId.toString() === contactUserId
      );

      if (existingContact) {
        return {
          success: false,
          message: 'Contact already in trusted list',
        };
      }

      userProfile.trustedContacts.push({
        contactUserId,
        relationship,
        canShareRides,
        canViewLocation,
        addedAt: new Date(),
      });

      await userProfile.save();

      return {
        success: true,
        message: 'Trusted contact added successfully',
        data: {
          contactUserId,
          relationship,
        },
      };
    } catch (error) {
      throw new Error(`Error adding trusted contact: ${error.message}`);
    }
  }

  /**
   * Get safety overview for user
   */
  static async getSafetyOverview(userId) {
    try {
      const userProfile = await UserProfile.findById(userId).select(
        'safetyScore safetyViolations trustedContacts'
      );

      const emergencyContacts = await EmergencyContact.countDocuments({
        userId,
      });

      const recentSOSAlerts = await SOSAlert.countDocuments({
        userId,
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      });

      const safetyRatings = await SafetyRating.find({
        ratedUserId: userId,
      }).lean();

      const averageRating =
        safetyRatings.length > 0
          ? (
              safetyRatings.reduce((sum, r) => sum + r.safetyRating, 0) /
              safetyRatings.length
            ).toFixed(1)
          : 0;

      return {
        success: true,
        data: {
          safetyScore: userProfile?.safetyScore || 5,
          safetyViolations: userProfile?.safetyViolations || 0,
          emergencyContacts,
          trustedContacts: userProfile?.trustedContacts?.length || 0,
          recentSOSAlerts,
          averageRating,
          totalRatings: safetyRatings.length,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving safety overview: ${error.message}`);
    }
  }

  /**
   * Enable/disable ride sharing with specific users
   */
  static async setRideSharingPreference(userId, contactUserId, canShare) {
    try {
      const userProfile = await UserProfile.findById(userId);
      if (!userProfile || !userProfile.trustedContacts) {
        return {
          success: false,
          message: 'Trusted contact not found',
        };
      }

      const contact = userProfile.trustedContacts.find(
        (c) => c.contactUserId.toString() === contactUserId
      );

      if (!contact) {
        return {
          success: false,
          message: 'Contact not in trusted list',
        };
      }

      contact.canShareRides = canShare;
      await userProfile.save();

      return {
        success: true,
        message: `Ride sharing ${canShare ? 'enabled' : 'disabled'} for contact`,
      };
    } catch (error) {
      throw new Error(`Error setting ride sharing preference: ${error.message}`);
    }
  }

  /**
   * Report safety violation
   */
  static async reportSafetyViolation(reporterId, reportedUserId, violationData) {
    try {
      const {
        rideId,
        violationType, // 'harassment', 'dangerous_driving', 'illegal_activity', 'threat', 'other'
        description,
        evidence, // array of photo/video URLs
      } = violationData;

      // Create safety rating with violation flag
      const rating = await this.rateUserSafety(
        reporterId,
        reportedUserId,
        rideId,
        {
          safetyRating: 1, // Lowest rating for violation
          behavior: 'violation',
          comments: description,
          reportViolation: true,
        }
      );

      return rating;
    } catch (error) {
      throw new Error(`Error reporting safety violation: ${error.message}`);
    }
  }
}

module.exports = SafetyAndEmergencyService;
