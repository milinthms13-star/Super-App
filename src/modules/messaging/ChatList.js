import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  getAvatarLabel,
  getChatClearTimestamp,
  isMessageHiddenByClear,
  isSameEntity,
} from './utils';

const ChatList = ({
  chats,
  selectedChat,
  onSelectChat,
  onNewChat,
  searchQuery,
  onSearchChange,
  clearedChats = {},
}) => {
  const { currentUser } = useApp();
  const [filteredChats, setFilteredChats] = useState(chats);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredChats(
        chats.filter(
          (chat) =>
            chat.groupName?.toLowerCase().includes(query) ||
            chat.participants?.some((participant) => participant.name?.toLowerCase().includes(query))
        )
      );
      return;
    }

    setFilteredChats(chats);
  }, [searchQuery, chats]);

  const getOtherUser = (chat) =>
    chat.participants?.find((participant) => !isSameEntity(participant, currentUser));

  const getChatTitle = (chat) => {
    if (chat.type === 'group') {
      return chat.groupName;
    }

    return getOtherUser(chat)?.name || 'Unknown User';
  };

  const getChatAvatar = (chat) => {
    if (chat.type === 'group') {
      return getAvatarLabel(chat.groupName, 'GR');
    }

    const otherUser = getOtherUser(chat);
    return getAvatarLabel(otherUser?.name, otherUser?.username, otherUser?.avatar, 'U');
  };

  const getChatPreview = (chat) => {
    // Show typing indicator if user is typing
    if (chat.typing) {
      return (
        <span className="typing-indicator-preview" aria-label="Typing">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-label">typing...</span>
        </span>
      );
    }

    const lastMessage = chat.lastMessage;
    const clearedAt = getChatClearTimestamp(chat?._id, clearedChats);
    const lastVisibleCandidate = lastMessage || { createdAt: chat?.lastMessageAt };

    if (isMessageHiddenByClear(lastVisibleCandidate, clearedAt)) {
      return 'Chat cleared. New messages will appear here.';
    }

    if (!lastMessage) {
      return 'No messages yet';
    }

    switch (lastMessage.messageType) {
      case 'sticker':
        return `🏷️ Sticker: ${lastMessage.content || 'Shared'}`;
      case 'location':
        return '📍 Location shared';
      case 'voice':
        return '🎙️ Voice note';
      case 'audio':
        return '🎵 Audio message';
      case 'image':
        return '📷 Photo shared';
      case 'video':
        return '🎬 Video shared';
      case 'file':
        return lastMessage.content || '📄 File shared';
      default:
        return lastMessage.content?.substring(0, 50) || 'No messages yet';
    }
  };

  const getChatTime = (chat) => {
    const clearedAt = getChatClearTimestamp(chat?._id, clearedChats);
    if (isMessageHiddenByClear(chat?.lastMessage || { createdAt: chat?.lastMessageAt }, clearedAt)) {
      return '';
    }

    if (!chat.lastMessageAt) {
      return '';
    }

    const messageTime = new Date(chat.lastMessageAt);
    const now = new Date();
    const isToday = messageTime.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = messageTime.toDateString() === yesterday.toDateString();

    if (isToday) {
      return messageTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (isYesterday) {
      return 'Yesterday';
    }

    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getPresenceText = (chat, otherUser) => {
    if (chat.type === 'group') {
      const memberCount = Number(chat.memberCount || chat.participants?.length || 0);
      return memberCount > 0 ? `${memberCount} members` : 'Group chat';
    }

    if (chat.typing) {
      return 'Typing now';
    }

    if (otherUser?.online) {
      return 'Online now';
    }

    if (otherUser?.lastSeen) {
      return `Last active ${otherUser.lastSeen}`;
    }

    if (chat.lastMessageAt) {
      return `Last active ${getChatTime(chat)}`;
    }

    return 'No activity yet';
  };

  const getDeliveryState = (chat) => {
    const lastMessage = chat?.lastMessage;
    if (!lastMessage || !isSameEntity(lastMessage?.senderId, currentUser)) {
      return '';
    }

    if (lastMessage?.read || lastMessage?.seenAt) {
      return 'Seen';
    }

    const hasDeliveredStatus = Array.isArray(lastMessage?.deliveryStatus)
      && lastMessage.deliveryStatus.some((status) => (
        status?.status === 'delivered' || status?.status === 'seen'
      ));

    if (hasDeliveredStatus || lastMessage?.deliveredAt) {
      return 'Delivered';
    }

    return 'Sent';
  };

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <div className="chat-list-header-copy">
          <h2>LinkUp</h2>
          <p className="chat-list-subtitle">Private chats, voice notes, and quick replies</p>
        </div>
        <button className="btn-new-chat" onClick={onNewChat} title="Start new chat" type="button">
          ➕ New Chat
        </button>
      </div>

      <div className="chat-search">
        <input
          type="text"
          placeholder="Search chats or names..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="search-input"
        />
      </div>

      <div className="chats-list">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const otherUser = getOtherUser(chat);
            const isOnline = otherUser?.online === true;
            
            return (
              <div
                key={chat._id}
                className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="chat-avatar-container">
                  <span className={`chat-avatar ${isOnline ? 'online-glow' : ''}`}>{getChatAvatar(chat)}</span>
                  {isOnline && <span className="online-indicator"></span>}
                </div>
                <div className="chat-item-info">
                  <div className="chat-top-line">
                    <h4 className="chat-title">{getChatTitle(chat)}</h4>
                    {chat?.type === 'group' && <span className="chat-type-badge">Group</span>}
                    {chat?.isPinned && <span className="chat-type-badge pinned">Pinned</span>}
                    {chat?.typing && <span className="chat-typing-inline">typing...</span>}
                  </div>
                  <p className="chat-preview">{getChatPreview(chat)}</p>
                  <p className={`chat-presence ${isOnline ? 'online' : ''}`}>
                    {getPresenceText(chat, otherUser)}
                  </p>
                </div>
                <div className="chat-item-meta">
                  <span className="chat-time">{getChatTime(chat)}</span>
                  {chat.unreadCount > 0 && (
                    <span className="unread-badge" title={`${chat.unreadCount} unread message${chat.unreadCount > 1 ? 's' : ''}`}>
                      {chat.unreadCount}
                    </span>
                  )}
                  {getDeliveryState(chat) && (
                    <span className="chat-delivery-state">
                      {getDeliveryState(chat)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-chats">
            <h3>No conversations yet</h3>
            <p>Your chats will appear here as soon as someone messages you.</p>
            <button className="btn-start-chat" onClick={onNewChat} type="button">
              Start a chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
