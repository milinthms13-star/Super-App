import React, { useEffect, useState } from 'react';
import foodDeliveryService from '../../services/foodDeliveryService';

const LOCATION_DEFAULTS = {
  lat: '9.9312',
  lng: '76.2673',
};

const formatInr = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const DeliveryPartnerDashboard = () => {
  const [riderProfile, setRiderProfile] = useState({
    vehicleNumber: '',
    vehicleType: 'bike',
    licenseNumber: '',
    currentLat: LOCATION_DEFAULTS.lat,
    currentLng: LOCATION_DEFAULTS.lng,
    isOnline: false,
  });
  const [orders, setOrders] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [sosMessage, setSosMessage] = useState('Need assistance on this delivery.');

  const refreshRiderOrders = async () => {
    try {
      const data = await foodDeliveryService.getMyRiderOrders();
      if (data.rider) {
        setRiderProfile((currentProfile) => ({
          ...currentProfile,
          ...data.rider,
          currentLat: String(data.rider.currentLat || currentProfile.currentLat),
          currentLng: String(data.rider.currentLng || currentProfile.currentLng),
          isOnline: Boolean(data.rider.isOnline),
        }));
      }
      setOrders(data.orders || []);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to load rider operations.');
    }
  };

  useEffect(() => {
    refreshRiderOrders();
  }, []);

  const handleProfileSave = async () => {
    try {
      const savedRider = await foodDeliveryService.createRiderProfile({
        vehicleNumber: riderProfile.vehicleNumber,
        vehicleType: riderProfile.vehicleType,
        licenseNumber: riderProfile.licenseNumber,
        currentLat: Number(riderProfile.currentLat),
        currentLng: Number(riderProfile.currentLng),
        isOnline: riderProfile.isOnline,
      });

      setRiderProfile((currentProfile) => ({
        ...currentProfile,
        ...savedRider,
        currentLat: String(savedRider.currentLat || currentProfile.currentLat),
        currentLng: String(savedRider.currentLng || currentProfile.currentLng),
      }));
      setStatusMessage('Rider profile saved.');
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to save rider profile.');
    }
  };

  const handleAvailabilitySave = async () => {
    try {
      const updatedRider = await foodDeliveryService.updateRiderAvailability({
        isOnline: riderProfile.isOnline,
        currentLat: Number(riderProfile.currentLat),
        currentLng: Number(riderProfile.currentLng),
      });

      setRiderProfile((currentProfile) => ({
        ...currentProfile,
        ...updatedRider,
        currentLat: String(updatedRider.currentLat || currentProfile.currentLat),
        currentLng: String(updatedRider.currentLng || currentProfile.currentLng),
      }));
      setStatusMessage(`Rider is now ${updatedRider.isOnline ? 'online' : 'offline'}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update rider availability.');
    }
  };

  const handleLocationUpdate = async (orderId) => {
    try {
      const updatedOrder = await foodDeliveryService.updateRiderLocation(orderId, {
        lat: Number(riderProfile.currentLat),
        lng: Number(riderProfile.currentLng),
        accuracy: 20,
        speed: 22,
      });

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setStatusMessage(`Location updated for order ${orderId}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update rider location.');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      const updatedOrder = await foodDeliveryService.updateRiderOrderStatus(orderId, status);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setStatusMessage(`Delivery moved to ${status}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update delivery status.');
    }
  };

  const handleTriggerSos = async (orderId) => {
    try {
      const updatedOrder = await foodDeliveryService.triggerRiderSos(orderId, {
        message: sosMessage,
        lat: Number(riderProfile.currentLat),
        lng: Number(riderProfile.currentLng),
      });

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setStatusMessage('SOS raised for this order. Operations has been notified.');
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to raise SOS right now.');
    }
  };

  return (
    <div className="restaurant-dashboard">
      <h2>Delivery Partner Operations</h2>

      <div className="fd-controls">
        <input
          placeholder="Vehicle number"
          value={riderProfile.vehicleNumber}
          onChange={(event) =>
            setRiderProfile((currentProfile) => ({
              ...currentProfile,
              vehicleNumber: event.target.value,
            }))
          }
        />
        <select
          value={riderProfile.vehicleType}
          onChange={(event) =>
            setRiderProfile((currentProfile) => ({
              ...currentProfile,
              vehicleType: event.target.value,
            }))
          }
        >
          <option value="bike">Bike</option>
          <option value="auto">Auto</option>
          <option value="car">Car</option>
        </select>
        <input
          placeholder="License number"
          value={riderProfile.licenseNumber}
          onChange={(event) =>
            setRiderProfile((currentProfile) => ({
              ...currentProfile,
              licenseNumber: event.target.value,
            }))
          }
        />
        <button onClick={handleProfileSave}>Save Rider Profile</button>
      </div>

      <div className="fd-controls">
        <input
          placeholder="SOS message"
          value={sosMessage}
          onChange={(event) => setSosMessage(event.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={Boolean(riderProfile.isOnline)}
            onChange={(event) =>
              setRiderProfile((currentProfile) => ({
                ...currentProfile,
                isOnline: event.target.checked,
              }))
            }
          />
          Online
        </label>
        <input
          placeholder="Latitude"
          value={riderProfile.currentLat}
          onChange={(event) =>
            setRiderProfile((currentProfile) => ({
              ...currentProfile,
              currentLat: event.target.value,
            }))
          }
        />
        <input
          placeholder="Longitude"
          value={riderProfile.currentLng}
          onChange={(event) =>
            setRiderProfile((currentProfile) => ({
              ...currentProfile,
              currentLng: event.target.value,
            }))
          }
        />
        <button onClick={handleAvailabilitySave}>Update Availability</button>
        <button onClick={refreshRiderOrders}>Refresh Orders</button>
      </div>

      {statusMessage && <p>{statusMessage}</p>}

      <div className="orders-list">
        <h3>Assigned Orders</h3>
        {orders.length === 0 && <p>No assigned orders right now.</p>}
        {orders.map((order) => (
          <div key={order.id} className="order-item">
            <span>Order {order.id}</span>
            <span>Total: {formatInr(order.total)}</span>
            <span>Status: {order.status}</span>
            <span>ETA: {order.tracking?.estimatedArrivalMinutes || 0} mins</span>
            <button onClick={() => handleLocationUpdate(order.id)}>Push Location</button>
            <button onClick={() => handleOrderStatus(order.id, 'picked-up')}>Picked Up</button>
            <button onClick={() => handleOrderStatus(order.id, 'nearby')}>Nearby</button>
            <button onClick={() => handleOrderStatus(order.id, 'delivered')}>Delivered</button>
            <button onClick={() => handleTriggerSos(order.id)}>SOS</button>
            {order.riderSafety?.activeSos && <span>SOS active</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
