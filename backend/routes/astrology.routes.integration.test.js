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
  const futurePreferredDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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

  test('GET /api/astrology/panchangam returns template metadata for guidance framing', async () => {
    const response = await request(app)
      .get('/api/astrology/panchangam')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        guidanceOnly: true,
        isSynthetic: true,
      })
    );
    expect(response.body.data).toEqual(
      expect.objectContaining({
        quality: expect.any(Object),
      })
    );
  });

  test('GET /api/astrology/panchangam uses cache on repeat request', async () => {
    const first = await request(app)
      .get('/api/astrology/panchangam')
      .expect(200);
    const second = await request(app)
      .get('/api/astrology/panchangam')
      .expect(200);

    expect(first.body.success).toBe(true);
    expect(second.body.success).toBe(true);
    expect(second.body.meta).toEqual(
      expect.objectContaining({
        cached: true,
      })
    );
  });

  test('GET /api/astrology/festivals returns template metadata for guidance framing', async () => {
    const response = await request(app)
      .get('/api/astrology/festivals')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        guidanceOnly: true,
        isSynthetic: true,
      })
    );
  });

  test('PUT + GET /api/astrology/profile persists and returns normalized profile data', async () => {
    const updateResponse = await request(app)
      .put('/api/astrology/profile')
      .set('x-user-id', 'astro-profile-user')
      .send({
        sign: 'virgo',
        birthDate: '1993-05-12',
        birthTime: '09:30 AM',
        birthPlace: 'Kochi',
        preferences: {
          favoriteTopics: ['career', 'finance'],
          receiveDailyHoroscope: true,
        },
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data).toEqual(
      expect.objectContaining({
        sign: 'virgo',
        birthPlace: 'Kochi',
      })
    );

    const readResponse = await request(app)
      .get('/api/astrology/profile')
      .set('x-user-id', 'astro-profile-user')
      .expect(200);

    expect(readResponse.body.success).toBe(true);
    expect(readResponse.body.data).toEqual(
      expect.objectContaining({
        sign: 'virgo',
        birthPlace: 'Kochi',
      })
    );
    expect(readResponse.body.data.preferences.favoriteTopics).toEqual(
      expect.arrayContaining(['career', 'finance'])
    );
  });

  test('POST /api/astrology/consultations/book creates a pending_payment booking for a valid slot', async () => {
    const response = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
        preferredDate: futurePreferredDate(),
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

  test('POST /api/astrology/consultations/book validates required fields', async () => {
    const response = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        slotId: 'today-1600',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid request payload');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  test('POST /api/astrology/consultations/book returns existing booking for duplicate user slot request', async () => {
    const payload = {
      consultantId: 'acharya-madhav',
      slotId: 'today-1600',
      preferredDate: futurePreferredDate(),
    };

    const first = await request(app)
      .post('/api/astrology/consultations/book')
      .set('x-user-id', 'astro-dup-user')
      .send(payload)
      .expect(201);

    const second = await request(app)
      .post('/api/astrology/consultations/book')
      .set('x-user-id', 'astro-dup-user')
      .send(payload)
      .expect(200);

    expect(second.body.success).toBe(true);
    expect(second.body.message).toContain('Existing active booking');
    expect(second.body.data.id || second.body.data._id).toBe(first.body.data.id || first.body.data._id);
  });

  test('POST /api/astrology/consultations/book blocks slot conflicts across users', async () => {
    const payload = {
      consultantId: 'acharya-madhav',
      slotId: 'today-1730',
      preferredDate: futurePreferredDate(),
    };

    await request(app)
      .post('/api/astrology/consultations/book')
      .set('x-user-id', 'astro-slot-owner')
      .send(payload)
      .expect(201);

    const conflict = await request(app)
      .post('/api/astrology/consultations/book')
      .set('x-user-id', 'astro-slot-contender')
      .send(payload)
      .expect(409);

    expect(conflict.body.success).toBe(false);
    expect(conflict.body.message).toContain('no longer available');
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

  test('GET /api/astrology/consultations/consultant-bookings enforces consultant scope', async () => {
    await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'nambiar-priya',
        slotId: 'tomorrow-1000',
      })
      .expect(201);

    const consultantResponse = await request(app)
      .get('/api/astrology/consultations/consultant-bookings')
      .set('x-user-role', 'consultant')
      .set('x-user-id', 'acharya-madhav')
      .expect(200);

    expect(consultantResponse.body.success).toBe(true);
    expect(consultantResponse.body.data.length).toBeGreaterThan(0);
    consultantResponse.body.data.forEach((booking) => {
      expect(booking.consultantId).toBe('acharya-madhav');
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

  test('POST /api/astrology/consultations/:bookingId/payment/verify rejects missing payment fields', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'nambiar-priya',
        slotId: 'tomorrow-1000',
      })
      .expect(201);
    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/verify`)
      .send({
        orderId: 'order_fake_123',
      })
      .expect(400);
  });

  test('POST /api/astrology/consultations/:bookingId/payment/verify rejects conflicting second paymentId', async () => {
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

    const firstPaymentId = 'pay_test_first';
    const firstSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${firstPaymentId}`)
      .digest('hex');

    await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/verify`)
      .send({
        orderId,
        paymentId: firstPaymentId,
        signature: firstSignature,
      })
      .expect(200);

    const conflictingPaymentId = 'pay_test_second';
    const conflictingSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${conflictingPaymentId}`)
      .digest('hex');

    const secondAttempt = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/verify`)
      .send({
        orderId,
        paymentId: conflictingPaymentId,
        signature: conflictingSignature,
      })
      .expect(409);

    expect(secondAttempt.body.success).toBe(false);
    expect(secondAttempt.body.message).toContain('already completed');
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

  test('GET /api/astrology/analytics/alerts returns structured ops signals for admin', async () => {
    const response = await request(app)
      .get('/api/astrology/analytics/alerts?lookbackHours=24')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        windowHours: expect.any(Number),
        generatedAt: expect.any(String),
        signals: expect.objectContaining({
          paymentVerificationFailures: expect.objectContaining({
            count: expect.any(Number),
            severity: expect.any(String),
          }),
          slotConflictSpikes: expect.objectContaining({
            count: expect.any(Number),
            severity: expect.any(String),
          }),
          webhookErrors: expect.objectContaining({
            count: expect.any(Number),
            severity: expect.any(String),
          }),
        }),
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

  test('GET /api/astrology/consultations/:bookingId/payment includes bookingStatus field', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    const response = await request(app)
      .get(`/api/astrology/consultations/${bookingId}/payment`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        bookingStatus: expect.any(String),
      })
    );
  });

  test('POST /api/astrology/consultations/:bookingId/payment/create-order blocks cancelled bookings', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    await request(app)
      .patch(`/api/astrology/consultations/${bookingId}/status`)
      .send({ status: 'cancelled' })
      .expect(200);

    await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .send({})
      .expect(409);
  });

  test('POST /api/astrology/payment/webhook/razorpay reconciles booking on payment.captured', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;
    const createOrderResponse = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .send({})
      .expect(200);

    const orderId = createOrderResponse.body.data.orderId;
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_001',
            order_id: orderId,
            notes: {
              bookingId,
            },
          },
        },
      },
    };

    const rawBody = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(rawBody)
      .digest('hex');

    const webhookResponse = await request(app)
      .post('/api/astrology/payment/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody)
      .expect(200);

    expect(webhookResponse.body.success).toBe(true);
    expect(webhookResponse.body.data).toEqual(
      expect.objectContaining({
        paymentStatus: 'completed',
      })
    );
  });

  test('POST /api/astrology/payment/webhook/razorpay ignores duplicate replay by event id', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;
    const createOrderResponse = await request(app)
      .post(`/api/astrology/consultations/${bookingId}/payment/create-order`)
      .send({})
      .expect(200);

    const orderId = createOrderResponse.body.data.orderId;
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_dup_001',
            order_id: orderId,
            notes: {
              bookingId,
            },
          },
        },
      },
    };
    const rawBody = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(rawBody)
      .digest('hex');

    await request(app)
      .post('/api/astrology/payment/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', 'evt_test_duplicate_1')
      .send(rawBody)
      .expect(200);

    const replayResponse = await request(app)
      .post('/api/astrology/payment/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', 'evt_test_duplicate_1')
      .send(rawBody)
      .expect(200);

    expect(replayResponse.body.success).toBe(true);
    expect(replayResponse.body.message).toContain('Duplicate webhook ignored');
  });

  test('POST /api/astrology/payment/webhook/razorpay rejects invalid signature', async () => {
    const response = await request(app)
      .post('/api/astrology/payment/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalid_signature')
      .send(JSON.stringify({ event: 'payment.captured' }))
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('POST /api/astrology/payment/webhook/razorpay rejects payload without event', async () => {
    const payload = {
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_no_event',
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(rawBody)
      .digest('hex');

    const response = await request(app)
      .post('/api/astrology/payment/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('event');
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

  test('POST /api/astrology/consultants/add-slot blocks non-consultant non-admin users', async () => {
    await request(app)
      .post('/api/astrology/consultants/add-slot')
      .set('x-user-role', 'user')
      .set('x-user-id', 'astro-user-plain')
      .send({
        consultantId: 'acharya-madhav',
        slotTime: 'Saturday 6:00 PM',
      })
      .expect(403);
  });

  test('PATCH /api/astrology/consultations/:bookingId/status allows owner to cancel only', async () => {
    const bookingResponse = await request(app)
      .post('/api/astrology/consultations/book')
      .set('x-user-role', 'user')
      .set('x-user-id', 'astro-owner-1')
      .send({
        consultantId: 'acharya-madhav',
        slotId: 'today-1600',
      })
      .expect(201);

    const bookingId = bookingResponse.body.data.id || bookingResponse.body.data._id;

    await request(app)
      .patch(`/api/astrology/consultations/${bookingId}/status`)
      .set('x-user-role', 'user')
      .set('x-user-id', 'astro-owner-1')
      .send({ status: 'completed' })
      .expect(403);

    const cancelResponse = await request(app)
      .patch(`/api/astrology/consultations/${bookingId}/status`)
      .set('x-user-role', 'user')
      .set('x-user-id', 'astro-owner-1')
      .send({ status: 'cancelled' })
      .expect(200);

    expect(cancelResponse.body.success).toBe(true);
    expect(cancelResponse.body.data.status).toBe('cancelled');
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
