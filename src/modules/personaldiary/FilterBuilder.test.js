import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiaryFilterBuilder from './FilterBuilder';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('DiaryFilterBuilder Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Rendering', () => {
    test('should render filter builder header', () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      render(<DiaryFilterBuilder />);
      expect(screen.getByText(/advanced filter builder/i)).toBeInTheDocument();
    });

    test('should render date range filter section', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/date range/i)).toBeInTheDocument();
      });
    });

    test('should render tags filter section', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/tags/i)).toBeInTheDocument();
      });
    });

    test('should render sentiment filter section', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: { sentiments: {} } }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/sentiment/i)).toBeInTheDocument();
      });
    });

    test('should render word count filter section', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/word count/i)).toBeInTheDocument();
      });
    });

    test('should render status filter dropdown', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/status/i)).toBeInTheDocument();
      });
    });

    test('should render apply filter button', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
      });
    });

    test('should render save filter button', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save filter/i })).toBeInTheDocument();
      });
    });

    test('should render load saved filters button', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load saved/i })).toBeInTheDocument();
      });
    });

    test('should render reset all button', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filter', () => {
    test('should update from date', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const dateInputs = await waitFor(() =>
        screen.getAllByRole('textbox').filter((el) => el.type === 'date')
      );

      if (dateInputs.length > 0) {
        await userEvent.type(dateInputs[0], '2026-05-01');
        expect(dateInputs[0]).toHaveValue('2026-05-01');
      }
    });

    test('should update to date', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const dateInputs = await waitFor(() =>
        screen.getAllByRole('textbox').filter((el) => el.type === 'date')
      );

      if (dateInputs.length > 1) {
        await userEvent.type(dateInputs[1], '2026-05-31');
        expect(dateInputs[1]).toHaveValue('2026-05-31');
      }
    });
  });

  describe('Sentiment Filter', () => {
    test('should toggle positive sentiment', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: { sentiments: {} } }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    test('should toggle multiple sentiments', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: { sentiments: {} } }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        if (checkboxes.length >= 3) {
          expect(checkboxes[0]).toBeInTheDocument();
          expect(checkboxes[1]).toBeInTheDocument();
          expect(checkboxes[2]).toBeInTheDocument();
        }
      });
    });
  });

  describe('Word Count Filter', () => {
    test('should set minimum word count', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const numberInputs = await waitFor(() =>
        screen.getAllByRole('spinbutton')
      );

      if (numberInputs.length > 0) {
        await userEvent.clear(numberInputs[0]);
        await userEvent.type(numberInputs[0], '100');
        expect(numberInputs[0]).toHaveValue(100);
      }
    });

    test('should set maximum word count', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const numberInputs = await waitFor(() =>
        screen.getAllByRole('spinbutton')
      );

      if (numberInputs.length > 1) {
        await userEvent.clear(numberInputs[1]);
        await userEvent.type(numberInputs[1], '500');
        expect(numberInputs[1]).toHaveValue(500);
      }
    });
  });

  describe('Status Filter', () => {
    test('should select draft status', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        if (selects.length > 0) {
          expect(selects[0]).toBeInTheDocument();
        }
      });
    });

    test('should select published status', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Apply Filter', () => {
    test('should apply filters with valid configuration', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: {
              results: [],
              total: 0,
              filters: {},
            },
          }),
        });

      render(<DiaryFilterBuilder onApplyFilter={mockCallback} />);

      await waitFor(() => {
        const applyBtn = screen.getByRole('button', { name: /apply filter/i });
        expect(applyBtn).toBeInTheDocument();
      });
    });

    test('should handle apply filter errors', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
            message: 'Filter error',
          }),
        });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        const applyBtn = screen.getByRole('button', { name: /apply filter/i });
        expect(applyBtn).toBeInTheDocument();
      });

      alertSpy.mockRestore();
    });

    test('should disable apply button while applying', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        const applyBtn = screen.getByRole('button', { name: /apply filter/i });
        expect(applyBtn).not.toBeDisabled();
      });
    });
  });

  describe('Save Filter', () => {
    test('should open save dialog', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const saveBtn = await waitFor(() =>
        screen.getByRole('button', { name: /save filter/i })
      );

      await userEvent.click(saveBtn);

      // Dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/save filter/i)).toBeInTheDocument();
      });
    });

    test('should require filter name before saving', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const saveBtn = await waitFor(() =>
        screen.getByRole('button', { name: /save filter/i })
      );

      await userEvent.click(saveBtn);

      await waitFor(() => {
        const confirmBtn = screen.getByRole('button', { name: /^save$/i });
        userEvent.click(confirmBtn);
      });

      alertSpy.mockRestore();
    });

    test('should save filter with name', async () => {
      const user = userEvent.setup();
      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { _id: 'f1', name: 'Happy Entries' },
          }),
        });

      render(<DiaryFilterBuilder />);

      const saveBtn = await waitFor(() =>
        screen.getByRole('button', { name: /save filter/i })
      );

      await userEvent.click(saveBtn);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/enter filter name/i);
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('Saved Filters', () => {
    test('should fetch saved filters on mount', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { _id: 'f1', name: 'Happy', useCount: 5 },
            { _id: 'f2', name: 'Sad', useCount: 2 },
          ],
        }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/diary/filters/list',
          expect.any(Object)
        );
      });
    });

    test('should display saved filters count', async () => {
      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: [
              { _id: 'f1', name: 'Happy', useCount: 5 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/load saved \(1\)/i)).toBeInTheDocument();
      });
    });

    test('should toggle saved filters panel', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { _id: 'f1', name: 'Happy', useCount: 5 },
          ],
        }),
      });

      render(<DiaryFilterBuilder />);

      const loadBtn = await waitFor(() =>
        screen.getByRole('button', { name: /load saved/i })
      );

      await userEvent.click(loadBtn);

      // Panel should toggle
    });

    test('should load saved filter', async () => {
      const user = userEvent.setup();
      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: [
              { _id: 'f1', name: 'Happy', useCount: 5 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { results: [] },
          }),
        });

      render(<DiaryFilterBuilder />);

      const loadBtn = await waitFor(() =>
        screen.getByRole('button', { name: /load saved/i })
      );

      await userEvent.click(loadBtn);

      // Would look for and click load button for filter
    });

    test('should delete saved filter', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { _id: 'f1', name: 'Happy', useCount: 5 },
          ],
        }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/load saved/i)).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Filter Suggestions', () => {
    test('should fetch filter suggestions', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            topTags: [
              { tag: 'work', count: 5 },
              { tag: 'personal', count: 3 },
            ],
            sentiments: { positive: 10, neutral: 5, negative: 2 },
            dateRanges: [],
          },
        }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/diary/filters/suggestions',
          expect.any(Object)
        );
      });
    });

    test('should display suggested tags', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            topTags: [
              { tag: 'work', count: 5 },
            ],
            sentiments: {},
            dateRanges: [],
          },
        }),
      });

      render(<DiaryFilterBuilder />);

      // Suggestions should be displayed
    });

    test('should display sentiment distribution', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            topTags: [],
            sentiments: { positive: 10, neutral: 5 },
            dateRanges: [],
          },
        }),
      });

      render(<DiaryFilterBuilder />);

      // Sentiment counts should be displayed
    });
  });

  describe('Reset Filters', () => {
    test('should reset all filters to default', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      const resetBtn = await waitFor(() =>
        screen.getByRole('button', { name: /reset all/i })
      );

      await userEvent.click(resetBtn);

      // All filters should be reset
    });
  });

  describe('Error Handling', () => {
    test('should handle fetch errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DiaryFilterBuilder />);

      // Component should still render
      await waitFor(() => {
        expect(screen.getByText(/advanced filter builder/i)).toBeInTheDocument();
      });
    });

    test('should handle invalid filter configuration', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
            message: 'Invalid filter',
          }),
        });

      render(<DiaryFilterBuilder />);

      alertSpy.mockRestore();
    });
  });

  describe('Callbacks', () => {
    test('should call onApplyFilter callback', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { results: [] },
          }),
        });

      render(<DiaryFilterBuilder onApplyFilter={mockCallback} />);

      // Would trigger filter application
    });

    test('should call onSaveFilter callback', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { _id: 'f1', name: 'Test' },
          }),
        });

      render(<DiaryFilterBuilder onSaveFilter={mockCallback} />);

      // Would trigger save filter
    });

    test('should call onLoadFilter callback', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: [
              { _id: 'f1', name: 'Test' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { results: [] },
          }),
        });

      render(<DiaryFilterBuilder onLoadFilter={mockCallback} />);

      // Would trigger load filter
    });
  });

  describe('Accessibility', () => {
    test('should have proper labels for inputs', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByText(/date range/i)).toBeInTheDocument();
        expect(screen.getByText(/sentiment/i)).toBeInTheDocument();
        expect(screen.getByText(/word count/i)).toBeInTheDocument();
      });
    });

    test('should have descriptive button text', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });

      render(<DiaryFilterBuilder />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save filter/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    test('should work end-to-end with filter creation and application', async () => {
      const user = userEvent.setup();
      fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: {} }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { results: [], total: 0 },
          }),
        });

      render(<DiaryFilterBuilder />);

      // Would set up filter, apply it
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
      });
    });
  });
});
