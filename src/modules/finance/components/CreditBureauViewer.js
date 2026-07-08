import React, { useState } from 'react';
import { financeApi } from '../financeApi';

const CreditBureauViewer = ({ onClose, prefillData = {} }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: prefillData.fullName || '',
    pan: prefillData.pan || '',
    phone: prefillData.phone || '',
    dob: prefillData.dob || '',
    gender: prefillData.gender || 'Male',
    state: prefillData.state || '',
    district: prefillData.district || '',
    pincode: prefillData.pincode || '',
  });

  const handleFetchReport = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.checkCreditBureau(formData);
      if (response.success) {
        setReportData(response.data);
      } else {
        setError(response.message || 'Failed to fetch credit report');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch credit report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      'Low': '#4caf50',
      'Medium': '#ff9800',
      'Medium-High': '#ff5722',
      'High': '#f44336',
    };
    return colors[level] || '#666';
  };

  const getScoreColor = (score) => {
    if (score >= 750) return '#4caf50';
    if (score >= 700) return '#8bc34a';
    if (score >= 650) return '#ff9800';
    if (score >= 600) return '#ff5722';
    return '#f44336';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>Credit Bureau Report</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>
          {!reportData ? (
            <form onSubmit={handleFetchReport} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>PAN Number *</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    required
                    maxLength="10"
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    pattern="[0-9]{10}"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    maxLength="6"
                    pattern="[0-9]{6}"
                    style={styles.input}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Fetching Report...' : 'Fetch Credit Report'}
              </button>

              <p style={styles.consent}>
                By fetching the report, you confirm that you have obtained consent from the applicant
                to pull their credit bureau report.
              </p>
            </form>
          ) : (
            <div style={styles.report}>
              {reportData.isMock && (
                <div style={styles.mockBanner}>
                  ⚠️ This is mock data for development. Configure credit bureau API keys for real reports.
                </div>
              )}

              <div style={styles.scoreCard}>
                <div style={styles.scoreCircle}>
                  <div style={{ ...styles.scoreNumber, color: getScoreColor(reportData.score) }}>
                    {reportData.score}
                  </div>
                  <div style={styles.scoreLabel}>{reportData.scoreRange}</div>
                </div>
                <div style={styles.riskBadge} style={{ backgroundColor: getRiskColor(reportData.riskLevel) }}>
                  Risk Level: {reportData.riskLevel}
                </div>
              </div>

              <div style={styles.section}>
                <h4>Account Summary</h4>
                <div style={styles.grid}>
                  <div style={styles.statCard}>
                    <div style={styles.statValue}>{reportData.accountSummary.totalAccounts}</div>
                    <div style={styles.statLabel}>Total Accounts</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statValue}>{reportData.accountSummary.activeAccounts}</div>
                    <div style={styles.statLabel}>Active</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statValue}>{reportData.accountSummary.closedAccounts}</div>
                    <div style={styles.statLabel}>Closed</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: reportData.accountSummary.overdueAccounts > 0 ? '#f44336' : '#4caf50' }}>
                      {reportData.accountSummary.overdueAccounts}
                    </div>
                    <div style={styles.statLabel}>Overdue</div>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h4>Credit Utilization & History</h4>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span>Credit Utilization:</span>
                    <strong>{reportData.creditUtilization}%</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Total Outstanding:</span>
                    <strong>₹{reportData.totalOutstanding.toLocaleString()}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Enquiries (90 days):</span>
                    <strong>{reportData.enquiriesLast90Days}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Oldest Account:</span>
                    <strong>{reportData.oldestAccount} months</strong>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h4>Payment History</h4>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span>On-time Payments:</span>
                    <strong style={{ color: '#4caf50' }}>{reportData.paymentHistory.onTimePayments}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Late Payments:</span>
                    <strong style={{ color: '#ff9800' }}>{reportData.paymentHistory.latePayments}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Defaults:</span>
                    <strong style={{ color: '#f44336' }}>{reportData.paymentHistory.defaults}</strong>
                  </div>
                </div>
              </div>

              {reportData.insights && reportData.insights.length > 0 && (
                <div style={styles.section}>
                  <h4>Key Insights</h4>
                  <ul style={styles.list}>
                    {reportData.insights.map((insight, idx) => (
                      <li key={idx} style={styles.listItem}>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reportData.recommendations && reportData.recommendations.length > 0 && (
                <div style={styles.section}>
                  <h4>Recommendations</h4>
                  <ul style={styles.list}>
                    {reportData.recommendations.map((rec, idx) => (
                      <li key={idx} style={styles.recommendationItem}>
                        💡 {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={styles.reportFooter}>
                <small>Report Date: {new Date(reportData.reportDate).toLocaleDateString()}</small>
                <button onClick={() => setReportData(null)} style={styles.newReportBtn}>
                  Fetch Another Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  error: {
    padding: '15px 20px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderBottom: '1px solid #ef5350',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  form: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
  },
  consent: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
    marginTop: '15px',
    fontStyle: 'italic',
  },
  report: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  mockBanner: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  scoreCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    marginBottom: '30px',
  },
  scoreCircle: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  scoreNumber: {
    fontSize: '72px',
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: '18px',
    color: '#666',
    marginTop: '10px',
  },
  riskBadge: {
    padding: '10px 30px',
    color: 'white',
    borderRadius: '20px',
    fontWeight: '600',
  },
  section: {
    marginBottom: '30px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginTop: '15px',
  },
  statCard: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginTop: '15px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    marginTop: '15px',
  },
  listItem: {
    padding: '10px',
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ff9800',
    marginBottom: '10px',
    borderRadius: '4px',
  },
  recommendationItem: {
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderLeft: '4px solid #2196f3',
    marginBottom: '10px',
    borderRadius: '4px',
  },
  reportFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    marginTop: '30px',
  },
  newReportBtn: {
    padding: '10px 20px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default CreditBureauViewer;
