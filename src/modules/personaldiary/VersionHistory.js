import React, { useState, useEffect } from "react";
import { getEntryVersions, restoreEntryVersion } from "../../services/diaryService";
import "./VersionHistory.css";

const VersionHistory = ({ entryId, onRestore, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState(null);

  useEffect(() => {
    fetchVersions();
  }, [entryId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const result = await getEntryVersions(entryId, { limit: 50 });
      setVersions(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber) => {
    try {
      setRestoring(true);
      const result = await restoreEntryVersion(entryId, versionNumber);
      onRestore?.(result.data);
      alert(`Restored to version ${versionNumber}`);
      onClose?.();
    } catch (err) {
      alert(`Failed to restore: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="version-history-modal">
      <div className="version-history-content">
        <div className="version-history-header">
          <h2>Version History</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="version-loading">Loading versions...</div>
        ) : error ? (
          <div className="version-error">Error: {error}</div>
        ) : versions.length === 0 ? (
          <div className="version-empty">No versions available</div>
        ) : (
          <div className="versions-list">
            {versions.map((version, index) => (
              <div key={version._id} className="version-item">
                <div 
                  className="version-header"
                  onClick={() => setExpandedVersion(expandedVersion === version._id ? null : version._id)}
                >
                  <div className="version-number">v{version.versionNumber}</div>
                  <div className="version-meta">
                    <span className="version-date">{formatDate(version.savedAt)}</span>
                    <span className={`version-type ${version.changeType}`}>
                      {version.changeType === 'auto_save' ? '⚡ Auto-saved' : '💾 Manual'}
                    </span>
                  </div>
                  <div className="version-title-preview">{version.title}</div>
                </div>

                {expandedVersion === version._id && (
                  <div className="version-details">
                    <div className="version-content-preview">
                      <strong>Content Preview:</strong>
                      <p>{version.content.substring(0, 200)}...</p>
                    </div>
                    <div className="version-metadata">
                      <span>Mood: {version.mood || 'N/A'}</span>
                      <span>Category: {version.category || 'N/A'}</span>
                      {version.tags && version.tags.length > 0 && (
                        <span>Tags: {version.tags.join(', ')}</span>
                      )}
                    </div>
                    <button
                      className="restore-btn"
                      onClick={() => handleRestore(version.versionNumber)}
                      disabled={restoring}
                    >
                      {restoring ? 'Restoring...' : `Restore to v${version.versionNumber}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
