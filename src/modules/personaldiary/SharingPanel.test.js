import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SharingPanel from './SharingPanel';

describe('SharingPanel', () => {
  const mockToken = 'test-token-123';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  const sharingStats = {
    totalShares: 2,
    sharedRecipients: 3,
    commentCount: 4,
    permissionDistribution: {
      view: 1,
      comment: 1,
      edit: 0,
    },
    shares: [
      {
        shareId: 'share-1',
        entryId: 'entry-1',
        entryTitle: 'My Summer Thoughts',
        sharedWith: ['user2@example.com'],
        permission: 'view',
        shareLink: 'http://localhost/share/share-1',
        createdAt: '2026-05-01T00:00:00.000Z',
        expiresAt: '2026-05-10T00:00:00.000Z',
        allowDownload: true,
        allowScreenshot: false,
        allowCopy: true,
      },
    ],
  };

  const collaborationInsights = {
    recentActivity: [
      {
        id: 'comment-1',
        commenterName: 'John Doe',
        comment: 'Great entry!',
        likes: 3,
        replies: 1,
        createdAt: '2026-05-02T00:00:00.000Z',
      },
    ],
    topCommenters: [
      {
        name: 'John Doe',
        commentCount: 5,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  const queueInitialFetches = () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: sharingStats }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: collaborationInsights }),
      });
  };

  const renderComponent = (props = {}) =>
    render(
      <SharingPanel
        token={mockToken}
        apiUrl={mockApiUrl}
        onError={mockOnError}
        onSuccess={mockOnSuccess}
        {...props}
      />
    );

  test('renders the sharing dashboard and the loaded shares', async () => {
    queueInitialFetches();

    renderComponent();

    expect(await screen.findByText(/sharing & collaboration/i)).toBeInTheDocument();
    expect(screen.getByText('My Summer Thoughts')).toBeInTheDocument();
    expect(screen.getByText(/user2@example.com/i)).toBeInTheDocument();
  });

  test('copies a share link to the clipboard', async () => {
    queueInitialFetches();

    renderComponent();
    fireEvent.click(await screen.findByRole('button', { name: /copy link/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost/share/share-1');
    expect(mockOnSuccess).toHaveBeenCalledWith('Link copied to clipboard');
  });

  test('revokes a share through the phase 7 revoke endpoint', async () => {
    queueInitialFetches();
    global.fetch.mockResolvedValueOnce({
      ok: true,
    });

    renderComponent();
    fireEvent.click(await screen.findByRole('button', { name: /revoke access/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${mockApiUrl}/api/diary/phase7/share/share-1/revoke`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalledWith('Share revoked successfully');
  });

  test('renders recent collaboration comments in the comments tab', async () => {
    queueInitialFetches();

    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /comments/i }));

    expect(await screen.findByText('Great entry!')).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });

  test('renders aggregate sharing statistics', async () => {
    queueInitialFetches();

    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /statistics/i }));

    expect(await screen.findByText(/total shares/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/view: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });

  test('shows an error banner and calls onError when the fetch fails', async () => {
    const failure = new Error('Failed to load sharing data');
    global.fetch.mockRejectedValueOnce(failure);

    renderComponent();

    expect(await screen.findByText(/failed to load sharing data/i)).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalledWith(failure);
  });
});
