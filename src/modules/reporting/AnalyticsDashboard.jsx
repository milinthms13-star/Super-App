import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import './AnalyticsDashboard.css';

/**
 * Analytics Dashboard - Phase 2 Feature 5
 * Comprehensive analytics for abuse reports including trends, patterns, and insights
 */

const AnalyticsDashboard = ({ currentUser }) => {
  // State
  const [activeTab, setActiveTab] = useState('overview'); // overview, trends, aggregation, filters
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [aggregation, setAggregation] = useState(null);
  const [filters, setFilters] = useState({
    reason: '',
    status: '',
    severity: '',
    page: 1,
    limit: 10
  });
  const [filteredReports, setFilteredReports] = useState(null);
  const [days, setDays] = useState(7);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/messaging/feature5-reporting/analytics?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Fetch trends
  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/messaging/feature5-reporting/trends?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch trends');

      const data = await response.json();
      setTrends(data.trends);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching trends:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Fetch aggregation
  const fetchAggregation = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/messaging/feature5-reporting/aggregation?timeWindow=24`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch aggregation');

      const data = await response.json();
      setAggregation(data.patterns);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching aggregation:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch filtered reports
  const fetchFilteredReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        reason: filters.reason,
        status: filters.status,
        severity: filters.severity,
        page: filters.page,
        limit: filters.limit
      });

      const response = await fetch(`${API_URL}/messaging/feature5-reporting/filter?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setFilteredReports(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
    } else if (activeTab === 'trends') {
      fetchTrends();
    } else if (activeTab === 'aggregation') {
      fetchAggregation();
    } else if (activeTab === 'filters') {
      fetchFilteredReports();
    }
  }, [activeTab, days, fetchAnalytics, fetchTrends, fetchAggregation, fetchFilteredReports]);

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>📊 Report Analytics Dashboard</h1>
        <div className="days-selector">
          <label>View last:</label>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          📊 Trends
        </button>
        <button
          className={`tab ${activeTab === 'aggregation' ? 'active' : ''}`}
          onClick={() => setActiveTab('aggregation')}
        >
          🔗 Aggregation
        </button>
        <button
          className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          🔍 Filtered Reports
        </button>
      </div>

      {loading && <div className="loading">Loading data...</div>}

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className="tab-content">
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="card">
              <div className="card-value">{analytics.summary.total}</div>
              <div className="card-label">Total Reports</div>
            </div>
            <div className="card">
              <div className="card-value">{analytics.summary.pending}</div>
              <div className="card-label">Pending</div>
            </div>
            <div className="card">
              <div className="card-value">{analytics.summary.resolved}</div>
              <div className="card-label">Resolved</div>
            </div>
            <div className="card">
              <div className="card-value">{analytics.summary.resolutionRate}</div>
              <div className="card-label">Resolution Rate</div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid">
            {/* By Category */}
            <div className="chart">
              <h3>Reports by Category</h3>
              <div className="chart-content">
                {analytics.byCategory && analytics.byCategory.map(item => (
                  <div key={item._id} className="chart-row">
                    <span className="chart-label">{item._id}</span>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar"
                        style={{
                          width: `${(item.count / (analytics.byCategory[0]?.count || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Status */}
            <div className="chart">
              <h3>Reports by Status</h3>
              <div className="chart-content">
                {analytics.byStatus && analytics.byStatus.map(item => (
                  <div key={item._id} className="chart-row">
                    <span className="chart-label">{item._id}</span>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar status-bar"
                        style={{
                          width: `${(item.count / (analytics.byStatus[0]?.count || 1)) * 100}%`,
                          backgroundColor: this.getStatusColor(item._id)
                        }}
                      />
                    </div>
                    <span className="chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Reporters */}
            <div className="chart">
              <h3>Top Reporters (Last {days} days)</h3>
              <div className="chart-content">
                {analytics.topReporters && analytics.topReporters.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="chart-row">
                    <span className="chart-label">User {idx + 1}</span>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar"
                        style={{
                          width: `${(item.count / (analytics.topReporters[0]?.count || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Reported */}
            <div className="chart">
              <h3>Most Reported Users</h3>
              <div className="chart-content">
                {analytics.topReported && analytics.topReported.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="chart-row">
                    <span className="chart-label">User {idx + 1}</span>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar warning-bar"
                        style={{
                          width: `${(item.count / (analytics.topReported[0]?.count || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends && (
        <div className="tab-content">
          <div className="trends-info">
            <p>Average per day: <strong>{trends.trend && Object.keys(trends.trend).length > 0 ? trends.avgPerDay : 'N/A'}</strong></p>
          </div>
          <div className="trend-timeline">
            {trends.trend && Object.entries(trends.trend).map(([date, data]) => (
              <div key={date} className="trend-day">
                <div className="trend-date">{date}</div>
                <div className="trend-count">
                  <div className="count-bar" style={{ height: `${Math.min(data.total * 10, 100)}px` }} />
                  <div className="count-value">{data.total}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aggregation Tab */}
      {activeTab === 'aggregation' && aggregation && (
        <div className="tab-content">
          <div className="aggregation-section">
            <h3>🚨 Serial Offenders ({aggregation.serialOffenders?.length || 0})</h3>
            {aggregation.serialOffenders && aggregation.serialOffenders.length > 0 ? (
              <div className="offenders-list">
                {aggregation.serialOffenders.map((offender, idx) => (
                  <div key={idx} className="offender-card alert-card">
                    <div className="offender-info">
                      <strong>User ID: {offender.userId}</strong>
                      <p>Reports: {offender.count} | Categories: {offender.reasons.join(', ')}</p>
                    </div>
                    {offender.shouldEscalate && (
                      <span className="escalation-badge">⚠️ ESCALATED</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No serial offenders detected</p>
            )}
          </div>

          <div className="aggregation-section">
            <h3>📈 Category Trends</h3>
            {aggregation.categoryTrends && aggregation.categoryTrends.length > 0 ? (
              <div className="trends-list">
                {aggregation.categoryTrends.map((trend, idx) => (
                  <div key={idx} className="trend-item">
                    <span className="trend-category">{trend.category}</span>
                    <span className="trend-badge">{trend.count} reports</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No trends available</p>
            )}
          </div>
        </div>
      )}

      {/* Filtered Reports Tab */}
      {activeTab === 'filters' && (
        <div className="tab-content">
          <div className="filters-row">
            <select
              value={filters.reason}
              onChange={(e) => setFilters({ ...filters, reason: e.target.value, page: 1 })}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="harassment">Harassment</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="spam">Spam</option>
              <option value="sexual_content">Sexual Content</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value, page: 1 })}
              className="filter-select"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {filteredReports && (
            <div className="reports-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.reports && filteredReports.reports.map(report => (
                    <tr key={report._id}>
                      <td>{report._id.slice(-6)}</td>
                      <td>{report.reason}</td>
                      <td><span className={`status-badge ${report.status}`}>{report.status}</span></td>
                      <td>{report.reportedBy?.email || 'Anonymous'}</td>
                      <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper method to get status color
AnalyticsDashboard.prototype.getStatusColor = function(status) {
  const colors = {
    'pending': '#ff9800',
    'investigating': '#2196f3',
    'resolved': '#4caf50',
    'dismissed': '#9e9e9e'
  };
  return colors[status] || '#999';
};

export default AnalyticsDashboard;
