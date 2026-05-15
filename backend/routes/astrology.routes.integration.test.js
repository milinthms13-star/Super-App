const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

jest.mock('../models/Reminder', () => ({
  create: jest.fn(async () => ({
    _id: 'reminder_test_1',
    userId: 'astro-user-1',
    reminders: ['Email', 'In-app'],
    reminderBeforeOffsets: [30],
  })),
}));

jest.mock('razorpay', () =>
  jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(async (payload) => ({
        id: `order_test_${Date.now()}`,
        amount: payload.amount,
        currency: payload.currency,
      })),
    },
  }))
);

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    const userId = req.headers['x-user-id'] || 'astro-user-1';
    const userRole = req.headers['x-user-role'] || 'admin';
    req.user = {
      id: userId,
      _id: userId,
      name: 'Astro Test User',
      email: 'astro@example.com',
      role: userRole,
    };
    next();
  },
  hasAdminPrivileges: (user) => String(user?.role || '').toLowerCase() === 'admin',
}));

const devAstrologyStore = require('../utils/devAstrologyStore');
const astrologyRouter = require('./astrology');

describe('astrology routes integration', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/astrology', astrologyRouter);
  });

  beforeEach(async () => {
    await devAstrologyStore.resetStore();
  });

  test('POST /api/astrology/kundli/report returns a downloadable PDF', async () => {
    const response = await request(app)
      .post('/api/astrology/kundli/report')
      .send({
        profile: {
          sign: 'leo',
          name: 'Test Person',
          lagna: 'Simha',
          nakshatra: 'Magha',
        },
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment; filename="kundli-report-');
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0);
  });

  test('GET /api/astrology/horoscope/report returns a downloadable PDF for a valid sign and period', async () => {
    const response = await request(app)
      .get('/api/astrology/horoscope/report')
      .query({ sign: 'virgo', period: 'year', language: 'en' })
      .expect(200);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment; filename="horoscope-report-virgo-year-en.pdf"');
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0);
  });

  test('POST /api/astrology/consultations/book creates a pending_payment booking for a valid slot', async () => {
    const response = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
        preferredDate: '2026-05-18T10:00:00.000Z',
        notes: 'Need guidance on career decisions.',
      })
      .expect(201);

    const Reminder = require('../models/Reminder');
    expect(Reminder.create).toHaveBeenCalled();
    const reminderPayload = Reminder.create.mock.calls[0][0];
    expect(reminderPayload.reminders).toEqual(expect.arrayContaining(['Email', 'In-app']));
    expect(reminderPayload.reminderBeforeOffsets).toEqual([30]);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        consultantId: 'acharya-madhav',
        consultantName: 'Madhav Acharya',
        slot: 'Today 4:00 PM',
        status: 'pending_payment',
        currency: 'INR',
      })
    );
    expect(response.body.data.confirmationCode).toMatch(/^ASTRO-/);
    expect(response.body.data.amountInr).toBe(1200);
  });

  test('POST /api/astrology/consultations/book rejects invalid slot ids', async () => {
    const response = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'invalid-slot-id',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid consultation slot selection');
  });

  test('GET /api/astrology/consultations returns bookings for the authenticated user', async () => {
    await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1730',
      })
      .expect(201);

    await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'nambiar-priya',
        slotId: 'tomorrow-1000',
      })
      .expect(201);

    const historyResponse = await request(app)
      .get('/api/astrology/consultations')
      .expect(200);

    expect(historyResponse.body.success).toBe(true);
    expect(historyResponse.body.data).toHaveLength(2);
    const consultantIds = historyResponse.body.data.map((booking) => booking.consultantId);
    expect(consultantIds).toEqual(expect.arrayContaining(['acharya-madhav', 'nambiar-priya']));
    historyResponse.body.data.forEach((booking) => {
      expect(booking).toEqual(
        expect.objectContaining({
          status: 'pending_payment',
        })
      );
    });
  });

  test('POST /api/astrology/consultations/:bookingId/payment/create-order creates a payment order', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    const paymentResponse = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .send({})
      .expect(200);

    expect(paymentResponse.body.success).toBe(true);
    expect(paymentResponse.body.data.orderId).toMatch(/^order_test_/);
    expect(paymentResponse.body.data.amountInr).toBe(1200);
  });

  test('POST /api/astrology/consultations/:bookingId/payment/verify marks payment as completed', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'nambiar-priya',
        slotId: 'tomorrow-1000',
      })
      .expect(201);
    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    const orderResponse = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .send({})
      .expect(200);
    const orderId = orderResponse.body.data.orderId;
    const paymentId = 'pay_test_123';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verifyResponse = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/verify`)
      .send({
        orderId,
        paymentId,
        signature,
      })
      .expect(200);

    expect(verifyResponse.body.success).toBe(true);
    expect(verifyResponse.body.data).toEqual(
      expect.objectContaining({
        paymentStatus: 'completed',
        status: 'confirmed',
      })
    );
  });

  test('GET /api/astrology/analytics/dashboard returns aggregate metrics', async () => {
    await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1730',
      })
      .expect(201);

    const response = await request(app)
      .get('/api/astrology/analytics/dashboard?period=month')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        totalBookings: expect.any(Number),
        totalRevenue: expect.any(Number),
      })
    );
  });

  test('POST /api/astrology/consultations/:bookingId/payment/create-order is blocked when accessing another user booking', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .set('x-user-id', 'astro-user-2')
      .send({})
      .expect(403);
  });

  test('POST /api/astrology/consultations/:bookingId/payment/verify is blocked when another user tries verification', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;
    const orderResponse = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .send({})
      .expect(200);

    const orderId = orderResponse.body.data.orderId;
    const paymentId = 'pay_test_123';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/verify`)
      .set('x-user-id', 'astro-user-2')
      .send({
        orderId,
        paymentId,
        signature,
      })
      .expect(403);
  });

  test('GET /api/astrology/consultations/:bookingId/payment returns payment status only for booking owner', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    await request(app)
      .get(`/api/astrology/consultations/${bookingId}/payment`)
      .set('x-user-id', 'astro-user-2')
      .expect(403);
  });

  test('POST /api/astrology/consultants/add-slot adds a new consultant slot', async () => {
    const response = await request(app)
      .post('/api/astrology/consultants/add-slot')
      .send({
        consultantId: 'acharya-madhav',
        slotTime: 'Saturday 4:30 PM',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.availableSlots.some((slot) => slot.label === 'Saturday 4:30 PM')).toBe(true);
  });

  test('GET /api/astrology/experiments/variants returns assigned experiment variants', async () => {
    const response = await request(app)
      .get('/api/astrology/experiments/variants')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        consultantCardLayout: expect.any(String),
        bookingFlow: expect.any(String),
      })
    );
  });
});
