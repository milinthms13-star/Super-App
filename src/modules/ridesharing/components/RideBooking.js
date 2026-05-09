import React, { useState } from 'react';
import axios from 'axios';
import './RideBooking.css';

const RideBooking = ({ onRideBooked, onError }) => {
  const [step, setStep] = useState('location'); // location, rideType, payment, confirm
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Location data
  const [pickup, setPickup] = useState({ address: '', lat: null, lng: null });
  const [destination, setDestination] = useState({ address: '', lat: null, lng: null });

  // Ride selection
  const [selectedRideType, setSelectedRideType] = useState(null);
  const [fareEstimate, setFareEstimate] = useState(null);

  // Payment data
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [couponCode, setCouponCode] = useState('');

  const rideTypes = [
    { id: 'bike', name: 'Bike Taxi', icon: '🏍️', price: '₹28', time: '2 min' },
    { id: 'auto', name: 'Auto', icon: '🛺', price: '₹42', time: '4 min' },
    { id: 'sedan', name: 'Sedan', icon: '🚗', price: '₹74', time: '6 min' },
    { id: 'suv', name: 'SUV', icon: '🚙', price: '₹98', time: '8 min' }
  ];

  const handleEstimateFare = async () => {
    if (!pickup.address || !destination.address) {
      setError('Please enter both pickup and destination');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get coordinates from address (simplified - use Google Maps in production)
      // For now, use mock coordinates
      const response = await axios.post('/api/ridesharing/estimate-fare', {
        rideType: selectedRideType,
        pickup: { ...pickup, lat: pickup.lat || 10.3157, lng: pickup.lng || 123.8854 },
        destination: { ...destination, lat: destination.lat || 10.3520, lng: destination.lng || 123.8854 }
      });

      setFareEstimate(response.data.fareBreakdown);
      setStep('payment');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to estimate fare';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        '/api/ridesharing/rides',
        {
          rideType: selectedRideType,
          pickup,
          destination: destination,
          paymentMethod,
          couponCode: couponCode || undefined,
          estimatedFare: fareEstimate.total
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (onRideBooked) {
        onRideBooked(response.data.data || response.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to book ride';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ride-booking-container">
      <div className="booking-header">
        <h2>Book a Ride</h2>
        <p>Quick, reliable, and affordable transportation</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Step 1: Location */}
      {step === 'location' && (
        <div className="booking-step">
          <h3>Where are you going?</h3>

          <div className="location-input-group">
            <div className="location-field">
              <label>Pickup Location</label>
              <div className="location-input">
                <span className="location-icon">📍</span>
                <input
                  type="text"
                  placeholder="Enter pickup location"
                  value={pickup.address}
                  onChange={(e) =>
                    setPickup({ ...pickup, address: e.target.value })
                  }
                  className="location-input-field"
                />
              </div>
            </div>

            <div className="swap-button">
              <button
                type="button"
                onClick={() => {
                  const temp = pickup;
                  setPickup(destination);
                  setDestination(temp);
                }}
              >
                ⇅
              </button>
            </div>

            <div className="location-field">
              <label>Destination</label>
              <div className="location-input">
                <span className="location-icon">📍</span>
                <input
                  type="text"
                  placeholder="Enter destination"
                  value={destination.address}
                  onChange={(e) =>
                    setDestination({ ...destination, address: e.target.value })
                  }
                  className="location-input-field"
                />
              </div>
            </div>
          </div>

          <button
            className="next-btn"
            onClick={() => setStep('rideType')}
            disabled={!pickup.address || !destination.address}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Ride Type Selection */}
      {step === 'rideType' && (
        <div className="booking-step">
          <h3>Select Ride Type</h3>

          <div className="ride-types-grid">
            {rideTypes.map((ride) => (
              <div
                key={ride.id}
                className={`ride-type-card ${selectedRideType === ride.id ? 'selected' : ''}`}
                onClick={() => setSelectedRideType(ride.id)}
              >
                <div className="ride-icon">{ride.icon}</div>
                <div className="ride-name">{ride.name}</div>
                <div className="ride-meta">
                  <span className="ride-price">{ride.price}</span>
                  <span className="ride-time">{ride.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="step-buttons">
            <button className="back-btn" onClick={() => setStep('location')}>
              Back
            </button>
            <button
              className="next-btn"
              onClick={handleEstimateFare}
              disabled={!selectedRideType || loading}
            >
              {loading ? 'Estimating...' : 'See Fare'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment Method */}
      {step === 'payment' && (
        <div className="booking-step">
          <h3>Payment Details</h3>

          {fareEstimate && (
            <div className="fare-breakdown">
              <div className="fare-item">
                <span>Base Fare</span>
                <span>₹{fareEstimate.baseFare}</span>
              </div>
              <div className="fare-item">
                <span>Distance ({fareEstimate.distance} km)</span>
                <span>₹{fareEstimate.distanceFare}</span>
              </div>
              {fareEstimate.timeFare > 0 && (
                <div className="fare-item">
                  <span>Time-based Fare</span>
                  <span>₹{fareEstimate.timeFare}</span>
                </div>
              )}
              <div className="fare-item">
                <span>Tax (5%)</span>
                <span>₹{fareEstimate.tax}</span>
              </div>
              <div className="fare-divider"></div>
              <div className="fare-total">
                <span>Total Fare</span>
                <span className="total-amount">₹{fareEstimate.total}</span>
              </div>
            </div>
          )}

          <div className="payment-methods">
            <label className="payment-method">
              <input
                type="radio"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="method-name">💳 Wallet/Card</span>
            </label>

            <label className="payment-method">
              <input
                type="radio"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="method-name">💵 Cash</span>
            </label>

            <label className="payment-method">
              <input
                type="radio"
                value="upi"
                checked={paymentMethod === 'upi'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="method-name">📱 UPI</span>
            </label>
          </div>

          <div className="coupon-section">
            <input
              type="text"
              placeholder="Have a promo code? Enter it here"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="coupon-input"
            />
          </div>

          <div className="step-buttons">
            <button className="back-btn" onClick={() => setStep('rideType')}>
              Back
            </button>
            <button
              className="book-btn"
              onClick={handleBookRide}
              disabled={loading}
            >
              {loading ? 'Booking...' : `Book Ride - ₹${fareEstimate?.total}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideBooking;
