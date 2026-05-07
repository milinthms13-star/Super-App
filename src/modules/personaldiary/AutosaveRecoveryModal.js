import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/AutosaveRecoveryModal.css';

/**
 * AutosaveRecoveryModal - Recover unsaved diary entries
 * Shows on app load if draft entries exist
 * Allows user to restore, discard, or continue editing
 */
const AutosaveRecoveryModal = ({
  isOpen,
  drafts = [],
  onRecover,
  onDiscard,
  onClose,
  loading = false
}) => {
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [expandedDraft, setExpandedDraft] = useState(null);

  // Auto-select all drafts by default
  useEffect(() => {
    if (isOpen && drafts.length > 0) {
      setSelectedDrafts(drafts.map((d) => d._id));
    }
  }, [isOpen, drafts]);

  const handleToggleDraft = (draftId) => {
    setSelectedDrafts((prev) =>
      prev.includes(draftId)
        ? prev.filter((id) => id !== draftId)
        : [...prev, draftId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDrafts.length === drafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(drafts.map((d) => d._id));
    }
  };

  const handleRecover = async () => {
    if (selectedDrafts.length === 0) {
      return;
    }
    const selectedEntries = drafts.filter((d) => selectedDrafts.includes(d._id));
    if (onRecover) {
      await onRecover(selectedEntries);
    }
  };

  const handleDiscardAll = async () => {
    if (window.confirm('Are you sure? Discarded entries cannot be recovered.')) {
      if (onDiscard) {
        await onDiscard(drafts.map((d) => d._id));
      }
    }
  };

  const handleDiscardSelected = async () => {
    if (selectedDrafts.length === 0) {
      return;
    }
    if (
      window.confirm(
        `Discard ${selectedDrafts.length} entry(ies)? This cannot be undone.`
      )
    ) {
      if (onDiscard) {
        await onDiscard(selectedDrafts);
      }
    }
  };

  if (!isOpen || drafts.length === 0) {
    return null;
  }

  const totalWords = drafts.reduce((sum, d) => {
    const content = (d.content || '').replace(/<[^>]*>/g, '');
    return sum + content.split(/\s+/).filter((w) => w.length > 0).length;
  }, 0);

  return (
    <div className="autosave-modal-overlay">
      <div className="autosave-modal-content">
        {/* Header */}
        <div className="autosave-modal-header">
          <div className="autosave-header-title">
            <span className="autosave-icon">💾</span>
            <div>
              <h2>Recover Unsaved Entries?</h2>
              <p>Found {drafts.length} draft(s) from your last session</p>
            </div>
          </div>
          <button
            className="autosave-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Summary Stats */}
        <div className="autosave-stats">
          <div className="stat">
            <div className="stat-value">{drafts.length}</div>
            <div className="stat-label">Entries</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalWords}</div>
            <div className="stat-label">Words</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {Math.round(totalWords / Math.max(drafts.length, 1))}
            </div>
            <div className="stat-label">Avg Length</div>
          </div>
        </div>

        {/* Drafts List */}
        <div className="autosave-drafts-list">
          <div className="drafts-header">
            <label className="select-all-checkbox">
              <input
                type="checkbox"
                checked={selectedDrafts.length === drafts.length}
                onChange={handleSelectAll}
                disabled={loading}
              />
              <span>
                {selectedDrafts.length === 0
                  ? 'None Selected'
                  : selectedDrafts.length === drafts.length
                  ? 'All Selected'
                  : `${selectedDrafts.length} Selected`}
              </span>
            </label>
          </div>

          {drafts.map((draft) => {
            const isExpanded = expandedDraft === draft._id;
            const content = (draft.content || '').replace(/<[^>]*>/g, '');
            const wordCount = content
              .split(/\s+/)
              .filter((w) => w.length > 0).length;
            const preview = content.substring(0, 100);

            return (
              <div
                key={draft._id}
                className={`autosave-draft-item ${
                  isExpanded ? 'expanded' : ''
                } ${selectedDrafts.includes(draft._id) ? 'selected' : ''}`}
              >
                <div className="draft-item-header">
                  <label className="draft-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedDrafts.includes(draft._id)}
                      onChange={() => handleToggleDraft(draft._id)}
                      disabled={loading}
                    />
                  </label>

                  <div className="draft-info">
                    <h3>{draft.title || 'Untitled Entry'}</h3>
                    <p className="draft-metadata">
                      <span>
                        📝{wordCount} words
                      </span>
                      {draft.mood && <span>• 😊 {draft.mood}</span>}
                      <span>
                        • {new Date(draft.createdAt).toLocaleString()}
                      </span>
                    </p>
                  </div>

                  <button
                    className="expand-btn"
                    onClick={() =>
                      setExpandedDraft(isExpanded ? null : draft._id)
                    }
                    disabled={loading}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="draft-preview">
                    <div className="preview-text">{preview}...</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="autosave-modal-actions">
          <div className="action-group">
            <button
              className="btn btn-recover"
              onClick={handleRecover}
              disabled={loading || selectedDrafts.length === 0}
              title={
                selectedDrafts.length === 0 ? 'Select entries to recover' : ''
              }
            >
              {loading ? 'Recovering...' : `✓ Recover (${selectedDrafts.length})`}
            </button>

            <button
              className="btn btn-discard"
              onClick={handleDiscardSelected}
              disabled={loading || selectedDrafts.length === 0}
            >
              🗑️ Discard Selected
            </button>

            <button
              className="btn btn-discard-all"
              onClick={handleDiscardAll}
              disabled={loading}
            >
              ⊗ Discard All
            </button>
          </div>

          <button
            className="btn btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Maybe Later
          </button>
        </div>

        {/* Info */}
        <div className="autosave-info">
          <p>
            💡 Tip: Recovered entries will appear in your editor. You can save
            them or discard after reviewing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutosaveRecoveryModal;
