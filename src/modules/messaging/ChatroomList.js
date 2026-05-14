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
    const isToday = parsedDate.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = parsedDate.toDateString() === yesterday.toDateString();

    if (deltaMinutes < 1) {
      return 'Last active just now';
    }
    if (deltaMinutes < 60) {
      return `Last active ${deltaMinutes}m ago`;
    }
    if (deltaMinutes < 24 * 60 && isToday) {
      return `Last active Today at ${parsedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    if (isYesterday) {
      return 'Last active Yesterday';
    }
    if (isToday) {
      return 'Last active Today';
    }

    return `Last active ${parsedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
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
