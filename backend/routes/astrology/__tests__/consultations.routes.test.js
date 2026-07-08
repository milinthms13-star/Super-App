const request = require('supertest');
const express = require('express');
const consultationRoutes = require('../consultations.routes');
const { authenticate } = require('../../../middleware/auth');

jest.mock('../../../middleware/auth');
jest.mock('../../../services/astrologyBackendService');

const app = express();
app.use(express.json());
app.use('/api/astrology/consultations', consultationRoutes);

describe('Consultation Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'user123', id: 'user123', role: 'user' };
      next();
    });
  });

  describe('GET /consultants', () => {
    it('should return list of consultants', async () => {
      const mockConsultants = [
        {
          id: 'consultant-1',
          name: 'Madhav Acharya',
          specialty: 'Kerala Jathakam',
          rate: '₹1,200 / 15 min',
          amountInr: 1200,
        },
      ];

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.listConsultantsPersistent = jest.fn().mockResolvedValue(mockConsultants);
      astrologyService.seedAstrologyConsultantsIfNeeded = jest.fn().mockResolvedValue();

      const response = await request(app)
        .get('/api/astrology/consultations/consultants')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Madhav Acharya');
    });
  });

  describe('POST /book', () => {
    it('should create consultation booking', async () => {
      const bookingData = {
        consultantId: 'consultant-1',
        slotId: 'slot-1',
        preferredDate: new Date().toISOString(),
        notes: 'Career guidance needed',
      };

      const mockConsultant = {
        id: 'consultant-1',
        name: 'Madhav Acharya',
        amountInr: 1200,
        availableSlots: [
          { id: 'slot-1', label: 'Today 4:00 PM' },
        ],
      };

      const mockBooking = {
        id: 'booking-123',
        userId: 'user123',
        consultantId: 'consultant-1',
        confirmationCode: 'ASTRO-ABC123',
        status: 'pending_payment',
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getConsultantByIdPersistent = jest.fn().mockResolvedValue(mockConsultant);
      astrologyService.saveConsultationBookingWithLock = jest.fn().mockResolvedValue({
        booking: mockBooking,
        conflict: false,
        reused: false,
      });
      astrologyService.findBookingBySlotLock = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/astrology/consultations/book')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.confirmationCode).toBe('ASTRO-ABC123');
    });

    it('should prevent double booking of same slot', async () => {
      const bookingData = {
        consultantId: 'consultant-1',
        slotId: 'slot-1',
        preferredDate: new Date().toISOString(),
      };

      const mockConsultant = {
        id: 'consultant-1',
        name: 'Madhav Acharya',
        amountInr: 1200,
        availableSlots: [{ id: 'slot-1', label: 'Today 4:00 PM' }],
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getConsultantByIdPersistent = jest.fn().mockResolvedValue(mockConsultant);
      astrologyService.findBookingBySlotLock = jest.fn().mockResolvedValue({
        id: 'existing-booking',
        userId: 'other-user',
      });

      const response = await request(app)
        .post('/api/astrology/consultations/book')
        .send(bookingData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('no longer available');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        consultantId: '',
        slotId: '',
      };

      await request(app)
        .post('/api/astrology/consultations/book')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PATCH /:bookingId/status', () => {
    it('should update booking status', async () => {
      const mockBooking = {
        id: 'booking-123',
        userId: 'user123',
        status: 'confirmed',
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.findConsultationBookingById = jest.fn().mockResolvedValue(mockBooking);
      astrologyService.updateConsultationBookingByIdWithLocks = jest.fn().mockResolvedValue({
        ...mockBooking,
        status: 'completed',
      });

      const response = await request(app)
        .patch('/api/astrology/consultations/booking-123/status')
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });

    it('should require valid status', async () => {
      await request(app)
        .patch('/api/astrology/consultations/booking-123/status')
        .send({ status: 'invalid-status' })
        .expect(400);
    });
  });

  describe('GET /consultant-earnings', () => {
    it('should return earnings for consultant', async () => {
      authenticate.mockImplementation((req, res, next) => {
        req.user = { 
          _id: 'consultant-1', 
          id: 'consultant-1', 
          role: 'consultant',
          consultantId: 'consultant-1',
        };
        next();
      });

      const mockBookings = [
        { status: 'completed', amountInr: 1200, paymentStatus: 'completed' },
        { status: 'completed', amountInr: 1500, paymentStatus: 'completed' },
      ];

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.listAllConsultationBookings = jest.fn().mockResolvedValue(mockBookings);

      const response = await request(app)
        .get('/api/astrology/consultations/consultant-earnings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2700);
      expect(response.body.data.bookings).toBe(2);
    });
  });
});
