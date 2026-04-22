import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import MessageSearch from './MessageSearch';
import MessageContextMenu from './MessageContextMenu';
import EmojiPicker from './EmojiPicker';
import ReadReceipts from './ReadReceipts';

const getId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value._id) {
    return getId(value._id);
  }

  return String(value);
};

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
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onSearchMessages,
  focusedMessageId,
  onFocusHandled,
}) => {
  const { currentUser } = useApp();
  const [messageInput, setMessageInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const currentUserId = getId(currentUser);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!focusedMessageId) {
      return;
    }

    const messageElement = messageContainerRef.current?.querySelector(
      `[data-message-id="${focusedMessageId}"]`
    );

    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      window.setTimeout(() => {
        messageElement.classList.remove('highlight');
      }, 1800);
    }

    if (onFocusHandled) {
      onFocusHandled();
    }
  }, [focusedMessageId, onFocusHandled]);

  const getOtherParticipants = () =>
    chat?.participants?.filter((participant) => getId(participant) !== currentUserId) || [];

  const getChatTitle = () => {
    if (chat?.type === 'group') {
      return chat.groupName;
    }

    return getOtherParticipants()[0]?.name || 'Unknown User';
  };

  const getChatInfo = () => {
    if (chat?.type === 'group') {
      return `${chat.participants.length} members`;
    }

    return getOtherParticipants()[0]?.isOnline ? 'Active now' : 'Available';
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) {
      return;
    }

    onSendMessage(
      messageInput.trim(),
      'text',
      null,
      replyingToMessage?._id || null
    );
    setMessageInput('');
    setReplyingToMessage(null);
    if (onTyping) {
      onTyping(false);
    }
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setMessageInput(nextValue);
    if (onTyping) {
      onTyping(nextValue.length > 0);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleContextMenu = (event, message, isOwnMessage) => {
    if (message.isDeleted) {
      return;
    }

    event.preventDefault();
    setContextMenu({
      message,
      canEdit: isOwnMessage && message.messageType === 'text',
      canDelete: isOwnMessage,
      position: { x: event.clientX, y: event.clientY },
    });
  };

  const handleEditMessage = (message) => {
    setEditingMessageId(message._id);
    setEditingContent(message.content || '');
  };

  const handleDeleteSelectedMessage = async (message) => {
    if (!message?._id) {
      return;
    }

    if (!window.confirm('Delete this message?')) {
      return;
    }

    await onDeleteMessage(message._id);
  };

  const handleReplyMessage = (message) => {
    setReplyingToMessage(message);
    setContextMenu(null);
  };

  const handleAddReaction = (message, event) => {
    if (event) {
      event.stopPropagation();
    }

    setSelectedMessageForReaction(message);
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = async (emoji) => {
    if (selectedMessageForReaction?._id) {
      await onAddReaction(selectedMessageForReaction._id, emoji);
      setSelectedMessageForReaction(null);
      setShowEmojiPicker(false);
      return;
    }

    setMessageInput((currentValue) => `${currentValue}${emoji}`);
    setShowEmojiPicker(false);
  };

  const handleSearchSelect = (message) => {
    const messageElement = messageContainerRef.current?.querySelector(
      `[data-message-id="${message._id}"]`
    );
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      window.setTimeout(() => messageElement.classList.remove('highlight'), 1800);
    }
    setShowSearch(false);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingContent.trim() || !editingMessageId) {
      return;
    }

    await onEditMessage(editingMessageId, editingContent.trim());
    handleCancelEdit();
  };

  const renderReplyPreview = (message) => {
    if (!message?.replyTo) {
      return null;
    }

    const replyAuthor = message.replyTo?.senderId?.name || 'Previous message';
    const replyText = message.replyTo?.content || 'Attachment';

    return (
      <div className="message-reply-preview">
        <strong>{replyAuthor}</strong>
        <span>{replyText}</span>
      </div>
    );
  };

  if (!chat) {
    return (
      <div className="chat-window empty-chat">
        <div className="empty-state">
          <p>Select a chat to start messaging</p>
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
            className={`btn-icon ${showSearch ? 'active' : ''}`}
            title="Search messages"
            onClick={() => setShowSearch((current) => !current)}
            type="button"
          >
            Search
          </button>
          <button className="btn-icon" title="Voice Call" onClick={() => onStartCall('audio')} type="button">
            Audio
          </button>
          <button className="btn-icon" title="Video Call" onClick={() => onStartCall('video')} type="button">
            Video
          </button>
          <button
            className={`btn-icon ${encryptionEnabled ? 'active' : ''}`}
            title={`${encryptionEnabled ? 'Disable' : 'Enable'} end-to-end encryption`}
            onClick={onToggleEncryption}
            type="button"
          >
            Encrypt
          </button>
        </div>
      </div>

      {showSearch && (
        <MessageSearch
          chatId={chat?._id}
          messages={messages}
          onSearch={onSearchMessages}
          onSelectMessage={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div className="messages-container" ref={messageContainerRef}>
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = getId(message.senderId) === currentUserId;
            const isEditing = editingMessageId === message._id;

            return (
              <div
                key={message._id || index}
                className={`message ${isOwnMessage ? 'sent' : 'received'} ${
                  message.isDeleted ? 'deleted' : ''
                }`}
                data-message-id={message._id}
                onContextMenu={(event) => handleContextMenu(event, message, isOwnMessage)}
              >
                {!isOwnMessage && (
                  <span className="message-avatar">{message.senderId?.avatar || 'U'}</span>
                )}

                <div className="message-content">
                  {chat.type === 'group' && !isOwnMessage && (
                    <p className="message-sender">{message.senderId?.name}</p>
                  )}

                  <div className="message-bubble">
                    {renderReplyPreview(message)}

                    {isEditing ? (
                      <div className="message-edit-form">
                        <textarea
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                          className="edit-textarea"
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button className="btn-edit-save" onClick={handleSaveEdit} type="button">
                            Save
                          </button>
                          <button className="btn-edit-cancel" onClick={handleCancelEdit} type="button">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : message.isDeleted ? (
                      <p className="message-deleted-text">This message was deleted.</p>
                    ) : (
                      <>
                        {message.messageType === 'text' && <p>{message.content}</p>}
                        {message.messageType === 'image' && (
                          <div className="message-media">
                            <img src={message.media?.url} alt="" />
                          </div>
                        )}
                        {message.messageType === 'video' && (
                          <div className="message-media">
                            <video src={message.media?.url} controls />
                          </div>
                        )}
                        {message.messageType === 'audio' && (
                          <div className="message-media">
                            <audio src={message.media?.url} controls />
                          </div>
                        )}
                        {message.messageType === 'file' && (
                          <div className="message-media">
                            <a href={message.media?.url} target="_blank" rel="noreferrer">
                              {message.content || 'Open file'}
                            </a>
                          </div>
                        )}

                        {message.reactions?.length > 0 && (
                          <div className="message-reactions">
                            {message.reactions.map((reaction, reactionIndex) => (
                              <button
                                key={`${reaction.emoji}-${reactionIndex}`}
                                className="reaction-chip"
                                onClick={(event) => handleAddReaction(message, event)}
                                type="button"
                              >
                                {reaction.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="message-meta">
                    <span className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {message.edits?.length > 0 && !message.isDeleted && (
                      <span className="message-edited-label">Edited</span>
                    )}
                    {isOwnMessage && (
                      <ReadReceipts
                        deliveryStatus={message.deliveryStatus}
                        currentUserId={currentUserId}
                      />
                    )}
                    {!message.isDeleted && (
                      <button
                        className="message-react-trigger"
                        onClick={(event) => handleAddReaction(message, event)}
                        type="button"
                        title="Add reaction"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span className="typing-text">
              {Array.from(typingUsers).length === 1 ? 'Someone is typing...' : 'People are typing...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          position={contextMenu.position}
          canEdit={contextMenu.canEdit}
          canDelete={contextMenu.canDelete}
          onEdit={handleEditMessage}
          onDelete={handleDeleteSelectedMessage}
          onReply={handleReplyMessage}
          onReact={handleAddReaction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={handleEmojiSelect}
          onClose={() => {
            setShowEmojiPicker(false);
            setSelectedMessageForReaction(null);
          }}
        />
      )}

      <div className="message-input-area">
        {replyingToMessage && (
          <div className="replying-banner">
            <div className="replying-banner-content">
              <strong>Replying to {replyingToMessage.senderId?.name || 'message'}</strong>
              <span>{replyingToMessage.content || 'Attachment'}</span>
            </div>
            <button
              className="replying-banner-close"
              onClick={() => setReplyingToMessage(null)}
              type="button"
            >
              X
            </button>
          </div>
        )}

        <textarea
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="message-textarea"
          rows="1"
        />
        <div className="message-actions">
          <button
            className="btn-action"
            title="Emoji picker"
            onClick={() => {
              setSelectedMessageForReaction(null);
              setShowEmojiPicker((current) => !current);
            }}
            type="button"
          >
            Emoji
          </button>
          <button className="btn-action" title="Attach file" onClick={onOpenFileUpload} type="button">
            File
          </button>
          <button
            className="btn-send"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            title="Send message"
            type="button"
          >
            Send
          </button>
        </div>
        {encryptionEnabled && (
          <div className="encryption-indicator">
            <span className="encryption-text">Encryption enabled</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
