import React, { useState, useMemo } from 'react';

const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'message',
      sender: 'Raj Kumar',
      title: 'Interested in Gaming Laptop',
      message: 'Is this still available?',
      timestamp: new Date(Date.now() - 600000),
      read: false,
      avatar: '/avatar1.png',
    },
    {
      id: 2,
      type: 'favorite',
      sender: 'Priya Sharma',
      title: 'Saved your listing',
      message: 'Someone saved "iPhone 13 Pro Max"',
      timestamp: new Date(Date.now() - 1800000),
      read: false,
      avatar: '/avatar2.png',
    },
    {
      id: 3,
      type: 'review',
      sender: 'System',
      title: 'New review received',
      message: 'Arjun gave you 5 stars on "Gaming Laptop"',
      timestamp: new Date(Date.now() - 3600000),
      read: true,
      avatar: '/default-avatar.png',
    },
    {
      id: 4,
      type: 'price-alert',
      sender: 'System',
      title: 'Price drop detected',
      message: 'Your listing "Budget Phone" dropped by ₹5,000',
      timestamp: new Date(Date.now() - 7200000),
      read: true,
      avatar: '/default-avatar.png',
    },
  ]);

  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = filterType === 'all' 
      ? notifications 
      : notifications.filter(n => n.type === filterType);

    // Sort
    if (sortBy === 'newest') {
      filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortBy === 'oldest') {
      filtered = filtered.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortBy === 'unread') {
      filtered = filtered.filter(n => !n.read).sort((a, b) => b.timestamp - a.timestamp);
    }

    return filtered;
  }, [notifications, filterType, sortBy]);

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Delete notification
  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Delete all
  const deleteAll = () => {
    setNotifications([]);
  };

  // Format time
  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'favorite':
        return '❤️';
      case 'review':
        return '⭐';
      case 'price-alert':
        return '🔔';
      case 'follower':
        return '👤';
      case 'order':
        return '📦';
      default:
        return 'ℹ️';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-center">
      {/* Header */}
      <div className="notification-header">
        <div className="header-title">
          <h2>🔔 Notifications</h2>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <button
          className="notification-close-btn"
          onClick={onClose}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="notification-controls">
        <select
          className="notification-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Notifications</option>
          <option value="message">💬 Messages</option>
          <option value="favorite">❤️ Favorites</option>
          <option value="review">⭐ Reviews</option>
          <option value="price-alert">🔔 Price Alerts</option>
          <option value="follower">👤 Followers</option>
          <option value="order">📦 Orders</option>
        </select>

        <select
          className="notification-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="unread">Unread Only</option>
        </select>

        <div className="notification-actions">
          {unreadCount > 0 && (
            <button
              className="action-btn"
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              ✓ Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              className="action-btn delete"
              onClick={deleteAll}
              title="Delete all notifications"
            >
              🗑️ Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-item ${notif.read ? 'read' : 'unread'}`}
            >
              <div className="notification-avatar">
                <img src={notif.avatar} alt={notif.sender} />
              </div>

              <div className="notification-content">
                <div className="content-header">
                  <span className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </span>
                  <span className="notification-title">{notif.title}</span>
                  <span className="notification-time">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>

                <p className="notification-message">
                  <strong>{notif.sender}:</strong> {notif.message}
                </p>

                {/* Actions */}
                <div className="notification-item-actions">
                  {notif.type === 'message' && (
                    <button className="reply-btn">Reply</button>
                  )}
                  {notif.type === 'favorite' && (
                    <button className="view-btn">View Item</button>
                  )}
                  {notif.type === 'review' && (
                    <button className="view-btn">View Review</button>
                  )}
                  {notif.type === 'price-alert' && (
                    <button className="view-btn">View Listing</button>
                  )}
                  {!notif.read && (
                    <button
                      className="read-btn"
                      onClick={() => markAsRead(notif.id)}
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    className="delete-btn"
                    onClick={() => deleteNotification(notif.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {!notif.read && <div className="unread-indicator" />}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="notification-footer">
        <button className="notification-settings-btn">
          ⚙️ Notification Settings
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
