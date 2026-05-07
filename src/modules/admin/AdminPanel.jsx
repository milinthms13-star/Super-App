import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../config';
import ModerationWebSocketClient from '../../websocket/moderationWebSocketClient';
import './AdminPanel.css';

/**
 * Admin Moderation Panel - Phase 2 Feature 3 + Feature 4
 * Comprehensive dashboard with REAL-TIME updates
 * 
 * Features:
 * - View pending moderation queue (real-time updates)
 * - Review abuse reports with evidence
 * - Take moderation actions (warn, suspend, ban, remove content)
 * - Handle appeals
 * - View moderation statistics and analytics (live)
 * - Audit trail of all actions
 * - Real-time moderator collaboration (task claiming)
 */

const AdminPanel = ({ currentUser }) => {
  // WebSocket client ref
  const wsClientRef = useRef(null);
  
  // State
  const [view, setView] = useState('queue'); // queue, report, analytics, audit
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: 'open',
    severity: '',
    category: '',
    sortBy: 'createdAt'
  });
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Real-time state
  const [wsConnected, setWsConnected] = useState(false);
  const [activeModerators, setActiveModerators] = useState(0);
  const [claimedTasks, setClaimedTasks] = useState(new Map());
  const [pendingNotifications, setPendingNotifications] = useState([]);

  // Fetch pending reports for moderation queue
  const fetchPendingReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/messaging/admin/reports?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch moderation statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/messaging/admin/analytics?days=7`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (view === 'queue') {
      fetchPendingReports();
    } else if (view === 'analytics') {
      fetchStats();
    }
  }, [view, fetchPendingReports, fetchStats]);

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = currentUser?.id || 'moderator';
        const role = currentUser?.role || 'moderator';

        if (!wsClientRef.current) {
          wsClientRef.current = new ModerationWebSocketClient();
        }

        // Connect to WebSocket server
        await wsClientRef.current.connect(token, userId, role);
        setWsConnected(true);

        // Setup event listeners
        wsClientRef.current.on('connected', (data) => {
          console.log('[AdminPanel] Connected to real-time service');
          setSuccess('Connected to real-time updates');
          setTimeout(() => setSuccess(''), 3000);
        });

        wsClientRef.current.on('new_report', (data) => {
          console.log('[AdminPanel] New report received:', data);
          // Refresh reports list
          fetchPendingReports();
          // Show notification
          addNotification('New report in queue!', 'info');
        });

        wsClientRef.current.on('task_claimed', (data) => {
          console.log('[AdminPanel] Task claimed:', data);
          const claimed = new Map(claimedTasks);
          claimed.set(data.taskId, { reportId: data.reportId, claimedAt: data.timestamp });
          setClaimedTasks(claimed);
        });

        wsClientRef.current.on('task_released', (data) => {
          console.log('[AdminPanel] Task released:', data);
          const claimed = new Map(claimedTasks);
          claimed.delete(data.taskId);
          setClaimedTasks(claimed);
        });

        wsClientRef.current.on('queue_stats_update', (data) => {
          console.log('[AdminPanel] Queue stats updated:', data);
          setActiveModerators(data.data.activeModerators);
          // Auto-refresh if not viewing report detail
          if (view === 'queue') {
            setStats(data.data);
          }
        });

        wsClientRef.current.on('user_warned', (data) => {
          console.log('[AdminPanel] User warned event:', data);
          addNotification(`User ${data.userId} warned (${data.warningCount}/3)`, 'warning');
          fetchPendingReports();
        });

        wsClientRef.current.on('user_suspended', (data) => {
          console.log('[AdminPanel] User suspended event:', data);
          addNotification(`User ${data.userId} suspended`, 'warning');
          fetchPendingReports();
        });

        wsClientRef.current.on('user_banned', (data) => {
          console.log('[AdminPanel] User banned event:', data);
          addNotification(`User ${data.userId} banned`, 'error');
          fetchPendingReports();
        });

        wsClientRef.current.on('report_resolved', (data) => {
          console.log('[AdminPanel] Report resolved event:', data);
          addNotification(`Report resolved: ${data.resolution}`, 'success');
          fetchPendingReports();
        });

        wsClientRef.current.on('disconnected', () => {
          console.log('[AdminPanel] WebSocket disconnected');
          setWsConnected(false);
          addNotification('Connection lost, attempting to reconnect...', 'warning');
        });

        wsClientRef.current.on('reconnect_failed', () => {
          console.log('[AdminPanel] WebSocket reconnect failed');
          setError('Failed to reconnect to real-time service');
        });

        wsClientRef.current.on('error', (data) => {
          console.error('[AdminPanel] WebSocket error:', data);
          addNotification('Real-time connection error', 'error');
        });

        // Request initial queue stats
        wsClientRef.current.requestQueueStats();
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
        addNotification('Failed to connect to real-time service', 'error');
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, [currentUser, view]);

  // Add notification helper
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setPendingNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setPendingNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Handle report selection
  const handleSelectReport = async (reportId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/messaging/admin/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch report details');

      const report = await response.json();
      setSelectedReport(report);
      setView('report');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Warn user action
  const handleWarnUser = async (userId) => {
    const reason = window.prompt('Enter warning reason:');
    if (!reason) return;

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/messaging/admin/users/${userId}/warn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason, severity: 'medium' })
      });

      if (!response.ok) throw new Error('Failed to warn user');

      setSuccess(`User warned successfully`);
      setTimeout(() => setSuccess(''), 3000);
      fetchPendingReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Suspend user action
  const handleSuspendUser = async (userId) => {
    const days = window.prompt('Enter suspension days (default: 7):');
    const reason = window.prompt('Enter suspension reason:');

    if (!reason) return;

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/messaging/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          days: parseInt(days) || 7,
          reason
        })
      });

      if (!response.ok) throw new Error('Failed to suspend user');

      setSuccess(`User suspended for ${days || 7} days`);
      setTimeout(() => setSuccess(''), 3000);
      fetchPendingReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Ban user action
  const handleBanUser = async (userId) => {
    if (!window.confirm('Are you sure? This action cannot be undone easily.')) return;

    const reason = window.prompt('Enter ban reason:');
    if (!reason) return;

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/messaging/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) throw new Error('Failed to ban user');

      setSuccess(`User banned successfully`);
      setTimeout(() => setSuccess(''), 3000);
      fetchPendingReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Resolve report
  const handleResolveReport = async (reportId, resolution) => {
    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/messaging/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          resolution,
          qualityScore: 75,
          suspensionDays: 7
        })
      });

      if (!response.ok) throw new Error('Failed to resolve report');

      // Notify via WebSocket
      if (wsClientRef.current && wsClientRef.current.isConnected()) {
        wsClientRef.current.emit('report_resolved_local', {
          reportId,
          resolution,
          moderatorId: currentUser?.id
        });
      }

      setSuccess(`Report resolved with action: ${resolution}`);
      setTimeout(() => setSuccess(''), 3000);
      setSelectedReport(null);
      fetchPendingReports();
      setView('queue');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Dismiss report
  const handleDismissReport = async (reportId) => {
    const reason = window.prompt('Enter dismissal reason:');
    if (!reason) return;

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/messaging/admin/reports/${reportId}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) throw new Error('Failed to dismiss report');

      setSuccess('Report dismissed');
      setTimeout(() => setSuccess(''), 3000);
      setSelectedReport(null);
      fetchPendingReports();
      setView('queue');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Render queue view
  const renderQueue = () => (
    <div className="moderation-queue">
      <div className="queue-header">
        <h2>Moderation Queue</h2>
        <button onClick={fetchPendingReports} disabled={loading} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="queue-filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={filters.severity}
          onChange={(e) => setFilters({...filters, severity: e.target.value})}
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
        >
          <option value="">All Categories</option>
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate Speech</option>
          <option value="spam">Spam</option>
          <option value="misinformation">Misinformation</option>
          <option value="sexual_content">Sexual Content</option>
        </select>
      </div>

      {loading && <div className="loading">Loading reports...</div>}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="reports-list">
        {reports.length === 0 ? (
          <p className="no-reports">No pending reports</p>
        ) : (
          reports.map(report => (
            <div
              key={report._id}
              className={`report-card severity-${report.severity}`}
              onClick={() => handleSelectReport(report._id)}
            >
              <div className="report-header">
                <span className="severity-badge">{report.severity.toUpperCase()}</span>
                <span className="category-badge">{report.reason}</span>
                <span className="status-badge">{report.status}</span>
              </div>
              <div className="report-content">
                <p className="report-description">{report.description}</p>
                <div className="report-meta">
                  <span>Reported by: {report.reportedBy?.email}</span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="report-actions">
                <button className="action-btn primary">View Details</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render report detail view
  const renderReportDetail = () => {
    if (!selectedReport) return null;

    return (
      <div className="report-detail">
        <button onClick={() => setView('queue')} className="back-btn">← Back to Queue</button>

        <div className="report-detail-content">
          <div className="detail-header">
            <h2>Report Details</h2>
            <div className="detail-badges">
              <span className={`status-badge ${selectedReport.status}`}>
                {selectedReport.status}
              </span>
              <span className={`severity-badge severity-${selectedReport.severity}`}>
                {selectedReport.severity}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Report Information</h3>
            <div className="detail-grid">
              <div>
                <strong>Category:</strong>
                <p>{selectedReport.reason}</p>
              </div>
              <div>
                <strong>Reported User:</strong>
                <p>{selectedReport.reportedUser?.email}</p>
              </div>
              <div>
                <strong>Reported By:</strong>
                <p>{selectedReport.reportedBy?.email}</p>
              </div>
              <div>
                <strong>Date Reported:</strong>
                <p>{new Date(selectedReport.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Description</h3>
            <p className="report-text">{selectedReport.description}</p>
          </div>

          {selectedReport.evidence?.screenshots?.length > 0 && (
            <div className="detail-section">
              <h3>Evidence</h3>
              <div className="evidence-grid">
                {selectedReport.evidence.screenshots.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Evidence ${idx + 1}`} />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3>Moderator Actions</h3>
            <div className="action-buttons">
              <button
                onClick={() => handleWarnUser(selectedReport.reportedUser._id)}
                disabled={actionInProgress}
                className="action-btn warn"
              >
                ⚠️ Warn User
              </button>
              <button
                onClick={() => handleSuspendUser(selectedReport.reportedUser._id)}
                disabled={actionInProgress}
                className="action-btn suspend"
              >
                🚫 Suspend User
              </button>
              <button
                onClick={() => handleBanUser(selectedReport.reportedUser._id)}
                disabled={actionInProgress}
                className="action-btn ban"
              >
                🔴 Ban User
              </button>
              <button
                onClick={() => handleResolveReport(selectedReport._id, 'message_removed')}
                disabled={actionInProgress}
                className="action-btn remove"
              >
                🗑️ Remove Content
              </button>
              <button
                onClick={() => handleDismissReport(selectedReport._id)}
                disabled={actionInProgress}
                className="action-btn dismiss"
              >
                ✓ Dismiss Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render analytics view
  const renderAnalytics = () => {
    if (!stats) return <div className="loading">Loading statistics...</div>;

    return (
      <div className="analytics-view">
        <h2>Moderation Statistics (Last 7 Days)</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalReports}</div>
            <div className="stat-label">Total Reports</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.pendingReports}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.resolvedReports}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.averageResolutionTime}h</div>
            <div className="stat-label">Avg Resolution Time</div>
          </div>
        </div>

        <div className="stats-section">
          <h3>Reports by Category</h3>
          <div className="category-breakdown">
            {stats.byCategory && Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="category-row">
                <span>{category}</span>
                <div className="bar" style={{ width: `${(count / stats.totalReports) * 100}%` }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h3>Actions Taken</h3>
          <div className="actions-breakdown">
            {stats.byAction && Object.entries(stats.byAction).map(([action, count]) => (
              <div key={action} className="action-row">
                <span>{action}</span>
                <span className="count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="panel-sidebar">
        <h1>Moderation Panel</h1>
        
        {/* Real-time status indicator */}
        <div className="realtime-status">
          <div className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? '🟢' : '🔴'}
          </div>
          <div className="status-text">
            <p>{wsConnected ? 'Real-time Connected' : 'Offline'}</p>
            {activeModerators > 0 && <p className="mods-count">{activeModerators} moderators active</p>}
          </div>
        </div>

        <nav className="panel-nav">
          <button
            className={`nav-btn ${view === 'queue' ? 'active' : ''}`}
            onClick={() => setView('queue')}
          >
            📋 Moderation Queue
          </button>
          <button
            className={`nav-btn ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => setView('analytics')}
          >
            📊 Analytics
          </button>
        </nav>
      </div>

      <div className="panel-content">
        {/* Notifications display */}
        {pendingNotifications.length > 0 && (
          <div className="notifications-container">
            {pendingNotifications.map(notif => (
              <div key={notif.id} className={`notification notification-${notif.type}`}>
                {notif.message}
              </div>
            ))}
          </div>
        )}

        {view === 'queue' && renderQueue()}
        {view === 'report' && renderReportDetail()}
        {view === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default AdminPanel;
