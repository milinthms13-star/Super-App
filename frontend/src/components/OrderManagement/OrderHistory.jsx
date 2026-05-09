/**
 * OrderHistory.jsx
 * Phase 5E - User's order history view
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './OrderHistory.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: '-1',
    page: 1,
  });
  const [pagination, setPagination] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (params.status === 'all') delete params.status;

      const response = await axios.get('/api/orders/my-orders', { params });
      setOrders(response.data.data.orders);
      setPagination(response.data.data.pagination);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = status => {
    const statusMap = {
      'Pending Payment': 'status-pending',
      'Confirmed': 'status-confirmed',
      'Processing': 'status-processing',
      'Shipped': 'status-shipped',
      'Delivered': 'status-delivered',
      'Cancelled': 'status-cancelled',
    };
    return statusMap[status] || 'status-default';
  };

  const formatDate = date => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="order-history">
      <h2>My Orders</h2>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="all">All Orders</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)}>
            <option value="createdAt">Recent</option>
            <option value="total">Price</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found</p>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card" onClick={() => navigate(`/orders/${order._id}`)}>
                <div className="order-header">
                  <div className="order-id">
                    <strong>Order #{order._id.substring(0, 8)}</strong>
                    <span className={`status-badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                  </div>
                  <div className="order-amount">₹{order.total?.toFixed(2) || '0.00'}</div>
                </div>

                <div className="order-items">
                  {order.items?.slice(0, 2).map((item, idx) => (
                    <span key={idx} className="item-name">{item.name || 'Item'}</span>
                  ))}
                  {order.items?.length > 2 && <span className="more-items">+{order.items.length - 2} more</span>}
                </div>

                <div className="order-footer">
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                  <button className="view-btn">View Details →</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`page-btn ${page === pagination.page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderHistory;
