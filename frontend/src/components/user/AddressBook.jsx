/**
 * AddressBook.jsx
 * Manage multiple delivery and billing addresses
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddressBook.css';

const AddressBook = ({ userId }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    type: 'home'
  });

  useEffect(() => {
    fetchAddresses();
  }, [userId]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/addresses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAddresses(response.data.data || []);
    } catch (err) {
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await axios.put(`/api/user/addresses/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/user/addresses', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      fetchAddresses();
      setFormData({
        recipientName: '',
        recipientPhone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        type: 'home'
      });
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save address');
    }
  };

  const handleEdit = (address) => {
    setFormData(address);
    setEditingId(address._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;

    try {
      await axios.delete(`/api/user/addresses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchAddresses();
    } catch (err) {
      setError('Failed to delete address');
    }
  };

  const handleSetDefault = async (id, type) => {
    try {
      await axios.post(
        `/api/user/addresses/${id}/default/${type}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchAddresses();
    } catch (err) {
      setError('Failed to set default');
    }
  };

  if (loading) return <div className="loading">Loading addresses...</div>;

  return (
    <div className="address-book">
      <div className="address-header">
        <h2>My Addresses</h2>
        <button
          className="add-address-btn"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              recipientName: '',
              recipientPhone: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              state: '',
              pincode: '',
              country: 'India',
              type: 'home'
            });
          }}
        >
          + Add Address
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="address-form-card">
          <h3>{editingId ? 'Edit Address' : 'New Address'}</h3>

          <form onSubmit={handleAddAddress}>
            <div className="form-row">
              <div className="form-group">
                <label>Recipient Name *</label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleAddressChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="recipientPhone"
                  value={formData.recipientPhone}
                  onChange={handleAddressChange}
                  placeholder="6-9 followed by 9 digits"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address Line 1 *</label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleAddressChange}
                placeholder="Street address"
                required
              />
            </div>

            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleAddressChange}
                placeholder="Apt, suite, etc (optional)"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleAddressChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleAddressChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleAddressChange}
                  placeholder="6 digits"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleAddressChange}>
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">Save Address</button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="addresses-list">
        {addresses.length === 0 ? (
          <p className="no-data">No addresses yet. Add your first address.</p>
        ) : (
          addresses.map((address) => (
            <div key={address._id} className="address-card">
              <div className="address-header-info">
                <h4>{address.recipientName}</h4>
                <div className="address-badges">
                  <span className="type-badge">{address.type.toUpperCase()}</span>
                  {address.isShippingDefault && <span className="default-badge">📦 Shipping</span>}
                  {address.isBillingDefault && <span className="default-badge">💳 Billing</span>}
                </div>
              </div>

              <div className="address-details">
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}, {address.state} {address.pincode}
                </p>
                <p>📞 {address.recipientPhone}</p>
              </div>

              <div className="address-actions">
                <button
                  className="action-btn"
                  onClick={() => handleSetDefault(address._id, 'shipping')}
                >
                  Set as Shipping
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleSetDefault(address._id, 'billing')}
                >
                  Set as Billing
                </button>
                <button
                  className="action-btn edit"
                  onClick={() => handleEdit(address)}
                >
                  Edit
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(address._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddressBook;
