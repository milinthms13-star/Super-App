import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecommendationsPanel from './RecommendationsPanel';

describe('RecommendationsPanel', () => {
  const mockToken = 'test-token-123';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();

  const mockRecommendations = {
    focusAreas: [
      {
        title: 'Improve Consistency',
        priority: 'high',
        description: 'Write more frequently',
        action: 'Set a daily reminder',
      },
    ],
    wellnessActions: [
      {
        title: 'Morning Reflection',
        description: 'Start the day with a short journal entry',
        timeframe: 'Daily',
        estimatedImpact: 'High',
        difficulty: 'Easy',
      },
    ],
    motivationBoosts: [
      {
        title: '100 Entries',
        message: "You've built real momentum.",
        celebration: 'Keep going!',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const renderComponent = (props = {}) =>
    render(
      <RecommendationsPanel
        token={mockToken}
        apiUrl={mockApiUrl}
        onError={mockOnError}
        {...props}
      />
    );

  test('renders the header and fetches the default 90-day recommendations', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockRecommendations }),
    });

    renderComponent();

    expect(await screen.findByText(/ai recommendations/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockApiUrl}/api/diary/phase7/recommendations?daysBack=90`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    );
    expect(screen.getByText('Improve Consistency')).toBeInTheDocument();
  });

  test('shows a loading state while recommendations are being fetched', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByText(/loading recommendations/i)).toBeInTheDocument();
  });

  test('refetches when the time window changes', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockRecommendations }),
    });

    renderComponent();

    await screen.findByText('Improve Consistency');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '30' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${mockApiUrl}/api/diary/phase7/recommendations?daysBack=30`,
        expect.any(Object)
      );
    });
  });

  test('switches between focus, wellness, and motivation tabs', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockRecommendations }),
    });

    renderComponent();
    await screen.findByText('Improve Consistency');

    fireEvent.click(screen.getByRole('button', { name: /wellness/i }));
    expect(await screen.findByText('Morning Reflection')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /motivation/i }));
    expect(await screen.findByText('100 Entries')).toBeInTheDocument();
  });

  test('renders an error banner and calls onError on fetch failure', async () => {
    const failure = new Error('Failed to fetch recommendations');
    global.fetch.mockRejectedValueOnce(failure);

    renderComponent();

    expect(await screen.findByText(/failed to fetch recommendations/i)).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalledWith(failure);
  });
});
