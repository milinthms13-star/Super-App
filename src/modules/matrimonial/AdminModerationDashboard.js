import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminModerationDashboard.css';

const AdminModerationDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [reports, setReports] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    verificationStatus: '',
    gender: '',
    minAge: '',
    maxAge: '',
    location: '',
    religion: '',
    subscriptionTier: '',
    hasReports: false,
    search: ''
  });
  const [reportFilters, setReportFilters] = useState({
    status: '',
    type: '',
    severity: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [bulkActionModal, setBulkActionModal] = useState({ show: false, action: '', reason: '' });
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchActivityFeed();
  }, []);

  useEffect(() => {
    if (activeTab === 'profiles') {
      fetchProfiles();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, filters, reportFilters, pagination.page]);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/matrimonial/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v !== false))
      });
      
      const response = await axios.get(`/api/matrimonial/admin/profiles?${params}`);
      setProfiles(response.data.profiles);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(reportFilters).filter(([_, v]) => v !== ''))
      });
      
      const response = await axios.get(`/api/matrimonial/admin/reports?${params}`);
      setReports(response.data.reports);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      const response = await axios.get('/api/matrimonial/admin/activity-feed?limit=50');
      setActivityFeed(response.data.activities);
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/matrimonial/admin/audit-logs?page=${pagination.page}&limit=50`);
      setAuditLogs(response.data.logs || []);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileDetails = async (profileId) => {
    try {
      const response = await axios.get(`/api/matrimonial/admin/profiles/${profileId}`);
      setSelectedProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile details:', error);
    }
  };

  const handleBulkAction = async () => {
    if (selectedProfiles.length === 0) {
      alert('Please select profiles first');
      return;
    }

    if (['reject', 'suspend', 'delete', 'flag'].includes(bulkActionModal.action) && !bulkActionModal.reason) {
      alert('Please provide a reason');
      return;
    }

    try {
      const response = await axios.post('/api/matrimonial/admin/profiles/bulk-action', {
        action: bulkActionModal.action,
        profileIds: selectedProfiles,
        reason: bulkActionModal.reason
      });

      alert(response.data.message);
      setSelectedProfiles([]);
      setBulkActionModal({ show: false, action: '', reason: '' });
      fetchProfiles();
      fetchDashboardStats();
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Failed to perform bulk action');
    }
  };

  const handleProfileStatusUpdate = async (profileId, status, reason = '') => {
    try {
      await axios.patch(`/api/matrimonial/admin/profiles/${profileId}/status`, { status, reason });
      alert('Profile status updated successfully');
      fetchProfiles();
      fetchDashboardStats();
    } catch (error) {
      console.error('Failed to update profile status:', error);
      alert('Failed to update profile status');
    }
  };

  const handleReportStatusUpdate = async (reportId, status, resolution = '', action = '') => {
    try {
      await axios.patch(`/api/matrimonial/admin/reports/${reportId}/status`, { status, resolution, action });
      alert('Report status updated successfully');
      fetchReports();
      fetchDashboardStats();
    } catch (error) {
      console.error('Failed to update report status:', error);
      alert('Failed to update report status');
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await axios.get(`/api/matrimonial/admin/export/${type}?format=csv`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  };

  const toggleProfileSelection = (profileId) => {
    setSelectedProfiles(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const selectAllProfiles = () => {
    if (selectedProfiles.length === profiles.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(profiles.map(p => p._id));
    }
  };

  const renderDashboard = () => (
    <div className="admin-dashboard">
      <h2>Dashboard Overview</h2>
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Profiles</h3>
            <div className="stat-item">
              <span>Total:</span>
              <strong>{stats.profiles.total}</strong>
            </div>
            <div className="stat-item">
              <span>Active:</span>
              <strong>{stats.profiles.active}</strong>
            </div>
            <div className="stat-item">
              <span>Pending Verification:</span>
              <strong>{stats.profiles.pendingVerification}</strong>
            </div>
            <div className="stat-item">
              <span>Reported:</span>
              <strong>{stats.profiles.reported}</strong>
            </div>
          </div>

          <div className="stat-card">
            <h3>Users</h3>
            <div className="stat-item">
              <span>Total:</span>
              <strong>{stats.users.total}</strong>
            </div>
            <div className="stat-item">
              <span>Active (7 days):</span>
              <strong>{stats.users.active}</strong>
            </div>
            <div className="stat-item">
              <span>Premium:</span>
              <strong>{stats.users.premium}</strong>
            </div>
            <div className="stat-item">
              <span>Recent Signups:</span>
              <strong>{stats.users.recentSignups}</strong>
            </div>
          </div>

          <div className="stat-card">
            <h3>Engagement</h3>
            <div className="stat-item">
              <span>Total Messages:</span>
              <strong>{stats.engagement.totalMessages}</strong>
            </div>
            <div className="stat-item">
              <span>Total Matches:</span>
              <strong>{stats.engagement.totalMatches}</strong>
            </div>
            <div className="stat-item">
              <span>Successful Matches:</span>
              <strong>{stats.engagement.successfulMatches}</strong>
            </div>
          </div>

          <div className="stat-card">
            <h3>Moderation</h3>
            <div className="stat-item">
              <span>Total Reports:</span>
              <strong>{stats.moderation.totalReports}</strong>
            </div>
            <div className="stat-item">
              <span>Unresolved:</span>
              <strong>{stats.moderation.unresolvedReports}</strong>
            </div>
            <div className="stat-item">
              <span>Resolution Rate:</span>
              <strong>{stats.moderation.resolutionRate}%</strong>
            </div>
          </div>
        </div>
      )}

      <div className="activity-feed-section">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {activityFeed.slice(0, 10).map((activity, index) => (
            <div key={index} className="activity-item">
              <span className={`activity-type ${activity.type}`}>
                {activity.type.replace('_', ' ').toUpperCase()}
              </span>
              <span className="activity-time">
                {new Date(activity.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfiles = () => (
    <div className="admin-profiles">
      <div className="profiles-header">
        <h2>Profile Management</h2>
        <div className="action-buttons">
          <button onClick={() => handleExport('profiles')}>Export CSV</button>
          {selectedProfiles.length > 0 && (
            <div className="bulk-actions">
              <button onClick={() => setBulkActionModal({ show: true, action: 'approve', reason: '' })}>
                Approve Selected ({selectedProfiles.length})
              </button>
              <button onClick={() => setBulkActionModal({ show: true, action: 'reject', reason: '' })}>
                Reject Selected
              </button>
              <button onClick={() => setBulkActionModal({ show: true, action: 'suspend', reason: '' })}>
                Suspend Selected
              </button>
              <button onClick={() => setBulkActionModal({ show: true, action: 'delete', reason: '' })}>
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filters.verificationStatus} onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })}>
          <option value="">All Verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input
          type="number"
          placeholder="Min Age"
          value={filters.minAge}
          onChange={(e) => setFilters({ ...filters, minAge: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max Age"
          value={filters.maxAge}
          onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
        />
        <input
          type="text"
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        />
        <select value={filters.subscriptionTier} onChange={(e) => setFilters({ ...filters, subscriptionTier: e.target.value })}>
          <option value="">All Tiers</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
          <option value="elite">Elite</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={filters.hasReports}
            onChange={(e) => setFilters({ ...filters, hasReports: e.target.checked })}
          />
          Has Reports
        </label>
        <button onClick={fetchProfiles}>Apply Filters</button>
        <button onClick={() => setFilters({
          status: '', verificationStatus: '', gender: '', minAge: '', maxAge: '',
          location: '', religion: '', subscriptionTier: '', hasReports: false, search: ''
        })}>Clear</button>
      </div>

      {loading ? (
        <div className="loading">Loading profiles...</div>
      ) : (
        <>
          <table className="profiles-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedProfiles.length === profiles.length && profiles.length > 0}
                    onChange={selectAllProfiles}
                  />
                </th>
                <th>Name</th>
                <th>Age/Gender</th>
                <th>Location</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Subscription</th>
                <th>Reports</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => (
                <tr key={profile._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProfiles.includes(profile._id)}
                      onChange={() => toggleProfileSelection(profile._id)}
                    />
                  </td>
                  <td>
                    <button className="link-button" onClick={() => fetchProfileDetails(profile._id)}>
                      {profile.firstName} {profile.lastName}
                    </button>
                  </td>
                  <td>{profile.age} / {profile.gender}</td>
                  <td>{profile.location?.city}, {profile.location?.state}</td>
                  <td>
                    <span className={`status-badge ${profile.status}`}>{profile.status}</span>
                  </td>
                  <td>
                    <span className={`verification-badge ${profile.verification?.status}`}>
                      {profile.verification?.status || 'pending'}
                    </span>
                  </td>
                  <td>{profile.user?.[0]?.subscription?.tier || 'free'}</td>
                  <td>{profile.reportCount || 0}</td>
                  <td>{new Date(profile.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons-cell">
                      <button onClick={() => handleProfileStatusUpdate(profile._id, 'active')}>Activate</button>
                      <button onClick={() => {
                        const reason = prompt('Enter suspension reason:');
                        if (reason) handleProfileStatusUpdate(profile._id, 'suspended', reason);
                      }}>Suspend</button>
                      <button onClick={() => fetchProfileDetails(profile._id)}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="admin-reports">
      <div className="reports-header">
        <h2>Report Management</h2>
        <button onClick={() => handleExport('reports')}>Export CSV</button>
      </div>

      <div className="filters-section">
        <select value={reportFilters.status} onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={reportFilters.type} onChange={(e) => setReportFilters({ ...reportFilters, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="fake_profile">Fake Profile</option>
          <option value="inappropriate_content">Inappropriate Content</option>
          <option value="harassment">Harassment</option>
          <option value="scam">Scam</option>
          <option value="other">Other</option>
        </select>
        <select value={reportFilters.severity} onChange={(e) => setReportFilters({ ...reportFilters, severity: e.target.value })}>
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button onClick={fetchReports}>Apply Filters</button>
      </div>

      {loading ? (
        <div className="loading">Loading reports...</div>
      ) : (
        <>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report._id}>
                  <td>{report.reporterId?.email || 'Anonymous'}</td>
                  <td>{report.type}</td>
                  <td>
                    <span className={`severity-badge ${report.severity}`}>{report.severity}</span>
                  </td>
                  <td>{report.reason?.substring(0, 50)}...</td>
                  <td>
                    <span className={`status-badge ${report.status}`}>{report.status}</span>
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons-cell">
                      <button onClick={() => {
                        const resolution = prompt('Enter resolution notes:');
                        if (resolution) handleReportStatusUpdate(report._id, 'resolved', resolution);
                      }}>Resolve</button>
                      <button onClick={() => handleReportStatusUpdate(report._id, 'investigating')}>
                        Investigate
                      </button>
                      <button onClick={() => handleReportStatusUpdate(report._id, 'dismissed')}>
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderAuditLogs = () => (
    <div className="admin-audit">
      <h2>Audit Logs</h2>
      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : (
        <table className="audit-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Admin</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, index) => (
              <tr key={index}>
                <td>{log.action}</td>
                <td>{log.adminId}</td>
                <td>{JSON.stringify(log.metadata).substring(0, 100)}...</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="admin-moderation-dashboard">
      <header className="admin-header">
        <h1>Admin Moderation Dashboard</h1>
        <div className="header-actions">
          <button onClick={fetchDashboardStats}>Refresh Stats</button>
          <button onClick={fetchActivityFeed}>Refresh Activity</button>
        </div>
      </header>

      <nav className="admin-nav">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'profiles' ? 'active' : ''}
          onClick={() => setActiveTab('profiles')}
        >
          Profiles
        </button>
        <button
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={activeTab === 'audit' ? 'active' : ''}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'profiles' && renderProfiles()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'audit' && renderAuditLogs()}
      </main>

      {/* Bulk Action Modal */}
      {bulkActionModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Bulk Action: {bulkActionModal.action}</h3>
            <p>This will affect {selectedProfiles.length} profiles</p>
            {['reject', 'suspend', 'delete', 'flag'].includes(bulkActionModal.action) && (
              <textarea
                placeholder="Enter reason (required)"
                value={bulkActionModal.reason}
                onChange={(e) => setBulkActionModal({ ...bulkActionModal, reason: e.target.value })}
                rows="4"
              />
            )}
            <div className="modal-actions">
              <button onClick={handleBulkAction}>Confirm</button>
              <button onClick={() => setBulkActionModal({ show: false, action: '', reason: '' })}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {selectedProfile && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Profile Details</h3>
            <div className="profile-details">
              <div className="detail-section">
                <h4>Basic Information</h4>
                <p><strong>Name:</strong> {selectedProfile.profile.firstName} {selectedProfile.profile.lastName}</p>
                <p><strong>Age:</strong> {selectedProfile.profile.age}</p>
                <p><strong>Gender:</strong> {selectedProfile.profile.gender}</p>
                <p><strong>Email:</strong> {selectedProfile.profile.userId?.email}</p>
                <p><strong>Phone:</strong> {selectedProfile.profile.userId?.phone}</p>
                <p><strong>Status:</strong> {selectedProfile.profile.status}</p>
              </div>

              <div className="detail-section">
                <h4>Activity Statistics</h4>
                <p><strong>Messages Sent:</strong> {selectedProfile.activity.messagesSent}</p>
                <p><strong>Messages Received:</strong> {selectedProfile.activity.messagesReceived}</p>
                <p><strong>Interests Sent:</strong> {selectedProfile.activity.interestsSent}</p>
                <p><strong>Interests Received:</strong> {selectedProfile.activity.interestsReceived}</p>
              </div>

              <div className="detail-section">
                <h4>Reports ({selectedProfile.reports.length})</h4>
                {selectedProfile.reports.map(report => (
                  <div key={report._id} className="report-item">
                    <p><strong>Type:</strong> {report.type}</p>
                    <p><strong>Reason:</strong> {report.reason}</p>
                    <p><strong>Status:</strong> {report.status}</p>
                    <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setSelectedProfile(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModerationDashboard;
