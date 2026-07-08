const request = require('supertest');
const express = require('express');
const profileRoutes = require('../profile.routes');
const { authenticate } = require('../../../middleware/auth');

jest.mock('../../../middleware/auth');
jest.mock('../../../services/astrologyBackendService');

const app = express();
app.use(express.json());
app.use('/api/astrology/profile', profileRoutes);

describe('Profile Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation((req, res, next) => {
      req.user = { _id: 'user123', id: 'user123' };
      next();
    });
  });

  describe('GET /api/astrology/profile', () => {
    it('should return user profile', async () => {
      const mockProfile = {
        userId: 'user123',
        sign: 'aries',
        birthDate: '1990-01-01',
        birthTime: '10:30 AM',
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.findProfileByUserId = jest.fn().mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/astrology/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
    });

    it('should return 401 without authentication', async () => {
      authenticate.mockImplementation((req, res) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/astrology/profile')
        .expect(401);
    });
  });

  describe('PUT /api/astrology/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        sign: 'taurus',
        birthDate: '1990-01-01',
        birthTime: '10:30 AM',
        birthPlace: 'Mumbai',
      };

      const updatedProfile = {
        userId: 'user123',
        ...updateData,
      };

      const astrologyService = require('../../../services/astrologyBackendService');
      astrologyService.findProfileByUserId = jest.fn().mockResolvedValue({});
      astrologyService.saveProfileByUserId = jest.fn().mockResolvedValue(updatedProfile);
      astrologyService.normalizeSign = jest.fn().mockReturnValue('taurus');
      astrologyService.getSignDetails = jest.fn().mockReturnValue({ name: 'Taurus', emoji: '♉' });
      astrologyService.getDailyHoroscope = jest.fn().mockReturnValue('Horoscope text');

      const response = await request(app)
        .put('/api/astrology/profile')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sign).toBe('taurus');
    });

    it('should validate profile data', async () => {
      const invalidData = {
        sign: '',
        birthDate: 'invalid-date',
      };

      await request(app)
        .put('/api/astrology/profile')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /api/astrology/profile', () => {
    it('should delete user profile', async () => {
      const AstrologyUserProfile = require('../../../models/AstrologyUserProfile');
      AstrologyUserProfile.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const response = await request(app)
        .delete('/api/astrology/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should handle deletion errors', async () => {
      const AstrologyUserProfile = require('../../../models/AstrologyUserProfile');
      AstrologyUserProfile.deleteOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .delete('/api/astrology/profile')
        .expect(500);
    });
  });
});
