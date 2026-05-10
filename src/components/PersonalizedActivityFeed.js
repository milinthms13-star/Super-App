import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import "../styles/PersonalizedActivityFeed.css";

const PersonalizedActivityFeed = () => {
  const navigate = useNavigate();
  const { cart, orders, ordersPagination, mockData } = useApp();
  const [filter, setFilter] = useState("all");

  const activities = useMemo(() => {
    const cartCount = (cart || []).reduce((total, item) => total + Number(item.quantity || 1), 0);
    const orderCount = Number(ordersPagination?.totalItems || orders?.length || 0);
    const messageCount = Array.isArray(mockData?.conversations) ? mockData.conversations.length : 0;
    const rideCount = Array.isArray(mockData?.rideOffers) ? mockData.rideOffers.length : 0;
    const socialCount = Array.isArray(mockData?.socialMediaPosts) ? mockData.socialMediaPosts.length : 0;

    const latestOrder = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;

    return [
      {
        id: "shopping",
        type: "shopping",
        module: "cart",
        title: "Cart status",
        description: `Items in cart: ${Number(cartCount || 0)}`,
        timestamp: new Date(),
        icon: "S",
        color: "#FF6B6B",
      },
      {
        id: "orders",
        type: "orders",
        module: "orders",
        title: "Orders",
        description: latestOrder
          ? `Latest order total: INR ${Number(latestOrder.amount || 0)}`
          : `Total orders: ${Number(orderCount || 0)}`,
        timestamp: latestOrder?.createdAt ? new Date(latestOrder.createdAt) : new Date(),
        icon: "O",
        color: "#F39C12",
      },
      {
        id: "messages",
        type: "messages",
        module: "messaging",
        title: "Conversations",
        description: `Tracked conversations: ${Number(messageCount || 0)}`,
        timestamp: new Date(),
        icon: "M",
        color: "#4ECDC4",
      },
      {
        id: "rides",
        type: "rides",
        module: "ridesharing",
        title: "Ride activity",
        description: `Ride listings: ${Number(rideCount || 0)}`,
        timestamp: new Date(),
        icon: "R",
        color: "#3498DB",
      },
      {
        id: "social",
        type: "social",
        module: "socialmedia",
        title: "Social activity",
        description: `Posts tracked: ${Number(socialCount || 0)}`,
        timestamp: new Date(),
        icon: "C",
        color: "#667EEA",
      },
    ];
  }, [cart, mockData, orders, ordersPagination]);

  const formatTime = (date) => {
    const now = new Date();
    const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : now;
    const diffMs = now - validDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${Math.max(0, diffMins)}m ago`;
    if (diffHours < 24) return `${Math.max(0, diffHours)}h ago`;
    if (diffDays < 7) return `${Math.max(0, diffDays)}d ago`;
    return validDate.toLocaleDateString();
  };

  const filteredActivities =
    filter === "all" ? activities : activities.filter((activity) => activity.type === filter);

  const activityTypes = [
    { value: "all", label: "All Activity", icon: "A" },
    { value: "shopping", label: "Shopping", icon: "S" },
    { value: "messages", label: "Messages", icon: "M" },
    { value: "rides", label: "Rides", icon: "R" },
    { value: "orders", label: "Orders", icon: "O" },
  ];

  return (
    <div className="personalized-activity-feed">
      <div className="feed-header">
        <h2>Your Activity</h2>
        <p className="feed-subtitle">Live dashboard summary based on your account data</p>
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
        {filteredActivities.map((activity, index) => (
          <div key={activity.id} className="activity-item">
            {index < filteredActivities.length - 1 && <div className="timeline-connector"></div>}

            <div className="activity-node" style={{ backgroundColor: activity.color }}>
              <span className="node-emoji">{activity.icon}</span>
            </div>

            <div className="activity-card" onClick={() => navigate(`/${activity.module}`)}>
              <div className="activity-header">
                <h4 className="activity-title">{activity.title}</h4>
                <span className="activity-time">{formatTime(activity.timestamp)}</span>
              </div>
              <p className="activity-description">{activity.description}</p>
              <div className="activity-badge" style={{ color: activity.color }}>
                {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalizedActivityFeed;
