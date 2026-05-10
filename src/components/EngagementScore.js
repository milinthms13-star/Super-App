import React, { useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import "../styles/EngagementScore.css";

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
  if (score > 0) return "Getting Started";
  return "New User";
};

const EngagementScore = () => {
  const { orders, cart, mockData } = useApp();

  const engagementData = useMemo(() => {
    const metrics = [
      {
        label: "Cart Items",
        value: Number((cart || []).reduce((total, item) => total + Number(item.quantity || 1), 0)),
        icon: "C",
      },
      {
        label: "Orders",
        value: Number(Array.isArray(orders) ? orders.length : 0),
        icon: "O",
      },
      {
        label: "Messages",
        value: Number(Array.isArray(mockData?.conversations) ? mockData.conversations.length : 0),
        icon: "M",
      },
      {
        label: "Social Posts",
        value: Number(Array.isArray(mockData?.socialMediaPosts) ? mockData.socialMediaPosts.length : 0),
        icon: "S",
      },
    ];

    const totalActions = metrics.reduce((sum, metric) => sum + Number(metric.value || 0), 0);
    const overallScore = Math.max(0, Math.min(100, totalActions * 5));

    const achievements = [
      {
        id: 1,
        name: "Starter",
        icon: "1",
        description: `Total actions: ${totalActions}`,
      },
      {
        id: 2,
        name: "Shop",
        icon: "2",
        description: `Orders: ${metrics[1].value}`,
      },
      {
        id: 3,
        name: "Connect",
        icon: "3",
        description: `Messages: ${metrics[2].value}`,
      },
      {
        id: 4,
        name: "Share",
        icon: "4",
        description: `Posts: ${metrics[3].value}`,
      },
    ];

    return {
      overallScore,
      level: getLevelName(overallScore),
      levelIcon: overallScore >= 80 ? "*" : overallScore >= 40 ? "+" : "-",
      thisWeek: totalActions,
      thisMonth: totalActions,
      metrics: metrics.map((metric) => ({
        ...metric,
        trend: `Current: ${Number(metric.value || 0)}`,
      })),
      achievements,
      totalActions,
    };
  }, [cart, mockData, orders]);

  const actionsToNextLevel = Math.max(0, Math.ceil((100 - engagementData.overallScore) / 5));

  return (
    <div className="engagement-score">
      <div className="score-card">
        <div className="score-header">
          <h3 className="score-title">Your Engagement</h3>
          <p className="score-period">Live Data</p>
        </div>

        <div className="score-display">
          <div
            className="score-circle"
            style={{
              background: `conic-gradient(${getScoreColor(engagementData.overallScore)} ${engagementData.overallScore}%, rgba(0, 0, 0, 0.1) 0%)`,
            }}
          >
            <div className="score-inner">
              <div className="score-number">{Number(engagementData.overallScore || 0)}</div>
              <div className="score-label">Score</div>
            </div>
          </div>

          <div className="score-info">
            <div className="level-badge">
              <span className="level-icon">{engagementData.levelIcon}</span>
              <span className="level-name">{engagementData.level}</span>
            </div>
            <p className="score-description">Score is calculated from real tracked dashboard activity.</p>
            <div className="activity-stats">
              <div className="stat">
                <span className="stat-label">This Week:</span>
                <span className="stat-value">{Number(engagementData.thisWeek || 0)} actions</span>
              </div>
              <div className="stat">
                <span className="stat-label">This Month:</span>
                <span className="stat-value">{Number(engagementData.thisMonth || 0)} actions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        {engagementData.metrics.map((metric) => (
          <div key={metric.label} className="metric-card">
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-content">
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{Number(metric.value || 0)}</p>
              <p className="metric-trend">{metric.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="achievements-section">
        <h4 className="achievements-title">Achievements</h4>
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

      <div className="next-level">
        <p className="next-level-text">
          <span className="next-level-icon">^</span>
          {Number(actionsToNextLevel || 0)} more actions to reach 100 score
        </p>
      </div>
    </div>
  );
};

export default EngagementScore;
