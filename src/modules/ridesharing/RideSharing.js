import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/RideSharing.css";

const VEHICLE_TYPES = [
  {
    id: 'bike',
    name: 'Bike Taxi',
    icon: '🏍️',
    capacity: 1,
    baseFare: 28,
    perKm: 6,
    description: 'Quick rides for solo travelers',
    eta: '2 mins'
  },
  {
    id: 'auto',
    name: 'Auto Rickshaw',
    icon: '🚗',
    capacity: 3,
    baseFare: 35,
    perKm: 12,
    description: 'Affordable rides for small groups',
    eta: '3 mins'
  },
  {
    id: 'mini_car',
    name: 'Mini Car',
    icon: '🚙',
    capacity: 4,
    baseFare: 50,
    perKm: 15,
    description: 'Comfortable rides for families',
    eta: '4 mins'
  },
  {
    id: 'sedan',
    name: 'Sedan',
    icon: '🚕',
    capacity: 4,
    baseFare: 80,
    perKm: 20,
    description: 'Premium rides with extra comfort',
    eta: '5 mins'
  },
  {
    id: 'suv',
    name: 'SUV',
    icon: '🚐',
    capacity: 6,
    baseFare: 120,
    perKm: 25,
    description: 'Spacious rides for larger groups',
    eta: '6 mins'
  }
];

const SERVICE_TYPES = [
  { id: 'regular', name: 'Regular', icon: '🚗' },
  { id: 'premium', name: 'Premium', icon: '⭐' },
  { id: 'women_only', name: 'Women Only', icon: '👩' },
  { id: 'senior_citizen', name: 'Senior Citizen', icon: '👴' },
  { id: 'emergency', name: 'Emergency', icon: '🚨' },
  { id: 'tourist', name: 'Tourist', icon: '🗺️' }
];

const RideSharing = () => {
  const { user } = useApp();
  const [activeMode, setActiveMode] = useState('rider');
  const [currentScreen, setCurrentScreen] = useState('home');

  // Rider states
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedService, setSelectedService] = useState('regular');
  const [fareEstimate, setFareEstimate] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);

  // Driver states
  const [driverStatus, setDriverStatus] = useState('offline');
  const [driverRides, setDriverRides] = useState([]);
  const [driverEarnings, setDriverEarnings] = useState({ today: 0, week: 0, month: 0 });

  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadUserData();
  }, [activeMode]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      if (activeMode === 'rider') {
        const historyResponse = await fetch('/api/ridesharing/rides/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const historyData = await historyResponse.json();
        if (historyData.success) {
          setRideHistory(historyData.data);
        }
      } else if (activeMode === 'driver') {
        const profileResponse = await fetch('/api/ridesharing/driver/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const profileData = await profileResponse.json();
        if (profileData.success) {
          setDriverStatus(profileData.data.isOnline ? 'available' : 'offline');
        }
      }
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const getFareEstimate = useCallback(async () => {
    if (!pickupLocation || !dropLocation || !selectedVehicle) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/ridesharing/fare/estimate?pickupLat=9.9312&pickupLng=76.2673&dropLat=9.9816&dropLng=76.2999&vehicleType=${selectedVehicle.id}`
      );
      const data = await response.json();
      if (data.success) {
        setFareEstimate(data.data);
      }
    } catch (err) {
      setError('Failed to get fare estimate');
    } finally {
      setLoading(false);
    }
  }, [pickupLocation, dropLocation, selectedVehicle]);

  useEffect(() => {
    getFareEstimate();
  }, [getFareEstimate]);

  const bookRide = async () => {
    if (!pickupLocation || !dropLocation || !selectedVehicle) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ridesharing/rides/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pickup: {
            address: pickupLocation,
            lat: 9.9312,
            lng: 76.2673
          },
          destination: {
            address: dropLocation,
            lat: 9.9816,
            lng: 76.2999
          },
          vehicleType: selectedVehicle.id,
          serviceType: selectedService,
          paymentMethod: 'cash'
        })
      });

      const data = await response.json();
      if (data.success) {
        setBookingConfirmed(true);
        setCurrentRide(data.data);
        setCurrentScreen('tracking');
        setSuccess('Ride booked successfully!');
      } else {
        setError(data.message || 'Failed to book ride');
      }
    } catch (err) {
      setError('Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const toggleDriverStatus = async () => {
    try {
      setLoading(true);
      const newStatus = driverStatus === 'available' ? 'offline' : 'available';
      const response = await fetch('/api/ridesharing/driver/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        setDriverStatus(newStatus);
        setSuccess(`You are now ${newStatus === 'available' ? 'online' : 'offline'}`);
      }
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const activateSOS = async () => {
    if (!currentRide) return;

    try {
      const response = await fetch(`/api/ridesharing/rides/${currentRide._id}/sos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('SOS activated! Help is on the way.');
        alert('EMERGENCY: SOS has been activated. Authorities have been notified.');
      }
    } catch (err) {
      setError('Failed to activate SOS');
    }
  };

  const renderHomeScreen = () => (
    <div className="ride-home">
      <div className="ride-header">
        <h1>🚗 Ride Sharing</h1>
        <p>Safe, affordable rides across South Kerala</p>
      </div>

      <div className="mode-selector">
        <button
          className={`mode-btn ${activeMode === 'rider' ? 'active' : ''}`}
          onClick={() => setActiveMode('rider')}
        >
          👤 Rider
        </button>
        <button
          className={`mode-btn ${activeMode === 'driver' ? 'active' : ''}`}
          onClick={() => setActiveMode('driver')}
        >
          🚗 Driver
        </button>
        <button
          className={`mode-btn ${activeMode === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveMode('admin')}
        >
          ⚙️ Admin
        </button>
      </div>

      {activeMode === 'rider' && (
        <div className="rider-home">
          <div className="location-inputs">
            <div className="input-group">
              <span className="input-icon">📍</span>
              <input
                type="text"
                placeholder="Pickup location"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="location-input"
              />
            </div>
            <div className="input-group">
              <span className="input-icon">🎯</span>
              <input
                type="text"
                placeholder="Drop location"
                value={dropLocation}
                onChange={(e) => setDropLocation(e.target.value)}
                className="location-input"
              />
            </div>
          </div>

          <div className="service-types">
            <h3>Service Type</h3>
            <div className="service-grid">
              {SERVICE_TYPES.map(service => (
                <button
                  key={service.id}
                  className={`service-btn ${selectedService === service.id ? 'active' : ''}`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <span className="service-icon">{service.icon}</span>
                  <span className="service-name">{service.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="vehicle-types">
            <h3>Choose Vehicle</h3>
            <div className="vehicle-grid">
              {VEHICLE_TYPES.map(vehicle => (
                <div
                  key={vehicle.id}
                  className={`vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''}`}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <div className="vehicle-icon">{vehicle.icon}</div>
                  <div className="vehicle-info">
                    <h4>{vehicle.name}</h4>
                    <p>{vehicle.description}</p>
                    <div className="vehicle-details">
                      <span>👥 {vehicle.capacity} seats</span>
                      <span>⏱️ {vehicle.eta}</span>
                    </div>
                  </div>
                  {fareEstimate && selectedVehicle?.id === vehicle.id && (
                    <div className="fare-display">
                      <span className="fare-amount">₹{fareEstimate.pricing.totalFare}</span>
                      <span className="fare-distance">{fareEstimate.distance}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="book-ride-btn"
            onClick={bookRide}
            disabled={!pickupLocation || !dropLocation || !selectedVehicle || loading}
          >
            {loading ? '🔄 Finding Driver...' : '🚀 Book Ride'}
          </button>
        </div>
      )}

      {activeMode === 'driver' && (
        <div className="driver-home">
          <div className="driver-status">
            <div className={`status-indicator ${driverStatus}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {driverStatus === 'available' ? '🟢 Online' :
                 driverStatus === 'busy' ? '🟡 Busy' : '🔴 Offline'}
              </span>
            </div>
            <button
              className={`status-toggle ${driverStatus}`}
              onClick={toggleDriverStatus}
            >
              {driverStatus === 'available' ? 'Go Offline' : 'Go Online'}
            </button>
          </div>

          <div className="driver-stats">
            <div className="stat-card">
              <h3>₹{driverEarnings.today}</h3>
              <p>Today's Earnings</p>
            </div>
            <div className="stat-card">
              <h3>{driverRides.filter(r => r.status === 'completed').length}</h3>
              <p>Rides Completed</p>
            </div>
            <div className="stat-card">
              <h3>4.8 ⭐</h3>
              <p>Rating</p>
            </div>
          </div>

          <div className="driver-actions">
            <button className="action-btn" onClick={() => setCurrentScreen('driver-dashboard')}>
              📊 Dashboard
            </button>
            <button className="action-btn" onClick={() => setCurrentScreen('driver-profile')}>
              👤 Profile
            </button>
            <button className="action-btn" onClick={() => setCurrentScreen('driver-earnings')}>
              💰 Earnings
            </button>
          </div>
        </div>
      )}

      {activeMode === 'admin' && (
        <div className="admin-home">
          <h2>Admin Panel</h2>
          <div className="admin-stats">
            <div className="stat-card">
              <h3>1,247</h3>
              <p>Total Rides</p>
            </div>
            <div className="stat-card">
              <h3>342</h3>
              <p>Active Drivers</p>
            </div>
            <div className="stat-card">
              <h3>₹45,230</h3>
              <p>Today's Revenue</p>
            </div>
            <div className="stat-card">
              <h3>98.5%</h3>
              <p>Safety Rating</p>
            </div>
          </div>

          <div className="admin-actions">
            <button className="action-btn" onClick={() => setCurrentScreen('admin-drivers')}>
              🚗 Manage Drivers
            </button>
            <button className="action-btn" onClick={() => setCurrentScreen('admin-rides')}>
              📋 Manage Rides
            </button>
            <button className="action-btn" onClick={() => setCurrentScreen('admin-analytics')}>
              📊 Analytics
            </button>
            <button className="action-btn" onClick={() => setCurrentScreen('admin-settings')}>
              ⚙️ Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderTrackingScreen = () => {
    if (!currentRide) return null;

    return (
      <div className="ride-tracking">
        <div className="tracking-header">
          <button className="back-btn" onClick={() => setCurrentScreen('home')}>← Back</button>
          <h2>Ride Tracking</h2>
        </div>

        <div className="ride-status-card">
          <div className="status-info">
            <h3>{currentRide.status?.replace('_', ' ').toUpperCase() || 'IN PROGRESS'}</h3>
            <p>Ride ID: {currentRide.rideId || currentRide._id}</p>
          </div>

          {currentRide.driverDetails && (
            <div className="driver-info">
              <div className="driver-avatar">
                {currentRide.driverDetails.profilePhoto ? (
                  <img src={currentRide.driverDetails.profilePhoto} alt="Driver" />
                ) : (
                  <span>👨‍🚗</span>
                )}
              </div>
              <div className="driver-details">
                <h4>{currentRide.driverDetails.name}</h4>
                <p>⭐ {currentRide.driverDetails.rating} • {currentRide.driverDetails.vehicleNumber}</p>
                <p>{currentRide.driverDetails.vehicleType} • {currentRide.driverDetails.vehicleColor}</p>
              </div>
            </div>
          )}
        </div>

        <div className="ride-details">
          <div className="location-info">
            <div className="pickup">
              <span className="location-icon">📍</span>
              <span>{currentRide.pickup?.address || 'Loading...'}</span>
            </div>
            <div className="drop">
              <span className="location-icon">🎯</span>
              <span>{currentRide.destination?.address || 'Loading...'}</span>
            </div>
          </div>

          <div className="fare-info">
            <h4>Total Fare: ₹{currentRide.pricing?.totalFare || 'Calculating...'}</h4>
            <p>Distance: {currentRide.distance?.text || 'Calculating...'}</p>
            <p>Duration: {currentRide.duration?.text || 'Calculating...'}</p>
          </div>
        </div>

        <div className="ride-actions">
          <button className="action-btn primary" onClick={() => {/* Call driver */}}>
            📞 Call Driver
          </button>
          <button className="action-btn secondary" onClick={() => {/* Chat with driver */}}>
            💬 Chat
          </button>
          <button className="action-btn danger" onClick={activateSOS}>
            🚨 SOS Emergency
          </button>
        </div>

        <div className="map-placeholder">
          <div className="map-content">
            <p>🗺️ Live Map Tracking</p>
            <p>Driver location will be shown here</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDriverDashboard = () => (
    <div className="driver-dashboard">
      <div className="dashboard-header">
        <button className="back-btn" onClick={() => setCurrentScreen('home')}>← Back</button>
        <h2>Driver Dashboard</h2>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>₹{driverEarnings.today}</h3>
          <p>Today</p>
        </div>
        <div className="stat-card">
          <h3>₹{driverEarnings.week}</h3>
          <p>This Week</p>
        </div>
        <div className="stat-card">
          <h3>₹{driverEarnings.month}</h3>
          <p>This Month</p>
        </div>
        <div className="stat-card">
          <h3>4.8 ⭐</h3>
          <p>Rating</p>
        </div>
      </div>

      <div className="recent-rides">
        <h3>Recent Rides</h3>
        <div className="rides-list">
          {driverRides.length > 0 ? (
            driverRides.slice(0, 5).map(ride => (
              <div key={ride._id} className="ride-item">
                <div className="ride-info">
                  <p>{ride.pickup?.address} → {ride.destination?.address}</p>
                  <p>₹{ride.pricing?.totalFare} • {ride.status}</p>
                </div>
                <div className="ride-date">
                  {new Date(ride.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <p>No rides yet</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAdminPanel = () => (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="back-btn" onClick={() => setCurrentScreen('home')}>← Back</button>
        <h2>Admin Panel</h2>
      </div>

      <div className="admin-overview">
        <div className="overview-cards">
          <div className="overview-card">
            <h3>1,247</h3>
            <p>Total Rides Today</p>
          </div>
          <div className="overview-card">
            <h3>342</h3>
            <p>Active Drivers</p>
          </div>
          <div className="overview-card">
            <h3>₹45,230</h3>
            <p>Revenue Today</p>
          </div>
          <div className="overview-card">
            <h3>98.5%</h3>
            <p>Safety Score</p>
          </div>
        </div>
      </div>

      <div className="admin-actions">
        <button className="admin-btn" onClick={() => setCurrentScreen('admin-drivers')}>
          🚗 Driver Management
        </button>
        <button className="admin-btn" onClick={() => setCurrentScreen('admin-rides')}>
          📋 Ride Management
        </button>
        <button className="admin-btn" onClick={() => setCurrentScreen('admin-analytics')}>
          📊 Analytics
        </button>
        <button className="admin-btn" onClick={() => setCurrentScreen('admin-settings')}>
          ⚙️ Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="ride-sharing-container">
      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          <span>✅ {success}</span>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {currentScreen === 'home' && renderHomeScreen()}
      {currentScreen === 'tracking' && renderTrackingScreen()}
      {currentScreen === 'driver-dashboard' && renderDriverDashboard()}
      {currentScreen === 'admin' && renderAdminPanel()}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">🔄</div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
};

export default RideSharing;
