import React, { useState, useEffect } from 'react';

/**
 * DiffViewer Component
 * Displays side-by-side or inline comparison of diary entry versions
 * Phase 4.6: Version comparison feature
 */
const DiffViewer = ({ entryId, versionId1, versionId2, onClose, loading = false }) => {
  const [diff, setDiff] = useState(null);
  const [displayMode, setDisplayMode] = useState('side-by-side'); // 'side-by-side' or 'inline'
  const [expandedLines, setExpandedLines] = useState(new Set());
  const [diffLoading, setDiffLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch diff data
  useEffect(() => {
    const fetchDiff = async () => {
      if (!entryId || !versionId1 || !versionId2) return;

      setDiffLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/diary/${entryId}/diff/content?versionId1=${versionId1}&versionId2=${versionId2}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setDiff(data.data);
        } else {
          throw new Error('Failed to load diff');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setDiffLoading(false);
      }
    };

    fetchDiff();
  }, [entryId, versionId1, versionId2]);

  const toggleLineExpanded = (lineNum) => {
    const newSet = new Set(expandedLines);
    if (newSet.has(lineNum)) {
      newSet.delete(lineNum);
    } else {
      newSet.add(lineNum);
    }
    setExpandedLines(newSet);
  };

  if (diffLoading || loading) {
    return (
      <div className="diff-viewer-container">
        <div className="diff-loading">
          <div className="spinner"></div>
          <p>Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diff-viewer-container">
        <div className="diff-error">
          <p>❌ {error}</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  if (!diff) {
    return null;
  }

  const { diff: diffData, similarity } = diff;
  const { lines, stats } = diffData;

  return (
    <div className="diff-viewer-container">
      {/* Header */}
      <div className="diff-viewer-header">
        <div className="diff-viewer-title">
          <h3>📊 Version Comparison</h3>
          <span className="similarity-badge">
            {similarity}% Similar
          </span>
        </div>

        <div className="diff-viewer-controls">
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value)}
            className="diff-mode-select"
          >
            <option value="side-by-side">Side-by-Side</option>
            <option value="inline">Inline</option>
          </select>

          <button className="diff-close-btn" onClick={onClose} title="Close comparison">
            ✕
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="diff-stats">
        <div className="stat-item">
          <span className="stat-label">Total Lines:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item added">
          <span className="stat-label">➕ Added:</span>
          <span className="stat-value">{stats.added}</span>
        </div>
        <div className="stat-item removed">
          <span className="stat-label">➖ Removed:</span>
          <span className="stat-value">{stats.removed}</span>
        </div>
        <div className="stat-item equal">
          <span className="stat-label">━ Unchanged:</span>
          <span className="stat-value">{stats.equal}</span>
        </div>
      </div>

      {/* Content Viewer */}
      <div className="diff-content-wrapper">
        {displayMode === 'side-by-side' ? (
          <div className="diff-side-by-side">
            <div className="diff-column original">
              <div className="diff-column-header">
                <h4>Original Version</h4>
                <span className="badge-removed">OLD</span>
              </div>
              <div className="diff-lines">
                {lines
                  .filter(line => line.type !== 'add')
                  .map((line, idx) => (
                    <div
                      key={`old-${idx}`}
                      className={`diff-line diff-${line.type}`}
                      title={line.className}
                    >
                      <span className="line-num">{line.lineNum}</span>
                      <span className="line-marker">
                        {line.type === 'remove' ? '−' : ' '}
                      </span>
                      <code className="line-content">
                        {line.content || '\u00A0'}
                      </code>
                    </div>
                  ))}
              </div>
            </div>

            <div className="diff-column modified">
              <div className="diff-column-header">
                <h4>Modified Version</h4>
                <span className="badge-added">NEW</span>
              </div>
              <div className="diff-lines">
                {lines
                  .filter(line => line.type !== 'remove')
                  .map((line, idx) => (
                    <div
                      key={`new-${idx}`}
                      className={`diff-line diff-${line.type}`}
                      title={line.className}
                    >
                      <span className="line-num">{line.lineNum}</span>
                      <span className="line-marker">
                        {line.type === 'add' ? '+' : ' '}
                      </span>
                      <code className="line-content">
                        {line.content || '\u00A0'}
                      </code>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* Inline mode */
          <div className="diff-inline">
            <div className="diff-lines">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`diff-line diff-${line.type}`}
                >
                  <span className="line-num">{line.lineNum}</span>
                  <span className="line-marker">
                    {line.type === 'add' && '+'}
                    {line.type === 'remove' && '−'}
                    {line.type === 'equal' && ' '}
                  </span>
                  <code className="line-content">
                    {line.content || '\u00A0'}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="diff-legend">
        <div className="legend-item equal">
          <span className="legend-marker">━</span>
          <span>Unchanged</span>
        </div>
        <div className="legend-item added">
          <span className="legend-marker">+</span>
          <span>Added</span>
        </div>
        <div className="legend-item removed">
          <span className="legend-marker">−</span>
          <span>Removed</span>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
