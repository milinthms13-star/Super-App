import React, { useEffect, useState } from 'react';
import { getAvatarLabel } from './utils';

const ChatroomList = ({
  chatrooms,
  selectedChatroom,
  onSelectChatroom,
  onNewChatroom,
  onBrowseChatrooms,
  searchQuery,
  onSearchChange,
  loading = false,
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

  const formatChatroomActivity = (room) => {
    if (!room?.lastMessageAt && !room?.updatedAt) {
      return 'No recent activity';
    }

    const timestamp = room?.lastMessageAt || room?.updatedAt;
    const parsedDate = new Date(timestamp);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Recently active';
    }

    const now = new Date();
    const deltaMinutes = Math.floor((now.getTime() - parsedDate.getTime()) / 60000);

    if (deltaMinutes < 1) {
      return 'Active now';
    }
    if (deltaMinutes < 60) {
      return `Active ${deltaMinutes}m ago`;
    }
    if (deltaMinutes < 24 * 60) {
      return `Active ${Math.floor(deltaMinutes / 60)}h ago`;
    }

    return `Active ${parsedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  const getRoomTone = (room) => {
    const memberCount = Number(room?.memberCount || 0);
    if (memberCount >= 100) {
      return 'trending';
    }
    if (room?.isPrivate) {
      return 'private';
    }
    return 'public';
  };

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
            Browse
          </button>
          <button
            className="btn-icon primary"
            onClick={onNewChatroom}
            title="Create new chatroom"
            type="button"
          >
            Create
          </button>
        </div>
      </div>

      <div className="chatroom-search">
        <input
          type="text"
          placeholder="Search chatrooms..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="search-input"
        />
      </div>

      <div className="chatroom-list">
        {loading ? (
          <div className="empty-chatrooms">
            <p>Loading chatrooms...</p>
          </div>
        ) : filteredChatrooms.length > 0 ? (
          filteredChatrooms.map((room) => (
            <div
              key={room._id}
              className={`chatroom-item ${
                selectedChatroom?._id === room._id ? 'active' : ''
              } ${getRoomTone(room)}`}
              onClick={() => onSelectChatroom(room)}
            >
              <div className="chatroom-item-avatar">
                {getAvatarLabel(room.name, room.name, '', room.icon, 'C')}
              </div>
              <div className="chatroom-item-info">
                <div className="chatroom-item-heading">
                  <h4 className="chatroom-item-name">{room.name}</h4>
                  <div className="chatroom-badges">
                    <span className={`chatroom-badge ${room.isPrivate ? 'private' : 'public'}`}>
                      {room.isPrivate ? 'Private' : 'Public'}
                    </span>
                    {Number(room?.memberCount || 0) >= 100 && (
                      <span className="chatroom-badge trending">Trending</span>
                    )}
                  </div>
                </div>
                <p className="chatroom-item-members">
                  {Number(room?.memberCount || 0)} members
                </p>
                {room?.description && (
                  <p className="chatroom-description-preview">{room.description}</p>
                )}
                <p className="chatroom-activity">{formatChatroomActivity(room)}</p>
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
