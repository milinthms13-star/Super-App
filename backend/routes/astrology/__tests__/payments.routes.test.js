const request = require('supertest');
const express = require('express');
const paymentRoutes = require('../payments.routes');
const { authenticate } = require('../../../middleware/auth');
const crypto = require('crypto');

jest.mock('../../../middleware/auth');
jest.mock('../../../services/astrologyBackendService');
jest.mock('razorpay');

const app = express();
app.use(express.json());
app.use('/api/astrology/payments', paymentRoutes);

describe('Payment Routes', () => {
  let mockRazorpay;

  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'user123', id: 'user123' };
      next();
    });

    mockRazorpay = {
      orders: {
        create: jest.fn().mockResolvedValue({
          id: 'order_test123',
          amount: 120000,
          currency: 'INR',
          status: 'created',
        }),
      },
      payments: {
        refund: jest.fn().mockResolvedValue({
          id: 'rfnd_test123',
          amount: 120000,
          status: 'processed',
        }),
      },
    };

    const Razorpay = require('razorpay');
    Razorpay.mockImplementation(() => mockRazorpay);
  });

  describe('POST /api/astrology/payments/:bookingId/create-order', () => {
    it('should create payment order successfully', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        consultantId: 'consultant123',
        amountInr: 1200,
        status: 'pending',
        paymentStatus: 'pending',
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);
      mockBooking.save = jest.fn().mockResolvedValue(mockBooking);

      const response = await request(app)
        .post('/api/astrology/payments/booking123/create-order')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe('order_test123');
      expect(response.body.data.amountInr).toBe(1200);
    });

    it('should return existing order if already created', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        amountInr: 1200,
        status: 'pending',
        paymentStatus: 'pending',
        paymentOrderId: 'order_existing123',
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      const response = await request(app)
        .post('/api/astrology/payments/booking123/create-order')
        .expect(200);

      expect(response.body.data.orderId).toBe('order_existing123');
      expect(response.body.data.reused).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'otherUser',
        amountInr: 1200,
        status: 'pending',
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      await request(app)
        .post('/api/astrology/payments/booking123/create-order')
        .expect(403);
    });

    it('should reject cancelled bookings', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        amountInr: 1200,
        status: 'cancelled',
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      await request(app)
        .post('/api/astrology/payments/booking123/create-order')
        .expect(400);
    });
  });

  describe('POST /api/astrology/payments/:bookingId/verify', () => {
    it('should verify payment signature successfully', async () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test456';
      const keySecret = 'test_secret';
      
      process.env.RAZORPAY_KEY_SECRET = keySecret;

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        amountInr: 1200,
        status: 'pending',
        paymentStatus: 'pending',
        paymentOrderId: orderId,
        save: jest.fn().mockResolvedValue(true),
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      const response = await request(app)
        .post('/api/astrology/payments/booking123/verify')
        .send({
          orderId,
          paymentId,
          signature: expectedSignature,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentStatus).toBe('completed');
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should reject invalid signature', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        paymentOrderId: 'order_test123',
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      await request(app)
        .post('/api/astrology/payments/booking123/verify')
        .send({
          orderId: 'order_test123',
          paymentId: 'pay_test456',
          signature: 'invalid_signature',
        })
        .expect(400);
    });
  });

  describe('POST /api/astrology/payments/:bookingId/refund', () => {
    it('should process refund successfully', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        amountInr: 1200,
        paymentStatus: 'completed',
        paymentId: 'pay_test123',
        save: jest.fn().mockResolvedValue(true),
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      const response = await request(app)
        .post('/api/astrology/payments/booking123/refund')
        .send({ reason: 'Consultant cancelled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refundId).toBe('rfnd_test123');
      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith('pay_test123', {
        amount: 120000,
        speed: 'normal',
      });
    });

    it('should reject refund for unpaid booking', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        paymentStatus: 'pending',
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      await request(app)
        .post('/api/astrology/payments/booking123/refund')
        .send({ reason: 'Test reason' })
        .expect(400);
    });
  });

  describe('GET /api/astrology/payments/:bookingId/status', () => {
    it('should return payment status', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        paymentStatus: 'completed',
        status: 'confirmed',
        paymentOrderId: 'order_test123',
        paymentId: 'pay_test456',
        amountInr: 1200,
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);

      const response = await request(app)
        .get('/api/astrology/payments/booking123/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentStatus).toBe('completed');
      expect(response.body.data.bookingStatus).toBe('confirmed');
    });
  });

  describe('GET /api/astrology/payments/:bookingId/receipt', () => {
    it('should generate and download receipt PDF', async () => {
      const mockBooking = {
        _id: 'booking123',
        userId: 'user123',
        consultantId: 'consultant123',
        amountInr: 1200,
        paymentStatus: 'completed',
        paymentId: 'pay_test123',
        paymentDate: new Date(),
        bookingDate: new Date(),
      };

      const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const mockConsultant = {
        name: 'Test Consultant',
      };

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      const User = require('../../../models/User');
      const AstrologyConsultant = require('../../../models/AstrologyConsultant');

      AstrologyConsultationBooking.findById = jest.fn().mockResolvedValue(mockBooking);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      AstrologyConsultant.findById = jest.fn().mockResolvedValue(mockConsultant);

      const response = await request(app)
        .get('/api/astrology/payments/booking123/receipt')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });
});
