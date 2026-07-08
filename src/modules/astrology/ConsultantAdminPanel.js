import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import './ConsultantAdminPanel.css';

const ConsultantAdminPanel = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [consultant, setConsultant] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, month: 0, bookings: 0 });
  const [slotInput, setSlotInput] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingProfile, setEditingProfile] = useState(false);

  const isAdmin = String(currentUser?.role || currentUser?.registrationType || '').toLowerCase() === 'admin';
  const isConsultant = String(currentUser?.role || currentUser?.registrationType || '').toLowerCase() === 'consultant';
  const canAccessConsultantDashboard = isAdmin || isConsultant;

  const consultantId = consultant?.id || currentUser?.consultantId || currentUser?.id || '';

  const loadConsultantData = useCallback(async () => {
    if (!consultantId) {
      return;
    }

    const response = await axios.get(`/api/astrology/consultants/${consultantId}`);

    const consultantData = response?.data?.data || null;
    setConsultant(consultantData);
    setAvailableSlots(consultantData?.availableSlots || []);
  }, [consultantId]);

  const loadBookings = useCallback(async () => {
    const response = await axios.get('/api/astrology/consultations/consultant-bookings', {
      params: consultantId ? { consultantId } : {},
    });
    setBookings(response?.data?.data || []);
  }, [consultantId]);

  const loadEarnings = useCallback(async () => {
    const response = await axios.get('/api/astrology/consultations/consultant-earnings', {
      params: consultantId ? { consultantId } : {},
    });
    setEarnings(response?.data?.data || { total: 0, month: 0, bookings: 0 });
  }, [consultantId]);

  const refreshAll = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await loadConsultantData();
      await loadBookings();
      await loadEarnings();
    } catch (requestError) {
      setError('Failed to load consultant dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, loadBookings, loadConsultantData, loadEarnings]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filterStatus === 'all') {
        return true;
      }
      return booking.status === filterStatus;
    });
  }, [bookings, filterStatus]);

  const updateBookingStatus = async (bookingId, status) => {
    try {
      setError('');
      setSuccess('');
      await axios.patch(
        `/api/astrology/consultations/${bookingId}/status`,
        { status }
      );
      setSuccess(`Booking status updated to ${status}!`);
      await loadBookings();
      await loadEarnings();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const addAvailableSlot = async () => {
    if (!slotInput.trim()) {
      setError('Please enter slot time');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await axios.post(
        '/api/astrology/consultations/consultants/add-slot',
        { consultantId, slotTime: slotInput.trim(), slotLabel: slotInput.trim() }
      );
      setSlotInput('');
      setSlotDate('');
      setSuccess('Slot added successfully!');
      await loadConsultantData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to add slot.');
    }
  };

  const removeAvailableSlot = async (slot) => {
    if (!window.confirm(`Remove slot "${slot?.label || slot?.id}"?`)) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      await axios.delete('/api/astrology/consultations/consultants/remove-slot', {
        data: { consultantId, slotTime: slot?.label || slot?.id || '' },
      });
      setSuccess('Slot removed successfully!');
      await loadConsultantData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to remove slot.');
    }
  };

  const updateConsultantProfile = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      await axios.put(
        `/api/astrology/consultations/consultants/${consultantId}`,
        {
          bio: formData.get('bio'),
          specialties: String(formData.get('specialties') || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          languages: String(formData.get('languages') || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          rate: Number(formData.get('rate')),
        }
      );
      
      setSuccess('Profile updated successfully!');
      setEditingProfile(false);
      await loadConsultantData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to update consultant profile.');
    } finally {
      setLoading(false);
    }
  };

  const bookingStats = useMemo(() => {
    const stats = {
      total: bookings.length,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
    };

    bookings.forEach((booking) => {
      const status = String(booking.status || '').toLowerCase();
      if (status === 'confirmed') stats.confirmed++;
      else if (status === 'completed') stats.completed++;
      else if (status === 'cancelled') stats.cancelled++;
      else if (status.includes('pending')) stats.pending++;
    });

    return stats;
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking) => {
        const bookingDate = new Date(booking.preferredDate || booking.createdAt);
        return bookingDate > now && booking.status === 'confirmed';
      })
      .sort((a, b) => {
        const dateA = new Date(a.preferredDate || a.createdAt);
        const dateB = new Date(b.preferredDate || b.createdAt);
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [bookings]);

  if (!currentUser?.id) {
    return <div className="consultant-admin-panel">Please sign in to access the consultant dashboard.</div>;
  }

  if (!canAccessConsultantDashboard) {
    return <div className="consultant-admin-panel">Consultant or admin access is required for this dashboard.</div>;
  }

  return (
    <div className="consultant-admin-panel">
      <div className="admin-header">
        <div className="header-content">
          <h1>👨‍⚕️ Consultant Dashboard</h1>
          <p className="consultant-name">{consultant?.name || 'Loading...'}</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-label">Rating</span>
            <strong className="stat-value">{consultant?.rating || 0}⭐</strong>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Total Bookings</span>
            <strong className="stat-value">{bookingStats.total}</strong>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="admin-tabs">
        {['overview', 'bookings', 'availability', 'earnings', 'profile'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'bookings' && bookingStats.total > 0 
              ? `📅 Bookings (${bookingStats.total})` 
              : tab === 'overview' ? '📊 Overview'
              : tab === 'availability' ? '🕐 Availability'
              : tab === 'earnings' ? '💰 Earnings'
              : '👤 Profile'}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'overview' ? <div className="loading-spinner">Loading...</div> : null}

      {activeTab === 'overview' ? (
        <div className="overview-section">
          <div className="overview-grid">
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <span className="stat-title">Total Earnings</span>
                <strong className="stat-amount">₹{Number(earnings.total || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <span className="stat-title">This Month</span>
                <strong className="stat-amount">₹{Number(earnings.month || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-title">Completed</span>
                <strong className="stat-amount">{bookingStats.completed}</strong>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <span className="stat-title">Confirmed</span>
                <strong className="stat-amount">{bookingStats.confirmed}</strong>
              </div>
            </div>
          </div>

          <div className="overview-sections">
            <section className="upcoming-bookings-card">
              <h2>🔜 Upcoming Consultations</h2>
              {upcomingBookings.length === 0 ? (
                <p className="no-data">No upcoming consultations scheduled.</p>
              ) : (
                <div className="upcoming-list">
                  {upcomingBookings.map((booking) => (
                    <div key={booking._id || booking.id} className="upcoming-item">
                      <div className="booking-time">
                        <span className="time-label">{booking.slot}</span>
                        <span className="date-label">
                          {new Date(booking.preferredDate || booking.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="booking-details">
                        <strong>Code: {booking.confirmationCode}</strong>
                        <span className="payment-status">
                          {booking.paymentStatus === 'completed' ? '✅ Paid' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="quick-stats-card">
              <h2>📊 Booking Status</h2>
              <div className="stats-breakdown">
                <div className="stat-row">
                  <span className="stat-label-row">Confirmed</span>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar stat-bar-confirmed" 
                      style={{ width: `${bookingStats.total > 0 ? (bookingStats.confirmed / bookingStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="stat-count">{bookingStats.confirmed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label-row">Completed</span>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar stat-bar-completed" 
                      style={{ width: `${bookingStats.total > 0 ? (bookingStats.completed / bookingStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="stat-count">{bookingStats.completed}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label-row">Pending</span>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar stat-bar-pending" 
                      style={{ width: `${bookingStats.total > 0 ? (bookingStats.pending / bookingStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="stat-count">{bookingStats.pending}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label-row">Cancelled</span>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar stat-bar-cancelled" 
                      style={{ width: `${bookingStats.total > 0 ? (bookingStats.cancelled / bookingStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="stat-count">{bookingStats.cancelled}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === 'bookings' ? (
        <section className="bookings-section">
          <div className="section-header">
            <h2>📋 All Bookings</h2>
            <div className="filter-buttons">
              {[
                { key: 'all', label: 'All', count: bookingStats.total },
                { key: 'confirmed', label: 'Confirmed', count: bookingStats.confirmed },
                { key: 'completed', label: 'Completed', count: bookingStats.completed },
                { key: 'cancelled', label: 'Cancelled', count: bookingStats.cancelled },
                { key: 'pending_payment', label: 'Pending', count: bookingStats.pending },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-btn ${filterStatus === key ? 'active' : ''}`}
                  onClick={() => setFilterStatus(key)}
                >
                  {label} {count > 0 ? `(${count})` : ''}
                </button>
              ))}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">No bookings found for this filter.</p>
            </div>
          ) : (
            <div className="bookings-grid">
              {filteredBookings.map((booking) => (
                <article key={booking._id || booking.id || booking.confirmationCode} className="booking-card">
                  <div className="booking-header">
                    <span className={`status-badge status-${booking.status}`}>
                      {booking.status}
                    </span>
                    <span className="booking-code">#{booking.confirmationCode}</span>
                  </div>
                  
                  <div className="booking-info">
                    <div className="info-row">
                      <span className="info-label">👤 Client:</span>
                      <span className="info-value">{booking.userName || booking.userId || 'Client'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">🕐 Slot:</span>
                      <span className="info-value">{booking.slot}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📅 Date:</span>
                      <span className="info-value">
                        {new Date(booking.preferredDate || booking.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">💳 Payment:</span>
                      <span className={`payment-badge payment-${booking.paymentStatus}`}>
                        {booking.paymentStatus || 'pending'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">💰 Amount:</span>
                      <span className="info-value">₹{Number(booking.amountInr || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {booking.notes ? (
                      <div className="info-row notes-row">
                        <span className="info-label">📝 Notes:</span>
                        <span className="info-value">{booking.notes}</span>
                      </div>
                    ) : null}
                  </div>
                  
                  {booking.status === 'confirmed' || booking.status === 'pending_payment' ? (
                    <div className="booking-actions">
                      <button 
                        type="button" 
                        className="action-btn btn-complete"
                        onClick={() => updateBookingStatus(booking._id || booking.id, 'completed')}
                      >
                        ✅ Mark Completed
                      </button>
                      <button 
                        type="button" 
                        className="action-btn btn-cancel"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this booking?')) {
                            updateBookingStatus(booking._id || booking.id, 'cancelled');
                          }
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'availability' ? (
        <section className="availability-section">
          <div className="section-header">
            <h2>🕐 Manage Availability</h2>
          </div>
          
          <div className="slots-container">
            <div className="current-slots">
              <h3>Current Available Slots ({availableSlots.length})</h3>
              {availableSlots.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <p className="empty-text">No slots available. Add your first slot below.</p>
                </div>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map((slot) => (
                    <div key={slot.id || slot.label} className="slot-card">
                      <div className="slot-info">
                        <span className="slot-time">🕐 {slot.label || slot}</span>
                        {slot.date ? (
                          <span className="slot-date">{slot.date}</span>
                        ) : null}
                      </div>
                      <button 
                        type="button" 
                        className="slot-remove-btn"
                        onClick={() => removeAvailableSlot(slot)}
                        title="Remove slot"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="add-slot-card">
              <h3>➕ Add New Slot</h3>
              <div className="add-slot-form">
                <div className="form-group">
                  <label htmlFor="slotInput">Slot Time/Label *</label>
                  <input
                    id="slotInput"
                    type="text"
                    value={slotInput}
                    onChange={(event) => setSlotInput(event.target.value)}
                    placeholder="e.g., Saturday 4:30 PM, Tomorrow 10 AM"
                    className="slot-input"
                  />
                  <small className="input-hint">
                    Enter a descriptive time slot (e.g., "Monday 10:00 AM", "Weekend 2:30 PM")
                  </small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="slotDate">Date (Optional)</label>
                  <input
                    id="slotDate"
                    type="date"
                    value={slotDate}
                    onChange={(event) => setSlotDate(event.target.value)}
                    className="slot-input"
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={addAvailableSlot}
                  className="add-slot-btn"
                  disabled={!slotInput.trim()}
                >
                  ➕ Add Slot
                </button>
              </div>
              
              <div className="slot-tips">
                <h4>💡 Tips for Adding Slots:</h4>
                <ul>
                  <li>Be specific with times (e.g., "Monday 10:30 AM" instead of "Morning")</li>
                  <li>Add multiple slots for different days and times</li>
                  <li>Update your availability regularly to attract more bookings</li>
                  <li>Consider peak hours when clients are most likely to book</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'earnings' ? (
        <section className="earnings-section">
          <div className="section-header">
            <h2>💰 Earnings Overview</h2>
          </div>
          
          <div className="earnings-grid">
            <div className="earnings-card earnings-total">
              <div className="earnings-icon">💎</div>
              <div className="earnings-content">
                <span className="earnings-label">Total Lifetime Earnings</span>
                <strong className="earnings-amount">₹{Number(earnings.total || 0).toLocaleString('en-IN')}</strong>
                <span className="earnings-count">{earnings.bookings || 0} completed consultations</span>
              </div>
            </div>
            
            <div className="earnings-card earnings-month">
              <div className="earnings-icon">📅</div>
              <div className="earnings-content">
                <span className="earnings-label">This Month</span>
                <strong className="earnings-amount">₹{Number(earnings.month || 0).toLocaleString('en-IN')}</strong>
                <span className="earnings-count">
                  {bookingStats.completed} consultations completed
                </span>
              </div>
            </div>
            
            <div className="earnings-card earnings-rate">
              <div className="earnings-icon">⭐</div>
              <div className="earnings-content">
                <span className="earnings-label">Your Rate</span>
                <strong className="earnings-amount">₹{Number(consultant?.amountInr || 0).toLocaleString('en-IN')}</strong>
                <span className="earnings-count">per 15-minute session</span>
              </div>
            </div>
            
            <div className="earnings-card earnings-average">
              <div className="earnings-icon">📊</div>
              <div className="earnings-content">
                <span className="earnings-label">Average per Booking</span>
                <strong className="earnings-amount">
                  ₹{earnings.bookings > 0 ? Math.round(earnings.total / earnings.bookings).toLocaleString('en-IN') : 0}
                </strong>
                <span className="earnings-count">average consultation value</span>
              </div>
            </div>
          </div>

          <div className="earnings-breakdown">
            <h3>📈 Earnings Breakdown</h3>
            <div className="breakdown-info">
              <div className="breakdown-row">
                <span className="breakdown-label">Confirmed Bookings:</span>
                <span className="breakdown-value">{bookingStats.confirmed} × ₹{consultant?.amountInr || 0} = ₹{(bookingStats.confirmed * (consultant?.amountInr || 0)).toLocaleString('en-IN')}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-label">Completed & Paid:</span>
                <span className="breakdown-value success">₹{Number(earnings.total || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-label">Pending Payments:</span>
                <span className="breakdown-value warning">{bookingStats.pending} bookings</span>
              </div>
            </div>
          </div>

          <div className="payout-info">
            <h3>💳 Payout Information</h3>
            <p className="info-text">
              Earnings are processed on a monthly basis. Completed consultations are 
              reviewed and payouts are initiated within 7 business days after month-end.
            </p>
            <p className="info-text">
              For any payout queries, please contact the admin team.
            </p>
          </div>
        </section>
      ) : null}

      {activeTab === 'profile' ? (
        <section className="profile-section">
          <div className="section-header">
            <h2>👤 Consultant Profile</h2>
            {!editingProfile ? (
              <button 
                type="button" 
                className="edit-profile-btn"
                onClick={() => setEditingProfile(true)}
              >
                ✏️ Edit Profile
              </button>
            ) : null}
          </div>
          
          {!editingProfile ? (
            <div className="profile-view">
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar">
                    {consultant?.name?.charAt(0) || 'C'}
                  </div>
                  <div className="profile-title">
                    <h3>{consultant?.name || 'Consultant'}</h3>
                    <div className="profile-rating">
                      <span className="rating-stars">⭐ {consultant?.rating || 0}</span>
                      <span className="rating-count">({bookingStats.completed} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">💼 Specialties:</span>
                    <span className="detail-value">{consultant?.specialty || 'General Consultation'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">🗣️ Languages:</span>
                    <span className="detail-value">
                      {Array.isArray(consultant?.languages) && consultant.languages.length > 0
                        ? consultant.languages.join(', ')
                        : 'Not specified'}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">💰 Rate:</span>
                    <span className="detail-value">₹{Number(consultant?.amountInr || 0).toLocaleString('en-IN')} / 15 min</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">📋 Bio:</span>
                    <p className="detail-bio">{consultant?.bio || 'No bio available yet.'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={updateConsultantProfile} className="profile-form">
              <div className="form-group">
                <label htmlFor="bio">Bio *</label>
                <textarea 
                  id="bio"
                  name="bio" 
                  defaultValue={consultant?.bio || ''} 
                  rows={6}
                  placeholder="Share your expertise, experience, and approach to astrology..."
                  required
                />
                <small className="input-hint">Write a compelling bio to attract more clients (min 50 characters)</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="specialties">Specialties *</label>
                <input
                  id="specialties"
                  type="text"
                  name="specialties"
                  defaultValue={consultant?.specialty || ''}
                  placeholder="e.g., Kerala Jathakam, Matchmaking, Career Guidance"
                  required
                />
                <small className="input-hint">Separate multiple specialties with commas</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="languages">Languages Spoken *</label>
                <input
                  id="languages"
                  type="text"
                  name="languages"
                  defaultValue={Array.isArray(consultant?.languages) ? consultant.languages.join(', ') : ''}
                  placeholder="e.g., English, Hindi, Malayalam, Tamil"
                  required
                />
                <small className="input-hint">Separate multiple languages with commas</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="rate">Consultation Rate (₹ per 15 min) *</label>
                <input
                  id="rate"
                  type="number"
                  name="rate"
                  defaultValue={Number(consultant?.amountInr || 0)}
                  min={100}
                  max={10000}
                  step={50}
                  required
                />
                <small className="input-hint">Set your consultation fee (minimum ₹100)</small>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? '⏳ Saving...' : '✅ Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setEditingProfile(false);
                    setError('');
                  }}
                  disabled={loading}
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default ConsultantAdminPanel;
