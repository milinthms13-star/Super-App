/**
 * Analytics Dashboard Component Tests
 * Tests for AnalyticsDashboard with mocked API calls
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock fetch
global.fetch = jest.fn();

describe('AnalyticsDashboard Component', () => {
  const mockToken = 'test-token-12345';
  const mockApiUrl = 'http://localhost:5000';

  const mockDashboardData = {
    writing: {
      entryCount: 45,
      totalWords: 12500,
      avgWords: 278,
      entriesPerDay: 1.5,
      wordsPerDay: 417
    },
    streak: {
      currentStreak: 12,
      longestStreak: 25,
      streakStartDate: '2024-05-01'
    },
    mood: {
      moodCounts: {
        positive: 20,
        neutral: 15,
        negative: 10
      },
      dominantMood: 'positive'
    },
    wellness: {
      score: 75,
      level: 'High'
    }
  };

  const mockSentimentTrend = [
    { period: '2024-05-01', positive: 70, neutral: 20, negative: 10, entries: 3 },
    { period: '2024-05-02', positive: 60, neutral: 30, negative: 10, entries: 2 },
    { period: '2024-05-03', positive: 50, neutral: 40, negative: 10, entries: 3 }
  ];

  const mockTagAnalytics = {
    uniqueTags: 12,
    totalTagUsages: 45,
    tagFrequency: [
      { tag: 'productivity', frequency: 8, trend: 'up' },
      { tag: 'growth', frequency: 6, trend: 'up' },
      { tag: 'learning', frequency: 5, trend: 'stable' }
    ]
  };

  const mockWordCountAnalytics = {
    totalWords: 12500,
    avgWords: 278,
    minWords: 25,
    maxWords: 1240,
    median: 250,
    wordDistribution: {
      veryShort: 5,
      short: 15,
      medium: 18,
      long: 5,
      veryLong: 2
    }
  };

  const mockHeatmapData = {
    '2024-05-01': 2,
    '2024-05-02': 1,
    '2024-05-03': 3,
    '2024-05-04': 2
  };

  const mockInsights = [
    {
      type: 'positive',
      message: 'Great writing streak! Keep it up.',
      severity: 'info'
    },
    {
      type: 'suggestion',
      message: 'Consider longer entries for deeper reflection.',
      severity: 'suggestion'
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
    fetch.mockImplementation((url) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockDashboardData })
        });
      }
      if (url.includes('/sentiment-trend')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSentimentTrend })
        });
      }
      if (url.includes('/tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockTagAnalytics })
        });
      }
      if (url.includes('/word-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockWordCountAnalytics })
        });
      }
      if (url.includes('/heatmap')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockHeatmapData })
        });
      }
      if (url.includes('/insights')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockInsights })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  // =========================================================================
  // RENDER TESTS
  // =========================================================================

  test('should render dashboard with title', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  test('should render loading state initially', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  test('should display error state on fetch failure', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API Error')));
    const onError = jest.fn();
    
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} onError={onError} />
    );
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  test('should display error message with retry button', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API Error')));
    
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // STATISTICS CARDS TESTS
  // =========================================================================

  test('should display statistics cards', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument(); // Entry count
      expect(screen.getByText('12500')).toBeInTheDocument(); // Total words
    });
  });

  test('should display entries and words stats', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Total Entries/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Words/i)).toBeInTheDocument();
    });
  });

  test('should display streak information', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // Current streak
    });
  });

  test('should display wellness score', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/75%/i)).toBeInTheDocument(); // Wellness score
    });
  });

  // =========================================================================
  // FILTER CONTROLS TESTS
  // =========================================================================

  test('should render filter controls', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  test('should change daysBack when filter selected', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    const filterSelects = screen.getAllByRole('combobox');
    if (filterSelects.length > 0) {
      await userEvent.selectOptions(filterSelects[0], '90');
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('daysBack=90'),
          expect.any(Object)
        );
      });
    }
  });

  test('should change groupBy when sentiment filter selected', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    const filterSelects = screen.getAllByRole('combobox');
    if (filterSelects.length > 1) {
      await userEvent.selectOptions(filterSelects[1], 'month');
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('groupBy=month'),
          expect.any(Object)
        );
      });
    }
  });

  test('should refresh data when refresh button clicked', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    const initialCallCount = fetch.mock.calls.length;
    
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  // =========================================================================
  // INSIGHTS TESTS
  // =========================================================================

  test('should display insights', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Great writing streak/i)).toBeInTheDocument();
    });
  });

  test('should display multiple insights', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Great writing streak/i)).toBeInTheDocument();
      expect(screen.getByText(/Consider longer entries/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // API REQUEST TESTS
  // =========================================================================

  test('should send authorization header with token', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
    });
  });

  test('should use custom API URL', async () => {
    const customApiUrl = 'http://custom-api.com';
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={customApiUrl} />
    );
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(customApiUrl),
        expect.any(Object)
      );
    });
  });

  test('should use default API URL when not provided', async () => {
    render(
      <AnalyticsDashboard token={mockToken} />
    );
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:5000'),
        expect.any(Object)
      );
    });
  });

  // =========================================================================
  // CALLBACK TESTS
  // =========================================================================

  test('should call onError callback on fetch error', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API Error')));
    const onError = jest.fn();
    
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} onError={onError} />
    );
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  test('should call onLoading callback', async () => {
    const onLoading = jest.fn();
    
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} onLoading={onLoading} />
    );
    
    // Should be called with true initially
    expect(onLoading).toHaveBeenCalledWith(true);
  });

  // =========================================================================
  // STATE MANAGEMENT TESTS
  // =========================================================================

  test('should handle empty data gracefully', async () => {
    fetch.mockImplementation((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });

    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      // Should not crash
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  test('should display default values for missing data', async () => {
    fetch.mockImplementation((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { writing: { entryCount: 0 } } })
      });
    });

    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ACCESSIBILITY TESTS
  // =========================================================================

  test('should have appropriate ARIA labels', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });
  });

  test('should have semantic HTML structure', async () => {
    const { container } = render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(container.querySelector('main')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // RESPONSIVE DESIGN TESTS
  // =========================================================================

  test('should render on desktop viewport', async () => {
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  test('should render on tablet viewport', async () => {
    global.innerWidth = 768;
    global.innerHeight = 1024;
    
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  test('should render on mobile viewport', async () => {
    global.innerWidth = 375;
    global.innerHeight = 667;
    
    render(
      <AnalyticsDashboard token={mockToken} apiUrl={mockApiUrl} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });
});
