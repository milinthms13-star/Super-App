import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import foodDeliveryService from "../../services/foodDeliveryService";
import "../../styles/FoodDelivery.css";

const FoodDelivery = () => {
  const { currentUser = {} } = useApp();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCuisine, setFilterCuisine] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
const [orders, setOrders] = useState([]);
  const [restaurantCartId, setRestaurantCartId] = useState(null);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    try {
      const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0).toFixed(0);
      // Call service for checkout
      await foodDeliveryService.checkout(selectedRestaurant.id, cart);
      setCart([]);
      setRestaurantCartId(null);
      alert(`Checkout successful! Total: ₹${total}`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed: ' + (error.message || 'Unknown error'));
    }
  };

  // Load restaurants
  useEffect(() => {
    foodDeliveryService.getRestaurants().then(setRestaurants);
  }, []);

  // Load orders
  useEffect(() => {
    foodDeliveryService.getMyOrders().then(setOrders);
  }, []);

  // Filter restaurants
  const filteredRestaurants = useMemo(() => {
    let result = restaurants.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterCuisine !== "All") {
      result = result.filter(r => r.categories?.includes(filterCuisine));
    }

    return result.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "delivery") return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
      return 0;
    });
  }, [restaurants, searchTerm, filterCuisine, sortBy]);

  const handleAddToCart = async (item) => {
    if (selectedRestaurant && selectedRestaurant.id !== restaurantCartId) {
      // New restaurant - clear cart
      setCart([{ ...item, quantity: 1, restaurantId: selectedRestaurant.id }]);
      setRestaurantCartId(selectedRestaurant.id);
      await foodDeliveryService.addToCart(selectedRestaurant.id, item.id, 1);
    } else {
      const existing = cart.find(c => c.id === item.id);
      if (existing) {
        const newQuantity = existing.quantity + 1;
        setCart(cart.map(c => 
          c.id === item.id ? { ...c, quantity: newQuantity } : c
        ));
        await foodDeliveryService.addToCart(selectedRestaurant.id, item.id, newQuantity);
      } else {
        const newItem = { ...item, quantity: 1, restaurantId: selectedRestaurant.id };
        setCart([...cart, newItem]);
        await foodDeliveryService.addToCart(selectedRestaurant.id, item.id, 1);
      }
    }
  };

  return (
    <div className="food-delivery">
      <div className="fd-header">
        <h1>🍽️ Feastly - Food Delivery</h1>
        <div className="fd-controls">
          <input 
            placeholder="Search restaurants..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select value={filterCuisine} onChange={e => setFilterCuisine(e.target.value)}>
            <option>All</option>
            <option>Biryani</option>
            <option>Chinese</option>
            <option>North Indian</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="rating">Top Rated</option>
            <option value="delivery">Fastest Delivery</option>
          </select>
        </div>
      </div>

      <div className="fd-restaurants-grid">
        {filteredRestaurants.map(restaurant => (
          <div key={restaurant.id} className="fd-restaurant-card">
            <div className="fd-restaurant-image">{restaurant.imageLabel}</div>
            <h3>{restaurant.name}</h3>
            <div className="fd-stats">
              <span>⭐ {restaurant.rating}</span>
              <span>⏰ {restaurant.deliveryTime}</span>
            </div>
            <button onClick={() => {
            foodDeliveryService.getMenu(restaurant.id).then(setMenu);
              setSelectedRestaurant(restaurant);
            }}>
              View Menu
            </button>
          </div>
        ))}
      </div>

      {/* Menu View */}
      {selectedRestaurant && (
        <div className="fd-menu">
          <button onClick={() => setSelectedRestaurant(null)}>← Back</button>
          <h2>{selectedRestaurant.name}</h2>
          <div className="fd-menu-grid">
            {menu.map(item => (
              <div key={item.id} className="fd-menu-item">
                <span>{item.image} {item.name}</span>
                <div>₹{item.price}</div>
                <button onClick={() => handleAddToCart(item)}>Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="fd-cart-summary">
          Cart: ₹{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(0)} 
          ({cart.length} items) - {restaurantCartId && restaurants.find(r => r.id === restaurantCartId)?.name}
          <button onClick={handleCheckout}>Checkout</button>
          <button onClick={() => {
            setCart([]);
            setRestaurantCartId(null);
          }}>Clear</button>
        </div>
      )}

      {/* Live Orders */}
      {orders.map(order => (
        <div key={order.id} className="fd-order-status">
          Order {order.id}: {order.status} 
          <button onClick={() => foodDeliveryService.updateOrderStatus(order.id, 'next')}>Update</button>
        </div>
      ))}
    </div>
  );
};

export default FoodDelivery;

