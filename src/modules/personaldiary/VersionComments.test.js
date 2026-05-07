/**
 * VersionComments Component - Unit Tests
 * Tests for comment display, creation, threading, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VersionComments from './VersionComments';

// Mock fetch
global.fetch = jest.fn();

describe('VersionComments Component', () => {
  const mockEntryId = '507f1f77bcf86cd799439011';
  const mockVersionId = '507f1f77bcf86cd799439012';
  const mockVersionNumber = 5;
  const mockToken = 'test-jwt-token';

  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('token', mockToken);
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render comments component with header', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/comments/i)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      fetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      expect(screen.getByText(/loading|fetching/i)).toBeInTheDocument();
    });

    it('should display error message on fetch failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('should show close button when onClose provided', () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const mockOnClose = jest.fn();

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render in read-only mode', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
          readOnly={true}
        />
      );

      await waitFor(() => {
        const textarea = screen.queryByRole('textbox');
        expect(textarea).not.toBeInTheDocument();
      });
    });
  });

  describe('Comment Display', () => {
    it('should display list of comments', async () => {
      const mockComments = [
        {
          _id: '1',
          text: 'First comment',
          sentiment: 'positive',
          likes: 2,
          userName: 'User1',
          createdAt: '2026-05-01'
        },
        {
          _id: '2',
          text: 'Second comment',
          sentiment: 'neutral',
          likes: 0,
          userName: 'User2',
          createdAt: '2026-05-02'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
        expect(screen.getByText('Second comment')).toBeInTheDocument();
      });
    });

    it('should display sentiment emoji', async () => {
      const mockComments = [
        {
          _id: '1',
          text: 'Great!',
          sentiment: 'positive',
          likes: 1,
          userName: 'User1',
          createdAt: '2026-05-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/😊|👍|positive/i)).toBeInTheDocument();
      });
    });

    it('should display like count', async () => {
      const mockComments = [
        {
          _id: '1',
          text: 'Comment',
          likes: 5,
          userName: 'User1',
          createdAt: '2026-05-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/5/)).toBeInTheDocument();
      });
    });

    it('should show empty state when no comments', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no comments|empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Adding Comments', () => {
    it('should add a comment successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const textarea = await screen.findByPlaceholderText(/add a comment/i);
      await userEvent.type(textarea, 'New comment');

      const submitButton = screen.getByRole('button', { name: /post|submit|add/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/versions/' + mockVersionId + '/comments'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New comment')
          })
        );
      });
    });

    it('should select sentiment before posting', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const sentimentButtons = await screen.findAllByRole('button', {
        name: /positive|neutral|negative|😊|😐|😔/i
      });
      await userEvent.click(sentimentButtons[0]); // select positive

      expect(sentimentButtons[0]).toHaveAttribute('data-selected', 'true');
    });

    it('should clear textarea after posting', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: '1', text: 'New comment' })
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const textarea = await screen.findByPlaceholderText(/add a comment/i);
      await userEvent.type(textarea, 'New comment');

      const submitButton = screen.getByRole('button', { name: /post|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should disable submit button when textarea is empty', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const submitButton = await screen.findByRole('button', { name: /post|submit/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Comment Interactions', () => {
    it('should like a comment', async () => {
      const mockComments = [
        {
          _id: '1',
          text: 'Comment',
          likes: 0,
          userName: 'User1',
          createdAt: '2026-05-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ likes: 1 })
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const likeButton = await screen.findByRole('button', { name: /like|👍/i });
      await userEvent.click(likeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/like'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('should delete own comment', async () => {
      const mockComments = [
        {
          _id: '1',
          text: 'My comment',
          isOwnComment: true,
          userName: 'CurrentUser',
          likes: 0,
          createdAt: '2026-05-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Deleted' })
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const deleteButton = await screen.findByRole('button', { name: /delete|×/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/comments/1'),
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });

    it('should reply to a comment', async () => {
      const mockComments = [
        {
          _id: '1',
          text: 'Main comment',
          userName: 'User1',
          likes: 0,
          createdAt: '2026-05-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const replyButton = await screen.findByRole('button', { name: /reply/i });
      await userEvent.click(replyButton);

      const replyTextarea = await screen.findByPlaceholderText(/reply/i);
      expect(replyTextarea).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort comments by recent', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const sortButton = await screen.findByRole('button', { name: /sort|recent/i });
      await userEvent.click(sortButton);

      expect(sortButton).toHaveAttribute('data-sort', 'recent');
    });

    it('should sort by oldest', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const sortButton = await screen.findByRole('button', { name: /oldest/i });
      await userEvent.click(sortButton);

      expect(sortButton).toHaveAttribute('data-sort', 'oldest');
    });

    it('should sort by most liked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const sortButton = await screen.findByRole('button', { name: /liked|popular/i });
      await userEvent.click(sortButton);

      expect(sortButton).toHaveAttribute('data-sort', 'liked');
    });
  });

  describe('Statistics Display', () => {
    it('should display total comments', async () => {
      const mockComments = [
        { _id: '1', text: 'Comment 1', likes: 0, userName: 'U1', createdAt: '2026-05-01' },
        { _id: '2', text: 'Comment 2', likes: 0, userName: 'U2', createdAt: '2026-05-01' },
        { _id: '3', text: 'Comment 3', likes: 0, userName: 'U3', createdAt: '2026-05-01' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/total.*3|3.*comments/i)).toBeInTheDocument();
      });
    });

    it('should show sentiment breakdown', async () => {
      const mockComments = [
        { _id: '1', text: 'Great!', sentiment: 'positive', likes: 0, userName: 'U1', createdAt: '2026-05-01' },
        { _id: '2', text: 'OK', sentiment: 'neutral', likes: 0, userName: 'U2', createdAt: '2026-05-01' },
        { _id: '3', text: 'Meh', sentiment: 'negative', likes: 0, userName: 'U3', createdAt: '2026-05-01' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/positive.*1|1.*positive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle comment submission error', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Comment too short' })
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const textarea = await screen.findByPlaceholderText(/add a comment/i);
      await userEvent.type(textarea, 'a');

      const submitButton = screen.getByRole('button', { name: /post|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed|too short/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/error|network/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const textarea = await screen.findByPlaceholderText(/add a comment/i);
      expect(textarea).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <VersionComments
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const textarea = await screen.findByPlaceholderText(/add a comment/i);
      textarea.focus();
      expect(textarea).toHaveFocus();
    });
  });
});
