import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';

const ChatList = ({ chats, selectedChat, onSelectChat, onNewChat, searchQuery, onSearchChange }) => {
  const { currentUser } = useApp();
  const [filteredChats, setFilteredChats] = useState(chats);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredChats(
        chats.filter(
          (chat) =>
            chat.groupName?.toLowerCase().includes(query) ||
            chat.participants?.some((p) => p.name?.toLowerCase().includes(query))
        )
      );
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const getOtherUser = (chat, currentUser) => {
    return chat.participants?.find((p) => p._id !== currentUser._id);
  };

  const getChatTitle = (chat, currentUser) => {
    if (chat.type === 'group') {
      return chat.groupName;
    }
    const otherUser = getOtherUser(chat, currentUser);
    return otherUser?.name || 'Unknown User';
  };

  const getChatAvatar = (chat, currentUser) => {
    if (chat.type === 'group') {
      return chat.groupIcon || '👥';
    }
    const otherUser = getOtherUser(chat, currentUser);
    return otherUser?.avatar || '👤';
  };

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h2>💬 Chats</h2>
        <button className="btn-new-chat" onClick={onNewChat} title="Start new chat">
          ✏️
        </button>
      </div>

      <div className="chat-search">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="chats-list">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div
              key={chat._id}
              className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat)}
            >
              <span className="chat-avatar">{getChatAvatar(chat, currentUser)}</span>
              <div className="chat-item-info">
                <h4 className="chat-title">{getChatTitle(chat, currentUser)}</h4>
                <p className="chat-preview">
                  {chat.lastMessage?.content?.substring(0, 50) || 'No messages yet'}
                </p>
              </div>
              {chat.unreadCount > 0 && (
                <span className="unread-badge">{chat.unreadCount}</span>
              )}
              <span className="chat-time">
                {chat.lastMessageAt
                  ? new Date(chat.lastMessageAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>
          ))
        ) : (
          <div className="empty-chats">
            <p>No conversations yet</p>
            <button className="btn-start-chat" onClick={onNewChat}>
              Start a chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
