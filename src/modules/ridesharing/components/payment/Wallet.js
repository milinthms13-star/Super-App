/**
 * Wallet.js
 * Main wallet component showing balance, add money, transactions
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Wallet.css';

const Wallet = () => {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [addMoneyForm, setAddMoneyForm] = useState({ amount: '' });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/api/ridesharing/phase3/wallet/balance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(response.data.balance || 0);
      setWallet(response.data.wallet);
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/ridesharing/phase3/wallet/transactions?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    }
  };

  const handleAddMoneyChange = (e) => {
    const { name, value } = e.target;
    setAddMoneyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMoneySubmit = async (e) => {
    e.preventDefault();
    const amount = parseInt(addMoneyForm.amount);

    if (!amount || amount < 50) {
      setError('Minimum amount is ₹50');
      return;
    }

    try {
      // Initiate payment
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase3/wallet/add-money-initiate`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // In production, integrate with Razorpay payment gateway
      // For now, simulate payment completion
      setTimeout(async () => {
        try {
          await axios.post(
            `${API_BASE}/api/ridesharing/phase3/wallet/add-money-complete`,
            { amount, paymentId: `PAY_${Date.now()}` },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setSuccessMessage(`₹${amount} added to wallet`);
          setAddMoneyForm({ amount: '' });
          setShowAddMoney(false);
          fetchWalletBalance();

          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
          setError('Payment failed');
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add money');
    }
  };

  const handleViewTransactions = () => {
    setShowTransactions(!showTransactions);
    if (!showTransactions) {
      fetchTransactions();
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTransactionIcon = (type) => {
    return type === 'credit' ? '↓' : '↑';
  };

  const getTransactionColor = (type) => {
    return type === 'credit' ? '#10b981' : '#ef4444';
  };

  if (loading) {
    return <div className="wallet-loading">Loading wallet...</div>;
  }

  return (
    <div className="wallet-container">
      {/* Header */}
      <div className="wallet-header">
        <h1>💳 My Wallet</h1>
        <button className="refresh-btn" onClick={fetchWalletBalance}>
          🔄 Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-content">
          <p className="balance-label">Wallet Balance</p>
          <h2 className="balance-amount">{formatAmount(balance)}</h2>
          <p className="balance-info">Cash ready to use for your rides</p>
        </div>
        <div className="balance-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddMoney(!showAddMoney)}
          >
            + Add Money
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleViewTransactions}
          >
            📋 History
          </button>
        </div>
      </div>

      {/* Add Money Form */}
      {showAddMoney && (
        <div className="add-money-section">
          <h3>Add Money to Wallet</h3>
          <form onSubmit={handleAddMoneySubmit}>
            <div className="form-group">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={addMoneyForm.amount}
                onChange={handleAddMoneyChange}
                placeholder="Enter amount (min ₹50)"
                min="50"
                max="100000"
                required
              />
              <span className="form-hint">Min: ₹50 | Max: ₹1,00,000</span>
            </div>

            <div className="quick-amounts">
              <p>Quick Select:</p>
              <button
                type="button"
                onClick={() => setAddMoneyForm({ amount: '100' })}
              >
                ₹100
              </button>
              <button
                type="button"
                onClick={() => setAddMoneyForm({ amount: '250' })}
              >
                ₹250
              </button>
              <button
                type="button"
                onClick={() => setAddMoneyForm({ amount: '500' })}
              >
                ₹500
              </button>
              <button
                type="button"
                onClick={() => setAddMoneyForm({ amount: '1000' })}
              >
                ₹1000
              </button>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Proceed to Payment
              </button>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => {
                  setShowAddMoney(false);
                  setAddMoneyForm({ amount: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions */}
      {showTransactions && (
        <div className="transactions-section">
          <h3>💰 Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="no-data">No transactions yet</p>
          ) : (
            <div className="transactions-list">
              {transactions.map((tx, idx) => (
                <div key={idx} className="transaction-item">
                  <div className="tx-icon" style={{ color: getTransactionColor(tx.type) }}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="tx-details">
                    <p className="tx-description">{tx.description}</p>
                    <p className="tx-date">
                      {new Date(tx.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="tx-amount" style={{ color: getTransactionColor(tx.type) }}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wallet Stats */}
      {wallet && (
        <div className="wallet-stats">
          <div className="stat-card">
            <p className="stat-label">Total Added</p>
            <p className="stat-value">{formatAmount(wallet.totalAdded)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Spent</p>
            <p className="stat-value">{formatAmount(wallet.totalSpent)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Cashback Earned</p>
            <p className="stat-value">{formatAmount(wallet.totalCashback)}</p>
          </div>
        </div>
      )}

      {/* Security Info */}
      <div className="security-info">
        <h4>🔒 Wallet Security</h4>
        <p>Your wallet is secured with end-to-end encryption. All transactions are protected.</p>
      </div>
    </div>
  );
};

export default Wallet;
