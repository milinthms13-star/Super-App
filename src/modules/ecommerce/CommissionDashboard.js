/**
 * Commission Dashboard Component
 * Displays commission earnings, transactions, and pending settlements
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/CommissionDashboard.css';

const CommissionDashboard = () => {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentUser) {
      fetchCommissionData();
    }
  }, [currentUser, selectedPeriod]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, transactionsRes, settlementsRes, summaryRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/ecommerce/commission/stats`, { headers }),
        axios.get(`${API_BASE_URL}/ecommerce/commission/transactions?limit=10`, { headers }),
        axios.get(`${API_BASE_URL}/ecommerce/commission/pending-settlements`, { headers }),
        axios.get(`${API_BASE_URL}/ecommerce/commission/earnings-breakdown?period=${selectedPeriod}`, { headers }),
      ]);

      setStats(statsRes.data.stats);
      setTransactions(transactionsRes.data.transactions);
      setPendingSettlements(settlementsRes.data);
      setSummary(summaryRes.data.summary);
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger',
    };
    return colors[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="commission-loading">
        <div className="spinner"></div>
        <p>Loading commission data...</p>
      </div>
    );
  }

  return (
    <div className="commission-dashboard">
      <div className="dashboard-header">
        <h1>💰 Commission & Earnings</h1>
        <p>Track your earnings, commissions, and settlements</p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon revenue">📈</div>
            <div className="stat-details">
              <span className="stat-label">This Month Revenue</span>
              <span className="stat-value">{formatCurrency(stats.thisMonth.revenue)}</span>
              <span className="stat-subtext">{stats.thisMonth.orders} orders</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon commission">💸</div>
            <div className="stat-details">
              <span className="stat-label">Commission Paid</span>
              <span className="stat-value">{formatCurrency(stats.thisMonth.commission)}</span>
              <span className="stat-subtext">{stats.commissionRate}% rate</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon earnings">💵</div>
            <div className="stat-details">
              <span className="stat-label">Net Earnings</span>
              <span className="stat-value">{formatCurrency(stats.thisMonth.netRevenue)}</span>
              <span className="stat-subtext">After commission</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">⏳</div>
            <div className="stat-details">
              <span className="stat-label">Pending Settlement</span>
              <span className="stat-value">{formatCurrency(stats.pending.amount)}</span>
              <span className="stat-subtext">{stats.pending.count} transactions</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'transactions' ? 'active' : ''}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button
          className={activeTab === 'settlements' ? 'active' : ''}
          onClick={() => setActiveTab('settlements')}
        >
          Settlements
        </button>
        <button
          className={activeTab === 'breakdown' ? 'active' : ''}
          onClick={() => setActiveTab('breakdown')}
        >
          Breakdown
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="comparison-card">
            <h3>📊 Monthly Comparison</h3>
            <div className="comparison-grid">
              <div className="comparison-item">
                <span className="label">Last Month</span>
                <span className="value">{formatCurrency(stats?.lastMonth.revenue || 0)}</span>
              </div>
              <div className="comparison-item">
                <span className="label">This Month</span>
                <span className="value">{formatCurrency(stats?.thisMonth.revenue || 0)}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Growth</span>
                <span className={`value ${(stats?.thisMonth.revenue - stats?.lastMonth.revenue) >= 0 ? 'positive' : 'negative'}`}>
                  {((stats?.thisMonth.revenue - stats?.lastMonth.revenue) / (stats?.lastMonth.revenue || 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {pendingSettlements && pendingSettlements.summary && (
            <div className="settlement-info-card">
              <h3>⏳ Next Settlement</h3>
              <div className="settlement-details">
                <div className="settlement-amount">
                  <span className="amount">{formatCurrency(pendingSettlements.summary.totalAmount)}</span>
                  <span className="count">{pendingSettlements.summary.count} transactions</span>
                </div>
                {pendingSettlements.summary.nextSettlementDate && (
                  <div className="settlement-date">
                    <span>Expected on:</span>
                    <strong>{formatDate(pendingSettlements.summary.nextSettlementDate)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="plan-info-card">
            <h3>📦 Your Plan</h3>
            <div className="plan-details">
              <div className="plan-name">{stats?.subscriptionPlan || 'Free'}</div>
              <div className="commission-rate">
                <span>Commission Rate:</span>
                <strong>{stats?.commissionRate}%</strong>
              </div>
              <p className="plan-note">
                Upgrade your plan to reduce commission rates and increase your earnings
              </p>
              <button className="btn btn-primary" onClick={() => window.location.href = '/ecommerce/subscription'}>
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="transactions-section">
          <div className="section-header">
            <h3>Recent Transactions</h3>
            <button className="btn btn-secondary" onClick={fetchCommissionData}>
              🔄 Refresh
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="no-data">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction ID</th>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Commission</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn._id}>
                      <td>{formatDate(txn.createdAt)}</td>
                      <td className="transaction-id">{txn.transactionId}</td>
                      <td>{txn.orderId?.customerName || 'N/A'}</td>
                      <td className="amount">{formatCurrency(txn.productAmount)}</td>
                      <td className="commission">-{formatCurrency(txn.commission.totalCommission)}</td>
                      <td className="net">{formatCurrency(txn.settlement.netAmount)}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(txn.settlement.status)}`}>
                          {txn.settlement.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && pendingSettlements && (
        <div className="settlements-section">
          <h3>Pending Settlements</h3>

          {pendingSettlements.transactions.length === 0 ? (
            <div className="no-data">
              <p>No pending settlements</p>
            </div>
          ) : (
            <>
              <div className="settlement-summary">
                <div className="summary-item">
                  <span>Total Amount:</span>
                  <strong>{formatCurrency(pendingSettlements.summary.totalAmount)}</strong>
                </div>
                <div className="summary-item">
                  <span>Transaction Count:</span>
                  <strong>{pendingSettlements.summary.count}</strong>
                </div>
              </div>

              <div className="settlements-list">
                {pendingSettlements.transactions.map((txn) => (
                  <div key={txn._id} className="settlement-item">
                    <div className="settlement-header">
                      <span className="txn-id">{txn.transactionId}</span>
                      <span className="date">{formatDate(txn.createdAt)}</span>
                    </div>
                    <div className="settlement-body">
                      <div className="amount-info">
                        <span>Order Amount:</span>
                        <span>{formatCurrency(txn.productAmount)}</span>
                      </div>
                      <div className="amount-info">
                        <span>Commission:</span>
                        <span className="negative">-{formatCurrency(txn.commission.totalCommission)}</span>
                      </div>
                      <div className="amount-info net">
                        <span>Net Payable:</span>
                        <strong>{formatCurrency(txn.settlement.netAmount)}</strong>
                      </div>
                    </div>
                    <div className="settlement-footer">
                      <span>Settlement Date: {formatDate(txn.settlement.scheduledDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Breakdown Tab */}
      {activeTab === 'breakdown' && summary && (
        <div className="breakdown-section">
          <div className="period-selector">
            <label>Period:</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          <div className="breakdown-summary">
            <div className="summary-card">
              <h4>Total Orders</h4>
              <div className="value">{summary.totalOrders}</div>
            </div>
            <div className="summary-card">
              <h4>Total Revenue</h4>
              <div className="value">{formatCurrency(summary.totalRevenue)}</div>
            </div>
            <div className="summary-card">
              <h4>Total Commission</h4>
              <div className="value negative">{formatCurrency(summary.totalCommission)}</div>
            </div>
            <div className="summary-card">
              <h4>Net Earnings</h4>
              <div className="value positive">{formatCurrency(summary.netPayable)}</div>
            </div>
          </div>

          {summary.byCategory && Object.keys(summary.byCategory).length > 0 && (
            <div className="category-breakdown">
              <h3>By Category</h3>
              <div className="category-grid">
                {Object.entries(summary.byCategory).map(([category, data]) => (
                  <div key={category} className="category-card">
                    <h4>{category}</h4>
                    <div className="category-stats">
                      <div className="stat">
                        <span>Orders:</span>
                        <span>{data.orders}</span>
                      </div>
                      <div className="stat">
                        <span>Revenue:</span>
                        <span>{formatCurrency(data.revenue)}</span>
                      </div>
                      <div className="stat">
                        <span>Commission:</span>
                        <span>{formatCurrency(data.commission)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.byMonth && Object.keys(summary.byMonth).length > 0 && (
            <div className="monthly-breakdown">
              <h3>Monthly Trend</h3>
              <div className="monthly-chart">
                {Object.entries(summary.byMonth)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, data]) => (
                    <div key={month} className="month-item">
                      <div className="month-label">{month}</div>
                      <div className="month-bar">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(data.revenue / summary.totalRevenue) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="month-value">{formatCurrency(data.revenue)}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommissionDashboard;
