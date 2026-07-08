const request = require('supertest');
const express = require('express');
const analyticsRoutes = require('../analytics.routes');
const { authenticate, hasAdminPrivileges } = require('../../../middleware/auth');

jest.mock('../../../middleware/auth');
jest.mock('../../../services/astrologyBackendService');

const app = express();
app.use(express.json());
app.use('/api/astrology/analytics', analyticsRoutes);

describe('Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'admin123', id: 'admin123', role: 'admin' };
      next();
    });

    hasAdminPrivileges.mockImplementation((req, res, next) => {
      if (req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
      }
    });
  });

  describe('GET /api/astrology/analytics/dashboard', () => {
    it('should return analytics dashboard metrics', async () => {
      const mockMetrics = {
        totalBookings: 150,
        completedBookings: 120,
        cancelledBookings: 10,
        totalRevenue: 180000,
        averageRating: 4.7,
        topConsultants: [
          { id: 'c1', name: 'Consultant 1', bookings: 50, revenue: 60000 },
          { id: 'c2', name: 'Consultant 2', bookings: 40, revenue: 48000 },
        ],
        bookingTrends: [
          { date: '2026-07-01', count: 10 },
          { date: '2026-07-02', count: 12 },
        ],
        userRetention: 0.85,
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getAnalyticsDashboard = jest.fn().mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/astrology/analytics/dashboard')
        .query({ period: 'month' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalBookings).toBe(150);
      expect(response.body.data.topConsultants).toHaveLength(2);
    });

    it('should reject non-admin users', async () => {
      hasAdminPrivileges.mockImplementation((req, res) => {
        res.status(403).json({ success: false, message: 'Admin access required' });
      });

      await request(app)
        .get('/api/astrology/analytics/dashboard')
        .expect(403);
    });
  });

  describe('GET /api/astrology/analytics/alerts', () => {
    it('should return operational alerts', async () => {
      const mockAlerts = {
        windowHours: 24,
        generatedAt: new Date().toISOString(),
        signals: {
          paymentVerificationFailures: { count: 3, severity: 'warn' },
          slotConflictSpikes: { count: 5, severity: 'info' },
          webhookErrors: { count: 1, severity: 'info' },
        },
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getOperationalAlerts = jest.fn().mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/astrology/analytics/alerts')
        .query({ windowHours: 24 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signals.paymentVerificationFailures.count).toBe(3);
    });
  });

  describe('POST /api/astrology/analytics/reports', () => {
    it('should generate PDF report', async () => {
      const mockReportData = {
        totalBookings: 150,
        completedBookings: 120,
        totalRevenue: 180000,
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getAnalyticsDashboard = jest.fn().mockResolvedValue(mockReportData);

      const response = await request(app)
        .post('/api/astrology/analytics/reports')
        .send({ period: 'month', format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should generate CSV report', async () => {
      const mockBookings = [
        { id: 'b1', consultantName: 'C1', amount: 1200, status: 'completed' },
        { id: 'b2', consultantName: 'C2', amount: 950, status: 'confirmed' },
      ];

      const AstrologyConsultationBooking = require('../../../models/AstrologyConsultationBooking');
      AstrologyConsultationBooking.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockBookings),
      });

      const response = await request(app)
        .post('/api/astrology/analytics/reports')
        .send({ period: 'month', format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should validate report format', async () => {
      await request(app)
        .post('/api/astrology/analytics/reports')
        .send({ period: 'month', format: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /api/astrology/analytics/consultants', () => {
    it('should return consultant statistics', async () => {
      const mockStats = [
        {
          consultantId: 'c1',
          consultantName: 'Consultant 1',
          totalBookings: 50,
          completedBookings: 45,
          totalRevenue: 60000,
          averageRating: 4.8,
        },
        {
          consultantId: 'c2',
          consultantName: 'Consultant 2',
          totalBookings: 40,
          completedBookings: 38,
          totalRevenue: 48000,
          averageRating: 4.6,
        },
      ];

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getBookingsByConsultant = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/astrology/analytics/consultants')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].totalRevenue).toBe(60000);
    });
  });

  describe('GET /api/astrology/analytics/revenue', () => {
    it('should return revenue trends', async () => {
      const mockTrends = [
        { date: '2026-07-01', revenue: 12000, bookings: 10 },
        { date: '2026-07-02', revenue: 15000, bookings: 12 },
        { date: '2026-07-03', revenue: 18000, bookings: 15 },
      ];

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getRevenueTrends = jest.fn().mockResolvedValue(mockTrends);

      const response = await request(app)
        .get('/api/astrology/analytics/revenue')
        .query({ period: 'week' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[2].revenue).toBe(18000);
    });
  });

  describe('GET /api/astrology/analytics/users', () => {
    it('should return user statistics', async () => {
      const mockUserStats = {
        totalProfiles: 500,
        profilesWithBirthDetails: 450,
        profilesWithFamilyMembers: 200,
        profilesWithSavedReadings: 350,
        usersWithBookings: 300,
        completionRate: 0.92,
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.getUserStats = jest.fn().mockResolvedValue(mockUserStats);

      const response = await request(app)
        .get('/api/astrology/analytics/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProfiles).toBe(500);
      expect(response.body.data.completionRate).toBe(0.92);
    });
  });
});
