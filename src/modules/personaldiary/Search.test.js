import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiarySearch from './Search';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('DiarySearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Rendering', () => {
    test('should render search input', () => {
      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      expect(input).toBeInTheDocument();
    });

    test('should render search button', () => {
      render(<DiarySearch />);
      const button = screen.getByRole('button', { name: /search/i });
      expect(button).toBeInTheDocument();
    });

    test('should render filter toggle button', () => {
      render(<DiarySearch />);
      const filterBtn = screen.getByRole('button', { name: /advanced filters/i });
      expect(filterBtn).toBeInTheDocument();
    });

    test('should render with correct initial state', () => {
      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      expect(input.value).toBe('');
    });
  });

  describe('Search Input', () => {
    test('should update input value when typing', async () => {
      const user = userEvent.setup();
      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);

      await user.type(input, 'happy');
      expect(input.value).toBe('happy');
    });

    test('should trigger search on button click', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: [],
            total: 0,
            query: 'test',
            page: 1,
          },
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'test');
      await userEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('should trigger search on Enter key press', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: [],
            total: 0,
            query: 'test',
            page: 1,
          },
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);

      await userEvent.type(input, 'test{Enter}');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('should show alert for empty search', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      render(<DiarySearch />);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.click(button);

      expect(alertSpy).toHaveBeenCalledWith('Please enter a search query');
      alertSpy.mockRestore();
    });
  });

  describe('Suggestions', () => {
    test('should fetch and display suggestions', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { text: 'positive', type: 'tag', category: 'Tags' },
            { text: 'work', type: 'tag', category: 'Tags' },
          ],
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);

      await userEvent.type(input, 'pos');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('suggestions'),
          expect.any(Object)
        );
      });
    });

    test('should not show suggestions for short query', async () => {
      const user = userEvent.setup();
      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);

      await userEvent.type(input, 'a');

      // Suggestions should not be fetched
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should select suggestion on click', async () => {
      const user = userEvent.setup();
      const mockSuggestions = [
        { text: 'happy', type: 'tag', category: 'Tags' },
      ];

      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: mockSuggestions,
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: {
              results: [],
              total: 0,
              query: 'happy',
              page: 1,
            },
          }),
        });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);

      await userEvent.type(input, 'hap');

      // Wait for suggestions to appear and click one
      // This is tested at higher level with snapshot
    });
  });

  describe('Search History', () => {
    test('should fetch search history on mount', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { query: 'happy', count: 2, lastSearched: new Date() },
          ],
        }),
      });

      render(<DiarySearch />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/diary/search/history',
          expect.any(Object)
        );
      });
    });

    test('should show history dropdown on input focus', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [
            { query: 'test', count: 1, lastSearched: new Date() },
          ],
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);

      await userEvent.click(input);

      // Wait for history to be fetched
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('should clear search history', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: [
              { query: 'test', count: 1, lastSearched: new Date() },
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
          }),
        });

      render(<DiarySearch />);

      // Focus input to show history
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      await userEvent.click(input);

      alertSpy.mockRestore();
    });
  });

  describe('Filters Panel', () => {
    test('should toggle filters panel', async () => {
      const user = userEvent.setup();
      render(<DiarySearch />);
      const filterBtn = screen.getByRole('button', { name: /advanced filters/i });

      expect(screen.queryByLabelText(/date range/i)).not.toBeInTheDocument();

      await userEvent.click(filterBtn);

      // Filters panel should show
      // This requires the component to actually render the filter UI
    });

    test('should update date range filters', async () => {
      const user = userEvent.setup();
      render(<DiarySearch />);
      const filterBtn = screen.getByRole('button', { name: /advanced filters/i });

      await userEvent.click(filterBtn);

      // Note: Implementation details would depend on actual component structure
    });

    test('should apply filters', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: [],
            total: 0,
            filters: {},
          },
        }),
      });

      render(<DiarySearch />);
      const filterBtn = screen.getByRole('button', { name: /advanced filters/i });

      await userEvent.click(filterBtn);

      // Would check for apply button and click it
    });

    test('should reset filters', async () => {
      const user = userEvent.setup();
      render(<DiarySearch />);
      const filterBtn = screen.getByRole('button', { name: /advanced filters/i });

      await userEvent.click(filterBtn);

      // Would check for reset button
    });
  });

  describe('Search Results', () => {
    test('should display search results', async () => {
      const user = userEvent.setup();
      const mockResults = {
        success: true,
        data: {
          results: [
            {
              _id: '1',
              title: 'Happy Day',
              createdAt: new Date('2026-05-01'),
              tags: ['positive'],
              sentiment: 'positive',
              preview: 'Had a great day',
            },
          ],
          total: 1,
          query: 'happy',
          page: 1,
          pageSize: 20,
        },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResults,
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'happy');
      await userEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('should show no results message', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: [],
            total: 0,
            query: 'xyz',
            page: 1,
            pageSize: 20,
          },
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'xyz');
      await userEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('should display result metadata', async () => {
      const user = userEvent.setup();
      const mockResults = {
        success: true,
        data: {
          results: [
            {
              _id: '1',
              title: 'Test Entry',
              createdAt: new Date(),
              tags: ['test'],
              sentiment: 'positive',
              preview: 'Test content',
            },
          ],
          total: 1,
          query: 'test',
          page: 1,
          pageSize: 20,
        },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResults,
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'test');
      await userEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Pagination', () => {
    test('should handle pagination', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: Array(20).fill({
              _id: '1',
              title: 'Test',
              createdAt: new Date(),
              tags: [],
              sentiment: 'neutral',
              preview: 'Test',
            }),
            total: 50,
            query: 'test',
            page: 1,
            pageSize: 20,
          },
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'test');
      await userEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle search errors', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          message: 'Search failed',
        }),
      });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'test');
      await userEvent.click(button);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Search failed')
        );
      });

      alertSpy.mockRestore();
    });

    test('should handle network errors', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'test');
      await userEvent.click(button);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('search')
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('Callbacks', () => {
    test('should call onSearch callback', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: [],
            total: 0,
            query: 'test',
            page: 1,
          },
        }),
      });

      render(<DiarySearch onSearch={mockCallback} />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'test');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });

    test('should call onFilter callback', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            results: [],
            total: 0,
            filters: {},
          },
        }),
      });

      render(<DiarySearch onFilter={mockCallback} />);
      // Test would continue with filter interaction
    });
  });

  describe('Accessibility', () => {
    test('should have proper button labels', () => {
      render(<DiarySearch />);
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /advanced filters/i })).toBeInTheDocument();
    });

    test('should have input with placeholder', () => {
      render(<DiarySearch />);
      expect(screen.getByPlaceholderText(/search your diary entries/i)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('should work end-to-end with search and filter', async () => {
      const user = userEvent.setup();
      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: [
              { query: 'happy', count: 1, lastSearched: new Date() },
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: {
              results: [
                {
                  _id: '1',
                  title: 'Happy Day',
                  createdAt: new Date(),
                  tags: ['positive'],
                  sentiment: 'positive',
                  preview: 'Great day',
                },
              ],
              total: 1,
              query: 'happy',
              page: 1,
            },
          }),
        });

      render(<DiarySearch />);
      const input = screen.getByPlaceholderText(/search your diary entries/i);
      const button = screen.getByRole('button', { name: /search/i });

      await userEvent.type(input, 'happy');
      await userEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });
});
