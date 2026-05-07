import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiarySearch from './Search';

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

const jsonResponse = (data) =>
  Promise.resolve({
    ok: true,
    json: async () => data,
  });

describe('DiarySearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [],
      })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders the primary search controls', async () => {
    render(<DiarySearch />);

    expect(
      screen.getByPlaceholderText(/search your diary entries/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /advanced filters/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/diary/search/history',
        expect.any(Object)
      );
    });
  });

  test('updates the input value while typing', async () => {
    render(<DiarySearch />);

    const input = screen.getByPlaceholderText(/search your diary entries/i);
    fireEvent.change(input, { target: { value: 'happy' } });

    expect(input).toHaveValue('happy');
  });

  test('alerts when search is attempted with an empty query', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<DiarySearch />);
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(alertSpy).toHaveBeenCalledWith('Please enter a search query');
    alertSpy.mockRestore();
  });

  test('submits a search request and renders results', async () => {
    const onSearch = jest.fn();

    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            results: [
              {
                _id: 'entry-1',
                title: 'Happy Day',
                createdAt: '2026-05-01T10:00:00.000Z',
                tags: ['positive'],
                sentiment: 'positive',
                preview: 'Had a great day',
                page: 1,
                total: 1,
              },
            ],
            total: 1,
            page: 1,
          },
        })
      );

    render(<DiarySearch onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText(/search your diary entries/i), {
      target: { value: 'happy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/diary/search/query',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    expect(await screen.findByText('Happy Day')).toBeInTheDocument();
    expect(onSearch).toHaveBeenCalled();
  });

  test('fetches suggestions after the debounce window for longer queries', async () => {
    jest.useFakeTimers();

    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ text: 'happy', type: 'tag', category: 'Tags' }],
        })
      );

    render(<DiarySearch />);

    fireEvent.change(screen.getByPlaceholderText(/search your diary entries/i), {
      target: { value: 'hap' },
    });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/diary/search/suggestions?query=hap'),
        expect.any(Object)
      );
    });

    expect(await screen.findByText('happy')).toBeInTheDocument();
  });

  test('toggles the filters panel and applies filters', async () => {
    const onFilter = jest.fn();

    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            results: [],
            total: 0,
            page: 1,
          },
        })
      );

    render(<DiarySearch onFilter={onFilter} />);

    fireEvent.click(screen.getByRole('button', { name: /advanced filters/i }));

    expect(screen.getByText(/date range/i)).toBeInTheDocument();

    const dateInputs = screen.getAllByDisplayValue('');
    fireEvent.change(dateInputs[0], { target: { value: '2026-05-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-05-31' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/diary/filter/apply',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    expect(onFilter).toHaveBeenCalled();
  });

  test('shows and clears search history from the dropdown', async () => {
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ query: 'happy', count: 2, lastSearched: '2026-05-01T00:00:00.000Z' }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
        })
      );

    render(<DiarySearch />);

    const input = screen.getByPlaceholderText(/search your diary entries/i);
    fireEvent.focus(input);

    expect(await screen.findByText(/recent searches/i)).toBeInTheDocument();
    expect(screen.getByText('happy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/diary/search/history',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('happy')).not.toBeInTheDocument();
    });
  });
});
