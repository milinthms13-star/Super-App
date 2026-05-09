/**
 * RideShareSOSService.js
 * Emergency SOS system for ride-sharing
 * Features: SOS alerts, live location sharing, incident reporting
 */

const SosIncident = require('../models/SosIncident');
const SosContact = require('../models/SosContact');
const RideRequest = require('../models/RideRequest');
const User = require('../models/User');
const notificationService = require('./notificationService');
const s3Service = require('./s3Service');

class RideShareSOSService {
  /**
   * 1. Send SOS emergency alert
   */
  async sendEmergencyAlert(userId, rideId, incidentType, description) {
    try {
      // Validate ride exists
      const ride = await RideRequest.findById(rideId).populate('riderId driverId');
      if (!ride) throw new Error('Ride not found');

      // Determine user type
      const userType = ride.riderId._id.toString() === userId.toString() ? 'rider' : 'driver';

      // Create SOS incident
      const sosIncident = new SosIncident({
        rideId,
        userId,
        userType,
        incidentType,
        description,
        location: {
          address: ride.currentLocation?.address || 'Unknown',
          lat: ride.currentLocation?.lat,
          lng: ride.currentLocation?.lng,
        },
        status: 'active',
        severity: this.calculateSeverity(incidentType),
      });

      await sosIncident.save();

      // Get emergency contacts for user
      const emergencyContacts = await SosContact.find({
        userId,
        verified: true,
        active: true,
      });

      if (emergencyContacts.length > 0) {
        sosIncident.emergencyContacts = emergencyContacts.map((contact) => ({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          notified: false,
        }));

        // Notify emergency contacts
        await this.notifyEmergencyContacts(sosIncident);
      }

      // Notify ride-sharing support
      await this.notifySupport(sosIncident, ride);

      // Notify other party (driver if rider called SOS, rider if driver called SOS)
      await this.notifyOtherParty(sosIncident, ride, userType);

      return {
        success: true,
        sosId: sosIncident._id,
        message: 'Emergency alert sent successfully',
        contactsNotified: sosIncident.emergencyContacts.length,
      };
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      throw new Error(`Failed to send emergency alert: ${error.message}`);
    }
  }

  /**
   * 2. Upload incident recording/evidence
   */
  async uploadIncidentEvidence(sosId, file, type = 'image') {
    try {
      const sosIncident = await SosIncident.findById(sosId);
      if (!sosIncident) throw new Error('SOS incident not found');

      // Validate file
      if (type === 'image') {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.mimetype)) {
          throw new Error('Invalid image format. Use JPG, PNG, or WebP');
        }
        if (file.size > 10 * 1024 * 1024) throw new Error('Image too large (max 10MB)');
      } else if (type === 'audio') {
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg'];
        if (!validTypes.includes(file.mimetype)) {
          throw new Error('Invalid audio format');
        }
        if (file.size > 50 * 1024 * 1024) throw new Error('Audio too large (max 50MB)');
      }

      // Upload to S3
      const uploadPath = `sos-incidents/${sosId}/${type}s/${Date.now()}-${file.originalname}`;
      const url = await s3Service.uploadFile(file.buffer, uploadPath);

      // Save evidence
      if (type === 'image') {
        sosIncident.images.push({
          url,
          uploadedAt: new Date(),
        });
      } else if (type === 'audio') {
        sosIncident.audioRecording = {
          url,
          duration: 0, // Will be set on processing
          encrypted: true,
          uploadedAt: new Date(),
        };
      }

      await sosIncident.save();

      return {
        success: true,
        url,
        message: `${type} uploaded successfully`,
      };
    } catch (error) {
      console.error('Error uploading incident evidence:', error);
      throw new Error(`Failed to upload evidence: ${error.message}`);
    }
  }

  /**
   * 3. Create shareable live trip link
   */
  async createLiveTripShare(rideId, sharedWithEmail, duration = 24) {
    try {
      const ride = await RideRequest.findById(rideId);
      if (!ride) throw new Error('Ride not found');

      // Generate unique access token
      const accessToken = this.generateAccessToken();
      const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

      const tripShare = {
        rideId,
        sharedWith: [{
          email: sharedWithEmail,
          link: `${process.env.FRONTEND_URL}/share/trip/${accessToken}`,
          accessToken,
          expiresAt,
        }],
        createdAt: new Date(),
      };

      // Save to trip share collection (create if not exists)
      const sharedTrip = new (require('../models/LiveTripShare'))(tripShare);
      await sharedTrip.save();

      // Send share link via email
      await this.sendTripShareEmail(sharedWithEmail, tripShare.sharedWith[0].link, ride);

      return {
        success: true,
        shareLink: tripShare.sharedWith[0].link,
        expiresAt,
        message: 'Live trip link shared successfully',
      };
    } catch (error) {
      console.error('Error creating trip share:', error);
      throw new Error(`Failed to create trip share: ${error.message}`);
    }
  }

  /**
   * 4. Update SOS incident status
   */
  async updateIncidentStatus(sosId, newStatus, notes = '') {
    try {
      const sosIncident = await SosIncident.findById(sosId);
      if (!sosIncident) throw new Error('SOS incident not found');

      sosIncident.status = newStatus;
      if (notes) sosIncident.notes = notes;

      if (newStatus === 'resolved') {
        sosIncident.resolvedAt = new Date();
      } else if (newStatus === 'closed') {
        sosIncident.closedAt = new Date();
      }

      await sosIncident.save();

      // Notify user of status change
      await notificationService.sendNotification(sosIncident.userId, {
        type: 'sos_status_update',
        title: 'SOS Incident Update',
        body: `Your SOS incident has been ${newStatus}`,
        sosId: sosIncident._id,
      });

      return {
        success: true,
        sosId,
        newStatus,
        message: 'Incident status updated',
      };
    } catch (error) {
      console.error('Error updating incident status:', error);
      throw new Error(`Failed to update incident status: ${error.message}`);
    }
  }

  /**
   * 5. Get active SOS incidents
   */
  async getActiveIncidents(userId, limit = 10) {
    try {
      const incidents = await SosIncident.find({
        userId,
        status: { $in: ['active', 'responded'] },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('rideId');

      return incidents;
    } catch (error) {
      console.error('Error fetching active incidents:', error);
      throw new Error(`Failed to fetch incidents: ${error.message}`);
    }
  }

  /**
   * 6. Get incident details
   */
  async getIncidentDetails(sosId) {
    try {
      const incident = await SosIncident.findById(sosId)
        .populate('rideId', 'pickupLocation dropoffLocation riderId driverId fare')
        .populate('userId', 'phone email name');

      if (!incident) throw new Error('Incident not found');

      return incident;
    } catch (error) {
      console.error('Error fetching incident details:', error);
      throw new Error(`Failed to fetch incident: ${error.message}`);
    }
  }

  /**
   * Helper: Calculate severity level
   */
  calculateSeverity(incidentType) {
    const severityMap = {
      accident: 'critical',
      threat: 'high',
      harassment: 'high',
      medical: 'high',
      lost_item: 'low',
      other: 'medium',
    };
    return severityMap[incidentType] || 'medium';
  }

  /**
   * Helper: Notify emergency contacts
   */
  async notifyEmergencyContacts(sosIncident) {
    try {
      for (const contact of sosIncident.emergencyContacts) {
        // Send SMS/Email notification
        await notificationService.sendSMS(
          contact.phone,
          `EMERGENCY: ${sosIncident.userType === 'rider' ? 'Your' : 'A'} Ride-Share emergency alert has been sent.`
        );

        contact.notified = true;
      }
      await sosIncident.save();
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }

  /**
   * Helper: Notify support team
   */
  async notifySupport(sosIncident, ride) {
    try {
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@rideshare.com';
      const message = `
        SOS Emergency Alert
        Type: ${sosIncident.incidentType}
        Severity: ${sosIncident.severity}
        Ride ID: ${ride._id}
        Location: ${sosIncident.location.address}
        Description: ${sosIncident.description}
      `;
      // Send to support queue
      await notificationService.sendEmail(supportEmail, 'URGENT: SOS Alert Received', message);
    } catch (error) {
      console.error('Error notifying support:', error);
    }
  }

  /**
   * Helper: Notify other party
   */
  async notifyOtherParty(sosIncident, ride, userType) {
    try {
      const otherUserId = userType === 'rider' ? ride.driverId : ride.riderId;
      await notificationService.sendNotification(otherUserId, {
        type: 'sos_alert',
        title: 'Safety Alert',
        body: 'Your ride partner has reported a safety concern. Support team has been notified.',
        sosId: sosIncident._id,
        priority: 'high',
      });
    } catch (error) {
      console.error('Error notifying other party:', error);
    }
  }

  /**
   * Helper: Generate access token
   */
  generateAccessToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Helper: Send trip share email
   */
  async sendTripShareEmail(email, shareLink, ride) {
    try {
      const message = `
        Your ride details are being shared with you.
        Click here to view live location: ${shareLink}
        This link expires in 24 hours.
      `;
      await notificationService.sendEmail(email, 'Live Ride Shared with You', message);
    } catch (error) {
      console.error('Error sending trip share email:', error);
    }
  }
}

module.exports = new RideShareSOSService();
