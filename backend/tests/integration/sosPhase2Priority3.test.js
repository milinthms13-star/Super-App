const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const SosIncident = require('../../models/SosIncident');
const User = require('../../models/User');

// Test configuration
const TEST_TIMEOUT = 30000;
const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar-test';
const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';

// Test data
let testUserId, testToken, testIncidentId;
const testUser = {
  email: 'sos-test@example.com',
  password: 'Test@123456',
  fullName: 'SOS Tester',
  phone: '+919876543210'
};

const testIncidentData = {
  callerId: null,
  callerName: 'Test Caller',
  callerPhone: '+919876543210',
  incidentType: 'medical',
  location: {
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'Delhi, India'
  },
  description: 'Test SOS incident for Priority 3',
  status: 'initial'
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
    await SosIncident.deleteMany({ callerName: testIncidentData.callerName });
    
    // Create test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
        fullName: testUser.fullName,
        phone: testUser.phone
      });
    
    testUserId = userRes.body.user._id;
    
    // Generate JWT token
    testToken = jwt.sign(
      { userId: testUserId, email: testUser.email },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: testUser.email });
    await SosIncident.deleteMany({ callerName: testIncidentData.callerName });
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Create a fresh incident for each test
    const incidentRes = await request(app)
      .post('/api/sos/create')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        ...testIncidentData,
        callerId: testUserId
      });
    
    testIncidentId = incidentRes.body.incident._id;
  });

  afterEach(async () => {
    // Clean up incident after each test
    await SosIncident.deleteOne({ _id: testIncidentId });
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
      expect(res.body.incident.currentStatus).toBe('acknowledged');
      expect(res.body.incident.statusHistory).toHaveLength(1);
      expect(res.body.incident.statusHistory[0].status).toBe('acknowledged');
      expect(res.body.incident.statusHistory[0].notes).toBe(updateData.notes);
      expect(res.body.incident.lastStatusUpdate).toBeDefined();
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
      expect(res.body.error).toBeDefined();
    });

    test('should capture responder location in status update', async () => {
      const updateData = {
        status: 'en-route',
        notes: 'On the way to location',
        responderName: 'Jane Responder',
        responderEmail: 'jane@example.com',
        responderLocation: {
          latitude: 28.5355,
          longitude: 77.3910,
          accuracy: 25,
          mapsUrl: 'https://maps.google.com/?q=28.5355,77.3910'
        }
      };

      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.incident.statusHistory[0].responderLocation).toBeDefined();
      expect(res.body.incident.statusHistory[0].responderLocation.latitude).toBe(28.5355);
      expect(res.body.incident.statusHistory[0].responderLocation.accuracy).toBe(25);
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
      expect(res.body.incident.currentStatus).toBe('en-route');
      expect(res.body.incident.statusHistory).toHaveLength(2);
      expect(res.body.incident.statusHistory[0].status).toBe('acknowledged');
      expect(res.body.incident.statusHistory[1].status).toBe('en-route');
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
      expect(res.body.incident.currentStatus).toBe('resolved');
      expect(res.body.incident.statusHistory).toHaveLength(4);
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
      expect(res.body.incident.currentStatus).toBe('escalated');
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

    test('should limit notes to 500 characters', async () => {
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

      expect(res.status).toBe(400);
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
      expect(res.body.incident.currentStatus).toBe('acknowledged');
      expect(res.body.incident.lastStatusUpdate).toBeDefined();
      expect(res.body.incident.lastUpdatedBy).toBe('john@example.com');
    });

    test('should include responder information in status', async () => {
      const responderData = {
        status: 'en-route',
        notes: 'On the way',
        responderName: 'Jane Smith',
        responderEmail: 'jane@example.com',
        responderLocation: {
          latitude: 28.5355,
          longitude: 77.3910,
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
      expect(res.body.latestUpdate.responderName).toBe('Jane Smith');
      expect(res.body.latestUpdate.responderLocation.latitude).toBe(28.5355);
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
      expect(res.body.incident.currentStatus).toBe('initial');
      expect(res.body.incident.statusHistory).toHaveLength(0);
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
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    test('should return paginated timeline', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline?limit=2&offset=0`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timeline).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.limit).toBe(2);
      expect(res.body.offset).toBe(0);
    });

    test('should return all timeline entries without pagination params', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timeline.length).toBeGreaterThanOrEqual(3);
    });

    test('should filter timeline by status', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline?filterStatus=acknowledged`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timeline.length).toBeGreaterThan(0);
      res.body.timeline.forEach(entry => {
        expect(entry.status).toBe('acknowledged');
      });
    });

    test('should include responder information in timeline entries', async () => {
      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timeline[0].responderName).toBe('John');
      expect(res.body.timeline[0].updatedBy).toBe('john@example.com');
      expect(res.body.timeline[0].timestamp).toBeDefined();
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
      expect(res1.body.timeline[0].status).not.toBe(res2.body.timeline[0].status);
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
      const newIncidentRes = await request(app)
        .post('/api/sos/create')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          ...testIncidentData,
          callerId: testUserId,
          callerName: 'New Test Caller'
        });

      const newIncidentId = newIncidentRes.body.incident._id;

      const res = await request(app)
        .get(`/api/sos/incident/${newIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timeline).toHaveLength(0);

      // Cleanup
      await SosIncident.deleteOne({ _id: newIncidentId });
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
            longitude: 77.2090,
            accuracy: 10,
            mapsUrl: 'https://maps.google.com/?q=28.6139,77.2090'
          }
        });

      const res = await request(app)
        .get(`/api/sos/incident/${testIncidentId}/timeline`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const resolvedEntry = res.body.timeline.find(entry => entry.status === 'resolved');
      expect(resolvedEntry.responderLocation).toBeDefined();
      expect(resolvedEntry.responderLocation.latitude).toBe(28.6139);
      expect(resolvedEntry.responderLocation.accuracy).toBe(10);
    });
  });

  describe('Status History Database Operations', () => {
    test('should create TTL index for automatic cleanup', async () => {
      const indexes = await SosIncident.collection.getIndexes();
      const hasTTLIndex = Object.values(indexes).some(index => {
        return index.expireAfterSeconds !== undefined;
      });
      expect(hasTTLIndex).toBe(true);
    });

    test('should maintain statusHistory chronologically', async () => {
      const timestamps = [];

      for (let i = 0; i < 3; i++) {
        await request(app)
          .patch(`/api/sos/incident/${testIncidentId}/status`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            status: ['acknowledged', 'en-route', 'arrived'][i],
            notes: `Update ${i}`,
            responderName: 'John',
            responderEmail: 'john@example.com'
          });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const incident = await SosIncident.findById(testIncidentId);
      expect(incident.statusHistory.length).toBe(3);

      for (let i = 0; i < 2; i++) {
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
    test('should include status update in WebSocket event payload', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Acknowledged',
          responderName: 'John',
          responderEmail: 'john@example.com'
        });

      expect(res.body.websocketEvent).toBeDefined();
      expect(res.body.websocketEvent.type).toBe('sos:status:updated');
      expect(res.body.websocketEvent.incidentId).toBe(testIncidentId.toString());
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle concurrent status updates gracefully', async () => {
      const updates = [
        { status: 'acknowledged', notes: 'Update 1', responderName: 'John', responderEmail: 'john@example.com' },
        { status: 'en-route', notes: 'Update 2', responderName: 'John', responderEmail: 'john@example.com' },
        { status: 'arrived', notes: 'Update 3', responderName: 'John', responderEmail: 'john@example.com' }
      ];

      const promises = updates.map(update =>
        request(app)
          .patch(`/api/sos/incident/${testIncidentId}/status`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(update)
      );

      const results = await Promise.all(promises);
      results.forEach(res => {
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
      expect(res.body.incident.statusHistory[0].notes).toBe('');
    });

    test('should validate responder location coordinates', async () => {
      const res = await request(app)
        .patch(`/api/sos/incident/${testIncidentId}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'acknowledged',
          notes: 'Test',
          responderName: 'John',
          responderEmail: 'john@example.com',
          responderLocation: {
            latitude: 91, // Invalid: > 90
            longitude: 77.2090,
            accuracy: 15,
            mapsUrl: 'https://maps.google.com/?q=91,77.2090'
          }
        });

      expect(res.status).toBe(400);
    });
  });
});
