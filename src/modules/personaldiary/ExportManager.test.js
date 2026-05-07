import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportManager from './ExportManager';

describe('ExportManager', () => {
  const mockToken = 'test-token-123';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName === 'a') {
        element.click = jest.fn();
      }
      return element;
    });
  });

  afterEach(() => {
    document.createElement.mockRestore();
  });

  const renderComponent = (props = {}) =>
    render(
      <ExportManager
        token={mockToken}
        apiUrl={mockApiUrl}
        onError={mockOnError}
        onSuccess={mockOnSuccess}
        {...props}
      />
    );

  test('renders the current export UI', () => {
    renderComponent();

    expect(screen.getByText(/export diary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/include analytics/i)).toBeChecked();
    expect(screen.getByRole('button', { name: /export as csv/i })).toBeInTheDocument();
  });

  test('shows the time period selector only for csv exports', () => {
    renderComponent();

    expect(screen.getByRole('combobox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('updates the selected export format in the UI', () => {
    renderComponent();

    const jsonButton = screen.getByRole('button', { name: /json/i });
    fireEvent.click(jsonButton);

    expect(jsonButton.className).toMatch(/active/);
    expect(
      screen.getByRole('button', { name: /export as json/i })
    ).toBeInTheDocument();
  });

  test('updates csv export options before submitting', () => {
    renderComponent();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '30' } });
    fireEvent.click(screen.getByLabelText(/include analytics/i));

    expect(select).toHaveValue('30');
    expect(screen.getByLabelText(/include analytics/i)).not.toBeChecked();
  });

  test('submits a csv export with the current token and query parameters', async () => {
    const blob = new Blob(['csv-data'], { type: 'text/csv' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => blob,
    });

    renderComponent();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /export as csv/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/diary/phase7/export/csv?daysBack=30&includeAnalytics=true`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockOnSuccess).toHaveBeenCalledWith('Export completed successfully');
    expect(screen.getByText(/export completed/i)).toBeInTheDocument();
  });

  test('submits a json export and downloads the returned payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          entries: [],
        },
      }),
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    fireEvent.click(screen.getByRole('button', { name: /export as json/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/diary/phase7/export/json?includeAnalytics=true`,
        expect.any(Object)
      );
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test('renders an error banner and notifies callers when export fails', async () => {
    const failure = new Error('Export failed');
    global.fetch.mockRejectedValueOnce(failure);

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /export as csv/i }));

    expect(await screen.findByText(/export failed/i)).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalledWith(failure);
  });

  test('shows a loading state while an export is in progress', async () => {
    global.fetch.mockImplementationOnce(
      () => new Promise(() => {})
    );

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /export as csv/i }));

    expect(screen.getByRole('button', { name: /exporting/i })).toBeDisabled();
  });
});
