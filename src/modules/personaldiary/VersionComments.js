import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/VersionComments.css';

/**
 * VersionComments - Display and manage comments on diary entry versions
 * Supports threading, likes, and sentiment tracking
 */
const VersionComments = ({
  entryId,
  versionId,
  versionNumber,
  onClose = null,
  readOnly = false
}) => {
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentiment, setSentiment] = useState('neutral');
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest, mostLiked

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/diary/${entryId}/versions/${versionId}/comments?includeReplies=true`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch comments');

        const data = await response.json();
        setComments(data.comments || []);
        setStats(data.stats || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [entryId, versionId]);

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/diary/${entryId}/versions/${versionId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            text: newCommentText.trim(),
            parentCommentId: replyTo,
            sentiment
          })
        }
      );

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();
      
      // Add comment to local state
      if (replyTo) {
        // Add as reply
        setComments(comments.map(c => 
          c._id === replyTo 
            ? { ...c, replies: [...(c.replies || []), data.comment] }
            : c
        ));
      } else {
        // Add as top-level comment
        setComments([data.comment, ...comments]);
      }

      setNewCommentText('');
      setReplyTo(null);
      setSentiment('neutral');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await fetch(
        `/api/diary/${entryId}/comments/${commentId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ isLike: true })
        }
      );

      if (!response.ok) throw new Error('Failed to like comment');

      const data = await response.json();
      // Update comment in state
      updateCommentInState(commentId, data.comment);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/diary/${entryId}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to delete comment');

      // Remove from state
      setComments(comments.filter(c => c._id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  };

  const updateCommentInState = (commentId, updatedComment) => {
    setComments(comments.map(c => 
      c._id === commentId ? updatedComment : c
    ));
  };

  const getSortedComments = () => {
    const sorted = [...comments];
    if (sortBy === 'oldest') {
      return sorted.reverse();
    } else if (sortBy === 'mostLiked') {
      return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    return sorted; // recent (default)
  };

  const renderComment = (comment, isReply = false) => (
    <div
      key={comment._id}
      className={`comment-item ${isReply ? 'comment-reply' : 'comment-top-level'}`}
    >
      {/* Comment header */}
      <div className="comment-header">
        <div className="comment-author-info">
          <span className="comment-author">{comment.userId?.name || 'Anonymous'}</span>
          <span className="comment-time">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>

        {comment.sentiment && comment.sentiment !== 'neutral' && (
          <span className={`comment-sentiment ${comment.sentiment}`}>
            {comment.sentiment === 'positive' && '😊'}
            {comment.sentiment === 'neutral' && '😐'}
            {comment.sentiment === 'negative' && '😞'}
          </span>
        )}
      </div>

      {/* Comment text */}
      <div className="comment-text">{comment.text}</div>

      {/* Comment actions */}
      <div className="comment-actions">
        <button
          className={`action-btn like-btn ${comment.likedBy?.length > 0 ? 'liked' : ''}`}
          onClick={() => handleLikeComment(comment._id)}
          disabled={readOnly}
        >
          👍 {comment.likes || 0}
        </button>

        {!readOnly && (
          <>
            <button
              className="action-btn reply-btn"
              onClick={() => setReplyTo(comment._id)}
            >
              💬 Reply
            </button>

            <button
              className="action-btn delete-btn"
              onClick={() => handleDeleteComment(comment._id)}
            >
              🗑️ Delete
            </button>
          </>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="version-comments-container">
      {/* Header */}
      <div className="comments-header">
        <div className="header-title">
          <h3>💬 Comments on v{versionNumber}</h3>
          {stats && (
            <span className="comment-count">{stats.totalComments} comment{stats.totalComments !== 1 ? 's' : ''}</span>
          )}
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose}>✕</button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="comments-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Add comment form */}
      {!readOnly && (
        <div className="add-comment-form">
          {replyTo && (
            <div className="reply-context">
              Replying to comment... 
              <button 
                className="cancel-reply"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </div>
          )}

          <textarea
            className="comment-textarea"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment about this version..."
            maxLength={2000}
            disabled={loading}
          />

          <div className="comment-form-footer">
            <select
              className="sentiment-select"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
              disabled={loading}
            >
              <option value="neutral">😐 Neutral</option>
              <option value="positive">😊 Positive</option>
              <option value="negative">😞 Negative</option>
            </select>

            <button
              className="btn-submit-comment"
              onClick={handleAddComment}
              disabled={!newCommentText.trim() || loading}
            >
              {loading ? '⏳ Posting...' : '✓ Post Comment'}
            </button>
          </div>
        </div>
      )}

      {/* Sort options */}
      {comments.length > 0 && (
        <div className="comments-sort">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="mostLiked">Most Liked</option>
          </select>
        </div>
      )}

      {/* Comments list */}
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <div className="comments-empty">
            <p>⏳ Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="comments-empty">
            <p>📝 No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          getSortedComments().map(comment => renderComment(comment, false))
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="comments-stats">
          <div className="stat-item">
            <span className="stat-label">Total Comments</span>
            <span className="stat-value">{stats.totalComments}</span>
          </div>
          {stats.bySentiment && stats.bySentiment.length > 0 && (
            <div className="stat-item">
              <span className="stat-label">Sentiments</span>
              <div className="sentiment-breakdown">
                {stats.bySentiment.map(s => (
                  <span key={s._id} className={`sentiment-badge ${s._id}`}>
                    {s._id}: {s.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionComments;
