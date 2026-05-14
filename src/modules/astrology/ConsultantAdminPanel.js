import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import './ConsultantAdminPanel.css';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const ConsultantAdminPanel = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [consultant, setConsultant] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, month: 0, bookings: 0 });
  const [slotInput, setSlotInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const consultantId = consultant?.id || currentUser?.consultantId || currentUser?.id || '';

  const loadConsultantData = useCallback(async () => {
    if (!consultantId) {
      return;
    }

    const response = await axios.get(`/api/astrology/consultants/${consultantId}`, {
      headers: authHeaders(),
    });

    const consultantData = response?.data?.data || null;
    setConsultant(consultantData);
    setAvailableSlots(consultantData?.availableSlots || []);
  }, [consultantId]);

  const loadBookings = useCallback(async () => {
    const response = await axios.get('/api/astrology/consultations/consultant-bookings', {
      params: consultantId ? { consultantId } : {},
      headers: authHeaders(),
    });
    setBookings(response?.data?.data || []);
  }, [consultantId]);

  const loadEarnings = useCallback(async () => {
    const response = await axios.get('/api/astrology/consultations/consultant-earnings', {
      params: consultantId ? { consultantId } : {},
      headers: authHeaders(),
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
      await axios.patch(
        `/api/astrology/consultations/${bookingId}/status`,
        { status },
        { headers: authHeaders() }
      );
      await loadBookings();
      await loadEarnings();
    } catch (requestError) {
      setError('Failed to update booking status.');
    }
  };

  const addAvailableSlot = async () => {
    if (!slotInput.trim()) {
      return;
    }

    try {
      await axios.post(
        '/api/astrology/consultants/add-slot',
        { consultantId, slotTime: slotInput.trim() },
        { headers: authHeaders() }
      );
      setSlotInput('');
      await loadConsultantData();
    } catch (requestError) {
      setError('Failed to add slot.');
    }
  };

  const removeAvailableSlot = async (slot) => {
    try {
      await axios.delete('/api/astrology/consultants/remove-slot', {
        data: { consultantId, slotTime: slot?.label || slot?.id || '' },
        headers: authHeaders(),
      });
      await loadConsultantData();
    } catch (requestError) {
      setError('Failed to remove slot.');
    }
  };

  const updateConsultantProfile = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      await axios.put(
        `/api/astrology/consultants/${consultantId}`,
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
        },
        { headers: authHeaders() }
      );
      await loadConsultantData();
    } catch (requestError) {
      setError('Failed to update consultant profile.');
    }
  };

  if (!currentUser?.id) {
    return <div className="consultant-admin-panel">Please sign in to access the consultant dashboard.</div>;
  }

  return (
    <div className="consultant-admin-panel">
      <div className="admin-header">
        <h1>Consultant Dashboard</h1>
        <p>{consultant?.name || 'Consultant'}</p>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="admin-tabs">
        {['bookings', 'availability', 'earnings', 'profile'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'bookings' ? `Bookings (${bookings.length})` : tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <p>Loading dashboard data...</p> : null}

      {activeTab === 'bookings' ? (
        <section className="bookings-section">
          <div className="filter-buttons">
            {['all', 'confirmed', 'completed', 'cancelled', 'pending_payment'].map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <p>No bookings found.</p>
          ) : (
            filteredBookings.map((booking) => (
              <article key={booking._id || booking.id || booking.confirmationCode} className="booking-card">
                <p>
                  <strong>Client:</strong> {booking.userName || booking.userId || 'Client'}
                </p>
                <p>
                  <strong>Slot:</strong> {booking.slot}
                </p>
                <p>
                  <strong>Status:</strong> {booking.status}
                </p>
                <p>
                  <strong>Payment:</strong> {booking.paymentStatus || 'pending'}
                </p>
                <p>
                  <strong>Code:</strong> {booking.confirmationCode}
                </p>
                {booking.status === 'confirmed' ? (
                  <div className="booking-actions">
                    <button type="button" onClick={() => updateBookingStatus(booking._id || booking.id, 'completed')}>
                      Mark Completed
                    </button>
                    <button type="button" onClick={() => updateBookingStatus(booking._id || booking.id, 'cancelled')}>
                      Cancel
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      ) : null}

      {activeTab === 'availability' ? (
        <section className="availability-section">
          <h2>Available Slots</h2>
          {availableSlots.map((slot) => (
            <div key={slot.id || slot.label} className="slot-item">
              <span>{slot.label || slot}</span>
              <button type="button" onClick={() => removeAvailableSlot(slot)}>
                Remove
              </button>
            </div>
          ))}
          <div className="add-slot-form">
            <input
              type="text"
              value={slotInput}
              onChange={(event) => setSlotInput(event.target.value)}
              placeholder="e.g. Saturday 4:30 PM"
            />
            <button type="button" onClick={addAvailableSlot}>
              Add Slot
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === 'earnings' ? (
        <section className="earnings-section">
          <h2>Earnings</h2>
          <p>Total: INR {Number(earnings.total || 0).toLocaleString('en-IN')}</p>
          <p>This month: INR {Number(earnings.month || 0).toLocaleString('en-IN')}</p>
          <p>Completed bookings: {earnings.bookings || 0}</p>
        </section>
      ) : null}

      {activeTab === 'profile' ? (
        <section className="profile-section">
          <h2>Consultant Profile</h2>
          <form onSubmit={updateConsultantProfile}>
            <label>
              Bio
              <textarea name="bio" defaultValue={consultant?.bio || ''} rows={4} />
            </label>
            <label>
              Specialties (comma-separated)
              <input
                type="text"
                name="specialties"
                defaultValue={consultant?.specialty || ''}
                placeholder="Kerala Jathakam, Matchmaking"
              />
            </label>
            <label>
              Languages (comma-separated)
              <input
                type="text"
                name="languages"
                defaultValue={Array.isArray(consultant?.languages) ? consultant.languages.join(', ') : ''}
              />
            </label>
            <label>
              Rate (INR per 15 minutes)
              <input
                type="number"
                name="rate"
                defaultValue={Number(consultant?.amountInr || 0)}
                min={100}
              />
            </label>
            <button type="submit">Update Profile</button>
          </form>
        </section>
      ) : null}
    </div>
  );
};

export default ConsultantAdminPanel;
