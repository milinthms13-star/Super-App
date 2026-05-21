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
      email: String(req.headers['x-user-email'] || 'admin@example.com').trim().toLowerCase(),
    };
    next();
  },
  verifyAdmin: (req, res, next) => {
    if (String(req.user?.role || '').toLowerCase() === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  },
  optionalToken: (req, _res, next) => {
    req.user = req.user || null;
    next();
  },
  hasAdminPrivileges: (user = {}) => String(user.role || '').toLowerCase() === 'admin',
}));

const gulfservicesRouter = require('./gulfservices');
const { GulfFraudReport, GulfAdminAuditEvent, GulfRecruiter } = require('../models/gulfservices');

describe('gulfservices routes integration', () => {
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
    app.use('/api/gulfservices', gulfservicesRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      GulfFraudReport.deleteMany({}),
      GulfAdminAuditEvent.deleteMany({}),
      GulfRecruiter.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('GET /api/gulfservices/bootstrap returns constants', async () => {
    const response = await request(app).get('/api/gulfservices/bootstrap').expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data?.constants?.countries)).toBe(true);
    expect(response.body.data?.constants?.services?.some((item) => item.id === 'visa')).toBe(true);
  });

  test('POST /api/gulfservices/payments/create rejects out-of-range amount', async () => {
    const response = await request(app)
      .post('/api/gulfservices/payments/create')
      .send({
        amount: 0,
        currency: 'usd',
        type: 'attestation',
        id: 'ATT-1',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '')).toContain('Amount must be between');
  });

  test('POST /api/gulfservices/payments/create rejects unsupported currency', async () => {
    const response = await request(app)
      .post('/api/gulfservices/payments/create')
      .send({
        amount: 120,
        currency: 'eur',
        type: 'attestation',
        id: 'ATT-2',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '')).toContain('Currency must be one of');
  });

  test('PUT /api/gulfservices/admin/fraud-reports/:reportId/status writes admin audit event', async () => {
    await GulfFraudReport.create({
      reportId: 'FRD-TST-001',
      recruiterId: 'recruiter-1',
      issueDescription: 'Agent asked for advance registration payment.',
      phone: '+919999999999',
      status: 'open',
    });

    const response = await request(app)
      .put('/api/gulfservices/admin/fraud-reports/FRD-TST-001/status')
      .set('x-user-role', 'admin')
      .set('x-user-id', '507f1f77bcf86cd799439012')
      .set('x-user-email', 'ops.admin@example.com')
      .send({
        status: 'in_review',
        adminNote: 'Escalated to fraud operations queue.',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data?.status).toBe('in_review');

    const audits = await GulfAdminAuditEvent.find({ entityType: 'gulf_fraud_report' }).lean();
    expect(audits).toHaveLength(1);
    expect(audits[0].entityId).toBe('FRD-TST-001');
    expect(audits[0].action).toBe('fraud_report_status_updated');
    expect(audits[0].before?.status).toBe('open');
    expect(audits[0].after?.status).toBe('in_review');
  });
});
