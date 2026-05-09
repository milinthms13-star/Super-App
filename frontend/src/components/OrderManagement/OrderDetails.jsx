/**
 * OrderDetails.jsx
 * Phase 5E - Detailed order view with tracking and returns
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderDetails.css';

const OrderDetails = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const [detailsRes, trackingRes] = await Promise.all([
        axios.get(`/api/orders/${orderId}`),
        axios.get(`/api/orders/${orderId}/tracking`).catch(() => null),
      ]);

      setOrder(detailsRes.data.data.order);
      setTracking(trackingRes?.data?.data || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    try {
      setActionLoading(true);
      await axios.post(`/api/orders/${orderId}/cancel`, {
        reason: 'Customer requested cancellation',
      });
      alert('Order cancelled successfully');
      fetchOrderDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateReturn = () => {
    navigate(`/orders/${orderId}/return`);
  };

  const canCancel = () => {
    return ['Pending Payment', 'Confirmed', 'Processing'].includes(order?.status);
  };

  const canReturn = () => {
    return order?.status === 'Delivered';
  };

  if (loading) return <div className="loading">Loading order details...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!order) return <div className="alert alert-error">Order not found</div>;

  return (
    <div className="order-details">
      {/* Header */}
      <div className="order-header">
        <h2>Order #{order._id.substring(0, 8)}</h2>
        <div className="order-meta">
          <span className="status">{order.status}</span>
          <span className="date">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {canCancel() && (
          <button className="btn btn-danger" onClick={handleCancelOrder} disabled={actionLoading}>
            Cancel Order
          </button>
        )}
        {canReturn() && (
          <button className="btn btn-primary" onClick={handleInitiateReturn}>
            Initiate Return
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
          Back to Orders
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Order Details
        </button>
        <button
          className={`tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          Tracking
        </button>
        <button
          className={`tab ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          Payment
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="details-tab">
            {/* Items */}
            <section className="section">
              <h3>Items</h3>
              <div className="items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <div className="item-info">
                      <strong>{item.name}</strong>
                      <span className="item-qty">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-price">₹{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Order Summary */}
            <section className="section">
              <h3>Order Summary</h3>
              <div className="summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                {order.taxes > 0 && (
                  <div className="summary-row">
                    <span>Taxes</span>
                    <span>₹{order.taxes?.toFixed(2)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="summary-row">
                    <span>Delivery Fee</span>
                    <span>₹{order.deliveryFee?.toFixed(2)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount</span>
                    <span>-₹{order.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total</span>
                  <strong>₹{order.total?.toFixed(2)}</strong>
                </div>
              </div>
            </section>

            {/* Delivery Address */}
            <section className="section">
              <h3>Delivery Address</h3>
              <div className="address">
                <p>{order.deliveryAddress?.name}</p>
                <p>{order.deliveryAddress?.phone}</p>
                <p>{order.deliveryAddress?.addressLine1}</p>
                {order.deliveryAddress?.addressLine2 && <p>{order.deliveryAddress.addressLine2}</p>}
                <p>
                  {order.deliveryAddress?.city}, {order.deliveryAddress?.state}{' '}
                  {order.deliveryAddress?.postalCode}
                </p>
              </div>
            </section>
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="tracking-tab">
            {tracking?.shipment ? (
              <>
                <section className="section">
                  <h3>Tracking Information</h3>
                  <div className="tracking-info">
                    <div className="info-row">
                      <span>Tracking Number</span>
                      <strong>{tracking.shipment.trackingNumber}</strong>
                    </div>
                    <div className="info-row">
                      <span>Status</span>
                      <strong className="status">{tracking.shipment.status}</strong>
                    </div>
                    {tracking.shipment.currentLocation && (
                      <div className="info-row">
                        <span>Current Location</span>
                        <strong>{tracking.shipment.currentLocation}</strong>
                      </div>
                    )}
                    <div className="info-row">
                      <span>Estimated Delivery</span>
                      <strong>{new Date(tracking.shipment.estimatedDelivery).toLocaleDateString('en-IN')}</strong>
                    </div>
                  </div>
                </section>

                {/* Timeline */}
                <section className="section">
                  <h3>Delivery Timeline</h3>
                  <div className="timeline">
                    {tracking.timeline?.map((event, idx) => (
                      <div key={idx} className={`timeline-item ${event.status}`}>
                        <div className="timeline-marker">{event.icon}</div>
                        <div className="timeline-content">
                          <div className="timeline-stage">{event.stage}</div>
                          <div className="timeline-time">
                            {new Date(event.timestamp).toLocaleDateString('en-IN')}
                          </div>
                          {event.location && <div className="timeline-location">{event.location}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Tracking History */}
                {tracking.shipment.trackingHistory?.length > 0 && (
                  <section className="section">
                    <h3>Tracking History</h3>
                    <div className="history">
                      {tracking.shipment.trackingHistory.map((entry, idx) => (
                        <div key={idx} className="history-entry">
                          <div className="entry-status">{entry.status}</div>
                          <div className="entry-location">{entry.location}</div>
                          <div className="entry-time">{new Date(entry.timestamp).toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="empty-state">Your order hasn't been shipped yet</div>
            )}
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="payment-tab">
            <section className="section">
              <h3>Payment Details</h3>
              <div className="payment-info">
                <div className="info-row">
                  <span>Payment Method</span>
                  <strong>{order.paymentMethod}</strong>
                </div>
                <div className="info-row">
                  <span>Amount Paid</span>
                  <strong>₹{order.total?.toFixed(2)}</strong>
                </div>
                <div className="info-row">
                  <span>Order Status</span>
                  <strong className="status">{order.status}</strong>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
