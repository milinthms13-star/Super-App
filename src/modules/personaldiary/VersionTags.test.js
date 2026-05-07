/**
 * VersionTags Component - Unit Tests
 * Tests for tag display, creation, management, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VersionTags from './VersionTags';

// Mock fetch
global.fetch = jest.fn();

describe('VersionTags Component', () => {
  const mockEntryId = '507f1f77bcf86cd799439011';
  const mockVersionId = '507f1f77bcf86cd799439012';
  const mockVersionNumber = 5;
  const mockToken = 'test-jwt-token';

  const mockPredefinedTags = [
    { name: 'final', color: '#10b981', description: 'Final version ready for archival' },
    { name: 'review-ready', color: '#f59e0b', description: 'Ready for review/sharing' },
    { name: 'important', color: '#ef4444', description: 'Important milestone' },
    { name: 'draft', color: '#a78bfa', description: 'Work-in-progress' }
  ];

  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('token', mockToken);
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render tags component with header', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/tags|tag/i)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      fetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves

      render(
        <VersionTags
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
        <VersionTags
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

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      const mockOnClose = jest.fn();

      render(
        <VersionTags
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

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
          readOnly={true}
        />
      );

      await waitFor(() => {
        const addButton = screen.queryByRole('button', { name: /add tag|new tag/i });
        expect(addButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Tag Display', () => {
    it('should display list of tags', async () => {
      const mockTags = [
        { _id: '1', name: 'final', color: '#10b981' },
        { _id: '2', name: 'important', color: '#ef4444' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('final')).toBeInTheDocument();
        expect(screen.getByText('important')).toBeInTheDocument();
      });
    });

    it('should display colored tag badges', async () => {
      const mockTags = [
        { _id: '1', name: 'final', color: '#10b981' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('final');
        expect(badge).toHaveStyle({ borderColor: '#10b981' });
      });
    });

    it('should show empty state when no tags', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no tags|empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Adding Tags', () => {
    it('should open add tag form on button click', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag|new tag|\+/i });
      await userEvent.click(addButton);

      const dropdown = await screen.findByRole('combobox', { name: /tag|select/i });
      expect(dropdown).toBeInTheDocument();
    });

    it('should show predefined tags in dropdown', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag|new tag/i });
      await userEvent.click(addButton);

      const options = await screen.findAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    it('should add selected tag to version', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: '1', name: 'final', color: '#10b981' })
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      await userEvent.click(addButton);

      const dropdown = await screen.findByRole('combobox');
      await userEvent.selectOptions(dropdown, 'final');

      const confirmButton = screen.getByRole('button', { name: /confirm|save|add/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/versions/' + mockVersionId + '/tags'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('final')
          })
        );
      });
    });

    it('should allow optional reason for tagging', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      await userEvent.click(addButton);

      const reasonTextarea = await screen.findByPlaceholderText(/reason|why|note/i);
      await userEvent.type(reasonTextarea, 'This is the final approved version');

      expect(reasonTextarea.value).toBe('This is the final approved version');
    });

    it('should cancel add tag form', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      await userEvent.click(addButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      const dropdown = screen.queryByRole('combobox');
      expect(dropdown).not.toBeInTheDocument();
    });
  });

  describe('Tag Management', () => {
    it('should remove tag from version', async () => {
      const mockTags = [
        { _id: '1', name: 'final', color: '#10b981' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Deleted' })
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('final')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove|delete|×/i });
      await userEvent.click(removeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/tags/1'),
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });

    it('should display tag description on hover', async () => {
      const mockTags = [
        { _id: '1', name: 'final', color: '#10b981' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const tagBadge = await screen.findByText('final');
      await userEvent.hover(tagBadge);

      await waitFor(() => {
        expect(screen.getByText(/final version ready/i)).toBeInTheDocument();
      });
    });

    it('should prevent duplicate tags', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Tag already exists' })
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      await userEvent.click(addButton);

      const confirmButton = screen.getByRole('button', { name: /confirm|add/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists|duplicate/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tag Info Panel', () => {
    it('should show tag info panel', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const infoButton = await screen.findByRole('button', { name: /info|help|about/i });
      await userEvent.click(infoButton);

      expect(screen.getByText(/tag|explain|description/i)).toBeInTheDocument();
    });

    it('should display descriptions of all predefined tags', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const infoButton = await screen.findByRole('button', { name: /info|help/i });
      await userEvent.click(infoButton);

      mockPredefinedTags.forEach(tag => {
        expect(screen.getByText(tag.name)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle tag addition error', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' })
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      await userEvent.click(addButton);

      const confirmButton = screen.getByRole('button', { name: /confirm|add/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed|server/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <VersionTags
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

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      expect(addButton).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const addButton = await screen.findByRole('button', { name: /add tag/i });
      addButton.focus();
      expect(addButton).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should render tags responsively on mobile', async () => {
      global.innerWidth = 480;

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      const { container } = render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const tagsContainer = container.querySelector('.version-tags-container');
      expect(tagsContainer).toHaveClass('responsive-mobile');
    });

    it('should render tags responsively on tablet', async () => {
      global.innerWidth = 768;

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredefinedTags
      });

      const { container } = render(
        <VersionTags
          entryId={mockEntryId}
          versionId={mockVersionId}
          versionNumber={mockVersionNumber}
        />
      );

      const tagsContainer = container.querySelector('.version-tags-container');
      expect(tagsContainer).toHaveClass('responsive-tablet');
    });
  });
});
