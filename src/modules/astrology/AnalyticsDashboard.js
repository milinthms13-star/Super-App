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
  const [consultantStats, setConsultantStats] = useState([]);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [userStats, setUserStats] = useState({
    totalProfiles: 0,
    profilesWithBirthDetails: 0,
    profilesWithFamilyMembers: 0,
    profilesWithSavedReadings: 0,
    usersWithBookings: 0,
    completionRate: 0,
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
      const [
        dashboardMetrics,
        dashboardAlerts,
        consultantData,
        revenueData,
        userData,
      ] = await Promise.all([
        astrologyService.getAnalyticsDashboard(period),
        astrologyService.getAnalyticsAlerts(24),
        astrologyService.getBookingsByConsultant(),
        astrologyService.getRevenueTrends(period),
        astrologyService.getUserStats(),
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
      setConsultantStats(consultantData || []);
      setRevenueTrends(revenueData || []);
      setUserStats(userData || {
        totalProfiles: 0,
        profilesWithBirthDetails: 0,
        profilesWithFamilyMembers: 0,
        profilesWithSavedReadings: 0,
        usersWithBookings: 0,
        completionRate: 0,
      });
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
          <h2>⚠️ Operational Alerts</h2>
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

        <section className="user-stats-card">
          <h2>👥 User Engagement</h2>
          <div className="user-stats-grid">
            <div className="user-stat">
              <span className="stat-label">Total Profiles</span>
              <strong className="stat-value">{userStats.totalProfiles || 0}</strong>
            </div>
            <div className="user-stat">
              <span className="stat-label">Complete Profiles</span>
              <strong className="stat-value">{userStats.profilesWithBirthDetails || 0}</strong>
              <span className="stat-percentage">{userStats.completionRate || 0}%</span>
            </div>
            <div className="user-stat">
              <span className="stat-label">With Family Profiles</span>
              <strong className="stat-value">{userStats.profilesWithFamilyMembers || 0}</strong>
            </div>
            <div className="user-stat">
              <span className="stat-label">Active Users</span>
              <strong className="stat-value">{userStats.usersWithBookings || 0}</strong>
            </div>
            <div className="user-stat">
              <span className="stat-label">Saved Readings</span>
              <strong className="stat-value">{userStats.profilesWithSavedReadings || 0}</strong>
            </div>
          </div>
        </section>

        <section className="consultant-stats-card">
          <h2>👨‍⚕️ Consultant Performance</h2>
          {Array.isArray(consultantStats) && consultantStats.length > 0 ? (
            <div className="consultant-stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Consultant</th>
                    <th>Total Bookings</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>Revenue</th>
                    <th>Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {consultantStats.map((consultant) => (
                    <tr key={consultant.consultantId}>
                      <td><strong>{consultant.consultantName || 'Unknown'}</strong></td>
                      <td>{consultant.totalBookings || 0}</td>
                      <td className="text-success">{consultant.completedBookings || 0}</td>
                      <td className="text-danger">{consultant.cancelledBookings || 0}</td>
                      <td>₹{Number(consultant.totalRevenue || 0).toLocaleString('en-IN')}</td>
                      <td className="text-success">₹{Number(consultant.completedRevenue || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No consultant data available yet.</p>
          )}
        </section>

        <section className="revenue-trends-card">
          <h2>💰 Revenue Trends</h2>
          {Array.isArray(revenueTrends) && revenueTrends.length > 0 ? (
            <div className="revenue-chart">
              <div className="chart-container">
                {revenueTrends.map((trend, index) => {
                  const maxRevenue = Math.max(...revenueTrends.map(t => t.completedRevenue || 0));
                  const height = maxRevenue > 0 ? ((trend.completedRevenue || 0) / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={trend.date || index} className="chart-bar-wrapper">
                      <div className="chart-bar-container">
                        <div 
                          className="chart-bar" 
                          style={{ height: `${height}%` }}
                          title={`₹${Number(trend.completedRevenue || 0).toLocaleString('en-IN')}`}
                        >
                          <span className="bar-value">₹{(trend.completedRevenue || 0) >= 1000 ? `${((trend.completedRevenue || 0) / 1000).toFixed(1)}k` : (trend.completedRevenue || 0)}</span>
                        </div>
                      </div>
                      <span className="chart-label">{new Date(trend.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      <span className="chart-sublabel">{trend.bookings || 0} bookings</span>
                    </div>
                  );
                })}
              </div>
              <div className="revenue-summary">
                <div className="summary-item">
                  <span>Total Bookings</span>
                  <strong>{revenueTrends.reduce((sum, t) => sum + (t.bookings || 0), 0)}</strong>
                </div>
                <div className="summary-item">
                  <span>Total Revenue</span>
                  <strong>₹{revenueTrends.reduce((sum, t) => sum + (t.revenue || 0), 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="summary-item">
                  <span>Completed Revenue</span>
                  <strong className="text-success">₹{revenueTrends.reduce((sum, t) => sum + (t.completedRevenue || 0), 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-data">No revenue trend data available yet.</p>
          )}
        </section>

        <section className="top-consultants-card">
          <h2>⭐ Top Consultants (by Revenue)</h2>
          {Array.isArray(metrics.topConsultants) && metrics.topConsultants.length > 0 ? (
            <div className="top-consultants-list">
              {metrics.topConsultants.slice(0, 5).map((consultant, index) => (
                <div key={consultant.consultantId || consultant.name} className="top-consultant-item">
                  <div className="consultant-rank">{index + 1}</div>
                  <div className="consultant-info">
                    <strong>{consultant.name}</strong>
                    <span>{consultant.bookings} bookings</span>
                  </div>
                  <div className="consultant-revenue">
                    ₹{Number(consultant.revenue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No consultant metrics yet.</p>
          )}
        </section>

        <section className="booking-trends-card">
          <h2>📊 Booking Trends</h2>
          {Array.isArray(metrics.bookingTrends) && metrics.bookingTrends.length > 0 ? (
            <div className="booking-trends-list">
              {metrics.bookingTrends.map((entry) => (
                <div key={entry.date} className="trend-item">
                  <span className="trend-date">{entry.date}</span>
                  <div className="trend-bar-container">
                    <div 
                      className="trend-bar" 
                      style={{ 
                        width: `${Math.min(100, (entry.bookings / Math.max(...metrics.bookingTrends.map(t => t.bookings))) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="trend-count">{entry.bookings}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No trend data yet.</p>
          )}
        </section>
      </div>
    </section>
  );
};

export default AnalyticsDashboard;
