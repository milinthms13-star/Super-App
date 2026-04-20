import React, { useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { normalizeSocialPosts } from "../socialData";
import "../../../styles/CreatorAnalytics.css";

const StatCard = ({ title, value, change, icon, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon" style={{ background: color }}>
      {icon}
    </div>
    <div className="stat-content">
      <h3>{value}</h3>
      <p>{title}</p>
      {change && (
        <span className={`stat-change ${change > 0 ? 'positive' : 'negative'}`}>
          {change > 0 ? '↗' : '↘'} {Math.abs(change)}%
        </span>
      )}
    </div>
  </div>
);

const Chart = ({ data, type = 'line' }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="chart">
      <div className="chart-bars">
        {data.map((item, index) => (
          <div key={index} className="chart-bar">
            <div
              className="bar-fill"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                background: `hsl(${index * 30}, 70%, 50%)`
              }}
            ></div>
            <span className="bar-label">{item.label}</span>
            <span className="bar-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreatorAnalytics = () => {
  const { mockData, currentUser } = useApp();
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  const posts = useMemo(
    () => normalizeSocialPosts(mockData?.socialMediaPosts || []),
    [mockData?.socialMediaPosts]
  );

  const userPosts = useMemo(
    () => posts.filter(post => String(post.author._id) === String(currentUser?._id)),
    [posts, currentUser]
  );

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalPosts = userPosts.length;
    const totalLikes = userPosts.reduce((sum, post) => sum + (post.likeCount || 0), 0);
    const totalComments = userPosts.reduce((sum, post) => sum + (post.commentCount || 0), 0);
    const totalShares = userPosts.reduce((sum, post) => sum + (post.shareCount || 0), 0);
    const totalViews = totalLikes * 3 + totalComments * 5 + totalShares * 10; // Estimated views

    // Calculate engagement rate
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 : 0;

    // Top performing posts
    const topPosts = [...userPosts]
      .sort((a, b) => (b.likeCount + b.commentCount + b.shareCount) - (a.likeCount + a.commentCount + a.shareCount))
      .slice(0, 5);

    // Posting frequency (posts per day)
    const daysSinceFirstPost = userPosts.length > 0 ?
      (Date.now() - new Date(userPosts[userPosts.length - 1].createdAt)) / (1000 * 60 * 60 * 24) : 1;
    const postingFrequency = totalPosts / Math.max(daysSinceFirstPost, 1);

    // Growth metrics (mock data for demo)
    const growthMetrics = {
      followers: 1250,
      followerGrowth: 12.5,
      posts: totalPosts,
      postGrowth: 8.3,
      likes: totalLikes,
      likeGrowth: 15.2,
      engagement: engagementRate.toFixed(1),
      engagementGrowth: 6.8
    };

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      engagementRate: engagementRate.toFixed(1),
      topPosts,
      postingFrequency: postingFrequency.toFixed(1),
      growthMetrics
    };
  }, [userPosts]);

  // Mock chart data
  const chartData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return Array.from({ length: days }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 100) + 20
    }));
  }, [timeRange]);

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  return (
    <div className="creator-analytics">
      <div className="analytics-header">
        <h2>📊 Creator Analytics</h2>
        <p>Track your content performance and audience growth</p>

        <div className="time-range-selector">
          {timeRangeOptions.map(option => (
            <button
              key={option.value}
              className={`time-btn ${timeRange === option.value ? 'active' : ''}`}
              onClick={() => setTimeRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <StatCard
          title="Total Posts"
          value={analytics.totalPosts}
          change={analytics.growthMetrics.postGrowth}
          icon="📝"
          color="#667eea"
        />
        <StatCard
          title="Total Likes"
          value={analytics.totalLikes}
          change={analytics.growthMetrics.likeGrowth}
          icon="❤️"
          color="#e74c3c"
        />
        <StatCard
          title="Total Comments"
          value={analytics.totalComments}
          change={5.2}
          icon="💬"
          color="#3498db"
        />
        <StatCard
          title="Engagement Rate"
          value={`${analytics.engagementRate}%`}
          change={analytics.growthMetrics.engagementGrowth}
          icon="📈"
          color="#2ecc71"
        />
        <StatCard
          title="Estimated Views"
          value={analytics.totalViews.toLocaleString()}
          change={18.7}
          icon="👁️"
          color="#f39c12"
        />
        <StatCard
          title="Followers"
          value={analytics.growthMetrics.followers.toLocaleString()}
          change={analytics.growthMetrics.followerGrowth}
          icon="👥"
          color="#9b59b6"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Engagement Over Time</h3>
          <Chart data={chartData} />
        </div>

        <div className="chart-card">
          <h3>🎯 Posting Frequency</h3>
          <div className="frequency-stat">
            <div className="frequency-number">{analytics.postingFrequency}</div>
            <div className="frequency-label">posts per day</div>
            <div className="frequency-recommendation">
              {parseFloat(analytics.postingFrequency) > 1.5 ? 'High activity!' :
               parseFloat(analytics.postingFrequency) > 0.5 ? 'Good pace' : 'Consider posting more'}
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Posts */}
      <div className="top-posts-section">
        <h3>🏆 Top Performing Posts</h3>
        <div className="top-posts-list">
          {analytics.topPosts.map((post, index) => {
            const engagement = post.likeCount + post.commentCount + post.shareCount;
            return (
              <div key={post._id} className="top-post-item">
                <div className="post-rank">#{index + 1}</div>
                <div className="post-preview">
                  <p>{post.content.substring(0, 100)}...</p>
                  <div className="post-stats">
                    <span>❤️ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                    <span>🔄 {post.shareCount}</span>
                    <span className="engagement-score">Score: {engagement}</span>
                  </div>
                </div>
                <div className="post-date">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="insights-section">
        <h3>💡 Insights & Recommendations</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>📊 Best Posting Time</h4>
            <p>Based on your engagement data, try posting between 7-9 PM for maximum reach.</p>
          </div>
          <div className="insight-card">
            <h4>🎨 Content Type Performance</h4>
            <p>Posts with images get 2.3x more engagement than text-only posts.</p>
          </div>
          <div className="insight-card">
            <h4>📱 Audience Growth</h4>
            <p>Your follower growth rate is above average. Keep creating quality content!</p>
          </div>
          <div className="insight-card">
            <h4>🔥 Trending Topics</h4>
            <p>Posts about technology and lifestyle are performing well in your niche.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorAnalytics;