/**
 * SafetyFeatureService.js
 * Manages safety features and emergency contacts
 */

const SafetyContact = require('../../models/SafetyContact');
const SafetyReport = require('../../models/SafetyReport');
const User = require('../../models/User');
const RideRequest = require('../../models/RideRequest');

class SafetyFeatureService {
  /**
   * Add emergency contact
   */
  async addEmergencyContact(userId, name, phone, relationship = 'friend') {
    try {
      if (phone.length < 10) {
        throw new Error('Invalid phone number');
      }

      const contact = new SafetyContact({
        userId,
        name: name.substring(0, 50),
        phone,
        relationship,
        isActive: true,
        addedAt: new Date(),
      });

      await contact.save();

      return {
        success: true,
        contactId: contact._id,
        message: 'Emergency contact added',
      };
    } catch (error) {
      throw new Error(`Failed to add contact: ${error.message}`);
    }
  }

  /**
   * Get user's emergency contacts
   */
  async getEmergencyContacts(userId) {
    try {
      const contacts = await SafetyContact.find({
        userId,
        isActive: true,
      }).sort({ addedAt: -1 });

      return {
        success: true,
        contacts,
        count: contacts.length,
      };
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(contactId, userId, name, phone, relationship) {
    try {
      const contact = await SafetyContact.findOne({
        _id: contactId,
        userId,
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      contact.name = name || contact.name;
      contact.phone = phone || contact.phone;
      contact.relationship = relationship || contact.relationship;
      contact.updatedAt = new Date();

      await contact.save();

      return {
        success: true,
        message: 'Contact updated',
      };
    } catch (error) {
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId, userId) {
    try {
      const contact = await SafetyContact.findOne({
        _id: contactId,
        userId,
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      contact.isActive = false;
      contact.deactivatedAt = new Date();
      await contact.save();

      return {
        success: true,
        message: 'Contact deleted',
      };
    } catch (error) {
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  /**
   * Trigger emergency alert
   */
  async triggerEmergencyAlert(userId, rideId, alertType = 'general') {
    try {
      // Validate ride is active
      const ride = await RideRequest.findById(rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }

      if (ride.status !== 'accepted' && ride.status !== 'in-progress') {
        throw new Error('Cannot trigger alert for inactive ride');
      }

      // Create safety report
      const report = new SafetyReport({
        userId,
        rideId,
        alertType,
        location: ride.currentLocation,
        timestamp: new Date(),
        status: 'active',
        reportedLocation: {
          type: 'Point',
          coordinates: [ride.currentLocation.lng, ride.currentLocation.lat],
        },
      });

      await report.save();

      // Get emergency contacts
      const contacts = await SafetyContact.find({
        userId,
        isActive: true,
      });

      // Notify emergency contacts (in real app, would send SMS/push notifications)
      const notifications = contacts.map(contact => ({
        contact: contact.name,
        phone: contact.phone,
        message: `Emergency alert from ${userId}. Ride ID: ${rideId}. Current location: ${ride.currentLocation.lat}, ${ride.currentLocation.lng}`,
      }));

      return {
        success: true,
        reportId: report._id,
        alertType,
        contactsNotified: contacts.length,
        notifications,
      };
    } catch (error) {
      throw new Error(`Failed to trigger alert: ${error.message}`);
    }
  }

  /**
   * Report safety issue during ride
   */
  async reportSafetyIssue(userId, rideId, issueType, description = '') {
    try {
      const ride = await RideRequest.findById(rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }

      const report = new SafetyReport({
        userId,
        rideId,
        alertType: 'safety_report',
        issueType,
        description: description.substring(0, 500),
        location: ride.currentLocation,
        timestamp: new Date(),
        status: 'reported',
      });

      await report.save();

      return {
        success: true,
        reportId: report._id,
        message: 'Safety issue reported',
      };
    } catch (error) {
      throw new Error(`Failed to report issue: ${error.message}`);
    }
  }

  /**
   * Get safety reports for a user
   */
  async getUserSafetyReports(userId, limit = 20) {
    try {
      const reports = await SafetyReport.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);

      return {
        success: true,
        reports,
        count: reports.length,
      };
    } catch (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }
  }

  /**
   * Share ride with friend
   */
  async shareRide(rideId, userId, friendPhones = []) {
    try {
      const ride = await RideRequest.findById(rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }

      const rideSharing = {
        rideId,
        sharedBy: userId,
        sharedWith: friendPhones,
        sharedAt: new Date(),
        locations: [
          {
            timestamp: new Date(),
            location: ride.currentLocation,
          },
        ],
      };

      // Update ride with sharing info
      if (!ride.sharing) {
        ride.sharing = [];
      }
      ride.sharing.push(rideSharing);
      await ride.save();

      return {
        success: true,
        message: 'Ride shared with friends',
        sharedWith: friendPhones.length,
      };
    } catch (error) {
      throw new Error(`Failed to share ride: ${error.message}`);
    }
  }

  /**
   * Update shared ride location
   */
  async updateSharedRideLocation(rideId, location) {
    try {
      const ride = await RideRequest.findById(rideId);
      if (!ride || !ride.sharing || ride.sharing.length === 0) {
        throw new Error('Shared ride not found');
      }

      const latestShare = ride.sharing[ride.sharing.length - 1];
      latestShare.locations.push({
        timestamp: new Date(),
        location,
      });

      // Keep only last 50 location updates per share
      if (latestShare.locations.length > 50) {
        latestShare.locations = latestShare.locations.slice(-50);
      }

      await ride.save();

      return {
        success: true,
        message: 'Shared location updated',
      };
    } catch (error) {
      throw new Error(`Failed to update shared location: ${error.message}`);
    }
  }

  /**
   * Get safety features status
   */
  async getSafetyStatus(userId) {
    try {
      const contacts = await SafetyContact.find({
        userId,
        isActive: true,
      });

      const activeAlerts = await SafetyReport.find({
        userId,
        status: 'active',
      });

      return {
        success: true,
        emergencyContactsCount: contacts.length,
        hasEmergencyContacts: contacts.length > 0,
        activeAlerts: activeAlerts.length,
        lastContactUpdate: contacts[0]?.updatedAt || contacts[0]?.addedAt,
      };
    } catch (error) {
      throw new Error(`Failed to get safety status: ${error.message}`);
    }
  }
}

module.exports = new SafetyFeatureService();
