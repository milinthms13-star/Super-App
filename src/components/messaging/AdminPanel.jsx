import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminPanel.css';

/**
 * Admin Moderation Panel - Phase 2 Feature 3
 * React component for moderation dashboard
 */

const AdminPanel = () => {
  // State: Moderation Queue & Reports
  const [reports, setReports] = useState([]);
  const [queue, setQueue] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State: Moderation Actions
  const [actionType, setActionType] = useState(''); // 'warn', 'suspend', 'ban', 'remove'
  const [actionDetails, setActionDetails] = useState({
    reason: '',
    severity: 'medium',
    suspensionDays: 7,
    qualityScore: 75,
    notes: ''
  });

  // State: Analytics & Audit
  const [stats, setStats] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'history', 'analytics', 'audit'

  // State: UI
  const [sortBy, setSortBy] = useState('createdAt');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  /**
   * Fetch pending reports
   */
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messaging/admin/reports', {
        params: { limit: 20, status: filterStatus }
      });
      setReports(response.data.reports || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  /**
   * Fetch moderation queue
   */
  const fetchQueue = useCallback(async () => {
    try {
      const response = await axios.get('/api/messaging/admin/queue');
      setQueue(response.data.nextTask);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  }, []);

  /**
   * Fetch moderation statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/messaging/admin/analytics', {
        params: { days: 7 }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  /**
   * Fetch audit log
   */
  const fetchAuditLog = useCallback(async () => {
    try {
      const response = await axios.get('/api/messaging/admin/audit', {
        params: { limit: 50 }
      });
      setAuditLog(response.data.logs || []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchReports();
    fetchQueue();
    fetchStats();
    fetchAuditLog();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchReports();
      fetchQueue();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchReports, fetchQueue, fetchStats, fetchAuditLog]);

  /**
   * Select report
   */
  const handleSelectReport = (report) => {
    setSelectedReport(report);
    setActionType('');
    setActionDetails({
      reason: '',
      severity: 'medium',
      suspensionDays: 7,
      qualityScore: 75,
      notes: ''
    });
  };

  /**
   * Resolve report (warn, suspend, ban, etc.)
   */
  const handleResolveReport = async () => {
    if (!selectedReport || !actionType) {
      setError('Please select an action');
      return;
    }

    try {
      setLoading(true);

      if (actionType === 'dismiss') {
        await axios.post(`/api/messaging/admin/reports/${selectedReport._id}/dismiss`, {
          reason: actionDetails.reason
        });
      } else if (actionType === 'escalate') {
        await axios.post(`/api/messaging/admin/reports/${selectedReport._id}/escalate`, {
          escalatedTo: actionDetails.escalatedTo || 'senior_moderator',
          reason: actionDetails.reason
        });
      } else {
        await axios.post(`/api/messaging/admin/reports/${selectedReport._id}/resolve`, {
          resolution: `${actionType === 'warn' ? 'user_warned' : actionType === 'remove' ? 'message_removed' : actionType === 'suspend' ? 'user_suspended' : 'user_banned'}`,
          qualityScore: actionDetails.qualityScore,
          notes: actionDetails.notes,
          suspensionDays: actionDetails.suspensionDays
        });

        // Also take action on user if needed
        if (actionType === 'warn') {
          await axios.post(`/api/messaging/admin/users/${selectedReport.reportedUser._id}/warn`, {
            reason: actionDetails.reason,
            severity: actionDetails.severity
          });
        } else if (actionType === 'suspend') {
          await axios.post(`/api/messaging/admin/users/${selectedReport.reportedUser._id}/suspend`, {
            days: actionDetails.suspensionDays,
            reason: actionDetails.reason
          });
        } else if (actionType === 'ban') {
          await axios.post(`/api/messaging/admin/users/${selectedReport.reportedUser._id}/ban`, {
            reason: actionDetails.reason
          });
        }
      }

      setError(null);
      setShowConfirmDialog(false);
      setSelectedReport(null);
      fetchReports();
      fetchQueue();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve report');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render: Queue Section
   */
  const renderQueueSection = () => (
    <div className="moderation-section">
      <h3>📋 Moderation Queue</h3>
      {queue ? (
        <div className="queue-card">
          <div className="queue-header">
            <span className="priority-badge" data-priority={queue.report?.priority}>
              {queue.report?.priority?.toUpperCase()}
            </span>
            <span className={`time-remaining ${queue.isOverdue ? 'overdue' : ''}`}>
              {queue.timeRemaining ? `⏱️ ${queue.timeRemaining}` : '⏰ Overdue'}
            </span>
          </div>

          <div className="queue-content">
            <p>
              <strong>Report ID:</strong> {queue.queueId}
            </p>
            <p>
              <strong>User:</strong> {queue.report?.reportedUser?.name}
            </p>
            <p>
              <strong>Reason:</strong> {queue.report?.reason}
            </p>
            <p>
              <strong>Status:</strong> {queue.report?.status}
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleSelectReport(queue.report)}
          >
            Review & Take Action
          </button>
        </div>
      ) : (
        <div className="empty-state">✅ No pending tasks</div>
      )}
    </div>
  );

  /**
   * Render: Reports List
   */
  const renderReportsSection = () => (
    <div className="moderation-section">
      <div className="section-header">
        <h3>📝 Pending Reports</h3>
        <div className="filters">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading reports...</div>
      ) : reports.length > 0 ? (
        <div className="reports-list">
          {reports.map((report) => (
            <div
              key={report._id}
              className={`report-item ${selectedReport?._id === report._id ? 'selected' : ''}`}
              onClick={() => handleSelectReport(report)}
            >
              <div className="report-status">
                <span className={`status-badge status-${report.status}`}>
                  {report.status}
                </span>
              </div>
              <div className="report-info">
                <p className="report-reason">
                  <strong>{report.reason}</strong>
                </p>
                <p className="report-user">
                  👤 {report.reportedUser?.name || 'Unknown'}
                </p>
                <p className="report-description">
                  {report.description?.substring(0, 100)}...
                </p>
                <p className="report-date">
                  {new Date(report.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No reports found</div>
      )}
    </div>
  );

  /**
   * Render: Action Panel
   */
  const renderActionPanel = () => {
    if (!selectedReport) return null;

    return (
      <div className="moderation-section action-panel">
        <h3>⚙️ Moderation Actions</h3>

        <div className="report-details">
          <h4>Report Details</h4>
          <p>
            <strong>Reported User:</strong> {selectedReport.reportedUser?.name}
          </p>
          <p>
            <strong>Reported By:</strong> {selectedReport.reportedBy?.name}
          </p>
          <p>
            <strong>Reason:</strong> {selectedReport.reason}
          </p>
          <p>
            <strong>Description:</strong> {selectedReport.description}
          </p>
        </div>

        <div className="action-buttons">
          <h4>Choose Action</h4>
          <div className="button-group">
            {['warn', 'remove', 'suspend', 'ban', 'dismiss', 'escalate'].map((action) => (
              <button
                key={action}
                className={`btn action-btn ${actionType === action ? 'active' : ''}`}
                onClick={() => setActionType(action)}
              >
                {action === 'warn' && '⚠️ Warn'}
                {action === 'remove' && '🗑️ Remove'}
                {action === 'suspend' && '⏸️ Suspend'}
                {action === 'ban' && '🚫 Ban'}
                {action === 'dismiss' && '✓ Dismiss'}
                {action === 'escalate' && '📤 Escalate'}
              </button>
            ))}
          </div>
        </div>

        {actionType && (
          <div className="action-form">
            <label>
              Reason:
              <input
                type="text"
                value={actionDetails.reason}
                onChange={(e) =>
                  setActionDetails({ ...actionDetails, reason: e.target.value })
                }
                placeholder="Enter reason for action"
              />
            </label>

            {actionType === 'warn' && (
              <label>
                Severity:
                <select
                  value={actionDetails.severity}
                  onChange={(e) =>
                    setActionDetails({ ...actionDetails, severity: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            )}

            {actionType === 'suspend' && (
              <label>
                Suspension Days:
                <input
                  type="number"
                  value={actionDetails.suspensionDays}
                  onChange={(e) =>
                    setActionDetails({
                      ...actionDetails,
                      suspensionDays: parseInt(e.target.value)
                    })
                  }
                  min="1"
                  max="365"
                />
              </label>
            )}

            <label>
              Quality Score (0-100):
              <input
                type="number"
                value={actionDetails.qualityScore}
                onChange={(e) =>
                  setActionDetails({
                    ...actionDetails,
                    qualityScore: parseInt(e.target.value)
                  })
                }
                min="0"
                max="100"
              />
            </label>

            <label>
              Notes:
              <textarea
                value={actionDetails.notes}
                onChange={(e) =>
                  setActionDetails({ ...actionDetails, notes: e.target.value })
                }
                placeholder="Additional notes"
                rows="3"
              />
            </label>

            {error && <div className="error-message">{error}</div>}

            <div className="button-group">
              <button
                className="btn btn-danger"
                onClick={() => setShowConfirmDialog(true)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Action'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setActionType('');
                  setSelectedReport(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render: Analytics
   */
  const renderAnalytics = () => (
    <div className="moderation-section">
      <h3>📊 Moderation Statistics (7 days)</h3>
      {stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.abuseReports?.submitted || 0}</div>
            <div className="stat-label">Reports Submitted</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.abuseReports?.resolved || 0}</div>
            <div className="stat-label">Reports Resolved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.queue?.inProgress || 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.moderationActions?.actions || 0}</div>
            <div className="stat-label">Actions Taken</div>
          </div>
        </div>
      ) : (
        <div className="loading">Loading statistics...</div>
      )}
    </div>
  );

  /**
   * Render: Audit Log
   */
  const renderAuditLog = () => (
    <div className="moderation-section">
      <h3>🔍 Audit Trail</h3>
      {auditLog.length > 0 ? (
        <div className="audit-log">
          {auditLog.map((entry, idx) => (
            <div key={idx} className="audit-entry">
              <span className="audit-action">{entry.action}</span>
              <span className="audit-admin">{entry.admin}</span>
              <span className="audit-time">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              <span className="audit-reason">{entry.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No audit entries</div>
      )}
    </div>
  );

  /**
   * Render: Confirmation Dialog
   */
  const renderConfirmDialog = () => {
    if (!showConfirmDialog) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowConfirmDialog(false)}>
        <div className="modal-content">
          <h3>Confirm Action</h3>
          <p>
            Are you sure you want to <strong>{actionType}</strong> this user?
          </p>
          <p className="reason">
            Reason: <em>{actionDetails.reason}</em>
          </p>
          <div className="button-group">
            <button
              className="btn btn-danger"
              onClick={handleResolveReport}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <header className="panel-header">
        <h1>🛡️ Moderation Dashboard</h1>
        <div className="header-info">
          <span>Phase 2 Feature 3</span>
        </div>
      </header>

      <nav className="panel-nav">
        {['queue', 'history', 'analytics', 'audit'].map((tab) => (
          <button
            key={tab}
            className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'queue' && '📋 Queue'}
            {tab === 'history' && '📝 History'}
            {tab === 'analytics' && '📊 Analytics'}
            {tab === 'audit' && '🔍 Audit'}
          </button>
        ))}
      </nav>

      <div className="panel-content">
        {activeTab === 'queue' && (
          <>
            {renderQueueSection()}
            {renderReportsSection()}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {renderReportsSection()}
            {renderActionPanel()}
          </>
        )}

        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'audit' && renderAuditLog()}
      </div>

      {renderConfirmDialog()}
    </div>
  );
};

export default AdminPanel;
