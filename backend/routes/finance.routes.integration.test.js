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
      consultantId: String(req.headers['x-consultant-id'] || '').trim(),
      name: 'Test User',
      phone: '9999999999',
    };
    next();
  },
  hasAdminPrivileges: (user = {}) => String(user.role || '').trim().toLowerCase() === 'admin',
}));

const financeRouter = require('./finance');
const FinanceLead = require('../models/FinanceLead');
const FinanceInstitution = require('../models/FinanceInstitution');
const FinanceAuditLog = require('../models/FinanceAuditLog');
const FinanceEligibilityRecord = require('../models/FinanceEligibilityRecord');
const mongoUri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

describe('finance routes integration', () => {
  let app;
  let institutionId;
  let mongoServer;

  beforeAll(async () => {
    let resolvedMongoUri = mongoUri;
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
    app.use('/api/finance', financeRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      FinanceLead.deleteMany({}),
      FinanceInstitution.deleteMany({}),
      FinanceAuditLog.deleteMany({}),
      FinanceEligibilityRecord.deleteMany({}),
    ]);

    const institution = await FinanceInstitution.create({
      partnerCode: 'FI-TST-001',
      name: 'Test Institution',
      type: 'bank',
      verifiedPartner: true,
      serviceDistricts: ['Kollam'],
      loanCategories: ['business'],
      commissionModel: { type: 'percentage', value: 1.5 },
      interestRange: { min: 9, max: 14 },
      approvalTime: { minDays: 2, maxDays: 5 },
    });

    institutionId = institution._id;

    await FinanceLead.create([
      {
        leadId: 'FIN-TST-001',
        fullName: 'Alice Finance',
        phone: '9999999999',
        state: 'Kerala',
        district: 'Kollam',
        loanCategory: 'business',
        amount: 400000,
        institution: {
          institutionId,
          name: institution.name,
          partnerCode: institution.partnerCode,
        },
        status: 'consultant_assigned',
        consultant: {
          consultantId: 'CONS-1',
          name: 'Consultant One',
          phone: '9000000001',
          assignedAt: new Date(),
        },
        statusTimeline: [
          {
            status: 'lead_received',
            note: 'seeded',
            changedByRole: 'system',
            changedByName: 'System',
            changedAt: new Date(),
          },
        ],
      },
      {
        leadId: 'FIN-TST-002',
        fullName: 'Bob Finance',
        phone: '8888888888',
        state: 'Kerala',
        district: 'Kollam',
        loanCategory: 'business',
        amount: 300000,
        institution: {
          institutionId,
          name: institution.name,
          partnerCode: institution.partnerCode,
        },
        status: 'consultant_assigned',
        consultant: {
          consultantId: 'CONS-2',
          name: 'Consultant Two',
          phone: '9000000002',
          assignedAt: new Date(),
        },
        statusTimeline: [
          {
            status: 'lead_received',
            note: 'seeded',
            changedByRole: 'system',
            changedByName: 'System',
            changedAt: new Date(),
          },
        ],
      },
    ]);

    await FinanceEligibilityRecord.create([
      {
        recordId: 'FER-TST-001',
        fullName: 'Alice Finance',
        phone: '9999999999',
        state: 'Kerala',
        district: 'Kollam',
        loanCategory: 'business',
        payload: { monthlyIncome: 65000 },
        result: { score: 82 },
      },
      {
        recordId: 'FER-TST-002',
        fullName: 'Bob Finance',
        phone: '8888888888',
        state: 'Kerala',
        district: 'Kollam',
        loanCategory: 'business',
        payload: { monthlyIncome: 45000 },
        result: { score: 60 },
      },
      {
        recordId: 'FER-TST-003',
        fullName: 'Other User',
        phone: '7777777777',
        state: 'Kerala',
        district: 'Kollam',
        loanCategory: 'business',
        payload: { monthlyIncome: 35000 },
        result: { score: 42 },
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('GET /api/finance/leads blocks consultant from querying another consultant scope', async () => {
    const response = await request(app)
      .get('/api/finance/leads')
      .set('x-user-role', 'consultant')
      .set('x-consultant-id', 'CONS-1')
      .query({ consultantId: 'CONS-2' })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '')).toContain('own consultant leads');
  });

  test('GET /api/finance/leads defaults consultant scope to authenticated identity when consultantId header missing', async () => {
    const response = await request(app)
      .get('/api/finance/leads')
      .set('x-user-role', 'consultant')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data?.leads)).toBe(true);
  });

  test('GET /api/finance/leads returns only own leads for consultant scope', async () => {
    const response = await request(app)
      .get('/api/finance/leads')
      .set('x-user-role', 'consultant')
      .set('x-consultant-id', 'CONS-1')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data?.leads)).toBe(true);
    expect(response.body.data.leads).toHaveLength(1);
    expect(response.body.data.leads[0].leadId).toBe('FIN-TST-001');
    expect(response.body.data?.pagination?.page).toBe(1);
  });

  test('GET /api/finance/leads returns paginated payload for admin', async () => {
    const response = await request(app)
      .get('/api/finance/leads')
      .set('x-user-role', 'admin')
      .query({ limit: 1, page: 1 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data?.leads)).toBe(true);
    expect(response.body.data.leads).toHaveLength(1);
    expect(response.body.data.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 1,
        totalCount: 2,
        totalPages: 2,
        hasNextPage: true,
      })
    );
  });

  test('PATCH /api/finance/leads/:leadId/status blocks consultant on unassigned lead', async () => {
    const response = await request(app)
      .patch('/api/finance/leads/FIN-TST-002/status')
      .set('x-user-role', 'consultant')
      .set('x-consultant-id', 'CONS-1')
      .send({ status: 'in_review', note: 'Trying to update another consultant lead' })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '')).toContain('assigned to your consultant profile');
  });

  test('FinanceAuditLog accepts data_deletion_processed action type', async () => {
    const record = await FinanceAuditLog.create({
      actionType: 'data_deletion_processed',
      actorRole: 'admin',
      actorName: 'Admin',
      leadId: 'FIN-TST-001',
      details: { reason: 'GDPR request' },
    });

    expect(record.actionType).toBe('data_deletion_processed');
  });

  test('POST /api/finance/leads uses idempotency key to avoid duplicate lead creation', async () => {
    const idempotencyKey = 'fin-idempotency-001';
    const baseRequest = () =>
      request(app)
        .post('/api/finance/leads')
        .set('x-user-role', 'user')
        .set('x-user-id', '507f1f77bcf86cd799439099')
        .set('x-idempotency-key', idempotencyKey)
        .set('x-source-channel', 'expo')
        .field('fullName', 'Expo Finance User')
        .field('phone', '9999999999')
        .field('state', 'Kerala')
        .field('district', 'Kollam')
        .field('loanCategory', 'business')
        .field('amount', '250000')
        .field('callbackWindow', 'today-evening')
        .field('consentPrivacy', 'true')
        .field('consentKyc', 'true')
        .field('consentDisclaimer', 'true');

    const first = await baseRequest().expect(201);
    expect(first.body.success).toBe(true);
    expect(first.body.data?.idempotency?.replayed).toBe(false);

    const firstLeadId = first.body.data?.lead?.leadId;
    expect(firstLeadId).toBeTruthy();

    const second = await baseRequest().expect(200);
    expect(second.body.success).toBe(true);
    expect(second.body.data?.idempotency?.replayed).toBe(true);
    expect(second.body.data?.lead?.leadId).toBe(firstLeadId);

    const leadCount = await FinanceLead.countDocuments({ 'sourceMeta.idempotencyKey': idempotencyKey });
    expect(leadCount).toBe(1);
  });

  test('GET /api/finance/dashboard/sla returns SLA summary for consultant scope', async () => {
    const response = await request(app)
      .get('/api/finance/dashboard/sla')
      .set('x-user-role', 'consultant')
      .set('x-consultant-id', 'CONS-1')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        totalOpenLeads: expect.any(Number),
        counts: expect.objectContaining({
          overdue: expect.any(Number),
          dueSoon: expect.any(Number),
          withoutSla: expect.any(Number),
        }),
      })
    );
  });

  test('GET /api/finance/analytics/source-channels returns channel rows', async () => {
    const response = await request(app)
      .get('/api/finance/analytics/source-channels')
      .set('x-user-role', 'admin')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data?.channels)).toBe(true);
  });

  test('GET /api/finance/institutions sets request correlation header', async () => {
    const response = await request(app).get('/api/finance/institutions').expect(200);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  test('GET /api/finance/dashboard/user keeps consultants scoped to their assigned leads', async () => {
    const response = await request(app)
      .get('/api/finance/dashboard/user')
      .set('x-user-role', 'consultant')
      .set('x-consultant-id', 'CONS-1')
      .query({ phone: '8888888888' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data?.totalLeads).toBe(0);
    expect(Array.isArray(response.body.data?.leads)).toBe(true);
    expect(response.body.data?.leads).toHaveLength(0);
  });

  test('GET /api/finance/analytics/funnel scopes eligibility metrics to consultant lead universe', async () => {
    const response = await request(app)
      .get('/api/finance/analytics/funnel')
      .set('x-user-role', 'consultant')
      .set('x-consultant-id', 'CONS-1')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data?.metrics?.totalLeads).toBe(1);
    expect(response.body.data?.metrics?.eligibilityRecords).toBe(1);
  });

  test('POST /api/finance/leads rejects invalid eligibility snapshot payload', async () => {
    const response = await request(app)
      .post('/api/finance/leads')
      .set('x-user-role', 'user')
      .set('x-user-id', '507f1f77bcf86cd799439099')
      .field('fullName', 'Snapshot User')
      .field('phone', '9999999999')
      .field('state', 'Kerala')
      .field('district', 'Kollam')
      .field('loanCategory', 'business')
      .field('amount', '250000')
      .field('callbackWindow', 'today-evening')
      .field('eligibilitySnapshot', '"invalid"')
      .field('consentPrivacy', 'true')
      .field('consentKyc', 'true')
      .field('consentDisclaimer', 'true')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '')).toContain('Eligibility snapshot payload is invalid');
  });
});
