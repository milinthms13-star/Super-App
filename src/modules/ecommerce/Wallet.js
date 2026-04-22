import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/Ecommerce.css';

const Wallet = () => {
  const { currentUser } = useApp();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchWallet();
      fetchTransactions();
    }
  }, [currentUser]);

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setWallet(response.data.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/wallet/transactions/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setTransactions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleAddMoney = async () => {
    if (addAmount <= 0) {
      alert('Enter valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/wallet/add-money`,
        { amount: addAmount },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );

      setWallet({
        ...wallet,
        balance: response.data.data.balance,
      });
      setTransactions([response.data.data.transaction, ...transactions]);
      setShowAddMoney(false);
      setAddAmount(100);
      alert('Money added successfully!');
    } catch (error) {
      alert('Error adding money: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    const icons = {
      Credit: '➕',
      Debit: '➖',
      Refund: '🔄',
      Transfer: '💸',
    };
    return icons[type] || '•';
  };

  const getTransactionColor = (type) => {
    const colors = {
      Credit: '#32CD32',
      Debit: '#FF6347',
      Refund: '#4169E1',
      Transfer: '#FFD700',
    };
    return colors[type] || '#999';
  };

  return (
    <div className="ecommerce-feature">
      <h2>💰 Digital Wallet</h2>

      {wallet && (
        <div className="wallet-display">
          <div className="balance-card">
            <h3>Available Balance</h3>
            <p className="balance-amount">₹{wallet.balance.toFixed(2)}</p>
            <p className="currency">{wallet.currency}</p>
          </div>

          <button className="btn btn-primary" onClick={() => setShowAddMoney(true)}>
            Add Money
          </button>
        </div>
      )}

      {showAddMoney && (
        <div className="add-money-form">
          <h3>Add Money to Wallet</h3>

          <div className="quick-amounts">
            {[100, 250, 500, 1000, 2500, 5000].map((amount) => (
              <button
                key={amount}
                className={`quick-btn ${addAmount === amount ? 'active' : ''}`}
                onClick={() => setAddAmount(amount)}
              >
                ₹{amount}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label>Custom Amount:</label>
            <input
              type="number"
              value={addAmount}
              onChange={(e) => setAddAmount(parseInt(e.target.value) || 0)}
              placeholder="Enter amount"
              min="1"
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddMoney} disabled={loading}>
              {loading ? 'Processing...' : `Add ₹${addAmount}`}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddMoney(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="transactions-section">
        <h3>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          <div className="transactions-list">
            {transactions.slice(0, 10).map((txn) => (
              <div key={txn.transactionId} className="transaction-item">
                <div className="txn-left">
                  <span
                    className="txn-icon"
                    style={{ color: getTransactionColor(txn.type) }}
                  >
                    {getTransactionIcon(txn.type)}
                  </span>
                  <div className="txn-info">
                    <p className="txn-type">{txn.type}</p>
                    <p className="txn-desc">{txn.description}</p>
                    <p className="txn-date">
                      {new Date(txn.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="txn-right">
                  <p className={`txn-amount ${txn.type === 'Debit' ? 'debit' : 'credit'}`}>
                    {txn.type === 'Debit' ? '-' : '+'}₹{txn.amount.toFixed(2)}
                  </p>
                  <span className={`txn-status ${txn.status.toLowerCase()}`}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {wallet && (
        <div className="wallet-stats">
          <div className="stat-card">
            <h4>Total Credited</h4>
            <p className="stat-value">₹{wallet.totalCredited.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h4>Total Debited</h4>
            <p className="stat-value">₹{wallet.totalDebited.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
