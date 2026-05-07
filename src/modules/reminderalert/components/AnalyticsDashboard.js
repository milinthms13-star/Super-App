import React, { useState, useEffect } from 'react';
import { getDashboardOverview, getChannelComparison, getReminderTypeAnalysis } from '../../../services/remindersService';
import './AnalyticsDashboard.css';

/**
 * Analytics Dashboard Component
 * Displays delivery metrics, channel performance, and trends
 * Phase 5 Feature
 */
const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [reminderTypeData, setReminderTypeData] = useState(null);
  const [daysBack, setDaysBack] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [daysBack]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboard, channels, reminderTypes] = await Promise.all([
        getDashboardOverview(daysBack),
        getChannelComparison(daysBack),
        getReminderTypeAnalysis(daysBack)
      ]);

      setDashboardData(dashboard);
      setChannelData(channels);
      setReminderTypeData(reminderTypes);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  if (!dashboardData) {
    return <div className="analytics-empty">No data available</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>📊 Reminder Delivery Analytics</h2>
        <div className="days-selector">
          <button
            className={daysBack === 7 ? 'active' : ''}
            onClick={() => setDaysBack(7)}
          >
            7 days
          </button>
          <button
            className={daysBack === 30 ? 'active' : ''}
            onClick={() => setDaysBack(30)}
          >
            30 days
          </button>
          <button
            className={daysBack === 90 ? 'active' : ''}
            onClick={() => setDaysBack(90)}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Success Rate Card */}
      <div className="analytics-card success-rate">
        <h3>Overall Success Rate</h3>
        <div className="success-metrics">
          <div className="metric">
            <span className="label">Success Rate</span>
            <span className="value">{dashboardData.successRate?.successRate || 0}%</span>
          </div>
          <div className="metric">
            <span className="label">Total Deliveries</span>
            <span className="value">{dashboardData.successRate?.totalDeliveries || 0}</span>
          </div>
          <div className="metric">
            <span className="label">Successful</span>
            <span className="value success">{dashboardData.successRate?.successfulDeliveries || 0}</span>
          </div>
          <div className="metric">
            <span className="label">Failed</span>
            <span className="value failed">{dashboardData.successRate?.failedDeliveries || 0}</span>
          </div>
        </div>
      </div>

      {/* Channel Breakdown */}
      {channelData && channelData.length > 0 && (
        <div className="analytics-card channel-breakdown">
          <h3>📱 Channel Performance</h3>
          <div className="channel-list">
            {channelData.map((channel, idx) => (
              <div key={idx} className="channel-item">
                <div className="channel-name">{channel._id}</div>
                <div className="channel-stats">
                  <span>Total: {channel.total}</span>
                  <span className="success">Sent: {channel.sent}</span>
                  <span className="failed">Failed: {channel.failed}</span>
                  <span>Rate: {channel.successRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminder Type Analysis */}
      {reminderTypeData && reminderTypeData.length > 0 && (
        <div className="analytics-card type-analysis">
          <h3>📋 Reminder Types</h3>
          <div className="type-list">
            {reminderTypeData.map((type, idx) => (
              <div key={idx} className="type-item">
                <div className="type-name">{type._id || 'Uncategorized'}</div>
                <div className="type-stats">
                  <span>Total: {type.total}</span>
                  <span className="success">Success Rate: {type.successRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Delivery Times */}
      {dashboardData.peakTimes && dashboardData.peakTimes.length > 0 && (
        <div className="analytics-card peak-times">
          <h3>⏰ Peak Delivery Hours</h3>
          <div className="time-list">
            {dashboardData.peakTimes.slice(0, 5).map((time, idx) => (
              <div key={idx} className="time-item">
                <span className="hour">{time.hour}:00</span>
                <span className="deliveries">{time.deliveries} deliveries</span>
                <span className="rate">{time.rate}% success</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failure Analysis */}
      {dashboardData.failureAnalysis && dashboardData.failureAnalysis.length > 0 && (
        <div className="analytics-card failure-analysis">
          <h3>⚠️ Common Failures</h3>
          <div className="failure-list">
            {dashboardData.failureAnalysis.map((failure, idx) => (
              <div key={idx} className="failure-item">
                <span className="error">{failure.error}</span>
                <span className="count">{failure.count} occurrences</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
