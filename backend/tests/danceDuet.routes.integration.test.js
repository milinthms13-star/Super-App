const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

process.env.DANCE_DUET_DISABLE_QUEUE_WORKER = 'true';

jest.mock('../services/danceDuetService', () => ({
  mergeDanceDuetFromSources: jest.fn(),
  analyzeDanceDuetInputs: jest.fn(),
}));

const danceDuetRouter = require('../routes/danceDuet');
const DanceDuetJob = require('../models/DanceDuetJob');
const { mergeDanceDuetFromSources, analyzeDanceDuetInputs } = require('../services/danceDuetService');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/dance-duet', danceDuetRouter);
  return app;
};

const makeToken = ({ sub, email, name }) =>
  jwt.sign(
    {
      sub,
      email,
      name,
    },
    'test-secret'
  );

const createVideoBuffer = () => Buffer.from('fake-video-content');

describe('DanceDuet routes integration', () => {
  let app;
  let userToken;
  let otherToken;

  beforeAll(async () => {
    app = createTestApp();
    userToken = makeToken({
      sub: 'dance-user-1',
      email: 'dancer1@example.com',
      name: 'Dancer 1',
    });
    otherToken = makeToken({
      sub: 'dance-user-2',
      email: 'dancer2@example.com',
      name: 'Dancer 2',
    });

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  beforeEach(() => {
    analyzeDanceDuetInputs.mockResolvedValue({
      readinessScore: 86,
      riskLevel: 'low',
      summary: 'Inputs are duet-ready.',
      suggestions: [],
      checks: ['Duration alignment looks good.'],
      diagnostics: {
        durationDeltaSeconds: 0.9,
      },
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await DanceDuetJob.deleteMany({});
  });

  test('GET /meta returns module capabilities', async () => {
    const response = await request(app).get('/api/dance-duet/meta').set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body.capabilities).toContain('history');
    expect(response.body.capabilities).toContain('analytics');
    expect(response.body.capabilities).toContain('idempotency');
    expect(response.body.capabilities).toContain('async-queue');
    expect(response.body.capabilities).toContain('preflight');
  });

  test('POST /merge queues job and returns preflight + growth pack', async () => {
    const response = await request(app)
      .post('/api/dance-duet/merge')
      .set('Authorization', `Bearer ${userToken}`)
      .field('mode', 'auto')
      .field('outputFormat', 'reel')
      .attach('video1', createVideoBuffer(), { filename: 'video1.mp4', contentType: 'video/mp4' })
      .attach('video2', createVideoBuffer(), { filename: 'video2.mp4', contentType: 'video/mp4' });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.jobId).toBeTruthy();
    expect(response.body.data.job.status).toBe('queued');
    expect(response.body.data.preflight.readinessScore).toBe(86);
    expect(response.body.data.growthPack.challengeTitle).toBeTruthy();
    expect(mergeDanceDuetFromSources).not.toHaveBeenCalled();

    const job = await DanceDuetJob.findById(response.body.jobId).lean();
    expect(job).toBeTruthy();
    expect(job.status).toBe('queued');
    expect(job.preflight.readinessScore).toBe(86);
  });

  test('POST /merge reuses completed job for same idempotency key', async () => {
    const existingJob = await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: {
        outputUrl: '/uploads/dance-duet/outputs/existing.mp4',
        warning: '',
        processingMs: 3210,
      },
      requestMetadata: {
        idempotencyKey: 'idem-abc-1',
      },
    });

    const response = await request(app)
      .post('/api/dance-duet/merge')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-idempotency-key', 'idem-abc-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.reused).toBe(true);
    expect(String(response.body.jobId)).toBe(String(existingJob._id));
    expect(response.body.outputUrl).toBe('/uploads/dance-duet/outputs/existing.mp4');
  });

  test('GET /jobs/:jobId/status returns queue status to owner', async () => {
    const job = await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'queued',
      processing: {
        attempts: 1,
        maxAttempts: 2,
      },
      output: {},
    });

    const response = await request(app)
      .get(`/api/dance-duet/jobs/${job._id}/status`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.job.status).toBe('queued');
    expect(response.body.data.job.maxAttempts).toBe(2);
  });

  test('GET /jobs/:jobId/status blocks non-owner', async () => {
    const job = await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'queued',
    });

    const response = await request(app)
      .get(`/api/dance-duet/jobs/${job._id}/status`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test('GET /jobs/me returns only current user jobs', async () => {
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/u1.mp4' },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer2@example.com',
      userName: 'Dancer 2',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/u2.mp4' },
    });

    const response = await request(app).get('/api/dance-duet/jobs/me').set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobs).toHaveLength(1);
    expect(response.body.data.jobs[0].userEmail).toBe('dancer1@example.com');
    expect(response.body.data.pagination.total).toBe(1);
  });

  test('GET /jobs/me supports status filter and pagination', async () => {
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/c1.mp4' },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'failed',
      output: { errorMessage: 'boom' },
    });

    const response = await request(app)
      .get('/api/dance-duet/jobs/me?status=failed&limit=1&page=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobs).toHaveLength(1);
    expect(response.body.data.jobs[0].status).toBe('failed');
    expect(response.body.data.pagination.page).toBe(1);
    expect(response.body.data.pagination.limit).toBe(1);
    expect(response.body.data.pagination.total).toBe(1);
  });

  test('GET /jobs/:jobId blocks non-owner', async () => {
    const job = await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/private.mp4' },
    });

    const response = await request(app)
      .get(`/api/dance-duet/jobs/${job._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test('GET /jobs/:jobId/download rejects output path outside trusted output root', async () => {
    const job = await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs-malicious/escape.mp4' },
    });

    const response = await request(app)
      .get(`/api/dance-duet/jobs/${job._id}/download`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid output path');
  });

  test('POST /merge with same idempotency key in parallel creates only one active job', async () => {
    const idempotencyKey = 'idem-parallel-merge-1';
    const [first, second] = await Promise.all([
      request(app)
        .post('/api/dance-duet/merge')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-idempotency-key', idempotencyKey)
        .field('mode', 'auto')
        .attach('video1', createVideoBuffer(), { filename: 'video1.mp4', contentType: 'video/mp4' })
        .attach('video2', createVideoBuffer(), { filename: 'video2.mp4', contentType: 'video/mp4' }),
      request(app)
        .post('/api/dance-duet/merge')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-idempotency-key', idempotencyKey)
        .field('mode', 'auto')
        .attach('video1', createVideoBuffer(), { filename: 'video1.mp4', contentType: 'video/mp4' })
        .attach('video2', createVideoBuffer(), { filename: 'video2.mp4', contentType: 'video/mp4' }),
    ]);

    expect([200, 202]).toContain(first.status);
    expect([200, 202]).toContain(second.status);

    const jobs = await DanceDuetJob.find({
      userEmail: 'dancer1@example.com',
      'requestMetadata.idempotencyKey': idempotencyKey,
      status: { $in: ['queued', 'processing', 'completed'] },
    }).lean();
    expect(jobs).toHaveLength(1);
  });

  test('GET /analytics/me returns summary with dead-letter counters', async () => {
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/a1.mp4', processingMs: 5000 },
      processing: { attempts: 1 },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'failed',
      output: { errorMessage: 'error', processingMs: 1000 },
      processing: { attempts: 2, deadLetteredAt: new Date(), deadLetterReason: 'ffmpeg fail' },
    });

    const response = await request(app)
      .get('/api/dance-duet/analytics/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary.totalJobs).toBe(2);
    expect(response.body.data.summary.completedJobs).toBe(1);
    expect(response.body.data.summary.failedJobs).toBe(1);
    expect(response.body.data.summary.deadLetteredJobs).toBe(1);
    expect(response.body.data.summary.completionRatePct).toBe(50);
  });

  test('GET /analytics/me returns mode breakdown', async () => {
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      options: { mode: 'side-by-side' },
      output: { outputUrl: '/uploads/dance-duet/outputs/m1.mp4', processingMs: 4100 },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'failed',
      options: { mode: 'side-by-side' },
      output: { errorMessage: 'err', processingMs: 1200 },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      options: { mode: 'same-background' },
      output: { outputUrl: '/uploads/dance-duet/outputs/m2.mp4', processingMs: 3900 },
    });

    const response = await request(app)
      .get('/api/dance-duet/analytics/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const modeMap = new Map((response.body.data.modes || []).map((item) => [item.mode, item.count]));
    expect(modeMap.get('side-by-side')).toBe(2);
    expect(modeMap.get('same-background')).toBe(1);
  });

  test('GET /jobs/me/counts returns grouped status counts and dead-lettered', async () => {
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/a1.mp4', processingMs: 5000 },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'failed',
      processing: { deadLetteredAt: new Date() },
      output: { errorMessage: 'error', processingMs: 1000 },
    });
    await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'processing',
      output: {},
    });

    const response = await request(app)
      .get('/api/dance-duet/jobs/me/counts')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.counts.completed).toBe(1);
    expect(response.body.data.counts.failed).toBe(1);
    expect(response.body.data.counts.processing).toBe(1);
    expect(response.body.data.counts.deadLettered).toBe(1);
  });

  test('DELETE /jobs/:jobId soft deletes owner job', async () => {
    const job = await DanceDuetJob.create({
      userEmail: 'dancer1@example.com',
      userName: 'Dancer 1',
      status: 'completed',
      output: { outputUrl: '/uploads/dance-duet/outputs/delete-me.mp4' },
    });

    const response = await request(app)
      .delete(`/api/dance-duet/jobs/${job._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updated = await DanceDuetJob.findById(job._id).lean();
    expect(updated.status).toBe('deleted');
    expect(updated.output.outputUrl).toBe('');
  });
});
