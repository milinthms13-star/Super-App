import React, { useState, useEffect } from "react";
import "../styles/EngagementScore.css";

const EngagementScore = ({ currentUser }) => {
  const [engagementData, setEngagementData] = useState({
    overallScore: 78,
    level: "Power User",
    levelIcon: "⭐",
    thisWeek: 45,
    thisMonth: 156,
    metrics: [
      { label: "Purchases", value: 12, icon: "🛍️", trend: "+3 this week" },
      { label: "Messages Sent", value: 89, icon: "💬", trend: "+22 this week" },
      { label: "Rides Booked", value: 8, icon: "🚗", trend: "+2 this week" },
      { label: "Orders Placed", value: 5, icon: "🍽️", trend: "+1 this week" },
    ],
    achievements: [
      { id: 1, name: "Early Bird", icon: "🌅", description: "First 5 bookings" },
      { id: 2, name: "Social Butterfly", icon: "🦋", description: "100+ messages" },
      { id: 3, name: "Foodie", icon: "👨‍🍳", description: "10 food orders" },
      { id: 4, name: "Explorer", icon: "🗺️", description: "15 rides taken" },
    ],
  });

  const getScoreColor = (score) => {
    if (score >= 80) return "#00B894";
    if (score >= 60) return "#FFD700";
    if (score >= 40) return "#FFA500";
    return "#FF6B6B";
  };

  const getLevelName = (score) => {
    if (score >= 90) return "Legendary User";
    if (score >= 80) return "Power User";
    if (score >= 70) return "Active User";
    if (score >= 50) return "Regular User";
    return "New User";
  };

  return (
    <div className="engagement-score">
      {/* Score Card */}
      <div className="score-card">
        <div className="score-header">
          <h3 className="score-title">Your Engagement</h3>
          <p className="score-period">This Month</p>
        </div>

        <div className="score-display">
          <div
            className="score-circle"
            style={{
              background: `conic-gradient(${getScoreColor(engagementData.overallScore)} ${engagementData.overallScore}%, rgba(0, 0, 0, 0.1) 0%)`,
            }}
          >
            <div className="score-inner">
              <div className="score-number">{engagementData.overallScore}</div>
              <div className="score-label">Score</div>
            </div>
          </div>

          <div className="score-info">
            <div className="level-badge">
              <span className="level-icon">{engagementData.levelIcon}</span>
              <span className="level-name">{getLevelName(engagementData.overallScore)}</span>
            </div>
            <p className="score-description">
              You're in the top 15% of active users this month
            </p>
            <div className="activity-stats">
              <div className="stat">
                <span className="stat-label">This Week:</span>
                <span className="stat-value">{engagementData.thisWeek} actions</span>
              </div>
              <div className="stat">
                <span className="stat-label">This Month:</span>
                <span className="stat-value">{engagementData.thisMonth} actions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {engagementData.metrics.map((metric) => (
          <div key={metric.label} className="metric-card">
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-content">
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{metric.value}</p>
              <p className="metric-trend">{metric.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="achievements-section">
        <h4 className="achievements-title">🏆 Achievements</h4>
        <div className="achievements-grid">
          {engagementData.achievements.map((achievement) => (
            <div key={achievement.id} className="achievement-badge">
              <div className="achievement-icon">{achievement.icon}</div>
              <div className="achievement-tooltip">
                <p className="achievement-name">{achievement.name}</p>
                <p className="achievement-desc">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Level Progress */}
      <div className="next-level">
        <p className="next-level-text">
          <span className="next-level-icon">🚀</span>
          {Math.ceil((100 - engagementData.overallScore) / 5)} more actions to reach Legendary status
        </p>
      </div>
    </div>
  );
};

export default EngagementScore;
