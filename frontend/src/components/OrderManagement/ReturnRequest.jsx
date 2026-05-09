/**
 * ReturnRequest.jsx
 * Phase 5E - Initiate return request
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './ReturnRequest.css';

const ReturnRequest = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    reason: '',
    items: [],
    comments: '',
  });

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrder(response.data.data.order);

      // Initialize selected items
      const initialItems = response.data.data.order.items.map(item => ({
        ...item,
        selected: false,
      }));
      setFormData(prev => ({ ...prev, items: initialItems }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleReasonChange = e => {
    setFormData(prev => ({ ...prev, reason: e.target.value }));
  };

  const handleItemToggle = idx => {
    const updated = [...formData.items];
    updated[idx].selected = !updated[idx].selected;
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleCommentsChange = e => {
    setFormData(prev => ({ ...prev, comments: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.reason) {
      setError('Please select a return reason');
      return;
    }

    const selectedItems = formData.items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/orders/${orderId}/return`, {
        reason: formData.reason,
        items: selectedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        comments: formData.comments,
      });

      alert('Return initiated successfully!');
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate return');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading order...</div>;
  if (!order) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="return-request">
      <h2>Initiate Return</h2>

      {/* Return Policy Info */}
      <div className="policy-info">
        <h3>Return Policy</h3>
        <ul>
          <li>Returns accepted within 30 days of delivery</li>
          <li>Items must be unused and in original packaging</li>
          <li>Full refund will be processed upon receipt and inspection</li>
          <li>Free return shipping label will be provided</li>
        </ul>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="return-form">
        {/* Return Reason */}
        <section className="section">
          <label className="required">Return Reason</label>
          <select
            value={formData.reason}
            onChange={handleReasonChange}
            disabled={submitting}
            required
          >
            <option value="">-- Select Reason --</option>
            <option value="defective">Product is defective</option>
            <option value="not_as_described">Not as described</option>
            <option value="wrong_item">Received wrong item</option>
            <option value="damaged_in_shipping">Damaged in shipping</option>
            <option value="changed_mind">Changed my mind</option>
            <option value="not_needed">No longer needed</option>
            <option value="other">Other</option>
          </select>
        </section>

        {/* Select Items */}
        <section className="section">
          <label className="required">Select Items to Return</label>
          <div className="items-selection">
            {formData.items.map((item, idx) => (
              <div key={idx} className="item-checkbox">
                <input
                  type="checkbox"
                  id={`item-${idx}`}
                  checked={item.selected}
                  onChange={() => handleItemToggle(idx)}
                  disabled={submitting}
                />
                <label htmlFor={`item-${idx}`}>
                  <div className="item-details">
                    <strong>{item.name}</strong>
                    <span className="qty">Qty: {item.quantity}</span>
                    <span className="price">₹{item.price}</span>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Comments */}
        <section className="section">
          <label>Additional Comments</label>
          <textarea
            value={formData.comments}
            onChange={handleCommentsChange}
            placeholder="Please provide any additional details about the return..."
            rows="4"
            disabled={submitting}
          />
        </section>

        {/* Actions */}
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Processing...' : 'Initiate Return'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/orders/${orderId}`)}>
            Cancel
          </button>
        </div>
      </form>

      {/* Refund Info */}
      <div className="refund-info">
        <h3>Refund Information</h3>
        <p>Once your return is approved and the items are received, your refund will be processed within 5-7 business days.</p>
      </div>
    </div>
  );
};

export default ReturnRequest;
