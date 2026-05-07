import React, { useState, useCallback } from 'react';
import { API_URL } from '../../config';
import './AdvancedReportingPanel.css';

/**
 * Advanced Reporting Panel - Phase 2 Feature 5
 * Allows users to report abuse with enhanced categorization
 */

const AdvancedReportingPanel = ({ onClose, onReportSubmitted }) => {
  // State
  const [reportType, setReportType] = useState('single'); // single, bulk
  const [reports, setReports] = useState([
    { id: 1, reportedUserId: '', reason: '', severity: 'medium', description: '' }
  ]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch categories on mount
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/messaging/feature5-reporting/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Handle single report submission
  const handleSingleReportSubmit = async (e) => {
    e.preventDefault();
    const report = reports[0];

    if (!report.reportedUserId || !report.reason || !report.description) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/messaging/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reportedUser: report.reportedUserId,
          reason: report.reason,
          description: report.description
        })
      });

      if (!response.ok) throw new Error('Failed to submit report');

      setSuccess('Report submitted successfully!');
      setTimeout(() => {
        onReportSubmitted?.();
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk report submission
  const handleBulkReportSubmit = async (e) => {
    e.preventDefault();

    const bulkReports = reports.filter(r => r.reportedUserId && r.reason);
    if (bulkReports.length === 0) {
      setError('Add at least one report');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/messaging/feature5-reporting/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reports: bulkReports.map(r => ({
            reportedUserId: r.reportedUserId,
            reason: r.reason,
            description: r.description
          })),
          batchId: `batch_${Date.now()}`
        })
      });

      if (!response.ok) throw new Error('Failed to submit bulk reports');

      const data = await response.json();
      setSuccess(`${data.results.successful.length} reports submitted successfully!`);

      setTimeout(() => {
        onReportSubmitted?.();
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add report row
  const handleAddReport = () => {
    setReports([
      ...reports,
      { id: reports.length + 1, reportedUserId: '', reason: '', severity: 'medium', description: '' }
    ]);
  };

  // Remove report row
  const handleRemoveReport = (id) => {
    if (reports.length > 1) {
      setReports(reports.filter(r => r.id !== id));
    }
  };

  // Update report field
  const handleUpdateReport = (id, field, value) => {
    setReports(reports.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="advanced-reporting-panel">
      <div className="reporting-header">
        <h2>Report Abuse</h2>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      {/* Report Type Selector */}
      <div className="report-type-selector">
        <label>
          <input
            type="radio"
            value="single"
            checked={reportType === 'single'}
            onChange={(e) => setReportType(e.target.value)}
          />
          Single Report
        </label>
        <label>
          <input
            type="radio"
            value="bulk"
            checked={reportType === 'bulk'}
            onChange={(e) => setReportType(e.target.value)}
          />
          Bulk Reports (up to 100)
        </label>
      </div>

      {/* Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Form */}
      <form onSubmit={reportType === 'single' ? handleSingleReportSubmit : handleBulkReportSubmit}>
        <div className="reports-container">
          {reports.map((report, idx) => (
            <div key={report.id} className="report-row">
              <div className="form-group">
                <label>User ID or Email *</label>
                <input
                  type="text"
                  placeholder="Enter user ID or email"
                  value={report.reportedUserId}
                  onChange={(e) => handleUpdateReport(report.id, 'reportedUserId', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={report.reason}
                  onChange={(e) => handleUpdateReport(report.id, 'reason', e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Severity</label>
                <select
                  value={report.severity}
                  onChange={(e) => handleUpdateReport(report.id, 'severity', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  placeholder="Describe the issue"
                  value={report.description}
                  onChange={(e) => handleUpdateReport(report.id, 'description', e.target.value)}
                  rows="3"
                  required
                />
              </div>

              {reportType === 'bulk' && reports.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveReport(report.id)}
                  className="remove-report-btn"
                >
                  Remove
                </button>
              )}

              {idx < reports.length - 1 && <hr className="report-divider" />}
            </div>
          ))}
        </div>

        {reportType === 'bulk' && (
          <button type="button" onClick={handleAddReport} className="add-report-btn">
            + Add Another Report
          </button>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Submitting...' : `Submit ${reportType === 'bulk' ? 'Reports' : 'Report'}`}
          </button>
        </div>
      </form>

      <p className="info-text">
        ℹ️ Your report is anonymous and will be reviewed by our moderation team.
      </p>
    </div>
  );
};

export default AdvancedReportingPanel;
