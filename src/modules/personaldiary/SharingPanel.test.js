/**
 * SharingPanel Component Tests
 * React Testing Library tests for SharingPanel
 * 20+ test cases covering sharing, comments, statistics
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SharingPanel from './SharingPanel';

describe('SharingPanel Component', () => {
  const mockToken = 'Bearer test_token_12345';
  const mockApiUrl = 'http://localhost:5000';
  const mockOnError = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockShares = [
    {
      _id: 'share1',
      entryId: 'entry1',
      title: 'My Summer Thoughts',
      sharedWith: ['user2@example.com'],
      permission: 'view',
      shareLink: 'http://localhost:5000/share/share1',
      isPublic: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: 'share2',
      entryId: 'entry2',
      title: 'Travel Diary',
      sharedWith: ['user3@example.com', 'user4@example.com'],
      permission: 'comment',
      shareLink: 'http://localhost:5000/share/share2',
      isPublic: false,
      expiresAt: null,
    },
  ];

  const mockComments = [
    {
      _id: 'comment1',
      entryId: 'entry1',
      authorName: 'John Doe',
      text: 'Great entry!',
      likes: 3,
      createdAt: new Date().toISOString(),
      mentions: [],
    },
    {
      _id: 'comment2',
      entryId: 'entry1',
      authorName: 'Jane Smith',
      text: 'I love this!',
      likes: 1,
      createdAt: new Date().toISOString(),
      mentions: [],
    },
  ];

  const mockStats = {
    totalShares: 2,
    sharedRecipients: 3,
    commentCount: 2,
    permissionDistribution: {
      view: 1,
      comment: 1,
      edit: 0,
    },
    mostSharedEntries: [
      { entryId: 'entry1', shareCount: 5 },
    ],
    topRecipients: [
      { name: 'user2@example.com', shareCount: 3 },
    ],
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
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel 
          token={mockToken} 
          apiUrl={mockApiUrl}
          onError={mockOnError}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Sharing & Collaboration/i)).toBeInTheDocument();
      });
    });

    test('should render tab navigation', async () => {
      global.fetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Shares/i)).toBeInTheDocument();
        expect(screen.getByText(/Comments/i)).toBeInTheDocument();
        expect(screen.getByText(/Statistics/i)).toBeInTheDocument();
      });
    });

    test('should render loading state initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {}));

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Shares Tab', () => {
    test('should display shared entries in shares tab', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText('My Summer Thoughts')).toBeInTheDocument();
      });
    });

    test('should display shared recipient email', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/user2@example.com/i)).toBeInTheDocument();
      });
    });

    test('should display permission level badge', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/View/i)).toBeInTheDocument();
        expect(screen.getByText(/Comment/i)).toBeInTheDocument();
      });
    });

    test('should display copy share link button', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Copy Link/i)).toBeInTheDocument();
      });
    });

    test('should display revoke share button', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Revoke/i)).toBeInTheDocument();
      });
    });

    test('should display expiration date if set', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Expires/i)).toBeInTheDocument();
      });
    });

    test('should copy link to clipboard when button clicked', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(true),
        },
      });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const copyButtons = screen.getAllByText(/Copy Link/i);
        fireEvent.click(copyButtons[0]);
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    test('should revoke share when button clicked', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { message: 'Share revoked' } }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const revokeButtons = screen.getAllByText(/Revoke/i);
        fireEvent.click(revokeButtons[0]);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/share/'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('Comments Tab', () => {
    test('should display comments in comments tab', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Great entry!')).toBeInTheDocument();
      });
    });

    test('should display commenter name', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
    });

    test('should display comment text', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Great entry!')).toBeInTheDocument();
        expect(screen.getByText('I love this!')).toBeInTheDocument();
      });
    });

    test('should display like count', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/3|likes?/i)).toBeInTheDocument();
      });
    });

    test('should render add comment form', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Add a comment/i)).toBeInTheDocument();
      });
    });

    test('should add comment when form submitted', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { message: 'Comment added' } }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Add a comment/i);
        fireEvent.change(input, { target: { value: 'New comment' } });
        const button = screen.getByRole('button', { name: /Post|Add/i });
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/comments'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Statistics Tab', () => {
    test('should display stat cards', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const statsTab = screen.getByText(/Statistics/i);
        fireEvent.click(statsTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/Total Shares/i)).toBeInTheDocument();
        expect(screen.getByText(/Comments/i)).toBeInTheDocument();
      });
    });

    test('should display stat values', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const statsTab = screen.getByText(/Statistics/i);
        fireEvent.click(statsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // totalShares
        expect(screen.getByText('3')).toBeInTheDocument(); // sharedRecipients
      });
    });

    test('should display permission distribution', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const statsTab = screen.getByText(/Statistics/i);
        fireEvent.click(statsTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/View/i)).toBeInTheDocument();
        expect(screen.getByText(/Comment/i)).toBeInTheDocument();
      });
    });

    test('should display top recipients', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockShares }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStats }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const statsTab = screen.getByText(/Statistics/i);
        fireEvent.click(statsTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/user2@example.com/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    test('should switch tabs when clicked', async () => {
      global.fetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const commentsTab = screen.getByText(/Comments/i);
        fireEvent.click(commentsTab);
      });

      expect(screen.getByText(/Comments/i)).toHaveClass(expect.stringMatching(/active|selected/i));
    });

    test('should maintain active tab state', async () => {
      global.fetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        const statsTab = screen.getByText(/Statistics/i);
        fireEvent.click(statsTab);
      });

      const statsTab = screen.getByText(/Statistics/i);
      expect(statsTab).toHaveClass(expect.stringMatching(/active|selected/i));
    });
  });

  describe('API Integration', () => {
    test('should fetch shares with bearer token', async () => {
      global.fetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
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

    test('should construct correct sharing-stats URL', async () => {
      global.fetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sharing-stats'),
          expect.any(Object)
        );
      });
    });

    test('should handle API errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    test('should call onSuccess callback', async () => {
      global.fetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} onSuccess={mockOnSuccess} />
      );

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message on API failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle empty shares list', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      render(
        <SharingPanel token={mockToken} apiUrl={mockApiUrl} />
      );

      await waitFor(() => {
        expect(screen.getByText(/No shares yet/i)).toBeInTheDocument();
      });
    });
  });
});
