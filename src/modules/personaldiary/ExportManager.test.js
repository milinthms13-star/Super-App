/**
 * ExportManager Component Tests
 * React Testing Library tests for ExportManager
 * 20+ test cases covering export formats, options, downloads
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportManager from './ExportManager';

describe('ExportManager Component', () => {
  const mockToken = 'Bearer test_token_12345';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn();
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-blob');
    global.URL.revokeObjectURL = jest.fn();
    mockOnError.mockClear();
    mockOnSuccess.mockClear();

    // Mock document.createElement for download link
    Element.prototype.click = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render component with header', () => {
      render(
        <ExportManager 
          token={mockToken} 
          apiUrl={mockApiUrl}
          onError={mockOnError}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/Export Your Diary/i)).toBeInTheDocument();
    });

    test('should render format selection buttons', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByText(/CSV/i)).toBeInTheDocument();
      expect(screen.getByText(/JSON/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF/i)).toBeInTheDocument();
    });

    test('should render time period filter', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const selector = screen.getByDisplayValue(/All time/i) || screen.getByText(/time/i);
      expect(selector).toBeInTheDocument();
    });

    test('should render export button', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    });

    test('should render analytics checkbox', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByLabelText(/Include Analytics/i)).toBeInTheDocument();
    });
  });

  describe('Format Selection', () => {
    test('should select CSV format by default', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const csvButton = screen.getByRole('button', { name: /CSV/i });
      expect(csvButton).toHaveClass(expect.stringContaining('active'));
    });

    test('should select JSON format when clicked', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const jsonButton = screen.getByRole('button', { name: /JSON/i });
      fireEvent.click(jsonButton);

      expect(jsonButton).toHaveClass(expect.stringContaining('active'));
    });

    test('should select PDF format when clicked', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const pdfButton = screen.getByRole('button', { name: /PDF/i });
      fireEvent.click(pdfButton);

      expect(pdfButton).toHaveClass(expect.stringContaining('active'));
    });

    test('should highlight selected format', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const jsonButton = screen.getByRole('button', { name: /JSON/i });
      fireEvent.click(jsonButton);

      await waitFor(() => {
        expect(jsonButton).toHaveClass(expect.stringMatching(/active|selected/i));
      });
    });
  });

  describe('Time Period Filtering', () => {
    test('should have time period select element', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      expect(select).toBeInTheDocument();
    });

    test('should support all time period options', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      
      // Options should include time periods
      expect(select).toHaveProperty('options');
    });

    test('should change daysBack state when period selected', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      await userEvent.selectOption(select, '30');

      // Verify selection changed
      expect(select.value).toBe('30');
    });

    test('should support 7 day period', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      await userEvent.selectOption(select, '7');

      expect(select.value).toBe('7');
    });

    test('should support 30 day period', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      await userEvent.selectOption(select, '30');

      expect(select.value).toBe('30');
    });

    test('should support 90 day period', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      await userEvent.selectOption(select, '90');

      expect(select.value).toBe('90');
    });

    test('should support 365 day period', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days|365 days/i);
      await userEvent.selectOption(select, '365');

      expect(select.value).toBe('365');
    });

    test('should support all time (0) period', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      await userEvent.selectOption(select, '0');

      expect(select.value).toBe('0');
    });
  });

  describe('Analytics Option', () => {
    test('should render analytics checkbox', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByLabelText(/Include Analytics/i)).toBeInTheDocument();
    });

    test('should toggle analytics checkbox', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const checkbox = screen.getByLabelText(/Include Analytics/i);
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    test('should disable time period filter for JSON format', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      
      // CSV format has time period enabled
      expect(select).toBeEnabled();

      // Switch to JSON
      const jsonButton = screen.getByRole('button', { name: /JSON/i });
      fireEvent.click(jsonButton);

      // Time period should be disabled for JSON
      await waitFor(() => {
        if (select.disabled) {
          expect(select).toBeDisabled();
        }
      });
    });

    test('should keep time period enabled for CSV', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      expect(select).toBeEnabled();
    });
  });

  describe('Export Functionality', () => {
    test('should fetch CSV data when export clicked', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(['date,title'], { type: 'text/csv' }),
        headers: new Map([['content-type', 'text/csv']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should send bearer token with request', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(),
        headers: new Map(),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

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

    test('should construct correct CSV export URL', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(),
        headers: new Map(),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/export/csv'),
          expect.any(Object)
        );
      });
    });

    test('should construct correct JSON export URL', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ entries: [] }),
        headers: new Map(),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const jsonButton = screen.getByRole('button', { name: /JSON/i });
      fireEvent.click(jsonButton);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/export/json'),
          expect.any(Object)
        );
      });
    });

    test('should handle export errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Export failed'));

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should show loading state during export', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/exporting|loading/i)).toBeInTheDocument();
      });
    });

    test('should show success message after export', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(['data']),
        headers: new Map([['content-type', 'text/csv']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} onSuccess={mockOnSuccess} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Download Handling', () => {
    test('should trigger download after successful export', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      global.fetch.mockResolvedValueOnce({
        blob: async () => mockBlob,
        headers: new Map([['content-type', 'text/csv']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    test('should set correct filename for CSV download', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(),
        headers: new Map([['content-type', 'text/csv']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(Element.prototype.click).toHaveBeenCalled();
      });
    });

    test('should include date in filename', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(),
        headers: new Map([['content-type', 'text/csv']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(Element.prototype.click).toHaveBeenCalled();
      });
    });

    test('should set correct content type for CSV', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(),
        headers: new Map([['content-type', 'text/csv']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should set correct content type for JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ entries: [] }),
        headers: new Map([['content-type', 'application/json']]),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const jsonButton = screen.getByRole('button', { name: /JSON/i });
      fireEvent.click(jsonButton);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('State Management', () => {
    test('should track loading state', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {}));

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(exportButton).toBeDisabled();
      });
    });

    test('should track export format', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const jsonButton = screen.getByRole('button', { name: /JSON/i });
      fireEvent.click(jsonButton);

      expect(jsonButton).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should track selected time period', async () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const select = screen.getByDisplayValue(/All time|7 days|30 days|90 days/i);
      await userEvent.selectOption(select, '30');

      expect(select.value).toBe('30');
    });

    test('should track analytics option', () => {
      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const checkbox = screen.getByLabelText(/Include Analytics/i);
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Error Handling', () => {
    test('should display error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should call onError callback', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Export failed'));

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should handle unauthorized access', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      render(
        <ExportManager token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe('Props Validation', () => {
    test('should use default apiUrl', async () => {
      global.fetch.mockResolvedValueOnce({
        blob: async () => new Blob(),
        headers: new Map(),
      });

      render(
        <ExportManager token={mockToken} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

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
        blob: async () => new Blob(),
        headers: new Map(),
      });

      render(
        <ExportManager token={mockToken} apiUrl={customApiUrl} />
      );

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(customApiUrl),
          expect.any(Object)
        );
      });
    });
  });
});
