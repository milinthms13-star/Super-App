import React, { useState, useEffect } from 'react';

const NotificationPanel = ({ notifications = [], onClear, onSelectNotification }) => {
  const [displayNotifications, setDisplayNotifications] = useState(notifications);

  useEffect(() => {
    setDisplayNotifications(notifications);
  }, [notifications]);

  const handleDismiss = (notificationId, event) => {
    event.stopPropagation();
    setDisplayNotifications((prev) =>
      prev.filter((notification) => String(notification._id || notification.id) !== String(notificationId))
    );
  };

  const unreadCount = displayNotifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <h3>
          Notifications
          {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
        </h3>
        <div className="notification-header-actions">
          {displayNotifications.length > 0 && (
            <button className="clear-all-btn" onClick={onClear} type="button" title="Clear all notifications">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="notification-list">
        {displayNotifications.length === 0 ? (
          <div className="empty-notifications">
            <p>No notifications</p>
          </div>
        ) : (
          displayNotifications.map((notification) => (
            <div
              key={notification._id || notification.id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => onSelectNotification(notification)}
            >
              <div className="notification-content">
                <div className="notification-header">
                  <span className="notification-title">{notification.title}</span>
                  <span className="notification-time">
                    {new Date(notification.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="notification-body">{notification.body}</p>
              </div>
              <button
                className="dismiss-btn"
                onClick={(event) => handleDismiss(notification._id || notification.id, event)}
                type="button"
                title="Dismiss"
              >
                X
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
