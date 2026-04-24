import React, { useState, useEffect } from 'react';
import { getAvatarLabel, getEntityId } from './utils';

const ChatroomList = ({
  chatrooms,
  selectedChatroom,
  onSelectChatroom,
  onNewChatroom,
  onBrowseChatrooms,
  searchQuery,
  onSearchChange,
}) => {
  const [filteredChatrooms, setFilteredChatrooms] = useState(chatrooms);

  useEffect(() => {
    let filtered = chatrooms;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (room) =>
          room.name?.toLowerCase().includes(query) ||
          room.description?.toLowerCase().includes(query)
      );
    }

    setFilteredChatrooms(filtered);
  }, [chatrooms, searchQuery]);

  return (
    <div className="chatroom-list-container">
      <div className="chatroom-list-header">
        <h2>Chatrooms</h2>
        <div className="chatroom-header-actions">
          <button
            className="btn-icon"
            onClick={onBrowseChatrooms}
            title="Browse public chatrooms"
            type="button"
          >
            🔍
          </button>
          <button
            className="btn-icon primary"
            onClick={onNewChatroom}
            title="Create new chatroom"
            type="button"
          >
            ➕
          </button>
        </div>
      </div>

      <div className="chatroom-search">
        <input
          type="text"
          placeholder="Search chatrooms..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="chatroom-list">
        {filteredChatrooms.length > 0 ? (
          filteredChatrooms.map((room) => (
            <div
              key={room._id}
              className={`chatroom-item ${
                selectedChatroom?._id === room._id ? 'active' : ''
              }`}
              onClick={() => onSelectChatroom(room)}
            >
              <div className="chatroom-item-avatar">
                {getAvatarLabel(room.name, room.name, '', room.icon, 'C')}
              </div>
              <div className="chatroom-item-info">
                <h4 className="chatroom-item-name">
                  {room.name}
                  {room.isPrivate && <span className="private-badge">🔒</span>}
                </h4>
                <p className="chatroom-item-members">
                  👥 {room.memberCount} members
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-chatrooms">
            <p>No chatrooms yet.</p>
            <button
              className="btn btn-primary"
              onClick={onNewChatroom}
              type="button"
            >
              Create One
            </button>
            <button
              className="btn btn-secondary"
              onClick={onBrowseChatrooms}
              type="button"
            >
              Browse Public
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatroomList;
