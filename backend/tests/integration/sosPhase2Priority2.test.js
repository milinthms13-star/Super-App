/**
 * =============================================================================
 * SOS PHASE 2 PRIORITY 2 INTEGRATION TESTS
 * Video Recording & Contact Groups
 * =============================================================================
 * Run: npm test -- sosPhase2Priority2.test.js
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server'); // Express app
const User = require('../../models/User');
const SOSIncident = require('../../models/SOSIncident');
const SOSContact = require('../../models/SOSContact');
const VideoRecording = require('../../models/VideoRecording');
const ContactGroup = require('../../models/ContactGroup');

const TEST_DB = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/sos-test';

describe('SOS Phase 2 - Priority 2 Integration Tests', () => {
  let authToken;
  let userId;
  let incidentId;
  let contactIds = [];
  let videoId;
  let groupId;

  /**
   * SETUP: Connect to test database and create test user
   */
  beforeAll(async () => {
    await mongoose.connect(TEST_DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test user
    const user = await User.create({
      email: 'test-p2@example.com',
      phone: '+911234567890',
      name: 'Test User P2',
    });

    userId = user._id;

    // Create auth token (mock)
    authToken = `Bearer ${user._id}`;
  });

  /**
   * TEARDOWN: Clean up test database
   */
  afterAll(async () => {
    await User.deleteMany({});
    await SOSIncident.deleteMany({});
    await SOSContact.deleteMany({});
    await VideoRecording.deleteMany({});
    await ContactGroup.deleteMany({});
    await mongoose.disconnect();
  });

  /**
   * =========================================================================
   * VIDEO RECORDING TESTS (8 test cases)
   * =========================================================================
   */

  describe('Video Recording Endpoints', () => {
    beforeAll(async () => {
      // Create test incident
      const incident = await SOSIncident.create({
        userId,
        reason: 'Emergency',
        latitude: 28.7041,
        longitude: 77.1025,
        status: 'ongoing',
        channels: ['SMS'],
      });

      incidentId = incident._id;

      // Create test contacts
      const contacts = await SOSContact.insertMany([
        { userId, phone: '+919876543210', name: 'Contact 1', verified: true },
        { userId, phone: '+919876543211', name: 'Contact 2', verified: true },
      ]);

      contactIds = contacts.map((c) => c._id);
    });

    test('Video: Upload video for incident', async () => {
      // Mock base64 video (small webm file)
      const mockBase64 = Buffer.from('WEBM_DATA').toString('base64');

      const response = await request(app)
        .post(`/api/sos/upload-video/${incidentId}`)
        .set('Authorization', authToken)
        .send({
          video: mockBase64,
          quality: 'medium',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.video).toHaveProperty('id');
      expect(response.body.video).toHaveProperty('filename');
      expect(response.body.video.quality).toBe('medium');

      videoId = response.body.video.id;
    });

    test('Video: Upload rejects invalid incident', async () => {
      const mockBase64 = Buffer.from('WEBM_DATA').toString('base64');
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/sos/upload-video/${invalidId}`)
        .set('Authorization', authToken)
        .send({
          video: mockBase64,
          quality: 'high',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });

    test('Video: Upload rejects empty video', async () => {
      const response = await request(app)
        .post(`/api/sos/upload-video/${incidentId}`)
        .set('Authorization', authToken)
        .send({
          video: '',
          quality: 'medium',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid|no video/i);
    });

    test('Video: Get all videos for incident', async () => {
      const response = await request(app)
        .get(`/api/sos/video/${incidentId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.incidentId).toBe(incidentId.toString());
      expect(Array.isArray(response.body.videos)).toBe(true);
      expect(response.body.videoCount).toBeGreaterThanOrEqual(0);
    });

    test('Video: Check transcoding status', async () => {
      const response = await request(app)
        .get(`/api/sos/video/${videoId}/status`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toMatch(/pending|processing|completed|failed/);
      expect(typeof response.body.progress).toBe('number');
    });

    test('Video: Status check rejects invalid video ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/sos/video/${invalidId}/status`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });

    test('Video: Get videos for non-existent incident', async () => {
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/sos/video/${invalidId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });

    test('Video: Requires authentication', async () => {
      const mockBase64 = Buffer.from('WEBM_DATA').toString('base64');

      const response = await request(app)
        .post(`/api/sos/upload-video/${incidentId}`)
        .send({
          video: mockBase64,
          quality: 'medium',
        });

      expect(response.status).toBe(401);
    });
  });

  /**
   * =========================================================================
   * CONTACT GROUP TESTS (15 test cases)
   * =========================================================================
   */

  describe('Contact Group Endpoints', () => {
    test('Group: Create new group', async () => {
      const response = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', authToken)
        .send({
          name: 'Family',
          description: 'Close family members',
          contacts: contactIds,
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.group.name).toBe('Family');
      expect(response.body.group.contactCount).toBe(2);
      expect(response.body.group.priority).toBe('high');

      groupId = response.body.group.id;
    });

    test('Group: Create requires name', async () => {
      const response = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', authToken)
        .send({
          description: 'Missing name',
          contacts: contactIds,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/name.*required/i);
    });

    test('Group: Create requires at least one contact', async () => {
      const response = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', authToken)
        .send({
          name: 'Empty Group',
          contacts: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/contact.*required/i);
    });

    test('Group: Get all groups', async () => {
      const response = await request(app)
        .get('/api/sos/contact-groups')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.groups[0]).toHaveProperty('name');
      expect(response.body.groups[0]).toHaveProperty('contactCount');
    });

    test('Group: Get single group', async () => {
      const response = await request(app)
        .get(`/api/sos/contact-groups/${groupId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group.name).toBe('Family');
      expect(response.body.group.contactCount).toBe(2);
    });

    test('Group: Get non-existent group', async () => {
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/sos/contact-groups/${invalidId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });

    test('Group: Update group name', async () => {
      const response = await request(app)
        .patch(`/api/sos/contact-groups/${groupId}`)
        .set('Authorization', authToken)
        .send({
          name: 'Close Family',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group.name).toBe('Close Family');
    });

    test('Group: Update rejects empty name', async () => {
      const response = await request(app)
        .patch(`/api/sos/contact-groups/${groupId}`)
        .set('Authorization', authToken)
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
    });

    test('Group: Add contact to group', async () => {
      // Create additional contact
      const newContact = await SOSContact.create({
        userId,
        phone: '+919876543212',
        name: 'Contact 3',
        verified: true,
      });

      const response = await request(app)
        .post(`/api/sos/contact-groups/${groupId}/contacts`)
        .set('Authorization', authToken)
        .send({
          contactId: newContact._id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group.contactCount).toBe(3);
    });

    test('Group: Remove contact from group', async () => {
      const response = await request(app)
        .delete(`/api/sos/contact-groups/${groupId}/contacts/${contactIds[1]}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group.contactCount).toBe(2);
    });

    test('Group: Cannot remove last contact', async () => {
      // Create single-contact group
      const singleContact = await SOSContact.create({
        userId,
        phone: '+919876543213',
        name: 'Solo Contact',
        verified: true,
      });

      const singleGroup = await ContactGroup.create({
        userId,
        name: 'Single',
        contacts: [singleContact._id],
        priority: 'medium',
      });

      const response = await request(app)
        .delete(`/api/sos/contact-groups/${singleGroup._id}/contacts/${singleContact._id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/last contact/i);
    });

    test('Group: Delete group', async () => {
      const response = await request(app)
        .delete(`/api/sos/contact-groups/${groupId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/deleted/i);
    });

    test('Group: Get statistics', async () => {
      const response = await request(app)
        .get('/api/sos/groups/stats')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toHaveProperty('totalGroups');
      expect(response.body.stats).toHaveProperty('totalContacts');
      expect(typeof response.body.stats.totalGroups).toBe('number');
    });

    test('Group: Requires authentication', async () => {
      const response = await request(app)
        .get('/api/sos/contact-groups');

      expect(response.status).toBe(401);
    });
  });

  /**
   * =========================================================================
   * COMBINED WORKFLOW TESTS (3 test cases)
   * =========================================================================
   */

  describe('Combined Workflow Tests', () => {
    test('Workflow: Create group and incident with video', async () => {
      // 1. Create incident
      const incidentRes = await request(app)
        .post('/api/sos/create-tracking-link')
        .set('Authorization', authToken)
        .send({
          reason: 'Safety check',
          latitude: 28.7041,
          longitude: 77.1025,
          channels: ['SMS'],
        });

      expect(incidentRes.status).toBe(201);
      const newIncidentId = incidentRes.body.incident._id || incidentRes.body.incidentId;

      // 2. Upload video for incident
      const mockBase64 = Buffer.from('WEBM_DATA').toString('base64');
      const videoRes = await request(app)
        .post(`/api/sos/upload-video/${newIncidentId}`)
        .set('Authorization', authToken)
        .send({
          video: mockBase64,
          quality: 'high',
        });

      expect(videoRes.status).toBe(201);

      // 3. Create contact group
      const newContact = await SOSContact.create({
        userId,
        phone: '+918765432109',
        name: 'Workflow Test',
        verified: true,
      });

      const groupRes = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', authToken)
        .send({
          name: 'Workflow Group',
          contacts: [newContact._id],
          priority: 'high',
        });

      expect(groupRes.status).toBe(201);

      // 4. Verify all created
      expect(newIncidentId).toBeDefined();
      expect(videoRes.body.video.id).toBeDefined();
      expect(groupRes.body.group.id).toBeDefined();
    });

    test('Workflow: Multiple videos for one incident', async () => {
      // Create incident
      const incident = await SOSIncident.create({
        userId,
        reason: 'Multi-video test',
        latitude: 28.7041,
        longitude: 77.1025,
        status: 'ongoing',
      });

      // Upload multiple videos
      const mockBase64 = Buffer.from('WEBM_DATA').toString('base64');
      const videos = [];

      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post(`/api/sos/upload-video/${incident._id}`)
          .set('Authorization', authToken)
          .send({
            video: mockBase64,
            quality: ['low', 'medium', 'high'][i],
          });

        expect(res.status).toBe(201);
        videos.push(res.body.video);
      }

      // Get all videos
      const listRes = await request(app)
        .get(`/api/sos/video/${incident._id}`)
        .set('Authorization', authToken);

      expect(listRes.status).toBe(200);
      expect(listRes.body.videoCount).toBe(3);
      expect(listRes.body.videos.length).toBe(3);
    });

    test('Workflow: Group usage tracking', async () => {
      // Create group
      const contact = await SOSContact.create({
        userId,
        phone: '+919876543214',
        name: 'Track Usage',
        verified: true,
      });

      const groupRes = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', authToken)
        .send({
          name: 'Usage Track Group',
          contacts: [contact._id],
        });

      const newGroupId = groupRes.body.group.id;

      // Get initial stats
      const statsRes1 = await request(app)
        .get('/api/sos/groups/stats')
        .set('Authorization', authToken);

      const initialCount = statsRes1.body.stats.totalGroups;

      // Delete and verify
      const deleteRes = await request(app)
        .delete(`/api/sos/contact-groups/${newGroupId}`)
        .set('Authorization', authToken);

      expect(deleteRes.status).toBe(200);

      // Verify count decreased
      const statsRes2 = await request(app)
        .get('/api/sos/groups/stats')
        .set('Authorization', authToken);

      expect(statsRes2.body.stats.totalGroups).toBeLessThan(initialCount);
    });
  });

  /**
   * =========================================================================
   * AUTHORIZATION TESTS (3 test cases)
   * =========================================================================
   */

  describe('Authorization & Permissions', () => {
    test('Auth: Another user cannot access groups', async () => {
      // Create different user
      const otherUser = await User.create({
        email: 'other-user@example.com',
        phone: '+919999999999',
        name: 'Other User',
      });

      const otherToken = `Bearer ${otherUser._id}`;

      // Create group as first user
      const contact = await SOSContact.create({
        userId,
        phone: '+919876543215',
        name: 'Private Contact',
        verified: true,
      });

      const groupRes = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', authToken)
        .send({
          name: 'Private Group',
          contacts: [contact._id],
        });

      // Try to access as different user
      const accessRes = await request(app)
        .get(`/api/sos/contact-groups/${groupRes.body.group.id}`)
        .set('Authorization', otherToken);

      expect(accessRes.status).toBe(404);

      // Cleanup
      await User.findByIdAndDelete(otherUser._id);
    });

    test('Auth: Missing token returns 401', async () => {
      const response = await request(app).post('/api/sos/contact-groups').send({
        name: 'No Auth',
        contacts: contactIds,
      });

      expect(response.status).toBe(401);
    });

    test('Auth: Invalid token returns 401', async () => {
      const response = await request(app)
        .post('/api/sos/contact-groups')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Bad Token',
          contacts: contactIds,
        });

      expect(response.status).toBe(401);
    });
  });
});

/**
 * Test Summary:
 * - Video Recording: 8 tests
 * - Contact Groups: 15 tests
 * - Combined Workflows: 3 tests
 * - Authorization: 3 tests
 * TOTAL: 29 test cases
 * 
 * Expected Coverage:
 * - All CRUD operations for groups
 * - Video upload and status checks
 * - Authorization checks
 * - Error handling and validation
 * - Combined workflows
 */
