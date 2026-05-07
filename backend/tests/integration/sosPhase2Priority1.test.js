/**
 * Phase 2 Integration Tests: Audio Recording + Spam Detection
 * Test Suite for Priority 1 Features
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const SOSIncident = require('../../models/SOSIncident');
const SOSContact = require('../../models/SOSContact');
const AudioRecording = require('../../models/AudioRecording');
const SpamReport = require('../../models/SpamReport');
const { generateToken } = require('../../middleware/auth');

// Dummy audio data (base64 encoded WAV)
const DUMMY_AUDIO_BASE64 = 'UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';

describe('Phase 2: Audio Recording & Spam Detection Tests', () => {
  let authToken;
  let userId;
  let testUser;
  let incidentId;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test Audio User',
      email: 'audiotest@test.com',
      phone: '9876543210',
    });

    userId = testUser._id;
    authToken = generateToken(userId);
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteOne({ _id: userId });
    await SOSIncident.deleteMany({ userId });
    await AudioRecording.deleteMany({ userId });
    await SpamReport.deleteMany({ userId });
  });

  describe('Audio Recording Feature', () => {
    beforeEach(async () => {
      // Create a test incident
      const incident = await SOSIncident.create({
        userId,
        reason: 'Test emergency for audio',
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 50,
        status: 'active',
        channels: ['SMS'],
      });
      incidentId = incident._id.toString();
    });

    test('POST /upload-audio - Upload valid audio to incident', async () => {
      const response = await request(app)
        .post(`/api/sos/upload-audio/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audio: DUMMY_AUDIO_BASE64,
          duration: 15,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('audioId');
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data.duration).toBe(15);
    });

    test('POST /upload-audio - Reject audio without base64 data', async () => {
      const response = await request(app)
        .post(`/api/sos/upload-audio/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration: 15,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid audio data');
    });

    test('POST /upload-audio - Reject empty audio', async () => {
      const response = await request(app)
        .post(`/api/sos/upload-audio/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audio: '',
          duration: 15,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('POST /upload-audio - Reject non-existent incident', async () => {
      const fakeIncidentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/sos/upload-audio/${fakeIncidentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audio: DUMMY_AUDIO_BASE64,
          duration: 10,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('GET /audio/:incidentId - Retrieve audio for incident', async () => {
      // Upload audio first
      await request(app)
        .post(`/api/sos/upload-audio/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audio: DUMMY_AUDIO_BASE64,
          duration: 12,
        });

      // Retrieve audio
      const response = await request(app)
        .get(`/api/sos/audio/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('filename');
      expect(response.body.data[0]).toHaveProperty('duration');
    });

    test('GET /audio/:incidentId - Returns empty array if no audio', async () => {
      const response = await request(app)
        .get(`/api/sos/audio/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBe(0);
    });

    test('GET /audio/:incidentId - Reject unauthorized access', async () => {
      const fakeToken = generateToken(new mongoose.Types.ObjectId());
      const response = await request(app)
        .get(`/api/sos/audio/${incidentId}`)
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Spam Detection Feature', () => {
    beforeEach(async () => {
      // Create a test incident
      const incident = await SOSIncident.create({
        userId,
        reason: 'Test spam detection',
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 50,
        status: 'active',
        channels: ['SMS'],
      });
      incidentId = incident._id.toString();
    });

    test('POST /check-spam - Analyze clean incident', async () => {
      const response = await request(app)
        .post(`/api/sos/check-spam/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('spamScore');
      expect(response.body.data).toHaveProperty('spamLevel');
      expect(response.body.data).toHaveProperty('reasons');
      expect(response.body.data.spamLevel).toMatch(/clean|suspicious|spam/);
    });

    test('POST /check-spam - Score is between 0 and 1', async () => {
      const response = await request(app)
        .post(`/api/sos/check-spam/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const score = response.body.data.spamScore;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('POST /check-spam - Breakdown contains all factors', async () => {
      const response = await request(app)
        .post(`/api/sos/check-spam/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const breakdown = response.body.data.breakdown;
      expect(breakdown).toHaveProperty('frequencyScore');
      expect(breakdown).toHaveProperty('timePatternScore');
      expect(breakdown).toHaveProperty('locationScore');
      expect(breakdown).toHaveProperty('contentScore');
      expect(breakdown).toHaveProperty('behaviorScore');
    });

    test('POST /check-spam - Reject non-existent incident', async () => {
      const fakeIncidentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/sos/check-spam/${fakeIncidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('GET /spam-report/:incidentId - Retrieve spam report', async () => {
      // Check spam first to create report
      await request(app)
        .post(`/api/sos/check-spam/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Retrieve report
      const response = await request(app)
        .get(`/api/sos/spam-report/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('automatedDetection');
      expect(response.body.data.automatedDetection).toHaveProperty('score');
      expect(response.body.data.automatedDetection).toHaveProperty('level');
    });

    test('GET /spam-report/:incidentId - Return 404 if no report exists', async () => {
      const newIncident = await SOSIncident.create({
        userId,
        reason: 'No report yet',
        latitude: 12.9716,
        longitude: 77.5946,
      });

      const response = await request(app)
        .get(`/api/sos/spam-report/${newIncident._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);

      await SOSIncident.deleteOne({ _id: newIncident._id });
    });
  });

  describe('Combined Audio + Spam Detection Workflow', () => {
    test('Complete workflow: Create incident → Upload audio → Check spam', async () => {
      // 1. Create incident
      const incident = await SOSIncident.create({
        userId,
        reason: 'Complete workflow test',
        latitude: 12.9716,
        longitude: 77.5946,
        channels: ['SMS'],
      });

      const workflowIncidentId = incident._id.toString();

      // 2. Upload audio
      const audioResponse = await request(app)
        .post(`/api/sos/upload-audio/${workflowIncidentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audio: DUMMY_AUDIO_BASE64,
          duration: 10,
        });

      expect(audioResponse.status).toBe(201);
      expect(audioResponse.body.data).toHaveProperty('audioId');

      // 3. Check spam
      const spamResponse = await request(app)
        .post(`/api/sos/check-spam/${workflowIncidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(spamResponse.status).toBe(200);
      expect(spamResponse.body.data).toHaveProperty('reportId');

      // 4. Verify both records exist
      const audioCount = await AudioRecording.countDocuments({
        incidentId: workflowIncidentId,
      });
      const spamReportExists = await SpamReport.findOne({
        incidentId: workflowIncidentId,
      });

      expect(audioCount).toBeGreaterThan(0);
      expect(spamReportExists).toBeDefined();

      // Cleanup
      await SOSIncident.deleteOne({ _id: workflowIncidentId });
    });
  });

  describe('Authentication & Authorization', () => {
    test('POST /upload-audio - Reject request without auth token', async () => {
      const response = await request(app)
        .post(`/api/sos/upload-audio/${incidentId}`)
        .send({
          audio: DUMMY_AUDIO_BASE64,
        });

      expect(response.status).toBe(401);
    });

    test('POST /check-spam - Reject request without auth token', async () => {
      const response = await request(app)
        .post(`/api/sos/check-spam/${incidentId}`)
        .send({});

      expect(response.status).toBe(401);
    });

    test('GET /audio/:incidentId - Reject request without auth token', async () => {
      const response = await request(app).get(`/api/sos/audio/${incidentId}`);

      expect(response.status).toBe(401);
    });
  });
});
