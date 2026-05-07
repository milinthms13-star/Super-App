import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/VersionHistoryTimeline.css';
import DiffViewer from './DiffViewer';
import VersionComments from './VersionComments';
import VersionTags from './VersionTags';

/**
 * VersionHistoryTimeline - Display version history of diary entries
 * Shows timeline of all edits with word count changes and version comparison
 */
const VersionHistoryTimeline = ({
  entryId,
  versions = [],
  onRestore,
  loading = false
}) => {
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState([null, null]); // For diff comparison
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [diffVersionIds, setDiffVersionIds] = useState([null, null]);
  const [showComments, setShowComments] = useState(null); // versionId or null
  const [showTags, setShowTags] = useState(null); // versionId or null

  const handleVersionClick = (index) => {
    setExpandedVersion(expandedVersion === index ? null : index);
  };

  const handleCompareSelect = (index) => {
    // Select 2 versions to compare
    const newSelection = [...selectedVersions];
    if (selectedVersions.includes(index)) {
      const idx = newSelection.indexOf(index);
      newSelection[idx] = null;
    } else {
      if (newSelection[0] === null) {
        newSelection[0] = index;
      } else if (newSelection[1] === null) {
        newSelection[1] = index;
      } else {
        newSelection[0] = newSelection[1];
        newSelection[1] = index;
      }
    }
    setSelectedVersions(newSelection);
  };

  const handleRestoreVersion = async (version) => {
    if (
      window.confirm(
        `Restore this entry to version ${version.versionNumber}? This will create a new version.`
      )
    ) {
      if (onRestore) {
        await onRestore(version);
      }
    }
  };

  const handleCompare = () => {
    // Get version IDs from selected indices
    if (selectedVersions[0] !== null && selectedVersions[1] !== null) {
      const idx1 = Math.max(selectedVersions[0], selectedVersions[1]); // Newer version first
      const idx2 = Math.min(selectedVersions[0], selectedVersions[1]); // Older version second
      const v1 = versionsWithStats[idx1]?._id;
      const v2 = versionsWithStats[idx2]?._id;
      if (v1 && v2) {
        setDiffVersionIds([v1, v2]);
        setShowDiffViewer(true);
      }
    }
  };

  const handleCloseDiff = () => {
    setShowDiffViewer(false);
    setDiffVersionIds([null, null]);
  };

  if (!versions || versions.length === 0) {
    return (
      <div className="version-timeline-empty">
        <p>📝 No version history available</p>
      </div>
    );
  }

  // Calculate word count for each version
  const versionsWithStats = versions.map((v, idx) => {
    const content = (v.content || '').replace(/<[^>]*>/g, '');
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

    // Word count change from previous version
    let wordDelta = 0;
    if (idx < versions.length - 1) {
      const prevContent = (versions[idx + 1].content || '').replace(
        /<[^>]*>/g,
        ''
      );
      const prevWordCount = prevContent
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      wordDelta = wordCount - prevWordCount;
    }

    return {
      ...v,
      wordCount,
      wordDelta
    };
  });

  return (
    <div className="version-timeline-container">
      {/* Header */}
      <div className="version-timeline-header">
        <h3>📜 Version History</h3>
        <p>
          {versions.length} version{versions.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Timeline */}
      <div className="version-timeline">
        {versionsWithStats.map((version, idx) => {
          const isFirst = idx === 0;
          const isLastVersion = idx === versionsWithStats.length - 1;
          const isSelected =
            selectedVersions[0] === idx || selectedVersions[1] === idx;
          const isExpanded = expandedVersion === idx;

          const createdDate = new Date(version.createdAt);
          const createdTime = createdDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
          const createdDateStr = createdDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric'
          });

          // Determine version type
          let versionType = 'edit';
          let versionLabel = `Edit`;
          if (isLastVersion) {
            versionLabel = 'Original';
            versionType = 'original';
          }
          if (version.type) {
            versionLabel = version.type
              .charAt(0)
              .toUpperCase() + version.type.slice(1);
            versionType = version.type;
          }

          return (
            <div
              key={version._id || idx}
              className={`version-item ${versionType} ${
                isSelected ? 'selected' : ''
              } ${isExpanded ? 'expanded' : ''}`}
            >
              {/* Timeline dot and connector */}
              <div className="timeline-dot-wrapper">
                <div className={`timeline-dot ${versionType}`}></div>
                {!isFirst && <div className="timeline-connector"></div>}
              </div>

              {/* Version card */}
              <div className="version-card">
                {/* Header */}
                <div
                  className="version-card-header"
                  onClick={() => handleVersionClick(idx)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div className="version-title-section">
                    <span className="version-number">v{version.versionNumber}</span>
                    <span className="version-label">{versionLabel}</span>
                    {version.description && (
                      <span className="version-description">
                        • {version.description}
                      </span>
                    )}
                  </div>

                  <div className="version-time-section">
                    <span className="version-time">{createdTime}</span>
                    <span className="version-date">{createdDateStr}</span>
                  </div>

                  <button
                    className="expand-arrow"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVersionClick(idx);
                    }}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>

                {/* Stats row */}
                <div className="version-stats-row">
                  <div className="stat-badge">
                    <span className="stat-icon">📝</span>
                    <span className="stat-text">{version.wordCount} words</span>
                  </div>

                  {version.wordDelta !== 0 && idx < versionsWithStats.length - 1 && (
                    <div
                      className={`stat-badge delta ${
                        version.wordDelta > 0 ? 'increased' : 'decreased'
                      }`}
                    >
                      <span className="delta-icon">
                        {version.wordDelta > 0 ? '⬆' : '⬇'}
                      </span>
                      <span className="delta-text">
                        {Math.abs(version.wordDelta)} word
                        {Math.abs(version.wordDelta) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {version.tags && version.tags.length > 0 && (
                    <div className="stat-badge tags-badge">
                      <span className="tags-icon">🏷️</span>
                      <span className="tags-text">
                        {version.tags.length} tag
                        {version.tags.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {version.mood && (
                    <div className="stat-badge mood-badge">
                      <span className="mood-icon">😊</span>
                      <span className="mood-text">{version.mood}</span>
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="version-expanded-content">
                    {/* Preview */}
                    <div className="version-preview">
                      <div
                        className="preview-text"
                        dangerouslySetInnerHTML={{
                          __html: version.content?.substring(0, 300) || ''
                        }}
                      />
                      {(version.content || '').length > 300 && (
                        <div className="preview-ellipsis">...</div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="version-actions">
                      <label className="compare-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCompareSelect(idx)}
                          disabled={
                            loading ||
                            (selectedVersions[0] !== null &&
                              selectedVersions[1] !== null &&
                              !isSelected)
                          }
                        />
                        <span>Select for comparison</span>
                      </label>

                      {selectedVersions[0] !== null && selectedVersions[1] !== null && (
                        <button
                          className="btn-compare"
                          onClick={handleCompare}
                          disabled={loading}
                        >
                          🔍 Compare Versions
                        </button>
                      )}

                      {/* Phase 4.7: Comments, Tags, Share buttons */}
                      <button
                        className="btn-action-icon"
                        onClick={() => setShowComments(showComments === version._id ? null : version._id)}
                        title="Comments"
                        disabled={loading}
                      >
                        💬
                      </button>

                      <button
                        className="btn-action-icon"
                        onClick={() => setShowTags(showTags === version._id ? null : version._id)}
                        title="Tags"
                        disabled={loading}
                      >
                        🏷️
                      </button>

                      {!isLastVersion && (
                        <button
                          className="btn-restore"
                          onClick={() => handleRestoreVersion(version)}
                          disabled={loading}
                        >
                          ↩️ Restore This Version
                        </button>
                      )}
                    </div>

                    {/* Phase 4.7: Comments Section */}
                    {showComments === version._id && (
                      <div className="version-details-section">
                        <VersionComments
                          entryId={entryId}
                          versionId={version._id}
                          versionNumber={version.versionNumber}
                          onClose={() => setShowComments(null)}
                        />
                      </div>
                    )}

                    {/* Phase 4.7: Tags Section */}
                    {showTags === version._id && (
                      <div className="version-details-section">
                        <VersionTags
                          entryId={entryId}
                          versionId={version._id}
                          versionNumber={version.versionNumber}
                          onClose={() => setShowTags(null)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Version info */}
      <div className="version-info">
        <p>
          💡 Original entry was created on{' '}
          {new Date(
            versionsWithStats[versionsWithStats.length - 1].createdAt
          ).toLocaleDateString()}
          . Total of {versions.length} saved version
          {versions.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Diff Viewer Modal */}
      {showDiffViewer && diffVersionIds[0] && diffVersionIds[1] && (
        <div className="version-diff-modal-overlay" onClick={handleCloseDiff}>
          <div
            className="version-diff-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={handleCloseDiff}>
              ✕
            </button>
            <DiffViewer
              entryId={entryId}
              versionId1={diffVersionIds[0]}
              versionId2={diffVersionIds[1]}
              onClose={handleCloseDiff}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryTimeline;
