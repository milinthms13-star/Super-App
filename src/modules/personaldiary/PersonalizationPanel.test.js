/**
 * PersonalizationPanel Component Tests
 * React Testing Library tests for PersonalizationPanel
 * 20+ test cases covering preferences, theme, writing modes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonalizationPanel from './PersonalizationPanel';

describe('PersonalizationPanel Component', () => {
  const mockToken = 'Bearer test_token_12345';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockPreferences = {
    theme: {
      mode: 'light',
      primaryColor: '#6366f1',
      fontSize: 'medium',
      fontFamily: 'Segoe UI',
      lineHeight: 1.6,
    },
    writing: {
      defaultMode: 'full',
      autoSave: true,
      autoSaveInterval: 30,
      wordGoal: 500,
      suggestTags: true,
    },
    notifications: {
      reminders: { enabled: true, time: '09:00', frequency: 'daily' },
      streakNotifications: true,
      analyticsDigest: 'weekly',
    },
    privacy: {
      profileVisibility: 'private',
      allowSharing: true,
      encryptEntries: false,
      dataRetention: '1year',
    },
  };

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
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel 
          token={mockToken} 
          apiUrl={mockApiUrl}
          onError={mockOnError}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Personalization Settings/i)).toBeInTheDocument();
      });
    });

    test('should render loading state initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {}));

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should render preference sections', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Theme/i)).toBeInTheDocument();
        expect(screen.getByText(/Writing/i)).toBeInTheDocument();
        expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
        expect(screen.getByText(/Privacy/i)).toBeInTheDocument();
      });
    });

    test('should render save button', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Theme Section', () => {
    test('should display theme mode buttons', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Light/i)).toBeInTheDocument();
        expect(screen.getByText(/Dark/i)).toBeInTheDocument();
        expect(screen.getByText(/Auto/i)).toBeInTheDocument();
      });
    });

    test('should select light theme', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const lightButton = screen.getByText(/Light/i);
        fireEvent.click(lightButton);
      });

      const lightButton = screen.getByText(/Light/i);
      expect(lightButton).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should select dark theme', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const darkButton = screen.getByText(/Dark/i);
        fireEvent.click(darkButton);
      });

      const darkButton = screen.getByText(/Dark/i);
      expect(darkButton).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should select auto theme', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const autoButton = screen.getByText(/Auto/i);
        fireEvent.click(autoButton);
      });

      const autoButton = screen.getByText(/Auto/i);
      expect(autoButton).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should display color picker', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Primary Color/i)).toBeInTheDocument();
      });
    });

    test('should display font size selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Small|Medium|Large/i)).toBeInTheDocument();
      });
    });

    test('should display line height selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/1.4|1.6|1.8|2/)).toBeInTheDocument();
      });
    });
  });

  describe('Writing Section', () => {
    test('should display writing mode buttons', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Full/i)).toBeInTheDocument();
        expect(screen.getByText(/Minimal/i)).toBeInTheDocument();
        expect(screen.getByText(/Focused/i)).toBeInTheDocument();
        expect(screen.getByText(/Typewriter/i)).toBeInTheDocument();
      });
    });

    test('should select full writing mode', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const fullButton = screen.getByText(/Full/i);
        fireEvent.click(fullButton);
      });

      expect(screen.getByText(/Full/i)).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should select minimal writing mode', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const minimalButton = screen.getByText(/Minimal/i);
        fireEvent.click(minimalButton);
      });

      expect(screen.getByText(/Minimal/i)).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should select focused writing mode', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const focusedButton = screen.getByText(/Focused/i);
        fireEvent.click(focusedButton);
      });

      expect(screen.getByText(/Focused/i)).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should select typewriter writing mode', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const typewriterButton = screen.getByText(/Typewriter/i);
        fireEvent.click(typewriterButton);
      });

      expect(screen.getByText(/Typewriter/i)).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should display auto-save checkbox', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Auto-save/i)).toBeInTheDocument();
      });
    });

    test('should display word goal input', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/500/)).toBeInTheDocument();
      });
    });

    test('should display tag suggestion checkbox', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Suggest tags/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notifications Section', () => {
    test('should display reminder frequency selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const selectors = screen.getAllByDisplayValue(/Daily|Weekly|Monthly/i);
        expect(selectors.length).toBeGreaterThan(0);
      });
    });

    test('should display reminder time input', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/09:00/)).toBeInTheDocument();
      });
    });

    test('should display streak notifications checkbox', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Streak notifications/i)).toBeInTheDocument();
      });
    });

    test('should display analytics digest selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const selectors = screen.getAllByDisplayValue(/Daily|Weekly|Monthly/i);
        expect(selectors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Privacy Section', () => {
    test('should display profile visibility selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Private|Contacts|Public/i)).toBeInTheDocument();
      });
    });

    test('should display data retention selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/6 months|1 year|Forever/i)).toBeInTheDocument();
      });
    });

    test('should display allow sharing checkbox', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Allow sharing/i)).toBeInTheDocument();
      });
    });

    test('should display encryption checkbox', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Encrypt entries/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('should save preferences when form submitted', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/preferences'),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });

    test('should send updated preferences to API', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const darkButton = screen.getByText(/Dark/i);
        fireEvent.click(darkButton);
      });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('dark'),
          })
        );
      });
    });

    test('should include bearer token with save request', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);
      });

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

    test('should show success message after save', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Unsaved Changes', () => {
    test('should track unsaved changes', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const darkButton = screen.getByText(/Dark/i);
        fireEvent.click(darkButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });

    test('should disable save button when no changes', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        expect(saveButton).toBeDisabled();
      });
    });

    test('should enable save button when changes made', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const darkButton = screen.getByText(/Dark/i);
        fireEvent.click(darkButton);
      });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        expect(saveButton).toBeEnabled();
      });
    });
  });

  describe('API Integration', () => {
    test('should fetch preferences with bearer token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
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

    test('should construct correct preferences URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/preferences'),
          expect.any(Object)
        );
      });
    });

    test('should handle API errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should call onSuccess callback on successful fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should display error on save failure', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPreferences }),
        })
        .mockRejectedValueOnce(new Error('Save failed'));

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    test('should call onError callback on failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));

      render(
        <PersonalizationPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe('Props Validation', () => {
    test('should use default apiUrl', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:5000'),
          expect.any(Object)
        );
      });
    });

    test('should use custom apiUrl', async () => {
      const customApiUrl = 'http://api.example.com';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreferences }),
      });

      render(
        <PersonalizationPanel token={mockToken} apiUrl={customApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(customApiUrl),
          expect.any(Object)
        );
      });
    });
  });
});
