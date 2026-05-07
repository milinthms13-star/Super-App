import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiaryFilterBuilder from './FilterBuilder';

global.fetch = jest.fn();

const localStorageMock = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('DiaryFilterBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const queueInitialFetches = ({
    savedFilters = [],
    suggestions = {
      topTags: [{ tag: 'work', count: 5 }],
      sentiments: { positive: 10, neutral: 3, negative: 1 },
    },
  } = {}) => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: savedFilters }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: suggestions }),
      });
  };

  test('renders the filter builder header and current summary', async () => {
    queueInitialFetches();

    render(<DiaryFilterBuilder />);

    expect(await screen.findByText(/advanced filter builder/i)).toBeInTheDocument();
    expect(screen.getByText(/no filters applied/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
  });

  test('loads saved filters and shows the saved count', async () => {
    queueInitialFetches({
      savedFilters: [{ _id: 'filter-1', name: 'Happy Days', useCount: 2 }],
    });

    render(<DiaryFilterBuilder />);

    expect(await screen.findByRole('button', { name: /load saved \(1\)/i })).toBeInTheDocument();
  });

  test('toggles suggested tags into the active filter summary', async () => {
    queueInitialFetches();

    render(<DiaryFilterBuilder />);

    fireEvent.click(await screen.findByRole('button', { name: /work \(5\)/i }));

    expect(screen.getByText(/tags \(any\): work/i)).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
  });

  test('applies filters through the backend endpoint and calls back with results', async () => {
    const onApplyFilter = jest.fn();
    queueInitialFetches();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { results: [], total: 0 },
      }),
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<DiaryFilterBuilder onApplyFilter={onApplyFilter} />);
    fireEvent.click(await screen.findByRole('button', { name: /apply filter/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/diary/filter/apply',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    expect(onApplyFilter).toHaveBeenCalledWith({ results: [], total: 0 });
    alertSpy.mockRestore();
  });

  test('opens the save dialog and saves a named filter', async () => {
    const onSaveFilter = jest.fn();
    queueInitialFetches();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { _id: 'filter-2', name: 'Work Entries' },
      }),
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<DiaryFilterBuilder onSaveFilter={onSaveFilter} />);

    fireEvent.click(await screen.findByRole('button', { name: /save filter/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter filter name/i), {
      target: { value: 'Work Entries' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/diary/filters/save',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Work Entries"'),
        })
      );
    });

    expect(onSaveFilter).toHaveBeenCalledWith({ _id: 'filter-2', name: 'Work Entries' });
    alertSpy.mockRestore();
  });

  test('resets the selected filters back to the default summary', async () => {
    queueInitialFetches();

    render(<DiaryFilterBuilder />);

    fireEvent.click(await screen.findByRole('button', { name: /work \(5\)/i }));
    expect(screen.getByText(/tags \(any\): work/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset all/i }));
    expect(screen.getByText(/no filters applied/i)).toBeInTheDocument();
  });

  test('still renders the builder when the initial fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DiaryFilterBuilder />);

    expect(await screen.findByText(/advanced filter builder/i)).toBeInTheDocument();
  });
});
