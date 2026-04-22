import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import '../../styles/Ecommerce.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Subscriptions = () => {
  const { currentUser } = useApp();
  const [subscriptions, setSubscriptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    items: [],
    frequency: 'Monthly',
    deliveryDay: 'Monday',
    deliveryAddress: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchSubscriptions();
    }
  }, [currentUser]);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/subscriptions/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setSubscriptions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const handleCreateSubscription = async () => {
    if (!formData.deliveryAddress || formData.items.length === 0) {
      alert('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/subscriptions/create`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      setSubscriptions([response.data.data, ...subscriptions]);
      setFormData({
        items: [],
        frequency: 'Monthly',
        deliveryDay: 'Monday',
        deliveryAddress: '',
        endDate: '',
      });
      setShowForm(false);
      alert('Subscription created successfully!');
    } catch (error) {
      alert('Error creating subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    if (window.confirm('Cancel this subscription?')) {
      try {
        await axios.post(`${API_BASE_URL}/subscriptions/${subscriptionId}/cancel`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        fetchSubscriptions();
        alert('Subscription cancelled');
      } catch (error) {
        alert('Error cancelling subscription: ' + error.message);
      }
    }
  };

  const handlePauseSubscription = async (subscriptionId) => {
    try {
      await axios.post(`${API_BASE_URL}/subscriptions/${subscriptionId}/pause`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      fetchSubscriptions();
      alert('Subscription paused');
    } catch (error) {
      alert('Error pausing subscription: ' + error.message);
    }
  };

  return (
    <div className="ecommerce-feature">
      <h2>🔄 Regular Subscriptions</h2>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Create Subscription
        </button>
      ) : (
        <div className="feature-form">
          <h3>Subscribe for Regular Deliveries</h3>

          <div className="form-group">
            <label>Frequency:</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            >
              <option>Weekly</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>
          </div>

          <div className="form-group">
            <label>Preferred Delivery Day:</label>
            <select
              value={formData.deliveryDay}
              onChange={(e) => setFormData({ ...formData, deliveryDay: e.target.value })}
            >
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
              <option>Saturday</option>
              <option>Sunday</option>
            </select>
          </div>

          <div className="form-group">
            <label>Delivery Address:</label>
            <textarea
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              placeholder="Full delivery address"
            />
          </div>

          <div className="form-group">
            <label>End Date (optional):</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreateSubscription} disabled={loading}>
              {loading ? 'Creating...' : 'Start Subscription'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="feature-list">
        <h3>Active Subscriptions ({subscriptions.length})</h3>
        {subscriptions.length === 0 ? (
          <p>No active subscriptions</p>
        ) : (
          <div className="subscriptions-items">
            {subscriptions.map((sub) => (
              <div key={sub.subscriptionId} className="subscription-card">
                <div className="sub-header">
                  <h4>{sub.frequency} Delivery</h4>
                  <span className={`sub-status ${sub.status.toLowerCase()}`}>{sub.status}</span>
                </div>
                <p>Items: {sub.items.length}</p>
                <p>Next Delivery: {new Date(sub.nextDeliveryDate).toLocaleDateString()}</p>
                <p>Amount: ₹{sub.totalPrice} {sub.discount > 0 && `(${sub.discount}% off)`}</p>
                <div className="sub-actions">
                  {sub.status === 'Active' && (
                    <>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handlePauseSubscription(sub.subscriptionId)}
                      >
                        Pause
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCancelSubscription(sub.subscriptionId)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscriptions;
