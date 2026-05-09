/**
 * AdminOrderDashboard.jsx
 * Phase 5E - Admin dashboard for order, return, and fulfillment management
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminOrderDashboard.css';

const AdminOrderDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkAction, setBulkAction] = useState('Confirmed');

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'overview') {
        const [ordersRes, returnsRes, shipmentsRes] = await Promise.all([
          axios.get('/api/admin/orders?limit=10'),
          axios.get('/api/admin/returns/pending'),
          axios.get('/api/admin/shipments/by-status/in_transit?limit=10'),
        ]);

        setOrders(ordersRes.data.data.orders || []);
        setReturns(returnsRes.data.data.returns || []);
        setShipments(shipmentsRes.data.data.shipments || []);
      } else if (activeTab === 'orders') {
        const res = await axios.get('/api/admin/orders?limit=50');
        setOrders(res.data.data.orders || []);
      } else if (activeTab === 'returns') {
        const res = await axios.get('/api/admin/returns/pending?limit=50');
        setReturns(res.data.data.returns || []);
      } else if (activeTab === 'shipments') {
        const res = await axios.get('/api/admin/shipments/by-status/pending?limit=50');
        setShipments(res.data.data.shipments || []);
      }

      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateOrders = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select orders');
      return;
    }

    try {
      await axios.post('/api/admin/orders/bulk-status-update', {
        orderIds: selectedOrders,
        status: bulkAction,
        notes: `Bulk updated by admin`,
      });

      alert('Orders updated successfully');
      setSelectedOrders([]);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update orders');
    }
  };

  const handleApproveReturn = async (returnId) => {
    try {
      await axios.post(`/api/admin/returns/${returnId}/approve`, {
        adminNotes: 'Approved',
      });

      alert('Return approved');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve return');
    }
  };

  const handleRejectReturn = async (returnId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await axios.post(`/api/admin/returns/${returnId}/reject`, {
        rejectionReason: reason,
      });

      alert('Return rejected');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject return');
    }
  };

  const handleOrderCheckbox = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const renderOrdersTab = () => (
    <div className="tab-panel">
      <h3>Orders Management</h3>

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
          <option value="Confirmed">Confirmed</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={handleBulkUpdateOrders}
          disabled={selectedOrders.length === 0}
        >
          Update {selectedOrders.length} Order{selectedOrders.length !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Orders Table */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={e =>
                  setSelectedOrders(e.target.checked ? orders.map(o => o._id) : [])
                }
              />
            </th>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order._id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order._id)}
                  onChange={() => handleOrderCheckbox(order._id)}
                />
              </td>
              <td>#{order._id.substring(0, 8)}</td>
              <td>{order.customerName || 'N/A'}</td>
              <td>₹{order.total?.toFixed(2)}</td>
              <td>
                <span className={`status-badge status-${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>
              <td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
              <td>
                <button className="btn-small btn-primary">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderReturnsTab = () => (
    <div className="tab-panel">
      <h3>Returns Management</h3>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Return ID</th>
            <th>Order ID</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Items</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {returns.map(ret => (
            <tr key={ret._id}>
              <td>{ret.returnId}</td>
              <td>#{ret.orderId.substring(0, 8)}</td>
              <td>{ret.reason}</td>
              <td>
                <span className={`status-badge status-${ret.status}`}>
                  {ret.status}
                </span>
              </td>
              <td>{ret.items?.length || 0} items</td>
              <td>{new Date(ret.initiatedAt).toLocaleDateString('en-IN')}</td>
              <td>
                {ret.status === 'initiated' && (
                  <>
                    <button
                      className="btn-small btn-success"
                      onClick={() => handleApproveReturn(ret.returnId)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleRejectReturn(ret.returnId)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderShipmentsTab = () => (
    <div className="tab-panel">
      <h3>Shipments Management</h3>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Tracking Number</th>
            <th>Order ID</th>
            <th>Status</th>
            <th>Current Location</th>
            <th>Estimated Delivery</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map(shipment => (
            <tr key={shipment._id}>
              <td>{shipment.trackingNumber}</td>
              <td>#{shipment.orderId.substring(0, 8)}</td>
              <td>
                <span className={`status-badge status-${shipment.status}`}>
                  {shipment.status}
                </span>
              </td>
              <td>{shipment.currentLocation || 'N/A'}</td>
              <td>{new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN')}</td>
              <td>{new Date(shipment.createdAt).toLocaleDateString('en-IN')}</td>
              <td>
                <button className="btn-small btn-primary">Update</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="tab-panel">
      <h3>Dashboard Overview</h3>

      <div className="dashboard-cards">
        <div className="card">
          <h4>Recent Orders</h4>
          <p className="card-count">{orders.length}</p>
          <button className="btn-small btn-secondary">View All</button>
        </div>

        <div className="card">
          <h4>Pending Returns</h4>
          <p className="card-count">{returns.length}</p>
          <button className="btn-small btn-secondary">View All</button>
        </div>

        <div className="card">
          <h4>In Transit Shipments</h4>
          <p className="card-count">{shipments.length}</p>
          <button className="btn-small btn-secondary">View All</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="section">
          <h4>Recent Orders</h4>
          <div className="mini-list">
            {orders.slice(0, 5).map(order => (
              <div key={order._id} className="mini-item">
                <span>#{order._id.substring(0, 8)}</span>
                <span>₹{order.total?.toFixed(2)}</span>
                <span className="status">{order.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h4>Pending Returns</h4>
          <div className="mini-list">
            {returns.slice(0, 5).map(ret => (
              <div key={ret._id} className="mini-item">
                <span>{ret.returnId}</span>
                <span>{ret.reason}</span>
                <span className="status">{ret.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-order-dashboard">
      <h1>Order Management Dashboard</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={`tab ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          Returns
        </button>
        <button
          className={`tab ${activeTab === 'shipments' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipments')}
        >
          Shipments
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'returns' && renderReturnsTab()}
          {activeTab === 'shipments' && renderShipmentsTab()}
        </>
      )}
    </div>
  );
};

export default AdminOrderDashboard;
