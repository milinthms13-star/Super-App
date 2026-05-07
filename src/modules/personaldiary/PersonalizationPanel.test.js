import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PersonalizationPanel from './PersonalizationPanel';

describe('PersonalizationPanel', () => {
  const mockToken = 'test-token-123';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockPreferences = {
    theme: {
      mode: 'light',
      primaryColor: '#6366f1',
      fontSize: 'medium',
      lineHeight: '1.6',
    },
    writing: {
      defaultMode: 'full',
      autoSaveInterval: 30,
      wordGoal: 500,
      spellCheck: true,
      grammarCheck: false,
      suggestTags: true,
    },
    notifications: {
      reminderFrequency: 'daily',
      reminderTime: '09:00',
      analyticsDigest: 'weekly',
      streakNotifications: true,
    },
    privacy: {
      profileVisibility: 'private',
      dataRetention: '1year',
      encryptEntries: false,
      backupEnabled: true,
      allowSharing: true,
      allowCollaboration: false,
    },
  };

  const mockThemeConfig = {
    primaryColor: '#6366f1',
    fontSize: '16px',
    fontFamily: 'Segoe UI',
    lineHeight: '1.6',
  };

  const mockWritingModeConfig = {
    full: { showToolbar: true, showSidebar: true },
    focused: { showToolbar: false, showSidebar: false },
  };

  const jsonResponse = (data) =>
    Promise.resolve({
      ok: true,
      json: async () => data,
    });

  const queueInitialFetches = () => {
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: mockPreferences })
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: mockThemeConfig })
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: mockWritingModeConfig })
      );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const renderComponent = (props = {}) =>
    render(
      <PersonalizationPanel
        token={mockToken}
        apiUrl={mockApiUrl}
        onError={mockOnError}
        onSuccess={mockOnSuccess}
        {...props}
      />
    );

  test('renders a loading state before preferences are available', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByText(/loading preferences/i)).toBeInTheDocument();
  });

  test('fetches the three personalization endpoints and renders the theme section by default', async () => {
    queueInitialFetches();

    renderComponent();

    expect(await screen.findByText(/personalization settings/i)).toBeInTheDocument();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `${mockApiUrl}/api/diary/phase7/preferences`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    );
    expect(screen.getByRole('button', { name: /theme/i })).toHaveClass('nav-btn active');
    expect(screen.getByText(/theme settings/i)).toBeInTheDocument();
  });

  test('switches between sections using the navigation buttons', async () => {
    queueInitialFetches();

    renderComponent();

    await screen.findByText(/theme settings/i);

    fireEvent.click(screen.getByRole('button', { name: /writing/i }));
    expect(await screen.findByText(/writing preferences/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /privacy/i }));
    expect(await screen.findByText(/privacy & security/i)).toBeInTheDocument();
  });

  test('tracks unsaved changes after a preference update', async () => {
    queueInitialFetches();

    renderComponent();

    const darkButton = await screen.findByRole('button', { name: /dark/i });
    fireEvent.click(darkButton);

    expect(await screen.findByText(/unsaved changes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeEnabled();
  });

  test('saves updated preferences through the phase 7 preferences endpoint', async () => {
    queueInitialFetches();
    global.fetch.mockResolvedValueOnce({ ok: true });

    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /dark/i }));
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${mockApiUrl}/api/diary/phase7/preferences`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
          body: expect.stringContaining('"mode":"dark"'),
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalledWith('Preferences saved successfully');
  });

  test('shows an error banner and calls onError when the initial fetch fails', async () => {
    const failure = new Error('Failed to fetch personalization data');
    global.fetch.mockRejectedValueOnce(failure);

    renderComponent();

    expect(await screen.findByText(/failed to fetch personalization data/i)).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalledWith(failure);
  });

  test('uses the provided apiUrl for the fetch requests', async () => {
    const customApiUrl = 'http://api.example.com';
    queueInitialFetches();

    renderComponent({ apiUrl: customApiUrl });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `${customApiUrl}/api/diary/phase7/preferences`,
        expect.any(Object)
      );
    });
  });
});
