import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VersionComments from './VersionComments';

global.fetch = jest.fn();

describe('VersionComments', () => {
  const mockEntryId = '507f1f77bcf86cd799439011';
  const mockVersionId = '507f1f77bcf86cd799439012';
  const mockVersionNumber = 5;

  const commentsResponse = {
    comments: [
      {
        _id: 'comment-1',
        text: 'Great version',
        sentiment: 'positive',
        likes: 2,
        likedBy: [],
        userId: { name: 'Alice' },
        createdAt: '2026-05-01T09:00:00.000Z',
        replies: [],
      },
    ],
    stats: {
      totalComments: 1,
      bySentiment: [{ _id: 'positive', count: 1 }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
  });

  const renderComponent = (props = {}) =>
    render(
      <VersionComments
        entryId={mockEntryId}
        versionId={mockVersionId}
        versionNumber={mockVersionNumber}
        {...props}
      />
    );

  test('renders the header and empty state after loading', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: [], stats: { totalComments: 0, bySentiment: [] } }),
    });

    renderComponent();

    expect(await screen.findByText(/comments on v5/i)).toBeInTheDocument();
    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument();
  });

  test('hides the comment composer in read-only mode', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => commentsResponse,
    });

    renderComponent({ readOnly: true });

    await screen.findByText('Great version');
    expect(screen.queryByPlaceholderText(/add a comment about this version/i)).not.toBeInTheDocument();
  });

  test('adds a new comment', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [], stats: { totalComments: 0, bySentiment: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comment: {
            _id: 'comment-2',
            text: 'New feedback',
            sentiment: 'neutral',
            likes: 0,
            likedBy: [],
            userId: { name: 'Alice' },
            createdAt: '2026-05-02T09:00:00.000Z',
          },
        }),
      });

    renderComponent();

    fireEvent.change(await screen.findByPlaceholderText(/add a comment about this version/i), {
      target: { value: 'New feedback' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `/api/diary/${mockEntryId}/versions/${mockVersionId}/comments`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"text":"New feedback"'),
        })
      );
    });

    expect(await screen.findByText('New feedback')).toBeInTheDocument();
  });

  test('likes an existing comment', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => commentsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comment: {
            ...commentsResponse.comments[0],
            likes: 3,
          },
        }),
      });

    renderComponent();

    const likeButton = await screen.findByRole('button', { name: /2/i });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `/api/diary/${mockEntryId}/comments/comment-1/like`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    expect(await screen.findByRole('button', { name: /3/i })).toBeInTheDocument();
  });

  test('deletes a comment after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => commentsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `/api/diary/${mockEntryId}/comments/comment-1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Great version')).not.toBeInTheDocument();
    });
    window.confirm.mockRestore();
  });

  test('renders an error banner when the initial fetch fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
    });

    renderComponent();

    expect(await screen.findByText(/failed to fetch comments/i)).toBeInTheDocument();
  });
});
