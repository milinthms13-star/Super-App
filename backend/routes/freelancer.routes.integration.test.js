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
      phone: String(req.headers['x-user-phone'] || ''),
      name: 'Freelancer Test User',
      email: role === 'admin' ? 'admin@nilahub.local' : 'user@nilahub.local',
    };
    next();
  },
  optionalToken: (req, _res, next) => {
    const role = String(req.headers['x-user-role'] || '').trim().toLowerCase();
    const userId = String(req.headers['x-user-id'] || '').trim();
    if (role || userId) {
      req.user = {
        _id: userId || '507f1f77bcf86cd799439011',
        id: userId || '507f1f77bcf86cd799439011',
        role: role || 'user',
        phone: String(req.headers['x-user-phone'] || ''),
        name: 'Freelancer Test User',
        email: role === 'admin' ? 'admin@nilahub.local' : 'user@nilahub.local',
      };
    }
    next();
  },
  verifyAdmin: (req, res, next) => {
    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.user.isAdmin = true;
    return next();
  },
  hasAdminPrivileges: (user = {}) =>
    String(user.role || '').toLowerCase() === 'admin' ||
    user.isAdmin === true ||
    String(user.email || '').toLowerCase() === 'admin@nilahub.local',
}));

const freelancerRouter = require('./freelancer');
const FreelancerProvider = require('../models/FreelancerProvider');
const FreelancerJob = require('../models/FreelancerJob');
const FreelancerBooking = require('../models/FreelancerBooking');
const FreelancerDispute = require('../models/FreelancerDispute');
const FreelancerCommissionConfig = require('../models/FreelancerCommissionConfig');
const FreelancerPlanPurchase = require('../models/FreelancerPlanPurchase');

jest.setTimeout(45000);

describe('freelancer routes integration', () => {
  let app;
  let mongoServer;
  let providerId;
  let providerOwnerUserId;
  let jobId;
  let bookingCode;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 45000,
      },
    });
    await mongoose.connect(mongoServer.getUri(), {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });

    app = express();
    app.use(express.json());
    app.use('/api/freelancer', freelancerRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      FreelancerProvider.deleteMany({}),
      FreelancerJob.deleteMany({}),
      FreelancerBooking.deleteMany({}),
      FreelancerDispute.deleteMany({}),
      FreelancerPlanPurchase.deleteMany({}),
      FreelancerCommissionConfig.deleteMany({}),
    ]);

    providerOwnerUserId = '507f1f77bcf86cd799439123';
    const provider = await FreelancerProvider.create({
      providerCode: 'FRP-TST-001',
      ownerUserId: providerOwnerUserId,
      name: 'Owner Provider',
      category: 'Developers',
      type: 'digital',
      district: 'Trivandrum',
      serviceAreas: ['Trivandrum'],
      language: 'English',
      languages: ['English'],
      budget: 'medium',
      availability: 'online-now',
      experience: 5,
      responseMinutes: 15,
      hourlyRate: 2000,
      gigStartsFrom: 10000,
      contactPhone: '9999988888',
      contactEmail: 'owner@provider.local',
      leadCredits: 3,
      verified: true,
      kycStatus: 'approved',
      verificationBadges: ['Verified'],
      isActive: true,
    });
    providerId = provider._id;

    const job = await FreelancerJob.create({
      jobCode: 'FRJ-TST-001',
      title: 'Test Web App Build',
      category: 'Developers',
      location: 'Trivandrum',
      requirements: 'Build and deploy a production-ready React application with API integration.',
      serviceType: 'digital',
      urgency: 'medium',
      minBudget: 5000,
      maxBudget: 25000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: {
        userId: '507f1f77bcf86cd799439999',
        customerName: 'Customer One',
        customerPhone: '9898989898',
        maskedPhone: '******9898',
      },
      status: 'open',
      bidCount: 0,
      attachments: [],
    });
    jobId = job._id;

    const booking = await FreelancerBooking.create({
      bookingCode: 'FRK-TST-001',
      providerId,
      providerName: provider.name,
      customer: {
        userId: '507f1f77bcf86cd799439222',
        name: 'Booking Customer',
        phone: '9876543210',
        maskedPhone: '******3210',
      },
      serviceMode: 'gig',
      bookingMode: 'instant',
      status: 'provider_assigned',
      payment: { totalAmount: 9000, escrowAmount: 0, status: 'pending', milestones: [] },
      statusTimeline: [{ status: 'provider_assigned', note: 'seed', changedBy: 'system', changedAt: new Date() }],
    });
    bookingCode = booking.bookingCode;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('GET /api/freelancer/providers masks sensitive contact details', async () => {
    const response = await request(app).get('/api/freelancer/providers').expect(200);
    const firstProvider = response.body?.data?.providers?.[0];
    expect(firstProvider).toBeTruthy();
    expect(firstProvider.contactPhone).toBeUndefined();
    expect(firstProvider.contactEmail).toBeUndefined();
    expect(String(firstProvider.contactPhoneMasked || '')).toContain('******');
  });

  test('PATCH /api/freelancer/providers/:providerId/kyc blocks non-admin', async () => {
    await request(app)
      .patch(`/api/freelancer/providers/${providerId}/kyc`)
      .set('x-user-role', 'user')
      .send({ status: 'approved' })
      .expect(403);

    const adminResponse = await request(app)
      .patch(`/api/freelancer/providers/${providerId}/kyc`)
      .set('x-user-role', 'admin')
      .send({ status: 'approved' })
      .expect(200);

    expect(adminResponse.body.success).toBe(true);
    expect(adminResponse.body.data?.provider?.kycStatus).toBe('approved');
  });

  test('GET /api/freelancer/bookings enforces booking scope for non-admin users', async () => {
    const unauthorized = await request(app)
      .get('/api/freelancer/bookings')
      .set('x-user-role', 'user')
      .set('x-user-id', '507f1f77bcf86cd799439777')
      .expect(200);

    expect(unauthorized.body.success).toBe(true);
    expect(Array.isArray(unauthorized.body.data?.bookings)).toBe(true);
    expect(unauthorized.body.data.bookings).toHaveLength(0);

    const ownerScoped = await request(app)
      .get('/api/freelancer/bookings')
      .set('x-user-role', 'user')
      .set('x-user-id', '507f1f77bcf86cd799439222')
      .expect(200);

    expect(Array.isArray(ownerScoped.body.data?.bookings)).toBe(true);
    expect(ownerScoped.body.data.bookings).toHaveLength(1);
    expect(ownerScoped.body.data.bookings[0].customer?.phone).toBeUndefined();
  });

  test('POST /api/freelancer/bookings/:bookingCode/otp/send does not expose devOtp by default', async () => {
    const response = await request(app)
      .post(`/api/freelancer/bookings/${bookingCode}/otp/send`)
      .set('x-user-role', 'user')
      .set('x-user-id', '507f1f77bcf86cd799439222')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data?.devOtp).toBeUndefined();
  });

  test('POST /api/freelancer/jobs/:jobId/lead-purchase decrements lead credits and blocks duplicates', async () => {
    const firstResponse = await request(app)
      .post(`/api/freelancer/jobs/${jobId}/lead-purchase`)
      .set('x-user-role', 'user')
      .set('x-user-id', providerOwnerUserId)
      .send({ providerId: String(providerId) })
      .expect(201);

    expect(firstResponse.body.success).toBe(true);
    expect(firstResponse.body.data?.remainingLeadCredits).toBe(2);

    const duplicateResponse = await request(app)
      .post(`/api/freelancer/jobs/${jobId}/lead-purchase`)
      .set('x-user-role', 'user')
      .set('x-user-id', providerOwnerUserId)
      .send({ providerId: String(providerId) })
      .expect(409);

    expect(duplicateResponse.body.success).toBe(false);
  });

  test('POST /api/freelancer/plans/purchase requires payment reference for paid plans', async () => {
    const invalidResponse = await request(app)
      .post('/api/freelancer/plans/purchase')
      .set('x-user-role', 'user')
      .set('x-user-id', providerOwnerUserId)
      .send({ providerId: String(providerId), planId: 'pro' })
      .expect(400);

    expect(invalidResponse.body.success).toBe(false);
    expect(String(invalidResponse.body.message || '')).toContain('Payment reference');
  });

  test('GET /api/freelancer/providers/:providerId allows public profile fetch with masked contact', async () => {
    const response = await request(app).get(`/api/freelancer/providers/${providerId}`).expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.provider?.contactPhone).toBeUndefined();
    expect(response.body.data?.provider?.contactEmail).toBeUndefined();
    expect(String(response.body.data?.provider?.contactPhoneMasked || '')).toContain('******');
  });

  test('POST /api/freelancer/jobs/:jobId/bids enforces provider ownership', async () => {
    await request(app)
      .post(`/api/freelancer/jobs/${jobId}/bids`)
      .set('x-user-id', '507f1f77bcf86cd799439888')
      .send({
        providerId: String(providerId),
        amount: 8500,
        timelineDays: 12,
        coverLetter: 'We can deliver this scope with QA and deployment support.',
      })
      .expect(403);

    const allowed = await request(app)
      .post(`/api/freelancer/jobs/${jobId}/bids`)
      .set('x-user-id', providerOwnerUserId)
      .send({
        providerId: String(providerId),
        amount: 8500,
        timelineDays: 12,
        coverLetter: 'We can deliver this scope with QA and deployment support.',
      })
      .expect(201);

    expect(allowed.body.success).toBe(true);
    expect(allowed.body.data?.bid?.providerName).toBe('Owner Provider');
  });

  test('GET /api/freelancer/jobs/:jobId/bids allows only job owner or admin', async () => {
    await request(app)
      .post(`/api/freelancer/jobs/${jobId}/bids`)
      .set('x-user-id', providerOwnerUserId)
      .send({
        providerId: String(providerId),
        amount: 9000,
        timelineDays: 10,
        coverLetter: 'Ownership-safe bid creation for access test coverage.',
      })
      .expect(201);

    await request(app)
      .get(`/api/freelancer/jobs/${jobId}/bids`)
      .set('x-user-id', '507f1f77bcf86cd799439555')
      .expect(403);

    const ownerView = await request(app)
      .get(`/api/freelancer/jobs/${jobId}/bids`)
      .set('x-user-id', '507f1f77bcf86cd799439999')
      .expect(200);

    expect(ownerView.body.success).toBe(true);
    expect(Array.isArray(ownerView.body.data?.bids)).toBe(true);
    expect(ownerView.body.data.bids).toHaveLength(1);
  });

  test('POST /api/freelancer/providers/:providerId/reviews requires completed booking', async () => {
    await request(app)
      .post(`/api/freelancer/providers/${providerId}/reviews`)
      .set('x-user-id', '507f1f77bcf86cd799439777')
      .set('x-user-phone', '9000000001')
      .send({
        reviewerName: 'Random User',
        reviewerPhone: '9000000001',
        rating: 5,
        comment: 'Great support.',
      })
      .expect(403);

    await FreelancerBooking.updateOne({ bookingCode }, { $set: { status: 'completed' } });
    const completedReview = await request(app)
      .post(`/api/freelancer/providers/${providerId}/reviews`)
      .set('x-user-id', '507f1f77bcf86cd799439222')
      .set('x-user-phone', '9876543210')
      .send({
        reviewerName: 'Booking Customer',
        reviewerPhone: '9876543210',
        rating: 5,
        comment: 'Completed and satisfied.',
      })
      .expect(201);

    expect(completedReview.body.success).toBe(true);
    expect(completedReview.body.data?.provider?.reviews?.[0]?.bookingCode).toBe(bookingCode);
  });

  test('GET /api/freelancer/disputes blocks unauthorized providerId scope', async () => {
    await FreelancerDispute.create({
      disputeCode: 'FRD-TST-001',
      bookingId: (await FreelancerBooking.findOne({ bookingCode }).select({ _id: 1 }))._id,
      bookingCode,
      raisedByRole: 'customer',
      raisedByName: 'Booking Customer',
      raisedAgainstRole: 'provider',
      reason: 'Service delay',
      details: 'Provider delayed delivery.',
      status: 'open',
    });

    await request(app)
      .get(`/api/freelancer/disputes?providerId=${providerId}`)
      .set('x-user-id', '507f1f77bcf86cd799439999')
      .expect(403);

    const ownerResponse = await request(app)
      .get(`/api/freelancer/disputes?providerId=${providerId}`)
      .set('x-user-id', providerOwnerUserId)
      .expect(200);

    expect(ownerResponse.body.success).toBe(true);
    expect(Array.isArray(ownerResponse.body.data?.disputes)).toBe(true);
    expect(ownerResponse.body.data.disputes).toHaveLength(1);
  });

  test('POST /api/freelancer/bookings rejects customer phone spoofing and accepts authenticated phone', async () => {
    await request(app)
      .post('/api/freelancer/bookings')
      .set('x-user-id', '507f1f77bcf86cd799439333')
      .set('x-user-phone', '9123456789')
      .send({
        providerId: String(providerId),
        customerName: 'Spoof Attempt',
        customerPhone: '9000000000',
        serviceMode: 'gig',
        bookingMode: 'instant',
        totalAmount: 5000,
      })
      .expect(403);

    const accepted = await request(app)
      .post('/api/freelancer/bookings')
      .set('x-user-id', '507f1f77bcf86cd799439333')
      .set('x-user-phone', '9123456789')
      .send({
        providerId: String(providerId),
        customerName: 'Auth User',
        customerPhone: '9123456789',
        serviceMode: 'gig',
        bookingMode: 'instant',
        totalAmount: 5000,
      })
      .expect(201);

    expect(accepted.body.success).toBe(true);
    expect(String(accepted.body.data?.booking?.customer?.maskedPhone || '')).toContain('******');
  });
});
