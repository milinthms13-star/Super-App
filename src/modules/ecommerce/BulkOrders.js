import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import '../../styles/Ecommerce.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BulkOrders = () => {
  const { currentUser } = useApp();
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    items: [],
    companyName: '',
    gstNumber: '',
    deliveryAddress: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bulk-orders/customer/${currentUser.email}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleCreateOrder = async () => {
    if (!formData.companyName || formData.items.length === 0) {
      alert('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/bulk-orders/create`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      setOrders([response.data.data, ...orders]);
      setFormData({
        items: [],
        companyName: '',
        gstNumber: '',
        deliveryAddress: '',
        notes: '',
      });
      setShowForm(false);
      alert('Bulk order created! Waiting for seller quote...');
    } catch (error) {
      alert('Error creating order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: '#FFA500',
      Quoted: '#4169E1',
      Confirmed: '#32CD32',
      Processing: '#FF6347',
      Shipped: '#87CEEB',
      Delivered: '#90EE90',
      Cancelled: '#DC143C',
    };
    return colors[status] || '#999';
  };

  return (
    <div className="ecommerce-feature">
      <h2>🏢 Bulk Orders (B2B)</h2>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Create Bulk Order
        </button>
      ) : (
        <div className="feature-form">
          <h3>Request Bulk Order</h3>

          <div className="form-group">
            <label>Company Name:</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Your company name"
            />
          </div>

          <div className="form-group">
            <label>GST Number:</label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              placeholder="GST number (optional)"
            />
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
            <label>Additional Notes:</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requirements..."
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading}>
              {loading ? 'Creating...' : 'Request Quote'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="feature-list">
        <h3>Your Bulk Orders ({orders.length})</h3>
        {orders.length === 0 ? (
          <p>No bulk orders yet</p>
        ) : (
          <div className="orders-items">
            {orders.map((order) => (
              <div key={order.bulkOrderId} className="order-card">
                <div className="order-header">
                  <h4>{order.companyName}</h4>
                  <span className="order-status" style={{ backgroundColor: getStatusColor(order.status) }}>
                    {order.status}
                  </span>
                </div>
                <p>Order ID: {order.bulkOrderId}</p>
                <p>Items: {order.items.length} | Total: ₹{order.totalAmount}</p>
                <p>Discount: {order.discountPercentage}%</p>
                <p className="text-muted">Created: {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOrders;
