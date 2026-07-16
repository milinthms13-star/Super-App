/**
 * Sharing Panel Component
 * Manages entry sharing, permissions, comments, and collaboration
 * Phase 7 - Sharing & Collaboration
 */

import React, { useState, useEffect } from 'react';
import './Phase7Components.css';
import {
  getEntryShares,
  getSharingStats,
  getCollaborationInsights,
  revokeShare,
  addCollaborationComment,
  createShareLink,
  updateSharePermissions
} from '../../services/diaryService';

const SharingPanel = ({ onClose, entryId, onError, onSuccess }) => {
  const [shares, setShares] = useState([]);
  const [comments, setComments] = useState([]);
  const [collaborationStats, setCollaborationStats] = useState(null);
  const [sharingStats, setSharingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTab, setExpandedTab] = useState('shares');
  const [newComment, setNewComment] = useState('');
  const [commentingLoading, setCommentingLoading] = useState(false);
  
  // New share form state
  const [showCreateShare, setShowCreateShare] = useState(false);
  const [newShare, setNewShare] = useState({
    recipientEmail: '',
    permission: 'view',
    expiresInDays: 7,
    isPublic: false,
    password: '',
    allowComments: true
  });

  useEffect(() => {
    fetchSharingData();
  }, []);

  const fetchSharingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, insightsRes] = await Promise.all([
        getSharingStats(),
        getCollaborationInsights()
      ]);

      if (statsRes.success) {
        setSharingStats(statsRes.data);
      }

      if (insightsRes.success) {
        setCollaborationStats(insightsRes.data);
        if (insightsRes.data.recentActivity) {
          setComments(insightsRes.data.recentActivity);
        }
      }

      // If specific entry provided, load its shares
      if (entryId) {
        const sharesRes = await getEntryShares(entryId);
        if (sharesRes.success) {
          setShares(Array.isArray(sharesRes.data) ? sharesRes.data : []);
        }
      }
    } catch (err) {
      const message = err.message || 'Failed to load sharing data';
      setError(message);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!entryId) {
      if (onError) onError(new Error('No entry selected'));
      return;
    }

    if (!newShare.recipientEmail && !newShare.isPublic) {
      if (onError) onError(new Error('Please provide recipient email or enable public sharing'));
      return;
    }

    try {
      const shareOptions = {
        shareWith: newShare.recipientEmail ? [newShare.recipientEmail] : [],
        permission: newShare.permission,
        isPublic: newShare.isPublic,
        allowComments: newShare.allowComments,
        password: newShare.password || null,
        expiresAt: newShare.expiresInDays 
          ? new Date(Date.now() + newShare.expiresInDays * 24 * 60 * 60 * 1000)
          : null
      };

      const response = await createShareLink(entryId, shareOptions);
      
      if (response.success) {
        setShares([response.data, ...shares]);
        setShowCreateShare(false);
        setNewShare({
          recipientEmail: '',
          permission: 'view',
          expiresInDays: 7,
          isPublic: false,
          password: '',
          allowComments: true
        });
        if (onSuccess) onSuccess('Share created successfully!');
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm('Are you sure you want to revoke this share?')) {
      return;
    }

    try {
      await revokeShare(shareId, 'Revoked by user');
      setShares(shares.filter(s => s.shareId !== shareId && s.id !== shareId));
      if (onSuccess) onSuccess('Share revoked successfully');
    } catch (err) {
      if (onError) onError(err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !entryId) return;

    try {
      setCommentingLoading(true);
      const response = await addCollaborationComment(entryId, {
        text: newComment.trim()
      });

      if (response.success) {
        setComments([response.data, ...comments]);
        setNewComment('');
        if (onSuccess) onSuccess('Comment added successfully');
      }
    } catch (err) {
      if (onError) onError(err);
    } finally {
      setCommentingLoading(false);
    }
  };

  const renderCreateShareForm = () => (
    <div className="create-share-form">
      <h3>Create New Share</h3>
      
      <div className="form-group">
        <label>Recipient Email (or leave empty for public)</label>
        <input
          type="email"
          value={newShare.recipientEmail}
          onChange={(e) => setNewShare({ ...newShare, recipientEmail: e.target.value })}
          placeholder="user@example.com"
        />
      </div>

      <div className="form-group">
        <label>Permission Level</label>
        <select
          value={newShare.permission}
          onChange={(e) => setNewShare({ ...newShare, permission: e.target.value })}
        >
          <option value="view">👁️ View Only</option>
          <option value="comment">💬 Can Comment</option>
          <option value="edit">✏️ Can Edit</option>
        </select>
      </div>

      <div className="form-group">
        <label>Expires In (days)</label>
        <input
          type="number"
          value={newShare.expiresInDays}
          onChange={(e) => setNewShare({ ...newShare, expiresInDays: parseInt(e.target.value) || 7 })}
          min="1"
          max="365"
        />
      </div>

      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={newShare.isPublic}
            onChange={(e) => setNewShare({ ...newShare, isPublic: e.target.checked })}
          />
          Make Public (anyone with link can access)
        </label>
      </div>

      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={newShare.allowComments}
            onChange={(e) => setNewShare({ ...newShare, allowComments: e.target.checked })}
          />
          Allow Comments
        </label>
      </div>

      {newShare.isPublic && (
        <div className="form-group">
          <label>Password Protection (optional)</label>
          <input
            type="password"
            value={newShare.password}
            onChange={(e) => setNewShare({ ...newShare, password: e.target.value })}
            placeholder="Leave empty for no password"
          />
        </div>
      )}

      <div className="form-actions">
        <button onClick={handleCreateShare} className="create-btn">
          📤 Create Share
        </button>
        <button onClick={() => setShowCreateShare(false)} className="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  );

  const renderShares = () => {
    return (
      <div className="shares-section">
        {entryId && (
          <div className="create-share-header">
            <button 
              onClick={() => setShowCreateShare(!showCreateShare)} 
              className="new-share-btn"
            >
              {showCreateShare ? '✕ Cancel' : '+ Create New Share'}
            </button>
          </div>
        )}

        {showCreateShare && renderCreateShareForm()}

        {!shares || shares.length === 0 ? (
          <div className="empty-state">
            <p>📭 No shared entries yet</p>
            <p>Share your diary entries with others to get feedback and collaborate.</p>
          </div>
        ) : (
          <div className="shares-list">
            {shares.map(share => (
              <div key={share.shareId || share.id} className="share-card">
                <div className="share-header">
                  <h4>{share.entryTitle || 'Shared Entry'}</h4>
                  <span className={`permission-badge ${share.permission}`}>
                    {share.permission === 'view' && '👁️ View'}
                    {share.permission === 'comment' && '💬 Comment'}
                    {share.permission === 'edit' && '✏️ Edit'}
                  </span>
                </div>

                <div className="share-details">
                  <p><strong>Shared with:</strong> {share.sharedWith?.join(', ') || 'Public link'}</p>
                  <p><strong>Created:</strong> {new Date(share.createdAt || share.sharedAt).toLocaleDateString()}</p>
                  {share.expiresAt && (
                    <p><strong>Expires:</strong> {new Date(share.expiresAt).toLocaleDateString()}</p>
                  )}
                </div>

                <div className="share-restrictions">
                  <div className="restriction">
                    {share.allowDownload || share.restrictions?.allowDownload ? '✅' : '❌'} Download
                  </div>
                  <div className="restriction">
                    {share.allowScreenshot !== false && share.restrictions?.allowScreenshot !== false ? '✅' : '❌'} Screenshots
                  </div>
                  <div className="restriction">
                    {share.allowCopy !== false && share.restrictions?.allowCopy !== false ? '✅' : '❌'} Copy
                  </div>
                </div>

                {share.shareLink && (
                  <div className="share-link">
                    <code>{share.shareLink}</code>
                  </div>
                )}

                <div className="share-actions">
                  {share.shareLink && (
                    <button className="copy-link-btn" onClick={() => {
                      navigator.clipboard.writeText(share.shareLink);
                      if (onSuccess) onSuccess('Link copied to clipboard');
                    }}>
                      🔗 Copy Link
                    </button>
                  )}
                  <button
                    className="revoke-btn"
                    onClick={() => handleRevokeShare(share.shareId || share.id)}
                  >
                    🗑️ Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderComments = () => {
    if (!comments || comments.length === 0) {
      return (
        <div className="empty-state">
          <p>💬 No comments yet</p>
          <p>Comments from collaborators will appear here.</p>
        </div>
      );
    }

    return (
      <div className="comments-section">
        <div className="recent-comments">
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <strong>{comment.commenterName || 'Anonymous'}</strong>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="comment-text">{comment.text || comment.comment}</p>
              <div className="comment-stats">
                <span>❤️ {comment.likes || 0}</span>
                <span>💬 {comment.replies || 0} replies</span>
              </div>
            </div>
          ))}
        </div>

        <div className="add-comment-form">
          <h4>Add a Comment</h4>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
          />
          <button
            onClick={handleAddComment}
            disabled={commentingLoading || !newComment.trim()}
            className="comment-submit-btn"
          >
            {commentingLoading ? 'Posting...' : '📤 Post Comment'}
          </button>
        </div>
      </div>
    );
  };

  const renderStatistics = () => {
    if (!sharingStats && !collaborationStats) {
      return (
        <div className="empty-state">
          <p>📊 No statistics available yet</p>
        </div>
      );
    }

    return (
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-value">{sharingStats?.totalShares || 0}</div>
          <div className="stat-label">Total Shares</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{sharingStats?.sharedRecipients || 0}</div>
          <div className="stat-label">Recipients</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{sharingStats?.commentCount || 0}</div>
          <div className="stat-label">Comments</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{collaborationStats?.topCommenters?.length || 0}</div>
          <div className="stat-label">Active Contributors</div>
        </div>

        {sharingStats?.permissionDistribution && (
          <div className="stat-card full-width">
            <h4>Permission Distribution</h4>
            <div className="distribution-list">
              <div>👁️ View: {sharingStats.permissionDistribution.view || 0}</div>
              <div>💬 Comment: {sharingStats.permissionDistribution.comment || 0}</div>
              <div>✏️ Edit: {sharingStats.permissionDistribution.edit || 0}</div>
            </div>
          </div>
        )}

        {collaborationStats?.topCommenters && collaborationStats.topCommenters.length > 0 && (
          <div className="stat-card full-width">
            <h4>Top Contributors</h4>
            <div className="top-list">
              {collaborationStats.topCommenters.slice(0, 5).map((commenter, idx) => (
                <div key={idx} className="top-item">
                  <span className="rank">#{idx + 1}</span>
                  <span className="name">{commenter.name || 'Anonymous'}</span>
                  <span className="count">{commenter.commentCount} comments</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="sharing-panel loading">
        <div className="spinner"></div>
        <p>Loading sharing data...</p>
      </div>
    );
  }

  return (
    <div className="sharing-panel">
      <div className="sharing-header">
        <h2>🤝 Sharing & Collaboration</h2>
        <p>Manage entry shares, permissions, and comments</p>
        {onClose && (
          <button onClick={onClose} className="close-btn" title="Close">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={fetchSharingData} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      <div className="sharing-tabs">
        {['shares', 'comments', 'statistics'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${expandedTab === tab ? 'active' : ''}`}
            onClick={() => setExpandedTab(tab)}
          >
            {tab === 'shares' && '📤 Shares'}
            {tab === 'comments' && '💬 Comments'}
            {tab === 'statistics' && '📊 Statistics'}
          </button>
        ))}
      </div>

      <div className="sharing-content">
        {expandedTab === 'shares' && renderShares()}
        {expandedTab === 'comments' && renderComments()}
        {expandedTab === 'statistics' && renderStatistics()}
      </div>

      <div className="sharing-footer">
        <button onClick={fetchSharingData} className="refresh-btn" disabled={loading}>
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default SharingPanel;
