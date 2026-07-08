import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import NilaBeautyAI from '../NilaBeautyAI';

jest.mock('axios');
jest.mock('../../../utils/auth', () => ({
  getStoredAuthToken: () => 'test-token',
}));
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  };
});

describe('NilaBeautyAI admin alerts', () => {
  test('renders operational alert severity badges for admins', async () => {
    const get = jest.fn(async (url) => {
      if (url.includes('/beauty-ai/admin/subscription-rules')) {
        return {
          data: {
            subscriptionRules: {
              free: {
                dailyAnalysisLimit: 1,
                weeklyPlanLengthDays: 7,
                allowPremiumReport: false,
                allowDermatologistReferral: false,
              },
              premium: {
                dailyAnalysisLimit: 10,
                weeklyPlanLengthDays: 30,
                allowPremiumReport: true,
                allowDermatologistReferral: true,
              },
            },
          },
        };
      }
      if (url.includes('/beauty-ai/admin/alerts')) {
        return {
          data: {
            alerts: [
              {
                key: 'upload_failures',
                label: 'Selfie upload failures',
                count24h: 8,
                count7d: 12,
                severity24h: 'red',
              },
            ],
          },
        };
      }
      if (url.includes('/beauty-ai/tips/today')) {
        return { data: { tips: [], todayTip: 'Tip' } };
      }
      if (url.includes('/beauty-ai/progress-log/mine')) {
        return { data: { logs: [] } };
      }
      if (url.includes('/beauty-ai/plans/my')) {
        return { data: { data: [] } };
      }
      throw new Error(`Unhandled GET URL in test: ${url}`);
    });

    axios.create.mockReturnValue({
      get,
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    });

    render(<NilaBeautyAI />);

    await waitFor(() => {
      expect(screen.getByText('Operational alerts')).toBeInTheDocument();
    });

    expect(screen.getByText('Selfie upload failures')).toBeInTheDocument();
    expect(screen.getByText('RED')).toBeInTheDocument();
  });
});
