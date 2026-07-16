import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const response = await axios.get('/api/messaging/admin/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStats(response.data.stats || {});
      } else if (activeTab === 'reports') {
        const response = await axios.get('/api/messaging/admin/reports', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setReports(response.data.reports || []);
      } else if (activeTab === 'users') {
        const response = await axios.get('/api/messaging/admin/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUsers(response.data.users || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId, reason) => {
    if (!window.confirm('Suspend this user?')) return;

    try {
      await axios.post(`/api/messaging/admin/users/${userId}/suspend`, {
        reason
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDashboardData();
    } catch (err) {
      setError('Failed to suspend user');
    }
  };

  const handleResolveReport = async (reportId, action) => {
    try {
      await axios.post(`/api/messaging/admin/reports/${reportId}/resolve`, {
        action
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDashboardData();
    } catch (err) {
      setError('Failed to resolve report');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  return (
    <div className="admin-dashboard-modal">
      <div className="admin-dashboard-container">
        <div className="admin-header">
          <h2>🛡️ Admin Dashboard</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="admin-content">
          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`admin-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports ({reports.filter(r => r.status === 'pending').length})
            </button>
            <button 
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button 
              className={`admin-tab ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              Metrics
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-value">{formatNumber(stats.totalUsers)}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💬</div>
                  <div className="stat-value">{formatNumber(stats.totalMessages)}</div>
                  <div className="stat-label">Total Messages</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🚨</div>
                  <div className="stat-value">{stats.pendingReports || 0}</div>
                  <div className="stat-label">Pending Reports</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-value">{stats.suspendedUsers || 0}</div>
                  <div className="stat-label">Suspended Users</div>
                </div>
              </div>

              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {stats.recentActivity?.map((activity, idx) => (
                    <div key={idx} className="activity-item">
                      <span className="activity-icon">{activity.icon}</span>
                      <span className="activity-text">{activity.text}</span>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-tab">
              <div className="reports-list">
                {reports.length === 0 ? (
                  <div className="empty-state">
                    <p>✅ No pending reports</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report._id} className={`report-item ${report.status}`}>
                      <div className="report-header">
                        <span className="report-type">{report.type}</span>
                        <span className="report-status">{report.status}</span>
                      </div>
                      <div className="report-content">
                        <p><strong>Reported by:</strong> {report.reportedBy?.name}</p>
                        <p><strong>Reported user:</strong> {report.reportedUser?.name}</p>
                        <p><strong>Reason:</strong> {report.reason}</p>
                        <p className="report-message">{report.message?.content}</p>
                      </div>
                      {report.status === 'pending' && (
                        <div className="report-actions">
                          <button 
                            onClick={() => handleResolveReport(report._id, 'dismiss')}
                            className="btn-dismiss"
                          >
                            Dismiss
                          </button>
                          <button 
                            onClick={() => handleResolveReport(report._id, 'warn')}
                            className="btn-warn"
                          >
                            Warn User
                          </button>
                          <button 
                            onClick={() => handleResolveReport(report._id, 'suspend')}
                            className="btn-suspend"
                          >
                            Suspend User
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-tab">
              <div className="users-list">
                {users.map((user) => (
                  <div key={user._id} className="user-item">
                    <div className="user-avatar">{user.name?.[0] || '?'}</div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-meta">
                        {user.email} • {user.messageCount} messages
                      </div>
                    </div>
                    <div className="user-status">
                      {user.isSuspended ? (
                        <span className="status-suspended">Suspended</span>
                      ) : (
                        <span className="status-active">Active</span>
                      )}
                    </div>
                    <div className="user-actions">
                      {!user.isSuspended && (
                        <button 
                          onClick={() => handleSuspendUser(user._id, 'Admin action')}
                          className="btn-user-action"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="metrics-tab">
              <div className="metrics-grid">
                <div className="metric-box">
                  <h4>Server Health</h4>
                  <div className="health-indicator good">
                    <span className="health-dot"></span>
                    <span>All systems operational</span>
                  </div>
                </div>
                <div className="metric-box">
                  <h4>Message Throughput</h4>
                  <p>{stats.messagesPerSecond || 0} msg/sec</p>
                </div>
                <div className="metric-box">
                  <h4>Storage Used</h4>
                  <p>{formatNumber(stats.storageUsed || 0)} MB / {formatNumber(stats.storageLimit || 0)} MB</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
