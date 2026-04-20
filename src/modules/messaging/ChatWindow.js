import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';

const ChatWindow = ({
  chat,
  messages,
  onSendMessage,
  onTyping,
  typingUsers,
  encryptionEnabled,
  onToggleEncryption,
  onStartCall,
  onOpenFileUpload,
  socket
}) => {
  const { currentUser } = useApp();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    const typing = e.target.value.length > 0;
    setIsTyping(typing);
    if (onTyping) {
      onTyping(typing);
    }
  };

  const getOtherParticipants = () => {
    return chat?.participants?.filter((p) => p._id !== currentUser._id) || [];
  };

  const getChatTitle = () => {
    if (chat?.type === 'group') {
      return chat.groupName;
    }
    const otherUser = getOtherParticipants()[0];
    return otherUser?.name || 'Unknown User';
  };

  const getChatInfo = () => {
    if (chat?.type === 'group') {
      return `${chat.participants.length} members`;
    }
    return 'Active now';
  };

  if (!chat) {
    return (
      <div className="chat-window empty-chat">
        <div className="empty-state">
          <p>👋 Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-header-info">
          <h3>{getChatTitle()}</h3>
          <p className="chat-status">{getChatInfo()}</p>
        </div>
        <div className="chat-header-actions">
          <button
            className="btn-icon"
            title="Voice Call"
            onClick={() => onStartCall('audio')}
          >
            📞
          </button>
          <button
            className="btn-icon"
            title="Video Call"
            onClick={() => onStartCall('video')}
          >
            📹
          </button>
          <button
            className={`btn-icon ${encryptionEnabled ? 'active' : ''}`}
            title={`${encryptionEnabled ? 'Disable' : 'Enable'} End-to-End Encryption`}
            onClick={onToggleEncryption}
          >
            🔒
          </button>
          <button className="btn-icon" title="Info">
            ℹ️
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message._id || index}
              className={`message ${message.senderId._id === currentUser._id ? 'sent' : 'received'}`}
            >
              {message.senderId._id !== currentUser._id && (
                <span className="message-avatar">{message.senderId.avatar}</span>
              )}
              <div className="message-content">
                {chat.type === 'group' && message.senderId._id !== currentUser._id && (
                  <p className="message-sender">{message.senderId.name}</p>
                )}
                <div className="message-bubble">
                  {message.messageType === 'text' ? (
                    <p>{message.content}</p>
                  ) : (
                    <div className="message-media">
                      {message.messageType === 'image' && <img src={message.media?.url} alt="" />}
                      {message.messageType === 'video' && (
                        <video src={message.media?.url} controls />
                      )}
                      {message.messageType === 'audio' && (
                        <audio src={message.media?.url} controls />
                      )}
                    </div>
                  )}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="message-reactions">
                      {message.reactions.map((r, idx) => (
                        <span key={idx} title={r.userId.name}>
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {message.senderId._id === currentUser._id && (
                  <span className="message-status">
                    {message.deliveryStatus?.[0]?.status === 'seen' ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span className="typing-text">
              {Array.from(typingUsers).length === 1 ? 'Someone' : 'People'} typing...
            </span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-area">
        <textarea
          value={messageInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="message-textarea"
          rows="1"
        />
        <div className="message-actions">
          <button
            className="btn-action"
            title="Attach file"
            onClick={onOpenFileUpload}
          >
            📎
          </button>
          <button className="btn-action" title="Add emoji">
            😊
          </button>
          <button
            className="btn-send"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            title="Send message"
          >
            📤
          </button>
        </div>
        {encryptionEnabled && (
          <div className="encryption-indicator">
            <span className="encryption-icon">🔒</span>
            <span className="encryption-text">End-to-end encrypted</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
