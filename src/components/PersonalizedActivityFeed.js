import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PersonalizedActivityFeed.css";

const PersonalizedActivityFeed = ({ currentUser }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // Simulated personalized activity data
    const mockActivities = [
      {
        id: 1,
        type: "purchase",
        module: "ecommerce",
        title: "You bought Wireless Headphones",
        description: "Order #12345 delivered",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        icon: "🛍️",
        color: "#FF6B6B",
      },
      {
        id: 2,
        type: "message",
        module: "messaging",
        title: "New message from Sarah",
        description: '"Hey! How was your order?"',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        icon: "💬",
        color: "#4ECDC4",
      },
      {
        id: 3,
        type: "booking",
        module: "ridesharing",
        title: "You booked a ride",
        description: "Kochi → Cochin Airport (₹245)",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        icon: "🚗",
        color: "#3498DB",
      },
      {
        id: 4,
        type: "order",
        module: "fooddelivery",
        title: "Order from FoodHub",
        description: "Biryani, Raita, Gulab Jamun",
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        icon: "🍽️",
        color: "#FF5252",
      },
      {
        id: 5,
        type: "listing",
        module: "classifieds",
        title: "Saved listing: iPhone 14",
        description: "₹45,000 • Kochi, Kerala",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        icon: "📋",
        color: "#F39C12",
      },
      {
        id: 6,
        type: "social",
        module: "socialmedia",
        title: "Your post got 120 likes",
        description: '"Morning meditation at Kochi Beach"',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        icon: "👥",
        color: "#667EEA",
      },
    ];

    setActivities(mockActivities);
  }, []);

  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((a) => a.type === filter);

  const activityTypes = [
    { value: "all", label: "All Activity", icon: "📊" },
    { value: "purchase", label: "Shopping", icon: "🛍️" },
    { value: "message", label: "Messages", icon: "💬" },
    { value: "booking", label: "Bookings", icon: "🚗" },
    { value: "order", label: "Orders", icon: "🍽️" },
  ];

  return (
    <div className="personalized-activity-feed">
      <div className="feed-header">
        <h2>Your Activity</h2>
        <p className="feed-subtitle">Stay updated with your recent interactions</p>
      </div>

      <div className="feed-filters">
        {activityTypes.map((type) => (
          <button
            key={type.value}
            className={`filter-btn ${filter === type.value ? "active" : ""}`}
            onClick={() => setFilter(type.value)}
          >
            <span className="filter-icon">{type.icon}</span>
            <span className="filter-label">{type.label}</span>
          </button>
        ))}
      </div>

      <div className="activity-timeline">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity, index) => (
            <div key={activity.id} className="activity-item">
              {/* Timeline connector */}
              {index < filteredActivities.length - 1 && (
                <div className="timeline-connector"></div>
              )}

              {/* Activity node */}
              <div
                className="activity-node"
                style={{ backgroundColor: activity.color }}
              >
                <span className="node-emoji">{activity.icon}</span>
              </div>

              {/* Activity card */}
              <div
                className="activity-card"
                onClick={() => navigate(`/${activity.module}`)}
              >
                <div className="activity-header">
                  <h4 className="activity-title">{activity.title}</h4>
                  <span className="activity-time">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                <p className="activity-description">{activity.description}</p>
                <div className="activity-badge" style={{ color: activity.color }}>
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="activity-empty">
            <p className="empty-icon">📭</p>
            <p className="empty-text">No activities yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedActivityFeed;
