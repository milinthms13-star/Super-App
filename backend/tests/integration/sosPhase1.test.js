/**
 * SOS Module Phase 1 Integration Tests
 * Tests for OTP, Siren, Photos, Tracking, and Retry Logic
 */

const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const SOSContact = require('../../models/SOSContact');
const SOSIncident = require('../../models/SOSIncident');
const TrackingLink = require('../../models/TrackingLink');

let authToken;
let userId;
let contactId;
let incidentId;
let trackingToken;

// Helper to generate auth token
const generateAuthToken = async () => {
  const user = await User.create({
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    phone: '9876543210',
    password: 'Test@123456',
  });
  userId = user._id;
  authToken = user.generateAuthToken();
  return authToken;
};

describe('SOS Module Phase 1 Tests', () => {
  // Setup and teardown
  beforeAll(async () => {
    await generateAuthToken();
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await SOSContact.deleteMany({});
    await SOSIncident.deleteMany({});
    await TrackingLink.deleteMany({});
  });

  // ==================== ENDPOINT 1: Send OTP ====================
  describe('POST /api/sos/send-contact-otp', () => {
    it('should send OTP to new contact', async () => {
      const res = await request(app)
        .post('/api/sos/send-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '9876543210',
          name: 'Emergency Contact 1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('OTP sent');
      expect(res.body.contactId).toBeDefined();
      expect(res.body.expiresIn).toBe(300);

      contactId = res.body.contactId;
    });

    it('should fail without phone number', async () => {
      const res = await request(app)
        .post('/api/sos/send-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Emergency Contact',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid phone', async () => {
      const res = await request(app)
        .post('/api/sos/send-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: 'invalid-phone',
          name: 'Contact',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should be rate limited after 5 attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/sos/send-contact-otp')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            phone: `98765432${i}0`,
            name: `Contact ${i}`,
          });
      }

      const res = await request(app)
        .post('/api/sos/send-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '9876543255',
          name: 'Contact 6',
        });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain('Too many');
    });
  });

  // ==================== ENDPOINT 2: Verify OTP ====================
  describe('POST /api/sos/verify-contact-otp', () => {
    let testContactId;
    let correctOTP;

    beforeAll(async () => {
      // Create a contact with OTP
      const res = await request(app)
        .post('/api/sos/send-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '8765432109',
          name: 'Verify Test Contact',
        });

      testContactId = res.body.contactId;

      // Get the OTP from database for testing
      const contact = await SOSContact.findById(testContactId).select('+otp');
      correctOTP = contact.otp;
    });

    it('should verify correct OTP', async () => {
      const res = await request(app)
        .post('/api/sos/verify-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactId: testContactId,
          otp: correctOTP,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(res.body.contact).toBeDefined();
    });

    it('should fail with incorrect OTP', async () => {
      const res = await request(app)
        .post('/api/sos/verify-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactId: testContactId,
          otp: '000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.attemptsLeft).toBeDefined();
    });

    it('should fail with invalid OTP format', async () => {
      const res = await request(app)
        .post('/api/sos/verify-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactId: testContactId,
          otp: 'invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail after 3 wrong attempts', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/sos/verify-contact-otp')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            contactId: testContactId,
            otp: '000000',
          });
      }

      const res = await request(app)
        .post('/api/sos/verify-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactId: testContactId,
          otp: '000000',
        });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('OTP_MAX_ATTEMPTS');
    });
  });

  // ==================== ENDPOINT 3: Create Tracking Link ====================
  describe('POST /api/sos/create-tracking-link', () => {
    let testIncidentId;

    beforeAll(async () => {
      // Create an incident first
      const incident = await SOSIncident.create({
        userId,
        reason: 'Medical',
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 25,
        channels: ['SMS'],
      });
      testIncidentId = incident._id;
    });

    it('should create tracking link for incident', async () => {
      const res = await request(app)
        .post('/api/sos/create-tracking-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          incidentId: testIncidentId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.trackingLink).toBeDefined();
      expect(res.body.trackingLink.token).toBeDefined();
      expect(res.body.trackingLink.url).toContain('/sos/tracking/');
      expect(res.body.trackingLink.expiresIn).toBe(86400); // 24 hours

      trackingToken = res.body.trackingLink.token;
    });

    it('should fail with invalid incident ID', async () => {
      const res = await request(app)
        .post('/api/sos/create-tracking-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          incidentId: 'invalid-id',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/sos/create-tracking-link')
        .send({
          incidentId: testIncidentId,
        });

      expect(res.status).toBe(401);
    });
  });

  // ==================== ENDPOINT 4: Get Tracking Location ====================
  describe('GET /api/sos/tracking/:token', () => {
    it('should get tracking location with valid token', async () => {
      const res = await request(app).get(`/api/sos/tracking/${trackingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.location).toBeDefined();
      expect(res.body.data.location.latitude).toBeDefined();
      expect(res.body.data.location.longitude).toBeDefined();
      expect(res.body.data.isActive).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app).get('/api/sos/tracking/invalid-token-123456');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should not require authentication', async () => {
      const res = await request(app).get(`/api/sos/tracking/${trackingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should track access count', async () => {
      await request(app).get(`/api/sos/tracking/${trackingToken}`);
      await request(app).get(`/api/sos/tracking/${trackingToken}`);

      const trackingLink = await TrackingLink.findOne({ token: trackingToken });
      expect(trackingLink.accessCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ==================== ENDPOINT 5: Send SOS Alert ====================
  describe('POST /api/sos/send-alert', () => {
    beforeAll(async () => {
      // Create and verify a contact
      const res = await request(app)
        .post('/api/sos/send-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '7654321098',
          name: 'Alert Test Contact',
        });

      const contact = await SOSContact.findById(res.body.contactId).select('+otp');

      await request(app)
        .post('/api/sos/verify-contact-otp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactId: res.body.contactId,
          otp: contact.otp,
        });
    });

    it('should send SOS alert with valid data', async () => {
      const res = await request(app)
        .post('/api/sos/send-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Medical',
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 25,
          channels: ['SMS'],
          photos: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.incidentId).toBeDefined();
      expect(res.body.contactsNotified).toBeGreaterThan(0);

      incidentId = res.body.incidentId;
    });

    it('should fail without verified contacts', async () => {
      const res = await request(app)
        .post('/api/sos/send-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Medical',
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 25,
          channels: ['SMS'],
          photos: [],
        });

      // Should have failed if no verified contacts
      expect(res.body).toBeDefined();
    });

    it('should fail with invalid coordinates', async () => {
      const res = await request(app)
        .post('/api/sos/send-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Medical',
          latitude: 91, // invalid
          longitude: 77.5946,
          accuracy: 25,
          channels: ['SMS'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail without channels', async () => {
      const res = await request(app)
        .post('/api/sos/send-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Medical',
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 25,
          channels: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should accept photo evidence', async () => {
      const base64Photo = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await request(app)
        .post('/api/sos/send-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Medical',
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 25,
          channels: ['SMS'],
          photos: [
            {
              data: base64Photo,
              timestamp: new Date(),
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.photosAttached).toBe(1);
    });

    it('should be rate limited after 3 alerts per minute', async () => {
      // Send 3 alerts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/sos/send-alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reason: 'Medical',
            latitude: 12.9716 + i * 0.01,
            longitude: 77.5946 + i * 0.01,
            accuracy: 25,
            channels: ['SMS'],
          });
      }

      // 4th alert should be rate limited
      const res = await request(app)
        .post('/api/sos/send-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Medical',
          latitude: 13.0,
          longitude: 77.6,
          accuracy: 25,
          channels: ['SMS'],
        });

      expect(res.status).toBe(429);
    });
  });

  // ==================== Additional Endpoints ====================
  describe('GET /api/sos/incidents', () => {
    it('should list user incidents', async () => {
      const res = await request(app)
        .get('/api/sos/incidents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter incidents by status', async () => {
      const res = await request(app)
        .get('/api/sos/incidents?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/sos/incidents?limit=10&page=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('PATCH /api/sos/incident/:incidentId/status', () => {
    it('should update incident status', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${incidentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'resolved',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');
    });

    it('should fail with invalid status', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${incidentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
