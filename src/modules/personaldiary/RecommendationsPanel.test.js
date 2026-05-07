/**
 * RecommendationsPanel Component Tests
 * React Testing Library tests for RecommendationsPanel
 * 20+ test cases covering rendering, state, API integration, user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationsPanel from './RecommendationsPanel';

describe('RecommendationsPanel Component', () => {
  const mockToken = 'Bearer test_token_12345';
  const mockApiUrl = 'http://localhost:5000';

  const mockRecommendations = {
    focusAreas: [
      { title: 'Improve Consistency', priority: 'high', description: 'Write more frequently', severity: 'high' },
      { title: 'Enhance Clarity', priority: 'medium', description: 'Use clearer language', severity: 'medium' },
    ],
    wellnessActions: [
      { action: 'Morning Reflection', timeframe: 'daily', impact: 'high' },
      { action: 'Weekly Review', timeframe: 'weekly', impact: 'medium' },
    ],
    motivationBoosts: [
      { milestone: '100 Entries', message: 'You\'ve reached 100 entries!', achieved: true },
    ],
    moodInsights: [
      { mood: 'happy', count: 45, trend: 'up' },
    ],
    writingEnhancements: [
      { suggestion: 'Add more details', category: 'detail' },
    ],
    timestamp: new Date().toISOString(),
    severity: 'high',
  };

  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  // Mock fetch globally
  beforeEach(() => {
    global.fetch = jest.fn();
    mockOnError.mockClear();
    mockOnSuccess.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render component with header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel 
          token={mockToken} 
          apiUrl={mockApiUrl}
          onError={mockOnError}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/AI-Powered Recommendations/i)).toBeInTheDocument();
      });
    });

    test('should render loading state initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should render error banner on fetch failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch' }),
      });

      render(
        <RecommendationsPanel 
          token={mockToken} 
          apiUrl={mockApiUrl}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should render recommendations data when loaded', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText('Improve Consistency')).toBeInTheDocument();
      });
    });

    test('should render time period filter dropdown', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const dropdown = screen.getByDisplayValue(/Last 90 days/i);
        expect(dropdown).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    test('should initialize with 90 days selected', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('daysBack=90'),
          expect.any(Object)
        );
      });
    });

    test('should store recommendations in state', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      const { container } = render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText('Improve Consistency')).toBeInTheDocument();
      });
    });

    test('should track error state', async () => {
      const error = 'Network error';
      global.fetch.mockRejectedValueOnce(new Error(error));

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should track loading state', () => {
      global.fetch.mockImplementation(() => new Promise(() => {}));

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    test('should fetch recommendations with correct bearer token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': mockToken,
            }),
          })
        );
      });
    });

    test('should construct correct API URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/diary/phase7/recommendations'),
          expect.any(Object)
        );
      });
    });

    test('should handle API errors gracefully', async () => {
      const errorMsg = 'Server error';
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMsg }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should call onSuccess callback on successful fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('User Interactions', () => {
    test('should refetch when time period filter changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const dropdown = screen.getByDisplayValue(/Last 90 days/i);
      await userEvent.selectOption(dropdown, '30');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('should support 7 day filter', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      const dropdown = screen.getByDisplayValue(/Last 90 days/i);
      await userEvent.selectOption(dropdown, '7');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('daysBack=7'),
          expect.any(Object)
        );
      });
    });

    test('should support 30 day filter', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      const dropdown = screen.getByDisplayValue(/Last 90 days/i);
      await userEvent.selectOption(dropdown, '30');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('daysBack=30'),
          expect.any(Object)
        );
      });
    });

    test('should support 180 day filter', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      const dropdown = screen.getByDisplayValue(/Last 90 days/i);
      await userEvent.selectOption(dropdown, '180');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('daysBack=180'),
          expect.any(Object)
        );
      });
    });

    test('should render tabs for different sections', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Focus Areas/i)).toBeInTheDocument();
        expect(screen.getByText(/Wellness Actions/i)).toBeInTheDocument();
      });
    });

    test('should switch tabs when clicked', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const wellnessTab = screen.getByText(/Wellness Actions/i);
        expect(wellnessTab).toBeInTheDocument();
      });

      const wellnessTab = screen.getByText(/Wellness Actions/i);
      fireEvent.click(wellnessTab);

      await waitFor(() => {
        expect(screen.getByText('Morning Reflection')).toBeInTheDocument();
      });
    });
  });

  describe('Rendering Focus Areas', () => {
    test('should display focus area title', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText('Improve Consistency')).toBeInTheDocument();
      });
    });

    test('should display priority badges', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument();
      });
    });

    test('should display focus area description', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText('Write more frequently')).toBeInTheDocument();
      });
    });
  });

  describe('Rendering Wellness Actions', () => {
    test('should display wellness action', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const wellnessTab = screen.getByText(/Wellness Actions/i);
        fireEvent.click(wellnessTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Morning Reflection')).toBeInTheDocument();
      });
    });

    test('should display timeframe', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const wellnessTab = screen.getByText(/Wellness Actions/i);
        fireEvent.click(wellnessTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/Daily/i)).toBeInTheDocument();
      });
    });

    test('should display impact indicator', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const wellnessTab = screen.getByText(/Wellness Actions/i);
        fireEvent.click(wellnessTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/High Impact/i)).toBeInTheDocument();
      });
    });
  });

  describe('Rendering Motivation Boosts', () => {
    test('should display motivation milestone', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const motivationTab = screen.getByText(/Motivation/i);
        fireEvent.click(motivationTab);
      });

      await waitFor(() => {
        expect(screen.getByText('100 Entries')).toBeInTheDocument();
      });
    });

    test('should display achievement message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const motivationTab = screen.getByText(/Motivation/i);
        fireEvent.click(motivationTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/reached 100 entries/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should call onError callback with error', async () => {
      const errorMsg = 'Failed to load recommendations';
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMsg }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(expect.any(String));
      });
    });

    test('should handle missing authorization', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should handle server errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have semantic HTML structure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      const { container } = render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    test('should have proper heading hierarchy', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toBeInTheDocument();
      });
    });

    test('should have accessible button labels', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(btn => {
          expect(btn.textContent || btn.getAttribute('aria-label')).toBeTruthy();
        });
      });
    });
  });

  describe('Props Validation', () => {
    test('should use default apiUrl when not provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:5000'),
          expect.any(Object)
        );
      });
    });

    test('should use provided apiUrl', async () => {
      const customApiUrl = 'http://api.example.com';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      render(
        <RecommendationsPanel token={mockToken} apiUrl={customApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(customApiUrl),
          expect.any(Object)
        );
      });
    });

    test('should handle missing token gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      render(
        <RecommendationsPanel apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});
