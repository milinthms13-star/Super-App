const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    const role = String(req.headers['x-user-role'] || 'user').trim().toLowerCase();
    const userId = String(req.headers['x-user-id'] || '507f1f77bcf86cd799439011');
    req.user = {
      _id: userId,
      id: userId,
      role,
      email: String(req.headers['x-user-email'] || 'healthcare.user@example.com').trim().toLowerCase(),
      name: String(req.headers['x-user-name'] || 'Healthcare User'),
    };
    next();
  },
  verifyAdmin: (req, res, next) => {
    if (String(req.user?.role || '').toLowerCase() === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  },
  optionalToken: (_req, _res, next) => next(),
  hasAdminPrivileges: (user = {}) => String(user.role || '').toLowerCase() === 'admin',
}));

jest.mock('../utils/s3Storage', () => ({
  uploadToS3: jest.fn(async (_buffer, key) => ({
    s3Key: key,
    s3Url: `https://example-bucket.local/${key}`,
  })),
  deleteFromS3: jest.fn(async () => true),
  generateSignedUrl: jest.fn((key) => `https://signed.local/${key}`),
}));

const healthcareRouter = require('./healthcare');
const HealthcareRecord = require('../models/healthcare/HealthcareRecord');
const HealthcareAuditLog = require('../models/healthcare/HealthcareAuditLog');
const HealthcarePharmacyOrder = require('../models/healthcare/HealthcarePharmacyOrder');
const HealthcareEmergencyIncident = require('../models/healthcare/HealthcareEmergencyIncident');

describe('healthcare routes integration', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    let resolvedMongoUri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!resolvedMongoUri) {
      mongoServer = await MongoMemoryServer.create();
      resolvedMongoUri = mongoServer.getUri();
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(resolvedMongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });
    }

    app = express();
    app.use(express.json());
    app.use('/api/healthcare', healthcareRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      HealthcareRecord.deleteMany({}),
      HealthcareAuditLog.deleteMany({}),
      HealthcarePharmacyOrder.deleteMany({}),
      HealthcareEmergencyIncident.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('record lifecycle supports archive, restore, consent renewal, and audit pagination', async () => {
    const createResponse = await request(app)
      .post('/api/healthcare/records')
      .send({
        title: 'HbA1c Report',
        category: 'Lab Report',
        doctorName: 'Dr. Arun',
        familyMember: 'Self',
        recordDate: '2026-05-20',
        fileName: 'hba1c-report.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://files.local/hba1c-report.pdf',
        visibility: 'family',
        consentAccepted: true,
        consentExpiryDate: '2026-12-31',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    const recordId = createResponse.body.data.id;

    const archiveResponse = await request(app)
      .delete(`/api/healthcare/records/${recordId}`)
      .send({ reason: 'cleanup' })
      .expect(200);
    expect(archiveResponse.body.data.status).toBe('archived');

    const listActive = await request(app).get('/api/healthcare/records').expect(200);
    expect(Array.isArray(listActive.body.data)).toBe(true);
    expect(listActive.body.data).toHaveLength(0);

    const listAll = await request(app).get('/api/healthcare/records?includeDeleted=true').expect(200);
    expect(listAll.body.data).toHaveLength(1);
    expect(listAll.body.data[0].isDeleted).toBe(true);

    const restoreResponse = await request(app)
      .patch(`/api/healthcare/records/${recordId}/restore`)
      .send({})
      .expect(200);
    expect(restoreResponse.body.data.isDeleted).toBe(false);

    const consentResponse = await request(app)
      .patch(`/api/healthcare/records/${recordId}/consent`)
      .send({
        visibility: 'care-team',
        consentAccepted: true,
        consentExpiryDate: '2027-01-31',
      })
      .expect(200);
    expect(consentResponse.body.data.visibility).toBe('care-team');

    const auditResponse = await request(app)
      .get('/api/healthcare/records/audit?action=record_archived&page=1&limit=10')
      .expect(200);
    expect(auditResponse.body.success).toBe(true);
    expect(auditResponse.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 10,
      })
    );
    expect(Array.isArray(auditResponse.body.data)).toBe(true);
  });

  test('create endpoints honor idempotency keys for safe retries', async () => {
    const key = 'idem-hc-test-record-1';
    const firstResponse = await request(app)
      .post('/api/healthcare/records')
      .set('x-idempotency-key', key)
      .send({
        title: 'Lipid Report',
        category: 'Lab Report',
        doctorName: 'Dr. Priya',
        familyMember: 'Self',
        recordDate: '2026-05-20',
        fileName: 'lipid-report.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://files.local/lipid-report.pdf',
        visibility: 'private',
        consentAccepted: true,
      })
      .expect(201);

    const secondResponse = await request(app)
      .post('/api/healthcare/records')
      .set('x-idempotency-key', key)
      .send({
        title: 'Lipid Report',
        category: 'Lab Report',
        doctorName: 'Dr. Priya',
        familyMember: 'Self',
        recordDate: '2026-05-20',
        fileName: 'lipid-report.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://files.local/lipid-report.pdf',
        visibility: 'private',
        consentAccepted: true,
      })
      .expect(201);

    expect(firstResponse.body.success).toBe(true);
    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);

    const records = await request(app).get('/api/healthcare/records').expect(200);
    expect(records.body.data).toHaveLength(1);
  });

  test('high-risk pharmacy review requires admin notes before approval', async () => {
    const createOrderResponse = await request(app)
      .post('/api/healthcare/pharmacy/orders')
      .send({
        items: [
          {
            medicineId: 'med-1',
            name: 'Amoxicillin 500mg',
            category: 'Infection',
            unitPrice: 220,
            quantity: 1,
            requiresPrescription: false,
          },
          {
            medicineId: 'med-2',
            name: 'Metformin 500mg',
            category: 'Diabetes',
            unitPrice: 130,
            quantity: 1,
            requiresPrescription: false,
          },
        ],
        deliveryAddress: 'Kozhikode',
        phone: '9999999999',
        customerName: 'Akhil',
      })
      .expect(201);

    const orderId = createOrderResponse.body.data.id;
    const rejectedResponse = await request(app)
      .patch(`/api/healthcare/pharmacy/orders/${orderId}`)
      .set('x-user-role', 'admin')
      .set('x-user-id', '507f1f77bcf86cd799439099')
      .send({
        prescriptionReviewStatus: 'approved',
      })
      .expect(400);

    expect(rejectedResponse.body.success).toBe(false);
    expect(String(rejectedResponse.body.message || '')).toContain('prescriptionReviewNotes is required');

    const approvedResponse = await request(app)
      .patch(`/api/healthcare/pharmacy/orders/${orderId}`)
      .set('x-user-role', 'admin')
      .set('x-user-id', '507f1f77bcf86cd799439099')
      .send({
        prescriptionReviewStatus: 'approved',
        prescriptionReviewNotes: 'Reviewed interaction risk and counseled patient.',
      })
      .expect(200);

    expect(approvedResponse.body.success).toBe(true);
    expect(approvedResponse.body.data.prescriptionReviewStatus).toBe('approved');
  });

  test('emergency incident enforces status transitions from open to acknowledged to resolved', async () => {
    const createIncidentResponse = await request(app)
      .post('/api/healthcare/emergency/sos')
      .send({
        incidentType: 'sos',
        escalationLevel: 'high',
        message: 'Need assistance',
      })
      .expect(201);
    const incidentId = createIncidentResponse.body.data.id;

    const acknowledgeResponse = await request(app)
      .patch(`/api/healthcare/emergency/incidents/${incidentId}`)
      .send({ status: 'acknowledged', responderNote: 'Responder connected.' })
      .expect(200);
    expect(acknowledgeResponse.body.data.status).toBe('acknowledged');

    const resolveResponse = await request(app)
      .patch(`/api/healthcare/emergency/incidents/${incidentId}`)
      .send({ status: 'resolved', responderNote: 'Incident closed.' })
      .expect(200);
    expect(resolveResponse.body.data.status).toBe('resolved');

    const invalidTransition = await request(app)
      .patch(`/api/healthcare/emergency/incidents/${incidentId}`)
      .send({ status: 'acknowledged' })
      .expect(400);
    expect(String(invalidTransition.body.message || '')).toContain('cannot change emergency status');
  });
});
