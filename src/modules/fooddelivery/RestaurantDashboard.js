import React, { useEffect, useState } from 'react';
import foodDeliveryService from '../../services/foodDeliveryService';
import { useApp } from '../../contexts/AppContext';

const RestaurantDashboard = () => {
  const { currentUser } = useApp();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Assume user is restaurant owner
    foodDeliveryService.getMyOrders().then(setOrders);
  }, []);

  const updateStatus = async (orderId, status) => {
    await foodDeliveryService.updateOrderStatus(orderId, status);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
  };

  return (
    <div className="restaurant-dashboard">
      <h2>Restaurant Dashboard</h2>
      <div className="orders-list">
        {orders.map(order => (
          <div key={order.id} className="order-item">
            <span>Order {order.id} - Items: {order.items.length}</span>
            <span>Total: ₹{order.total}</span>
            <span>Status: {order.status}</span>
            <select onChange={(e) => updateStatus(order.id, e.target.value)} value={order.status}>
              <option>pending</option>
              <option>preparing</option>
              <option>ready</option>
              <option>delivered</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantDashboard;

