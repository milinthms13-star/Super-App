import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { astrologyService } from '../../services/astrologyService';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { currentUser } = useApp();
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    topConsultants: [],
    bookingTrends: [],
    userRetention: 0,
  });
  const [period, setPeriod] = useState('month');
  const [alerts, setAlerts] = useState({
    windowHours: 24,
    generatedAt: '',
    signals: {
      paymentVerificationFailures: { count: 0, severity: 'info' },
      slotConflictSpikes: { count: 0, severity: 'info' },
      webhookErrors: { count: 0, severity: 'info' },
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = String(currentUser?.role || currentUser?.registrationType || '').toLowerCase() === 'admin';

  const getSeverityClassName = (severity = '') => {
    const normalized = String(severity || '').toLowerCase();
    if (normalized === 'critical') return 'severity-critical';
    if (normalized === 'warn') return 'severity-warn';
    return 'severity-info';
  };

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboardMetrics, dashboardAlerts] = await Promise.all([
        astrologyService.getAnalyticsDashboard(period),
        astrologyService.getAnalyticsAlerts(24),
      ]);
      setMetrics(dashboardMetrics || {});
      setAlerts(
        dashboardAlerts || {
          windowHours: 24,
          generatedAt: '',
          signals: {
            paymentVerificationFailures: { count: 0, severity: 'info' },
            slotConflictSpikes: { count: 0, severity: 'info' },
            webhookErrors: { count: 0, severity: 'info' },
          },
        }
      );
    } catch (requestError) {
      if (requestError?.status === 403) {
        setError('Admin access required to view analytics dashboard.');
      } else {
        setError(requestError?.message || 'Failed to load analytics dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void loadAnalytics();
  }, [isAdmin, loadAnalytics]);

  if (!isAdmin) {
    return <section className="analytics-dashboard"><p className="analytics-error">Admin access required.</p></section>;
  }

  const downloadReport = async (format = 'pdf') => {
    try {
      const report = await astrologyService.downloadAnalyticsReport(period, format);

      const url = window.URL.createObjectURL(new Blob([report.blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.fileName || `astrology-report-${period}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      if (requestError?.status === 403) {
        setError('Admin access required to download analytics report.');
      } else {
        setError(requestError?.message || 'Failed to download analytics report.');
      }
    }
  };

  return (
    <section className="analytics-dashboard">
      <header className="analytics-header">
        <h1>Astrology Analytics Dashboard</h1>
        <div className="analytics-controls">
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
            <option value="year">This year</option>
            <option value="total">All time</option>
          </select>
          <button type="button" onClick={() => downloadReport('pdf')}>
            Download PDF
          </button>
          <button type="button" onClick={() => downloadReport('csv')}>
            Export CSV
          </button>
        </div>
      </header>

      {loading ? <p>Loading analytics...</p> : null}
      {error ? <p className="analytics-error">{error}</p> : null}

      <div className="metrics-grid">
        <article className="metric-card">
          <span>Total bookings</span>
          <strong>{metrics.totalBookings || 0}</strong>
        </article>
        <article className="metric-card">
          <span>Completed bookings</span>
          <strong>{metrics.completedBookings || 0}</strong>
        </article>
        <article className="metric-card">
          <span>Cancelled bookings</span>
          <strong>{metrics.cancelledBookings || 0}</strong>
        </article>
        <article className="metric-card">
          <span>Total revenue</span>
          <strong>INR {Number(metrics.totalRevenue || 0).toLocaleString('en-IN')}</strong>
        </article>
        <article className="metric-card">
          <span>Average rating</span>
          <strong>{Number(metrics.averageRating || 0).toFixed(1)}</strong>
        </article>
        <article className="metric-card">
          <span>User retention</span>
          <strong>{metrics.userRetention || 0}%</strong>
        </article>
      </div>

      <div className="analytics-sections">
        <section className="alerts-card">
          <h2>Operational alerts</h2>
          <p className="alerts-subtitle">
            Last {alerts.windowHours || 24}h
            {alerts.generatedAt ? ` • Updated ${new Date(alerts.generatedAt).toLocaleString('en-IN')}` : ''}
          </p>
          <ul className="alerts-list">
            <li>
              <span>Payment verification failures</span>
              <strong className={`severity-badge ${getSeverityClassName(alerts?.signals?.paymentVerificationFailures?.severity)}`}>
                {alerts?.signals?.paymentVerificationFailures?.count || 0} • {alerts?.signals?.paymentVerificationFailures?.severity || 'info'}
              </strong>
            </li>
            <li>
              <span>Slot conflict spikes</span>
              <strong className={`severity-badge ${getSeverityClassName(alerts?.signals?.slotConflictSpikes?.severity)}`}>
                {alerts?.signals?.slotConflictSpikes?.count || 0} • {alerts?.signals?.slotConflictSpikes?.severity || 'info'}
              </strong>
            </li>
            <li>
              <span>Webhook errors</span>
              <strong className={`severity-badge ${getSeverityClassName(alerts?.signals?.webhookErrors?.severity)}`}>
                {alerts?.signals?.webhookErrors?.count || 0} • {alerts?.signals?.webhookErrors?.severity || 'info'}
              </strong>
            </li>
          </ul>
        </section>

        <section>
          <h2>Top consultants</h2>
          {Array.isArray(metrics.topConsultants) && metrics.topConsultants.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topConsultants.map((consultant) => (
                  <tr key={consultant.consultantId || consultant.name}>
                    <td>{consultant.name}</td>
                    <td>{consultant.bookings}</td>
                    <td>INR {Number(consultant.revenue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No consultant metrics yet.</p>
          )}
        </section>

        <section>
          <h2>Booking trend</h2>
          {Array.isArray(metrics.bookingTrends) && metrics.bookingTrends.length > 0 ? (
            <ul>
              {metrics.bookingTrends.map((entry) => (
                <li key={entry.date}>
                  {entry.date}: {entry.bookings}
                </li>
              ))}
            </ul>
          ) : (
            <p>No trend data yet.</p>
          )}
        </section>
      </div>
    </section>
  );
};

export default AnalyticsDashboard;
