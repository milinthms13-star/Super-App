/**
 * Sharing Panel Component
 * Manages entry sharing, permissions, comments, and collaboration
 * Phase 7 - Sharing & Collaboration
 */

import React, { useState, useEffect } from 'react';
import './Phase7Components.css';

const SharingPanel = ({ token, apiUrl = 'http://localhost:5000', onError, onSuccess }) => {
  const [shares, setShares] = useState([]);
  const [comments, setComments] = useState([]);
  const [collaborationStats, setCollaborationStats] = useState(null);
  const [sharingStats, setSharingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTab, setExpandedTab] = useState('shares');
  const [newComment, setNewComment] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [commentingLoading, setCommentingLoading] = useState(false);

  useEffect(() => {
    fetchSharingData();
  }, []);

  const fetchSharingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, insightsRes] = await Promise.all([
        fetch(`${apiUrl}/api/diary/phase7/sharing-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/diary/phase7/collaboration-insights`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!statsRes.ok || !insightsRes.ok) throw new Error('Failed to fetch sharing data');

      const statsData = await statsRes.json();
      const insightsData = await insightsRes.json();

      setSharingStats(statsData.data);
      setCollaborationStats(insightsData.data);

      // Mock shares and comments data from response
      if (statsData.data?.shares) setShares(statsData.data.shares);
      if (insightsData.data?.recentActivity) setComments(insightsData.data.recentActivity);
    } catch (err) {
      const message = err.message || 'Failed to load sharing data';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      const response = await fetch(`${apiUrl}/api/diary/phase7/share/${shareId}/revoke`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to revoke share');

      setShares(shares.filter(s => s.shareId !== shareId));
      onSuccess?.('Share revoked successfully');
    } catch (err) {
      onError?.(err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedEntryId) return;

    try {
      setCommentingLoading(true);
      const response = await fetch(`${apiUrl}/api/diary/phase7/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entryId: selectedEntryId,
          comment: newComment
        })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();
      setComments([...comments, data.data]);
      setNewComment('');
      onSuccess?.('Comment added successfully');
    } catch (err) {
      onError?.(err);
    } finally {
      setCommentingLoading(false);
    }
  };

  const renderShares = () => {
    if (!shares || shares.length === 0) {
      return (
        <div className="empty-state">
          <p>📭 No shared entries yet</p>
          <p>Share your diary entries with others to get feedback and collaborate.</p>
        </div>
      );
    }

    return (
      <div className="shares-list">
        {shares.map(share => (
          <div key={share.shareId} className="share-card">
            <div className="share-header">
              <h4>{share.entryTitle || 'Untitled Entry'}</h4>
              <span className={`permission-badge ${share.permission}`}>
                {share.permission === 'view' && '👁️ View'}
                {share.permission === 'comment' && '💬 Comment'}
                {share.permission === 'edit' && '✏️ Edit'}
              </span>
            </div>

            <div className="share-details">
              <p><strong>Shared with:</strong> {share.sharedWith?.join(', ') || 'Public link'}</p>
              <p><strong>Created:</strong> {new Date(share.createdAt).toLocaleDateString()}</p>
              {share.expiresAt && (
                <p><strong>Expires:</strong> {new Date(share.expiresAt).toLocaleDateString()}</p>
              )}
            </div>

            <div className="share-restrictions">
              <div className="restriction">
                {share.allowDownload ? '✅' : '❌'} Download allowed
              </div>
              <div className="restriction">
                {share.allowScreenshot ? '✅' : '❌'} Screenshots allowed
              </div>
              <div className="restriction">
                {share.allowCopy ? '✅' : '❌'} Copy allowed
              </div>
            </div>

            <div className="share-actions">
              <button className="copy-link-btn" onClick={() => {
                navigator.clipboard.writeText(share.shareLink);
                onSuccess?.('Link copied to clipboard');
              }}>
                🔗 Copy Link
              </button>
              <button
                className="revoke-btn"
                onClick={() => handleRevokeShare(share.shareId)}
              >
                🗑️ Revoke Access
              </button>
            </div>
          </div>
        ))}
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
      </div>

      {error && <div className="error-banner">{error}</div>}

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
        <button onClick={fetchSharingData} className="refresh-btn">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default SharingPanel;
