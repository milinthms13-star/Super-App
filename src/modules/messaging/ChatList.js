import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';

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

const ChatList = ({
  chats,
  selectedChat,
  onSelectChat,
  onNewChat,
  searchQuery,
  onSearchChange,
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
    chat.participants?.find((participant) => getId(participant) !== getId(currentUser));

  const getChatTitle = (chat) => {
    if (chat.type === 'group') {
      return chat.groupName;
    }

    return getOtherUser(chat)?.name || 'Unknown User';
  };

  const getChatAvatar = (chat) => {
    if (chat.type === 'group') {
      return chat.groupIcon || 'GRP';
    }

    return getOtherUser(chat)?.avatar || 'USR';
  };

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h2>Chats</h2>
        <button className="btn-new-chat" onClick={onNewChat} title="Start new chat" type="button">
          New
        </button>
      </div>

      <div className="chat-search">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
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
              <span className="chat-avatar">{getChatAvatar(chat)}</span>
              <div className="chat-item-info">
                <h4 className="chat-title">{getChatTitle(chat)}</h4>
                <p className="chat-preview">
                  {chat.lastMessage?.content?.substring(0, 50) || 'No messages yet'}
                </p>
              </div>
              {chat.unreadCount > 0 && <span className="unread-badge">{chat.unreadCount}</span>}
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
