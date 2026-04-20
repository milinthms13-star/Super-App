import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { buildConversations, buildNotifications, normalizeSocialPosts } from "../socialData";
import "../styles/Notifications.css";

const getNotificationColor = (type) => {
  const colors = {
    like: "#e74c3c",
    comment: "#3498db",
    follow: "#2ecc71",
    message: "#f39c12",
    mention: "#9b59b6",
    share: "#1abc9c",
  };
  return colors[type] || "#95a5a6";
};

const Notifications = () => {
  const { currentUser, mockData } = useApp();
  const generatedNotifications = useMemo(() => {
    const posts = normalizeSocialPosts(mockData?.socialMediaPosts || []);
    const conversations = buildConversations(mockData?.conversations || [], currentUser);
    return buildNotifications(posts, conversations);
  }, [currentUser, mockData?.conversations, mockData?.socialMediaPosts]);
  const [notifications, setNotifications] = useState(generatedNotifications);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setNotifications(generatedNotifications);
  }, [generatedNotifications]);

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") {
      return !notification.isRead;
    }
    if (filter === "likes") {
      return notification.notificationType === "like";
    }
    if (filter === "comments") {
      return notification.notificationType === "comment";
    }
    if (filter === "follows") {
      return notification.notificationType === "follow";
    }
    return true;
  });

  const handleMarkAsRead = (notificationId) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === notificationId ? { ...notification, isRead: true } : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {filteredNotifications.some((notification) => !notification.isRead) ? (
          <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="notification-filters">
        {[
          ["all", "All"],
          ["unread", "Unread"],
          ["likes", "Likes"],
          ["comments", "Comments"],
          ["follows", "Follows"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`filter-btn ${filter === id ? "active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <p>No notifications yet.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? "unread" : ""}`}
              style={{ borderLeftColor: getNotificationColor(notification.notificationType) }}
              onClick={() => {
                if (!notification.isRead) {
                  handleMarkAsRead(notification._id);
                }
              }}
            >
              <div className="notification-content">
                <div className="notification-header">
                  <img
                    src={notification.actor.avatar}
                    alt={notification.actor.name}
                    className="actor-avatar"
                  />
                  <div className="notification-text">
                    <h4>{notification.title}</h4>
                    <p>{notification.description}</p>
                  </div>
                </div>

                <span className="notification-time">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>

              {!notification.isRead ? <div className="unread-indicator" /> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
