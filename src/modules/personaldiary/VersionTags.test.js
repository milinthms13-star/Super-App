import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VersionTags from './VersionTags';

global.fetch = jest.fn();

describe('VersionTags', () => {
  const mockEntryId = '507f1f77bcf86cd799439011';
  const mockVersionId = '507f1f77bcf86cd799439012';
  const mockVersionNumber = 5;

  const predefinedTags = {
    final: { color: '#10b981', description: 'Final version ready for archival' },
    important: { color: '#ef4444', description: 'Important milestone' },
    draft: { color: '#a78bfa', description: 'Work in progress' },
  };

  const versionTags = [
    { _id: 'tag-1', name: 'final', color: '#10b981' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
  });

  const queueInitialFetches = (tags = []) => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: predefinedTags }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags }),
      });
  };

  const renderComponent = (props = {}) =>
    render(
      <VersionTags
        entryId={mockEntryId}
        versionId={mockVersionId}
        versionNumber={mockVersionNumber}
        {...props}
      />
    );

  test('renders the header and empty state after loading', async () => {
    queueInitialFetches([]);

    renderComponent();

    expect(await screen.findByText(/tags for v5/i)).toBeInTheDocument();
    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument();
    expect(screen.getByText(/about tags/i)).toBeInTheDocument();
  });

  test('shows the close button when onClose is provided', async () => {
    queueInitialFetches([]);
    const onClose = jest.fn();

    const { container } = renderComponent({ onClose });
    await screen.findByText(/tags for v5/i);

    const closeButton = container.querySelector('.close-btn');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  test('hides tag editing controls in read only mode', async () => {
    queueInitialFetches(versionTags);

    renderComponent({ readOnly: true });

    await screen.findByText('final');
    expect(screen.queryByRole('button', { name: /\+ add tag/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle(/remove tag/i)).not.toBeInTheDocument();
  });

  test('renders existing version tags', async () => {
    queueInitialFetches(versionTags);

    renderComponent();

    const tag = await screen.findByText('final');
    expect(tag).toBeInTheDocument();
    expect(tag.closest('.tag-badge')).toHaveStyle({ borderColor: '#10b981' });
  });

  test('opens the add-tag form and lists predefined tags', async () => {
    queueInitialFetches([]);

    const { container } = renderComponent();

    const addTagButton = await screen.findByRole('button', { name: /\+ add tag/i });
    await waitFor(() => expect(addTagButton).not.toBeDisabled());
    fireEvent.click(addTagButton);

    const select = container.querySelector('.tag-form-content select');
    expect(select).toBeInTheDocument();
    expect(screen.getAllByText(/final version ready for archival/i).length).toBeGreaterThan(0);
  });

  test('adds a selected tag and renders it in the list', async () => {
    queueInitialFetches([]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag: { _id: 'tag-2', name: 'important', color: '#ef4444' },
      }),
    });

    const { container } = renderComponent();
    const addTagButton = await screen.findByRole('button', { name: /\+ add tag/i });
    await waitFor(() => expect(addTagButton).not.toBeDisabled());
    fireEvent.click(addTagButton);
    const select = container.querySelector('.tag-form-content select');
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'important' } });
    fireEvent.click(screen.getByRole('button', { name: /add tag/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `/api/diary/${mockEntryId}/versions/${mockVersionId}/tags`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"important"'),
        })
      );
    });

    expect(await screen.findByText('important')).toBeInTheDocument();
  });

  test('removes a tag after confirmation', async () => {
    queueInitialFetches(versionTags);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    global.fetch.mockResolvedValueOnce({ ok: true });

    renderComponent();

    fireEvent.click(await screen.findByTitle(/remove tag/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `/api/diary/${mockEntryId}/tags/tag-1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('final')).not.toBeInTheDocument();
    });
    window.confirm.mockRestore();
  });

  test('renders an error banner when adding a tag fails', async () => {
    queueInitialFetches([]);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Tag already exists' }),
    });

    const { container } = renderComponent();
    const addTagButton = await screen.findByRole('button', { name: /\+ add tag/i });
    await waitFor(() => expect(addTagButton).not.toBeDisabled());
    fireEvent.click(addTagButton);
    const confirmButton = container.querySelector('.btn-confirm');
    fireEvent.click(confirmButton);

    expect(await screen.findByText(/tag already exists/i)).toBeInTheDocument();
  });
});
