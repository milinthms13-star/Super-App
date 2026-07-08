const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    const userId = req.headers['x-user-id'] || '507f1f77bcf86cd799439011';
    const userRole = req.headers['x-user-role'] || 'user';
    req.user = {
      _id: userId,
      id: userId,
      email: userRole === 'admin' ? 'admin@example.com' : 'user@example.com',
      role: userRole,
      isAdmin: userRole === 'admin',
    };
    next();
  },
  verifyAdmin: (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }
    return next();
  },
}));

const {
  BeautyPlan,
  BeautyTip,
  BeautyProgressLog,
  BeautySubscriptionRule,
  BeautyUsageQuota,
  BeautyConsentAudit,
  BeautyOpsEvent,
  BeautySelfie,
} = require('../models/beautyai');
const s3Storage = require('../utils/s3Storage');
const beautyRouter = require('./beautyAI');

describe('beautyAI routes integration', () => {
  let app;
  const generatedSelfieDir = path.join(__dirname, '..', 'uploads', 'beauty-ai');

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      const uri =
        process.env.MONGO_TEST_URI ||
        process.env.MONGODB_URI ||
        process.env.DATABASE_URL;
      await mongoose.connect(uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });
    }

    app = express();
    app.use(express.json({ limit: '8mb' }));
    app.use('/api/beauty-ai', beautyRouter);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await Promise.all([
      BeautyPlan.deleteMany({}),
      BeautyTip.deleteMany({}),
      BeautyProgressLog.deleteMany({}),
      BeautySubscriptionRule.deleteMany({}),
      BeautyUsageQuota.deleteMany({}),
      BeautyConsentAudit.deleteMany({}),
      BeautyOpsEvent.deleteMany({}),
      BeautySelfie.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await fs.rm(generatedSelfieDir, { recursive: true, force: true }).catch(() => {});
  });

  test('GET /api/beauty-ai/tips/today seeds and returns tips', async () => {
    const response = await request(app)
      .get('/api/beauty-ai/tips/today')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.tips)).toBe(true);
    expect(response.body.tips.length).toBeGreaterThan(0);
  });

  test('GET /api/beauty-ai/tips/today is stable for same user/date/timezone', async () => {
    const first = await request(app)
      .get('/api/beauty-ai/tips/today')
      .query({ language: 'en', timezone: 'Asia/Kolkata' })
      .set('x-user-id', '507f1f77bcf86cd799439011')
      .expect(200);

    const second = await request(app)
      .get('/api/beauty-ai/tips/today')
      .query({ language: 'en', timezone: 'Asia/Kolkata' })
      .set('x-user-id', '507f1f77bcf86cd799439011')
      .expect(200);

    expect(first.body.success).toBe(true);
    expect(first.body.todayTip).toBeTruthy();
    expect(first.body.dateKey).toBeTruthy();
    expect(second.body.todayTip?._id).toBe(first.body.todayTip?._id);
    expect(second.body.dateKey).toBe(first.body.dateKey);
  });

  test('POST /api/beauty-ai/plan requires consent', async () => {
    const response = await request(app)
      .post('/api/beauty-ai/plan')
      .send({
        language: 'en',
        concern: 'acne',
        budget: 'low',
        eventType: 'daily-glow',
        skinType: 'oily',
        hairType: 'normal',
        selectedConcerns: ['Acne'],
        consent: false,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Consent');

    const audits = await BeautyConsentAudit.find({ action: 'plan_generation' }).lean();
    expect(audits).toHaveLength(1);
    expect(audits[0].consentGiven).toBe(false);
  });

  test('POST /api/beauty-ai/plan returns generated plan payload', async () => {
    const response = await request(app)
      .post('/api/beauty-ai/plan')
      .send({
        language: 'en',
        concern: 'acne',
        budget: 'low',
        eventType: 'daily-glow',
        skinType: 'oily',
        hairType: 'normal',
        selectedConcerns: ['Acne'],
        consent: true,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.plan).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        morning: expect.any(Array),
        night: expect.any(Array),
        concernSeverity: expect.any(String),
        apiVersion: expect.any(String),
        modelVersion: expect.any(String),
      })
    );
    expect(response.body.quota).toEqual(
      expect.objectContaining({
        tier: expect.any(String),
        used: expect.any(Number),
        limit: expect.any(Number),
        nextAllowedAt: expect.any(String),
      })
    );
    expect(response.body.featureFlags).toEqual(
      expect.objectContaining({
        canUseRealSelfieAnalysis: true,
        canGeneratePlan: true,
      })
    );
    expect(response.body.apiVersion).toBeTruthy();
    expect(response.body.modelVersion).toBeTruthy();
  });

  test('POST /api/beauty-ai/plan enforces daily quota for free tier users', async () => {
    const payload = {
      language: 'en',
      concern: 'acne',
      budget: 'low',
      eventType: 'daily-glow',
      skinType: 'oily',
      hairType: 'normal',
      selectedConcerns: ['Acne'],
      consent: true,
    };

    await request(app)
      .post('/api/beauty-ai/plan')
      .send(payload)
      .expect(200);

    const second = await request(app)
      .post('/api/beauty-ai/plan')
      .send(payload)
      .expect(429);

    expect(second.body.success).toBe(false);
    expect(second.body.message).toContain('limit');
    expect(second.body.quota.nextAllowedAt).toBeTruthy();
    expect(second.body.featureFlags.canGeneratePlan).toBe(true);
  });

  test('POST /api/beauty-ai/analyze-selfie accepts selfie upload and derives signals', async () => {
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7d8AAAAASUVORK5CYII=';
    const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

    const response = await request(app)
      .post('/api/beauty-ai/analyze-selfie')
      .field('knownSkinType', '')
      .field('concern', 'acne')
      .field('eventType', 'daily-glow')
      .field('language', 'en')
      .field('budget', 'low')
      .field('selfieConsent', 'true')
      .attach('selfie', tinyPngBuffer, { filename: 'selfie.png', contentType: 'image/png' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.analysis.selfieSignals).toEqual(
      expect.objectContaining({
        rednessScore: expect.any(Number),
        textureScore: expect.any(Number),
        brightnessScore: expect.any(Number),
        confidence: expect.any(Number),
      })
    );
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        derivedFromSelfie: true,
      })
    );
    expect(response.body.plan).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        concernSeverity: expect.any(String),
      })
    );
    expect(response.body.featureFlags.canUseRealSelfieAnalysis).toBe(true);
    expect(response.body.apiVersion).toBeTruthy();
    expect(response.body.modelVersion).toBeTruthy();
  });

  test('POST /api/beauty-ai/analyze-selfie accepts client-provided selfieSignals without selfie upload', async () => {
    const response = await request(app)
      .post('/api/beauty-ai/analyze-selfie')
      .send({
        concern: 'acne',
        eventType: 'daily-glow',
        language: 'en',
        budget: 'low',
        selfieConsent: true,
        selfieSignals: {
          rednessScore: 0.42,
          textureScore: 0.38,
          brightnessScore: 0.61,
          confidence: 0.73,
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.analysis.selfieSignals).toEqual(
      expect.objectContaining({
        rednessScore: 0.42,
        textureScore: 0.38,
        brightnessScore: 0.61,
        confidence: 0.73,
      })
    );
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        derivedFromSelfie: false,
      })
    );
  });

  test('POST /api/beauty-ai/analyze-selfie rejects mixed selfie upload and selfieSignals in one request', async () => {
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7d8AAAAASUVORK5CYII=';
    const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

    const response = await request(app)
      .post('/api/beauty-ai/analyze-selfie')
      .field('concern', 'acne')
      .field('eventType', 'daily-glow')
      .field('language', 'en')
      .field('budget', 'low')
      .field('selfieConsent', 'true')
      .field('selfieSignals[rednessScore]', '0.4')
      .field('selfieSignals[textureScore]', '0.3')
      .attach('selfie', tinyPngBuffer, { filename: 'selfie.png', contentType: 'image/png' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('either a selfie upload or selfieSignals');
  });

  test('POST /api/beauty-ai/plans rejects base64 data URL photo payload', async () => {
    const response = await request(app)
      .post('/api/beauty-ai/plans')
      .send({
        skinType: 'oily',
        hairType: 'normal',
        budget: 'low',
        language: 'en',
        selectedConcerns: ['Acne'],
        photoUrl: 'data:image/png;base64,AAABBBCCC',
        photoName: 'selfie.png',
        eventType: 'daily-glow',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('base64');
  });

  test('POST /api/beauty-ai/plans rejects untrusted photo host', async () => {
    const response = await request(app)
      .post('/api/beauty-ai/plans')
      .send({
        skinType: 'oily',
        hairType: 'normal',
        budget: 'low',
        language: 'en',
        selectedConcerns: ['Acne'],
        photoUrl: 'https://evil.example.com/selfie.jpg',
        photoName: 'selfie.jpg',
        eventType: 'daily-glow',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not trusted');
  });

  test('POST /api/beauty-ai/plans stores a plan with secure photo URL', async () => {
    const response = await request(app)
      .post('/api/beauty-ai/plans')
      .send({
        skinType: 'oily',
        hairType: 'normal',
        budget: 'low',
        language: 'en',
        selectedConcerns: ['Acne'],
        photoUrl: 'http://localhost/uploads/beauty-ai/selfies/test/selfie-1.webp',
        photoStorageKey: 'beauty-ai/selfies/test/selfie-1.webp',
        photoStorageProvider: 'local',
        photoName: 'selfie.jpg',
        eventType: 'daily-glow',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        photoUrl: 'http://localhost/uploads/beauty-ai/selfies/test/selfie-1.webp',
        photoStorageKey: 'beauty-ai/selfies/test/selfie-1.webp',
      })
    );
  });

  test('POST /api/beauty-ai/selfies/upload stores a sanitized selfie and returns public URL', async () => {
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7d8AAAAASUVORK5CYII=';
    const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

    const response = await request(app)
      .post('/api/beauty-ai/selfies/upload')
      .attach('selfie', tinyPngBuffer, { filename: 'selfie.png', contentType: 'image/png' })
      .expect(201);

    expect(response.body.success).toBe(true);
    const photoUrl = String(response.body.data.photoUrl || '');
    expect(photoUrl.length).toBeGreaterThan(0);
    expect(photoUrl.startsWith('http://') || photoUrl.startsWith('https://') || photoUrl.startsWith('/uploads/')).toBe(true);
    expect(String(response.body.data.photoStorageKey || '').length).toBeGreaterThan(0);
    expect(String(response.body.data.photoStorageProvider || '').length).toBeGreaterThan(0);
    expect(String(response.body.data.selfieId || '').length).toBeGreaterThan(0);
    expect(response.body.apiVersion).toBeTruthy();
    expect(response.body.modelVersion).toBeTruthy();

    const selfieDoc = await BeautySelfie.findById(response.body.data.selfieId).lean();
    expect(selfieDoc).toBeTruthy();

    const uploadEvents = await BeautyOpsEvent.find({ eventType: 'upload_success' }).lean();
    expect(uploadEvents.length).toBeGreaterThan(0);
  });

  test('POST /api/beauty-ai/selfies/delete deletes selfie record and returns deletion status', async () => {
    const selfie = await BeautySelfie.create({
      userId: '507f1f77bcf86cd799439011',
      photoUrl: 'http://localhost/uploads/beauty-ai/selfies/test/selfie-delete.webp',
      photoStorageKey: 'beauty-ai/selfies/test/selfie-delete.webp',
      photoStorageProvider: 'local',
      photoName: 'selfie-delete.webp',
      status: 'active',
    });

    const response = await request(app)
      .post('/api/beauty-ai/selfies/delete')
      .send({ selfieId: String(selfie._id) })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.deletion).toEqual(
      expect.objectContaining({
        dbUpdated: true,
      })
    );

    const deleted = await BeautySelfie.findById(selfie._id).lean();
    expect(deleted.status).toBe('deleted');
  });

  test('DELETE /api/beauty-ai/plans/:id/photo clears persisted photo storage fields', async () => {
    const created = await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      photoUrl: 'http://localhost/uploads/beauty-ai/selfies/test/selfie-2.webp',
      photoStorageKey: 'beauty-ai/selfies/test/selfie-2.webp',
      photoStorageProvider: 'local',
      plan: { title: 'Plan with photo', score: 72 },
    });

    const response = await request(app)
      .delete(`/api/beauty-ai/plans/${created._id}/photo`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.photoUrl).toBe('');
    expect(response.body.data.photoStorageKey).toBe('');
    expect(response.body.deletion).toEqual(
      expect.objectContaining({
        previousPhotoDeleteSuccess: expect.any(Boolean),
      })
    );
  });

  test('DELETE /api/beauty-ai/plans/:id/photo still succeeds when storage delete fails and logs event', async () => {
    jest.spyOn(s3Storage, 'deleteFromS3').mockRejectedValueOnce(new Error('forced delete failure'));

    const created = await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      photoUrl: 'http://localhost/uploads/beauty-ai/selfies/test/selfie-3.webp',
      photoStorageKey: 'beauty-ai/selfies/test/selfie-3.webp',
      photoStorageProvider: 'local',
      plan: { title: 'Plan with photo', score: 72 },
    });

    const response = await request(app)
      .delete(`/api/beauty-ai/plans/${created._id}/photo`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.photoStorageKey).toBe('');

    const failedDeleteEvent = await BeautyOpsEvent.findOne({ eventType: 'upload_delete_failed' }).lean();
    expect(failedDeleteEvent).toBeTruthy();
  });

  test('GET /api/beauty-ai/plans/my returns only authenticated user plans', async () => {
    await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      plan: { title: 'User plan', score: 70 },
    });
    await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439012',
      skinType: 'dry',
      budget: 'high',
      language: 'en',
      plan: { title: 'Other plan', score: 80 },
    });

    const response = await request(app)
      .get('/api/beauty-ai/plans/my')
      .set('x-user-id', '507f1f77bcf86cd799439011')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe('507f1f77bcf86cd799439011');
    expect(response.body.apiVersion).toBeTruthy();
    expect(response.body.modelVersion).toBeTruthy();
  });

  test('GET /api/beauty-ai/plans/:id enforces ownership', async () => {
    const plan = await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      plan: { title: 'Owned plan', score: 70 },
    });

    const ok = await request(app).get(`/api/beauty-ai/plans/${plan._id}`).expect(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.data._id).toBe(String(plan._id));

    const blocked = await request(app)
      .get(`/api/beauty-ai/plans/${plan._id}`)
      .set('x-user-id', '507f1f77bcf86cd799439012')
      .expect(404);
    expect(blocked.body.success).toBe(false);
  });

  test('PUT /api/beauty-ai/plans/:id updates notes and concerns safely', async () => {
    const plan = await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      selectedConcerns: ['acne'],
      plan: { title: 'Editable plan', score: 65 },
    });

    const response = await request(app)
      .put(`/api/beauty-ai/plans/${plan._id}`)
      .send({
        notes: 'Updated note',
        selectedConcerns: ['acne', 'pigmentation'],
        primaryConcern: 'pigmentation',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.notes).toBe('Updated note');
    expect(response.body.data.primaryConcern).toBe('pigmentation');
    expect(response.body.data.selectedConcerns).toEqual(expect.arrayContaining(['acne', 'pigmentation']));
  });

  test('POST /api/beauty-ai/plans/:id/duplicate creates a new active copy', async () => {
    const original = await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      selectedConcerns: ['acne'],
      notes: 'Original note',
      plan: { title: 'Original plan', score: 66 },
      status: 'Archived',
    });

    const response = await request(app)
      .post(`/api/beauty-ai/plans/${original._id}/duplicate`)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data._id).not.toBe(String(original._id));
    expect(response.body.data.status).toBe('Active');
    expect(response.body.data.notes).toBe('Original note');
  });

  test('PUT /api/beauty-ai/plans/:id/photo replaces selfie and reports deletion status', async () => {
    const plan = await BeautyPlan.create({
      userId: '507f1f77bcf86cd799439011',
      skinType: 'oily',
      budget: 'low',
      language: 'en',
      photoUrl: 'http://localhost/uploads/beauty-ai/selfies/test/selfie-old.webp',
      photoStorageKey: 'beauty-ai/selfies/test/selfie-old.webp',
      photoStorageProvider: 'local',
      photoName: 'old.webp',
      plan: { title: 'Photo replace plan', score: 71 },
    });

    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7d8AAAAASUVORK5CYII=';
    const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

    const response = await request(app)
      .put(`/api/beauty-ai/plans/${plan._id}/photo`)
      .attach('selfie', tinyPngBuffer, { filename: 'new-selfie.png', contentType: 'image/png' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(String(response.body.data.photoUrl || '').length).toBeGreaterThan(0);
    expect(String(response.body.data.photoStorageKey || '').length).toBeGreaterThan(0);
    expect(response.body.deletion).toEqual(
      expect.objectContaining({
        previousPhotoDeleteSuccess: expect.any(Boolean),
      })
    );
  });

  test('PUT /api/beauty-ai/plans/:id/archive rejects malformed id', async () => {
    const response = await request(app)
      .put('/api/beauty-ai/plans/not-a-valid-object-id/archive')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid plan id');
  });

  test('POST /api/beauty-ai/progress-log parses done=\"false\" correctly', async () => {
    await request(app)
      .post('/api/beauty-ai/progress-log')
      .send({
        day: 4,
        done: 'false',
        note: 'day four',
        skinScore: 61,
      })
      .expect(201);

    const saved = await BeautyProgressLog.findOne({
      userId: '507f1f77bcf86cd799439011',
      day: 4,
    }).lean();

    expect(saved).toBeTruthy();
    expect(saved.done).toBe(false);
  });

  test('POST /api/beauty-ai/admin/tip-library is admin-only', async () => {
    await request(app)
      .post('/api/beauty-ai/admin/tip-library')
      .set('x-user-role', 'user')
      .send({
        title: 'Admin tip',
        text: 'Test',
      })
      .expect(403);
  });

  test('admin can update and read subscription rules', async () => {
    const payload = {
      free: {
        dailyAnalysisLimit: 2,
        weeklyPlanLengthDays: 10,
        allowPremiumReport: false,
        allowDermatologistReferral: false,
      },
      premium: {
        dailyAnalysisLimit: 20,
        weeklyPlanLengthDays: 35,
        allowPremiumReport: true,
        allowDermatologistReferral: true,
      },
    };

    await request(app)
      .put('/api/beauty-ai/admin/subscription-rules')
      .set('x-user-role', 'admin')
      .send(payload)
      .expect(200);

    const readResponse = await request(app)
      .get('/api/beauty-ai/admin/subscription-rules')
      .set('x-user-role', 'admin')
      .expect(200);

    expect(readResponse.body.success).toBe(true);
    expect(readResponse.body.subscriptionRules.free.dailyAnalysisLimit).toBe(2);
    expect(readResponse.body.subscriptionRules.premium.dailyAnalysisLimit).toBe(20);
  });

  test('GET /api/beauty-ai/admin/alerts returns structured alert summary', async () => {
    await BeautyOpsEvent.create([
      { eventType: 'upload_failure', severity: 'warning', endpoint: '/api/beauty-ai/selfies/upload' },
      { eventType: 'quota_block', severity: 'warning', endpoint: '/api/beauty-ai/plan' },
    ]);
    await BeautyConsentAudit.create({
      userId: '507f1f77bcf86cd799439011',
      action: 'plan_generation',
      consentGiven: false,
      endpoint: '/api/beauty-ai/plan',
      reason: 'test',
    });

    const response = await request(app)
      .get('/api/beauty-ai/admin/alerts')
      .set('x-user-role', 'admin')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.alerts)).toBe(true);
    expect(response.body.alerts.length).toBeGreaterThan(0);
  });
});
