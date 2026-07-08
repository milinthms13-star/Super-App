import React, { useState, useEffect } from 'react';
import { financeApi } from '../financeApi';

const FraudDetectionWidget = ({ phone, pan, aadhaarNumber, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [fraudData, setFraudData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (phone) {
      checkFraud();
    }
  }, [phone]);

  const checkFraud = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await financeApi.checkFraud({ phone, pan, aadhaarNumber });
      if (response.success) {
        setFraudData(response.data);
      }
    } catch (err) {
      setError('Failed to perform fraud check');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#ff5722',
      critical: '#f44336',
    };
    return colors[level] || '#666';
  };

  const getRiskIcon = (level) => {
    const icons = {
      low: '✓',
      medium: '⚠',
      high: '⚠',
      critical: '✕',
    };
    return icons[level] || '?';
  };

  if (loading) {
    return (
      <div style={styles.widget}>
        <div style={styles.loading}>Running fraud detection...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.widget}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  if (!fraudData) return null;

  return (
    <div style={styles.widget}>
      <div style={styles.header}>
        <h4>Fraud Detection Analysis</h4>
        {onClose && <button onClick={onClose} style={styles.closeBtn}>✕</button>}
      </div>

      <div style={{...styles.riskCard, backgroundColor: getRiskColor(fraudData.overallRisk)}}>
        <div style={styles.riskIcon}>{getRiskIcon(fraudData.overallRisk)}</div>
        <div>
          <div style={styles.riskLabel}>Risk Level: {fraudData.overallRisk.toUpperCase()}</div>
          <div style={styles.riskScore}>Risk Score: {fraudData.riskScore}/100</div>
        </div>
      </div>

      {fraudData.blocked && (
        <div style={styles.blockedBanner}>
          🚫 Application Blocked - High fraud risk detected
        </div>
      )}

      <div style={styles.checks}>
        <div style={styles.checkItem}>
          <strong>Duplicate Check</strong>
          {fraudData.checks.duplicate.isDuplicate ? (
            <span style={{ color: '#ff9800' }}>
              ⚠ {fraudData.checks.duplicate.count} duplicates found
            </span>
          ) : (
            <span style={{ color: '#4caf50' }}>✓ No duplicates</span>
          )}
        </div>

        <div style={styles.checkItem}>
          <strong>Velocity Check</strong>
          <span style={{ color: getRiskColor(fraudData.checks.velocity.riskLevel) }}>
            {fraudData.checks.velocity.count} applications in last week
          </span>
        </div>

        <div style={styles.checkItem}>
          <strong>Blacklist Check</strong>
          {fraudData.checks.blacklist.blacklisted ? (
            <span style={{ color: '#f44336' }}>✕ Blacklisted</span>
          ) : (
            <span style={{ color: '#4caf50' }}>✓ Clear</span>
          )}
        </div>

        <div style={styles.checkItem}>
          <strong>IP Reputation</strong>
          <span style={{ color: getRiskColor(fraudData.checks.ip.riskLevel) }}>
            {fraudData.checks.ip.recentApplications} recent apps from this IP
          </span>
        </div>

        {fraudData.checks.device && (
          <div style={styles.checkItem}>
            <strong>Device Check</strong>
            {fraudData.checks.device.suspicious ? (
              <span style={{ color: '#ff9800' }}>⚠ Suspicious device</span>
            ) : (
              <span style={{ color: '#4caf50' }}>✓ Normal device</span>
            )}
          </div>
        )}
      </div>

      {fraudData.recommendations && fraudData.recommendations.length > 0 && (
        <div style={styles.recommendations}>
          <strong>Recommendations:</strong>
          <ul style={styles.list}>
            {fraudData.recommendations.map((rec, idx) => (
              <li key={idx} style={styles.recommendationItem}>
                <span style={styles.severity}>{rec.severity.toUpperCase()}:</span>
                <span style={styles.action}>{rec.action}</span> - {rec.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const styles = {
  widget: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  error: {
    padding: '15px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
  },
  riskCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    borderRadius: '8px',
    color: 'white',
    marginBottom: '20px',
  },
  riskIcon: {
    fontSize: '48px',
  },
  riskLabel: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  riskScore: {
    fontSize: '16px',
    marginTop: '5px',
  },
  blockedBanner: {
    padding: '15px',
    backgroundColor: '#ffcdd2',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  checks: {
    display: 'grid',
    gap: '12px',
    marginBottom: '20px',
  },
  checkItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  recommendations: {
    padding: '15px',
    backgroundColor: '#fff3e0',
    borderRadius: '4px',
  },
  list: {
    marginTop: '10px',
    paddingLeft: '20px',
  },
  recommendationItem: {
    marginBottom: '8px',
  },
  severity: {
    fontWeight: 'bold',
    marginRight: '5px',
  },
  action: {
    color: '#1976d2',
    fontWeight: '600',
  },
};

export default FraudDetectionWidget;
