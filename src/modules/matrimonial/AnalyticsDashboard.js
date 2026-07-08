import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList
} from 'recharts';
import './AnalyticsDashboard.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'];

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    fetchTimeSeriesData('users');
    fetchTimeSeriesData('messages');
    fetchTimeSeriesData('interests');
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/matrimonial/analytics/dashboard', {
        params: dateRange
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSeriesData = async (metric) => {
    try {
      const response = await axios.get('/api/matrimonial/analytics/timeseries', {
        params: { metric, ...dateRange, interval: 'day' }
      });
      setTimeSeriesData(prev => ({ ...prev, [metric]: response.data.data }));
    } catch (error) {
      console.error(`Failed to fetch ${metric} time-series:`, error);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = async (type) => {
    try {
      const response = await axios.get('/api/matrimonial/analytics/export', {
        params: { type, ...dateRange, format: 'csv' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${type}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  const renderOverview = () => {
    if (!dashboardData) return null;

    const { engagement, revenue } = dashboardData;

    return (
      <div className="overview-section">
        <div className="metrics-grid">
          <div className="metric-card gradient-1">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <h3>{engagement.profiles.total.toLocaleString()}</h3>
              <p>Total Profiles</p>
              <span className="metric-change">
                +{engagement.profiles.new} new
              </span>
            </div>
          </div>

          <div className="metric-card gradient-2">
            <div className="metric-icon">✨</div>
            <div className="metric-content">
              <h3>{engagement.profiles.active.toLocaleString()}</h3>
              <p>Active Users</p>
              <span className="metric-change">
                {engagement.profiles.activeRate}% active rate
              </span>
            </div>
          </div>

          <div className="metric-card gradient-3">
            <div className="metric-icon">💬</div>
            <div className="metric-content">
              <h3>{engagement.engagement.totalMessages.toLocaleString()}</h3>
              <p>Messages Sent</p>
              <span className="metric-change">
                Avg {engagement.engagement.avgMessagesPerUser}/user
              </span>
            </div>
          </div>

          <div className="metric-card gradient-4">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <h3>₹{revenue.revenue.total.toLocaleString()}</h3>
              <p>Total Revenue</p>
              <span className="metric-change">
                MRR: ₹{revenue.revenue.mrr.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="metric-card gradient-5">
            <div className="metric-icon">💝</div>
            <div className="metric-content">
              <h3>{engagement.engagement.totalInterests.toLocaleString()}</h3>
              <p>Interests Sent</p>
              <span className="metric-change">
                {engagement.engagement.interestAcceptanceRate}% accepted
              </span>
            </div>
          </div>

          <div className="metric-card gradient-6">
            <div className="metric-icon">👁️</div>
            <div className="metric-content">
              <h3>{engagement.engagement.profileViews.toLocaleString()}</h3>
              <p>Profile Views</p>
              <span className="metric-change">
                Total views
              </span>
            </div>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h3>User Growth Trend</h3>
            {timeSeriesData.users && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData.users}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#667eea" strokeWidth={2} name="New Users" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <h3>Message Activity</h3>
            {timeSeriesData.messages && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData.messages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#764ba2" name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFunnel = () => {
    if (!dashboardData || !dashboardData.funnel) return null;

    const funnelData = dashboardData.funnel.stages.map(stage => ({
      name: stage.stage,
      value: stage.count,
      percentage: stage.percentage
    }));

    return (
      <div className="funnel-section">
        <div className="funnel-header">
          <h3>Conversion Funnel</h3>
          <div className="conversion-rate">
            Overall Conversion: <strong>{dashboardData.funnel.conversionRate}%</strong>
          </div>
        </div>

        <div className="funnel-chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <FunnelChart>
              <Tooltip />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
              >
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                <LabelList position="inside" fill="#fff" stroke="none" dataKey="value" />
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        <div className="funnel-table">
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Count</th>
                <th>Conversion Rate</th>
                <th>Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.funnel.stages.map((stage, index) => {
                const prevStage = index > 0 ? dashboardData.funnel.stages[index - 1] : null;
                const dropoff = prevStage ? 
                  ((prevStage.count - stage.count) / prevStage.count * 100).toFixed(1) : 0;

                return (
                  <tr key={index}>
                    <td>{stage.stage}</td>
                    <td>{stage.count.toLocaleString()}</td>
                    <td>{stage.percentage}%</td>
                    <td className={dropoff > 50 ? 'high-dropoff' : ''}>
                      {index > 0 ? `${dropoff}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRevenue = () => {
    if (!dashboardData || !dashboardData.revenue) return null;

    const { revenue, subscriptions } = dashboardData.revenue;

    const tierData = Object.entries(revenue.byTier).map(([tier, data]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      count: data.count,
      revenue: data.revenue
    }));

    return (
      <div className="revenue-section">
        <div className="revenue-cards">
          <div className="revenue-card">
            <h4>Total Revenue</h4>
            <div className="revenue-value">₹{revenue.total.toLocaleString()}</div>
          </div>

          <div className="revenue-card">
            <h4>Monthly Recurring Revenue</h4>
            <div className="revenue-value">₹{revenue.mrr.toLocaleString()}</div>
          </div>

          <div className="revenue-card">
            <h4>Average Revenue Per User</h4>
            <div className="revenue-value">₹{revenue.arpu}</div>
          </div>

          <div className="revenue-card">
            <h4>Churn Rate</h4>
            <div className="revenue-value">{subscriptions.churnRate}%</div>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h3>Revenue by Tier</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#667eea" name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Subscriptions by Tier</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderDemographics = () => {
    if (!dashboardData || !dashboardData.demographics) return null;

    const { gender, age, religion, location } = dashboardData.demographics;

    return (
      <div className="demographics-section">
        <div className="charts-row">
          <div className="chart-card">
            <h3>Gender Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={gender}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ _id, percent }) => `${_id}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {gender.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Age Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={age}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#764ba2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h3>Top Religions</h3>
            <div className="list-chart">
              {religion.map((item, index) => (
                <div key={index} className="list-item">
                  <span className="list-label">{item._id || 'Not specified'}</span>
                  <div className="list-bar">
                    <div 
                      className="list-bar-fill"
                      style={{ 
                        width: `${(item.count / religion[0].count) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                  <span className="list-value">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>Top Locations</h3>
            <div className="list-chart">
              {location.map((item, index) => (
                <div key={index} className="list-item">
                  <span className="list-label">{item._id || 'Not specified'}</span>
                  <div className="list-bar">
                    <div 
                      className="list-bar-fill"
                      style={{ 
                        width: `${(item.count / location[0].count) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                  <span className="list-value">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !dashboardData) {
    return <div className="analytics-loading">📊 Loading analytics...</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Analytics Dashboard</h1>
          <p>Comprehensive insights and metrics</p>
        </div>

        <div className="header-controls">
          <div className="date-range-picker">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
            />
          </div>

          <button onClick={() => handleExport('engagement')} className="btn-export">
            📥 Export
          </button>
        </div>
      </div>

      <nav className="dashboard-nav">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'funnel' ? 'active' : ''}
          onClick={() => setActiveTab('funnel')}
        >
          Conversion Funnel
        </button>
        <button
          className={activeTab === 'revenue' ? 'active' : ''}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue
        </button>
        <button
          className={activeTab === 'demographics' ? 'active' : ''}
          onClick={() => setActiveTab('demographics')}
        >
          Demographics
        </button>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'funnel' && renderFunnel()}
        {activeTab === 'revenue' && renderRevenue()}
        {activeTab === 'demographics' && renderDemographics()}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
