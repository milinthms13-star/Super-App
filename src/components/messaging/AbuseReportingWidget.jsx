import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AbuseReportingWidget.css';

/**
 * AbuseReportingWidget - Phase 2 Feature 5: User Abuse Reporting
 * Allows users to submit abuse reports and view their report status
 */

const AbuseReportingWidget = ({ userId, currentUserId, onClose }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report', 'my-reports', 'stats'
  const [formData, setFormData] = useState({
    reportedUser: userId,
    reason: '',
    description: '',
    relationship: 'stranger',
    previousIncidents: false,
    reportedMessage: ''
  });

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reportReasons = [
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam' },
    { value: 'nsfw', label: 'NSFW Content' },
    { value: 'fraud', label: 'Fraud/Scam' },
    { value: 'violence', label: 'Violence/Threats' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'other', label: 'Other' }
  ];

  /**
   * Fetch user's submitted reports
   */
  useEffect(() => {
    if (activeTab === 'my-reports') {
      fetchUserReports();
    } else if (activeTab === 'stats') {
      fetchUserStats();
    }
  }, [activeTab]);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messaging/reports/my-reports', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReports(response.data.reports);
      setError('');
    } catch (err) {
      setError('Failed to load reports');
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messaging/reports/my-stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle report form submission
   */
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!formData.reason) {
      setError('Please select a reason');
      return;
    }

    if (!formData.description || formData.description.trim().length < 10) {
      setError('Please provide at least 10 characters in your description');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        '/api/messaging/reports/report',
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setSuccess(response.data.message);
      setFormData({
        reportedUser: userId,
        reason: '',
        description: '',
        relationship: 'stranger',
        previousIncidents: false,
        reportedMessage: ''
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report');
      console.error('Submit report error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle appeal submission
   */
  const handleSubmitAppeal = async (reportId) => {
    if (!appealReason.trim()) {
      setError('Please enter your appeal reason');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        `/api/messaging/reports/report/${reportId}/appeal`,
        { reason: appealReason },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setSuccess('Appeal submitted successfully');
      setAppealReason('');
      setSelectedReport(null);

      // Refresh reports
      fetchUserReports();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit appeal');
      console.error('Submit appeal error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render report form
   */
  const renderReportForm = () => (
    <form onSubmit={handleSubmitReport} className='report-form'>
      <div className='form-group'>
        <label htmlFor='reason'>Reason for Report *</label>
        <select
          id='reason'
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className='form-control'
        >
          <option value=''>Select a reason...</option>
          {reportReasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </div>

      <div className='form-group'>
        <label htmlFor='description'>Details *</label>
        <textarea
          id='description'
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder='Provide specific details about the issue (minimum 10 characters)...'
          className='form-control'
          rows='5'
          minLength='10'
        />
        <small className='text-muted'>
          {formData.description.length} / 10 (minimum)
        </small>
      </div>

      <div className='form-group'>
        <label htmlFor='relationship'>Your Relationship</label>
        <select
          id='relationship'
          value={formData.relationship}
          onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
          className='form-control'
        >
          <option value='stranger'>Stranger</option>
          <option value='contact'>Contact</option>
          <option value='friend'>Friend</option>
        </select>
      </div>

      <div className='form-group checkbox'>
        <label>
          <input
            type='checkbox'
            checked={formData.previousIncidents}
            onChange={(e) => setFormData({ ...formData, previousIncidents: e.target.checked })}
          />
          This user has harassed me before
        </label>
      </div>

      <button type='submit' className='btn btn-primary' disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );

  /**
   * Render my reports tab
   */
  const renderMyReports = () => (
    <div className='reports-list'>
      {reports.length === 0 ? (
        <div className='empty-state'>
          <p>You haven't submitted any reports yet.</p>
        </div>
      ) : (
        reports.map((report) => (
          <div key={report._id} className={`report-item status-${report.status}`}>
            <div className='report-header'>
              <div>
                <strong className='report-reason'>{report.reason.replace(/_/g, ' ')}</strong>
                <small className={`status-badge status-${report.status}`}>
                  {report.status}
                </small>
              </div>
              <small className='report-date'>{new Date(report.createdAt).toLocaleDateString()}</small>
            </div>

            <div className='report-content'>
              <p>{report.description}</p>
            </div>

            {report.status === 'resolved' && report.resolution && (
              <div className='resolution-section'>
                <strong>Resolution:</strong>
                <p>{report.resolution}</p>
              </div>
            )}

            {(report.status === 'dismissed' || report.status === 'resolved') && (
              <button
                className='btn btn-sm btn-outline'
                onClick={() => setSelectedReport(report)}
              >
                Appeal Decision
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );

  /**
   * Render user stats tab
   */
  const renderStats = () => (
    <div className='stats-container'>
      {stats && (
        <>
          <div className='stats-grid'>
            <div className='stat-card'>
              <div className='stat-value'>{stats.reportsSubmitted}</div>
              <div className='stat-label'>Reports Submitted</div>
            </div>

            <div className='stat-card'>
              <div className='stat-value'>{stats.reportsReceived}</div>
              <div className='stat-label'>Reports Received</div>
            </div>

            <div className='stat-card'>
              <div className={`stat-value status-${stats.accountStatus}`}>
                {stats.accountStatus}
              </div>
              <div className='stat-label'>Account Status</div>
            </div>

            <div className='stat-card'>
              <div className={`stat-value health-${stats.accountHealth}`}>
                {stats.accountHealth}%
              </div>
              <div className='stat-label'>Account Health</div>
            </div>
          </div>

          <div className='warnings-section'>
            <strong>Warnings: {stats.warnings}</strong>
            {stats.warnings > 0 && (
              <p className='warning-text'>
                You have {stats.warnings} warning(s). Please ensure you follow community guidelines.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  /**
   * Render appeal modal
   */
  const renderAppealModal = () => (
    <div className='modal-overlay' onClick={() => setSelectedReport(null)}>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h3>Appeal Report Decision</h3>
          <button
            className='close-btn'
            onClick={() => setSelectedReport(null)}
          >
            ✕
          </button>
        </div>

        <div className='modal-body'>
          <p className='report-status'>
            <strong>Current Status:</strong> {selectedReport?.status}
          </p>

          <div className='form-group'>
            <label htmlFor='appeal-reason'>Why do you think this decision was incorrect? *</label>
            <textarea
              id='appeal-reason'
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder='Explain your appeal...'
              className='form-control'
              rows='5'
              minLength='10'
            />
          </div>
        </div>

        <div className='modal-footer'>
          <button
            className='btn btn-secondary'
            onClick={() => setSelectedReport(null)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className='btn btn-primary'
            onClick={() => handleSubmitAppeal(selectedReport._id)}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className='abuse-reporting-widget'>
      <div className='widget-header'>
        <h2>Report Abuse</h2>
        <button className='close-btn' onClick={onClose}>
          ✕
        </button>
      </div>

      {error && <div className='alert alert-error'>{error}</div>}
      {success && <div className='alert alert-success'>{success}</div>}

      <div className='widget-tabs'>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          Report Issue
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-reports')}
        >
          My Reports
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Account Stats
        </button>
      </div>

      <div className='widget-content'>
        {activeTab === 'report' && renderReportForm()}
        {activeTab === 'my-reports' && (loading ? <div>Loading...</div> : renderMyReports())}
        {activeTab === 'stats' && (loading ? <div>Loading...</div> : renderStats())}
      </div>

      {selectedReport && renderAppealModal()}
    </div>
  );
};

export default AbuseReportingWidget;
