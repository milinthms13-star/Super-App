const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const SosIncident = require('../../models/SosIncident');
const User = require('../../models/User');

// Test configuration
const TEST_TIMEOUT = 30000;
const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar-test';

// Test data
let testUserId;
let testToken;
let testIncidentId;
const testUser = {
  email: 'sos-test@example.com',
  fullName: 'SOS Tester',
  phone: '+919876543210'
};

const testIncidentData = {
  reason: 'medical',
  latitude: 28.6139,
  longitude: 77.209,
  accuracy: 25,
  status: 'active',
  channels: ['SMS']
};

describe('Priority 3 - SOS Real-Time Status Updates', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // Clear test data
    await User.deleteMany({ email: testUser.email });

    // Create test user directly for integration auth flow
    const user = await User.create({
      email: testUser.email,
      phone: testUser.phone,
      name: testUser.fullName
    });

    testUserId = user._id;
    // In test mode, auth middleware accepts ObjectId-like bearer token
    testToken = testUserId.toString();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: testUser.email });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Create a fresh incident for each test
    const incident = await SosIncident.create({
      userId: testUserId,
      ...testIncidentData,
      currentStatus: 'initial',
      statusHistory: []
    });

    testIncidentId = incident._id;
  });

  afterEach(async () => {
    // Clean up incident after each test
    if (testIncidentId) {
      await SosIncident.deleteOne({ _id: testIncidentId });
    }
  });

  describe('PATCH /api/sos/incident/:incidentId/status - Update Status', () => {
    test('should update incident status with valid data', async () => {
      const updateData = {
        status: 'acknowledged',
        notes: 'Responder acknowledged the incident',
        responderName: 'John Responder',
        responderEmail: 'responder@example.com'
      };

      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.newStatus).toBe('acknowledged');
      expect(res.body.data.statusHistory).toHaveLength(1);
      expect(res.body.data.statusHistory[0].status).toBe('acknowledged');
      expect(res.body.data.statusHistory[0].notes).toBe(updateData.notes);

      const incident = await SosIncident.findById(testIncidentId);
      expect(incident.lastStatusUpdate).toBeDefined();
    });

    test('should reject invalid status value', async () => {
      const updateData = {
        status: 'invalid-status',
        notes: 'Test note',
        responderName: 'John Responder',
        responderEmail: 'responder@example.com'
      };

      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });

    test('should capture responder location in status update', async () => {
      const updateData = {
        status: 'en-route',
        notes: 'On the way to location',
        responderName: 'Jane Responder',
        responderEmail: 'jane@example.com',
        responderLocation: {
          latitude: 28.5355,
          longitude: 77.391,
          accuracy: 25,
          mapsUrl: 'https://maps.google.com/?q=28.5355,77.3910'
        }
      };

      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.data.statusHistory[0].responderLocation).toBeDefined();
      expect(res.body.data.statusHistory[0].responderLocation.latitude).toBe(28.5355);
      expect(res.body.data.statusHistory[0].responderLocation.accuracy).toBe(25);
    });

    test('should support status transitions: acknowledged -> en-route', async () => {
      // First update: acknowledge
      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Acknowledged',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      // Second update: en-route
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'en-route',
          notes: 'En route to location',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.newStatus).toBe('en-route');
      expect(res.body.data.statusHistory).toHaveLength(2);
      expect(res.body.data.statusHistory[0].status).toBe('acknowledged');
      expect(res.body.data.statusHistory[1].status).toBe('en-route');
    });

    test('should support status transitions: arrived -> resolved', async () => {
      // Setup: acknowledge -> en-route -> arrived
      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Acknowledged',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'en-route',
          notes: 'En route',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'arrived',
          notes: 'Arrived at location',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      // Now resolve
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'resolved',
          notes: 'Incident resolved successfully',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.newStatus).toBe('resolved');
      expect(res.body.data.statusHistory).toHaveLength(4);
    });

    test('should support escalation from any status', async () => {
      // Update to acknowledged first
      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Acknowledged',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      // Escalate
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'escalated',
          notes: 'Escalated to higher authority',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.newStatus).toBe('escalated');
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .send({
          status: 'acknowledged',
          notes: 'Test',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(401);
    });

    test('should reject non-existent incident', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/sos/incident/${fakeId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Test',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(404);
    });

    test('should accept long notes payload', async () => {
      const longNotes = 'a'.repeat(501);
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: longNotes,
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.statusHistory[0].notes.length).toBe(501);
    });
  });

  describe('GET /api/sos/incident/:incidentId/status - Get Current Status', () => {
    test('should return current status snapshot', async () => {
      // First update the status
      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Acknowledged by responder',
          responderName: 'John Responder',
          responderEmail: 'john@example.com'
        });

      // Get current status
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('acknowledged');
      expect(res.body.data.latestUpdate.timestamp).toBeDefined();
      expect(res.body.data.latestUpdate.responderEmail).toBe('john@example.com');
    });

    test('should include responder information in status', async () => {
      const responderData = {
        status: 'en-route',
        notes: 'On the way',
        responderName: 'Jane Smith',
        responderEmail: 'jane@example.com',
        responderLocation: {
          latitude: 28.5355,
          longitude: 77.391,
          accuracy: 15,
          mapsUrl: 'https://maps.google.com/?q=28.5355,77.3910'
        }
      };

      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(responderData);

      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.latestUpdate.responderName).toBe('Jane Smith');
      expect(res.body.data.latestUpdate.responderEmail).toBe('jane@example.com');
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/status`);

      expect(res.status).toBe(401);
    });

    test('should return 404 for non-existent incident', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/sos/incident/${fakeId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
    });

    test('should return initial status if no updates', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('initial');
      expect(res.body.data.statistics.totalStatusUpdates).toBe(0);
    });
  });

  describe('GET /api/sos/incident/:incidentId/timeline - Get Status Timeline', () => {
    beforeEach(async () => {
      // Add multiple status updates for timeline testing
      const statuses = [
        { status: 'acknowledged', notes: 'Acknowledged', responderName: 'John', responderEmail: 'john@example.com' },
        { status: 'en-route', notes: 'On the way', responderName: 'John', responderEmail: 'john@example.com' },
        { status: 'arrived', notes: 'Arrived at location', responderName: 'John', responderEmail: 'john@example.com' }
      ];

      for (const statusUpdate of statuses) {
        await request(app)
          .patch(`/api/sos/incident/${testIncidentId}/status`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(statusUpdate);

        // Small delay between updates to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });

    test('should return paginated timeline', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline?limit=2&offset=0`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timeline).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.offset).toBe(0);
    });

    test('should return all timeline entries without pagination params', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(3);
    });

    test('should filter timeline by status', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline?filterStatus=acknowledged`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timeline.length).toBeGreaterThan(0);
      res.body.data.timeline.forEach((entry) => {
        expect(entry.status).toBe('acknowledged');
      });
    });

    test('should include responder information in timeline entries', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timeline[0].responderName).toBe('John');
      expect(res.body.data.timeline[0].updatedBy).toBe('john@example.com');
      expect(res.body.data.timeline[0].timestamp).toBeDefined();
    });

    test('should support offset-based pagination', async () => {
      const res1 = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline?limit=1&offset=0`)
        .set('Authorization', `Bearer ${testToken}`);

      const res2 = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline?limit=1&offset=1`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.timeline[0].status).not.toBe(res2.body.data.timeline[0].status);
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`);

      expect(res.status).toBe(401);
    });

    test('should return empty timeline for non-existent incident', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/sos/incident/${fakeId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
    });

    test('should return empty array for incident with no updates', async () => {
      // Create a new incident without any updates
      const newIncident = await SosIncident.create({
        userId: testUserId,
        ...testIncidentData,
        reason: 'New Test Incident',
        currentStatus: 'initial',
        statusHistory: []
      });

      const res = await request(app)
        .get(`/api/sos/incident/${newIncident._id}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timeline).toHaveLength(0);

      // Cleanup
      await SosIncident.deleteOne({ _id: newIncident._id });
    });

    test('should include location information in timeline entries', async () => {
      // Add an update with location
      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'resolved',
          notes: 'Resolved',
          responderName: 'John',
          responderEmail: 'john@example.com',
          responderLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            accuracy: 10,
            mapsUrl: 'https://maps.google.com/?q=28.6139,77.2090'
          }
        });

      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const resolvedEntry = res.body.data.timeline.find((entry) => entry.status === 'resolved');
      expect(resolvedEntry.responderLocation).toBeDefined();
      expect(resolvedEntry.responderLocation.latitude).toBe(28.6139);
      expect(resolvedEntry.responderLocation.accuracy).toBe(10);
    });
  });

  describe('Status History Database Operations', () => {
    test('should create TTL index for automatic cleanup', async () => {
      const indexes = await SosIncident.collection.indexes();
      const hasTTLIndex = indexes.some((index) => index.expireAfterSeconds !== undefined);
      expect(hasTTLIndex).toBe(true);
    });

    test('should maintain statusHistory chronologically', async () => {
      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .patch(`/api/sos/incident/${testIncidentId}/status`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            status: ['acknowledged', 'en-route', 'arrived'][i],
            notes: `Update ${i}`,
            responderName: 'John',
            responderEmail: 'john@example.com'
          });

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const incident = await SosIncident.findById(testIncidentId);
      expect(incident.statusHistory.length).toBe(3);

      for (let i = 0; i < 2; i += 1) {
        const time1 = new Date(incident.statusHistory[i].timestamp).getTime();
        const time2 = new Date(incident.statusHistory[i + 1].timestamp).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });

    test('should update lastStatusUpdate field', async () => {
      const before = new Date();

      await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Test',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      const after = new Date();
      const incident = await SosIncident.findById(testIncidentId);

      expect(incident.lastStatusUpdate).toBeDefined();
      const updateTime = new Date(incident.lastStatusUpdate).getTime();
      expect(updateTime).toBeGreaterThanOrEqual(before.getTime());
      expect(updateTime).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('WebSocket Integration', () => {
    test('should return status payload suitable for websocket broadcasting', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Acknowledged',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(String(res.body.data.incidentId)).toBe(String(testIncidentId));
      expect(res.body.data.newStatus).toBe('acknowledged');
      expect(res.body.data.lastUpdate.timestamp).toBeDefined();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle concurrent status updates gracefully', async () => {
      const updates = [
        { status: 'acknowledged', notes: 'Update 1', responderName: 'John', responderEmail: 'john@example.com' },
        { status: 'en-route', notes: 'Update 2', responderName: 'John', responderEmail: 'john@example.com' },
        { status: 'arrived', notes: 'Update 3', responderName: 'John', responderEmail: 'john@example.com' }
      ];

      const promises = updates.map((update) =>
        request(app)
          .patch(`/api/sos/incident/${testIncidentId}/status`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(update)
      );

      const results = await Promise.all(promises);
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });

      const incident = await SosIncident.findById(testIncidentId);
      expect(incident.statusHistory.length).toBe(3);
    });

    test('should handle missing optional fields gracefully', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.statusHistory[0].notes).toBe('');
    });

    test('should accept responder location coordinates as provided', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Test',
          responderName: 'John',
          responderEmail: 'john@example.com',
          responderLocation: {
            latitude: 91,
            longitude: 77.209,
            accuracy: 15,
            mapsUrl: 'https://maps.google.com/?q=91,77.2090'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.statusHistory[0].responderLocation.latitude).toBe(91);
    });
  });
});
