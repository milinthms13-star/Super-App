import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MessagePinner.css';

const MessagePinner = ({ chatId, onClose, onMessageClick }) => {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const MAX_PINS = 3;

  useEffect(() => {
    fetchPinnedMessages();
  }, [chatId]);

  const fetchPinnedMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/messaging/v4/pins/${chatId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPinnedMessages(response.data.pinnedMessages || []);
    } catch (err) {
      console.error('Error fetching pinned messages:', err);
      setError('Failed to load pinned messages');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (messageId) => {
    if (!window.confirm('Unpin this message?')) return;

    setLoading(true);
    setError('');

    try {
      await axios.delete(`/api/messaging/v4/pins/${chatId}/${messageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPinnedMessages();
    } catch (err) {
      setError('Failed to unpin message');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpinAll = async () => {
    if (!window.confirm('Unpin all messages?')) return;

    setLoading(true);
    setError('');

    try {
      await axios.delete(`/api/messaging/v4/pins/${chatId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPinnedMessages();
    } catch (err) {
      setError('Failed to unpin all messages');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = (messageId) => {
    if (onMessageClick) {
      onMessageClick(messageId);
    }
    onClose();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getMessageIcon = (messageType) => {
    const icons = {
      text: '💬',
      image: '🖼️',
      video: '🎥',
      audio: '🎵',
      file: '📎',
      location: '📍',
      contact: '👤'
    };
    return icons[messageType] || '💬';
  };

  if (loading && pinnedMessages.length === 0) {
    return (
      <div className="message-pinner-modal">
        <div className="message-pinner-container">
          <div className="loading-state">
            <p>Loading pinned messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-pinner-modal">
      <div className="message-pinner-container">
        <div className="pinner-header">
          <h2>📌 Pinned Messages</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="pinner-content">
          <div className="pins-info">
            <span className="pins-count">
              {pinnedMessages.length} / {MAX_PINS} messages pinned
            </span>
            {pinnedMessages.length > 0 && (
              <button 
                onClick={handleUnpinAll}
                className="btn-unpin-all"
              >
                Unpin All
              </button>
            )}
          </div>

          <div className="pinned-messages-list">
            {pinnedMessages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📌</div>
                <p>No pinned messages</p>
                <p className="empty-subtitle">
                  Pin important messages to find them quickly later
                </p>
              </div>
            ) : (
              pinnedMessages.map((msg, index) => (
                <div key={msg._id} className="pinned-message-item">
                  <div className="pin-badge">{index + 1}</div>
                  <div 
                    className="message-content"
                    onClick={() => handleViewMessage(msg._id)}
                  >
                    <div className="message-header">
                      <span className="message-type-icon">
                        {getMessageIcon(msg.messageType)}
                      </span>
                      <span className="sender-name">
                        {msg.senderId?.name || 'Unknown'}
                      </span>
                      <span className="message-date">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <div className="message-body">
                      {msg.messageType === 'text' ? (
                        <p>{truncateText(msg.content, 150)}</p>
                      ) : (
                        <div className="media-placeholder">
                          <span className="media-icon">
                            {getMessageIcon(msg.messageType)}
                          </span>
                          <span className="media-type">
                            {msg.messageType.charAt(0).toUpperCase() + msg.messageType.slice(1)}
                          </span>
                          {msg.content && (
                            <p className="media-caption">{truncateText(msg.content, 80)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="message-reactions">
                        {msg.reactions.slice(0, 3).map((reaction, idx) => (
                          <span key={idx} className="reaction-emoji">
                            {reaction.emoji}
                          </span>
                        ))}
                        {msg.reactions.length > 3 && (
                          <span className="reactions-more">
                            +{msg.reactions.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="message-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpin(msg._id);
                      }}
                      className="btn-unpin"
                      title="Unpin"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {pinnedMessages.length > 0 && pinnedMessages.length < MAX_PINS && (
            <div className="pin-tip">
              💡 Tip: You can pin up to {MAX_PINS} messages. 
              Long-press any message to pin it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagePinner;
