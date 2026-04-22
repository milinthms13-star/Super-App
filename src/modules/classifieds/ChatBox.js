import React, { useState, useRef, useEffect } from 'react';

const ChatBox = ({ listing, seller, currentUser, onClose, isOpen }) => {
  const [messages, setMessages] = useState(listing?.messages || [
    {
      id: 1,
      sender: 'seller',
      senderName: seller?.name,
      senderAvatar: seller?.avatar,
      text: 'Hi! I still have this item available. Feel free to ask me anything!',
      timestamp: new Date(Date.now() - 3600000),
      read: true,
    },
  ]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      sender: 'buyer',
      senderName: currentUser?.name || 'You',
      senderAvatar: currentUser?.avatar,
      text: messageText,
      timestamp: new Date(),
      read: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');
    setIsTyping(true);

    // Simulate seller response after 2 seconds
    setTimeout(() => {
      const response = {
        id: messages.length + 2,
        sender: 'seller',
        senderName: seller?.name,
        senderAvatar: seller?.avatar,
        text: 'Great question! Let me help you with that.',
        timestamp: new Date(),
        read: false,
      };
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 2000);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-box-overlay">
      <div className="chat-box">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-seller-info">
            <img
              src={seller?.avatar || '/default-avatar.png'}
              alt={seller?.name}
              className="chat-avatar"
            />
            <div className="chat-seller-details">
              <h4 className="chat-seller-name">
                {seller?.name}
                {seller?.verified && <span className="verified-badge">✓</span>}
              </h4>
              <p className="chat-listing-title">{listing?.title}</p>
            </div>
          </div>

          <button
            className="chat-close-btn"
            onClick={onClose}
            title="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Messages Container */}
        <div className="chat-messages">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message ${msg.sender}-message`}
            >
              <div className="message-avatar">
                <img
                  src={msg.senderAvatar || '/default-avatar.png'}
                  alt={msg.senderName}
                  title={msg.senderName}
                />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">{msg.senderName}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="message-text">{msg.text}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message seller-message typing">
              <div className="message-avatar">
                <img
                  src={seller?.avatar || '/default-avatar.png'}
                  alt={seller?.name}
                />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="chat-footer">
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="chat-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                maxLength={500}
              />
              <span className="input-char-count">
                {messageText.length}/500
              </span>
            </div>

            <button
              type="submit"
              className="chat-send-btn"
              disabled={!messageText.trim()}
              title="Send message"
            >
              ➤ Send
            </button>
          </form>

          {/* Quick Actions */}
          <div className="chat-quick-actions">
            <button className="quick-action" title="Call seller">
              📞
            </button>
            <button className="quick-action" title="Share listing">
              🔗
            </button>
            <button className="quick-action" title="Report listing">
              🚩
            </button>
          </div>
        </div>

        {/* Chat Info */}
        <div className="chat-info">
          <span className="info-badge">💬 {messages.length} messages</span>
          <span className="info-badge">
            {seller?.responseTime || '~2 hrs'} response time
          </span>
          <span className="info-badge">
            {seller?.positiveFeedback || '98'}% positive
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
