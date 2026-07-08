import axios from 'axios';
import {
  fetchDailyTips,
  fetchUsageStatus,
  fetchConsentStatus,
  generatePlan,
  fetchMyPlans,
  deletePlan,
  saveProgressLog,
} from '../../services/beautyaiApi';

jest.mock('axios');
jest.mock('../../../utils/api', () => ({
  buildApiUrl: (path) => `http://localhost:3000/api${path}`,
}));
jest.mock('../../../utils/auth', () => ({
  getStoredAuthToken: () => 'mock-token',
}));

describe('beautyaiApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDailyTips', () => {
    it('fetches tips successfully', async () => {
      const mockTips = {
        data: {
          success: true,
          todayTip: { title: 'Test Tip', text: 'Test content' },
          tips: [{ title: 'Tip 1' }, { title: 'Tip 2' }],
        },
      };

      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockTips),
      });

      const result = await fetchDailyTips({ language: 'en' });

      expect(result.success).toBe(true);
      expect(result.data.todayTip.title).toBe('Test Tip');
      expect(result.data.tips).toHaveLength(2);
    });

    it('handles fetch error', async () => {
      axios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: { data: { message: 'Network error' } },
        }),
      });

      const result = await fetchDailyTips({ language: 'en' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('fetchUsageStatus', () => {
    it('fetches usage status successfully', async () => {
      const mockUsage = {
        data: {
          success: true,
          usage: {
            tier: 'free',
            analyzeSelfie: { used: 1, limit: 3, remaining: 2 },
          },
          featureFlags: {
            selfieAnalysis: true,
          },
        },
      };

      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUsage),
      });

      const result = await fetchUsageStatus();

      expect(result.success).toBe(true);
      expect(result.data.usage.tier).toBe('free');
      expect(result.data.featureFlags.selfieAnalysis).toBe(true);
    });
  });

  describe('generatePlan', () => {
    it('generates plan successfully', async () => {
      const mockPlan = {
        data: {
          success: true,
          plan: {
            title: 'Test Plan',
            skinType: 'combination',
          },
        },
      };

      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockPlan),
      });

      const planData = {
        consent: true,
        skinType: 'combination',
        concern: 'acne',
      };

      const result = await generatePlan(planData);

      expect(result.success).toBe(true);
      expect(result.data.plan.title).toBe('Test Plan');
    });

    it('handles plan generation error', async () => {
      axios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue({
          response: { data: { message: 'Quota exceeded' } },
        }),
      });

      const result = await generatePlan({ consent: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quota exceeded');
    });
  });

  describe('fetchMyPlans', () => {
    it('fetches user plans successfully', async () => {
      const mockPlans = {
        data: {
          success: true,
          data: [
            { _id: 'plan1', title: 'Plan 1' },
            { _id: 'plan2', title: 'Plan 2' },
          ],
        },
      };

      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlans),
      });

      const result = await fetchMyPlans();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('deletePlan', () => {
    it('deletes plan successfully when online', async () => {
      const mockResponse = {
        data: { success: true, message: 'Plan deleted' },
      };

      axios.create.mockReturnValue({
        delete: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await deletePlan('plan123');

      expect(result.success).toBe(true);
    });

    it('queues delete when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      axios.create.mockReturnValue({
        delete: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const result = await deletePlan('plan123');

      expect(result.offline).toBe(true);
      expect(result.message).toContain('offline');
    });
  });

  describe('saveProgressLog', () => {
    it('saves progress successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          log: { day: 1, done: true },
        },
      };

      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      });

      const logData = { planId: 'plan123', day: 1, done: true };
      const result = await saveProgressLog(logData);

      expect(result.success).toBe(true);
      expect(result.data.log.day).toBe(1);
    });

    it('queues progress when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      axios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const logData = { planId: 'plan123', day: 1, done: true };
      const result = await saveProgressLog(logData);

      expect(result.offline).toBe(true);
    });
  });

  describe('fetchConsentStatus', () => {
    it('fetches consent status successfully', async () => {
      const mockConsent = {
        data: {
          success: true,
          planGeneration: { granted: true, grantedAt: '2026-01-01' },
          selfieAnalysis: { granted: true, grantedAt: '2026-01-01' },
        },
      };

      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockConsent),
      });

      const result = await fetchConsentStatus();

      expect(result.success).toBe(true);
      expect(result.data.planGeneration.granted).toBe(true);
    });
  });
});
