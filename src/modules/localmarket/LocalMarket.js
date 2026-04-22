import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/LocalMarket.css";

const ROLE_OPTIONS = [
  { id: "buyer", label: "Buyer" },
  { id: "shopowner", label: "Shop Owner" },
  { id: "delivery", label: "Delivery Partner" },
  { id: "admin", label: "Admin" },
];

const SHOP_TYPES = ["Grocery Store", "Supermarket", "Convenience Store", "Local Kirana", "Organic Store"];
const SHOP_CATEGORIES = [
  "Vegetables & Fruits",
  "Dairy & Eggs",
  "Pantry Staples",
  "Beverages",
  "Bakery",
  "Meat & Fish",
  "Personal Care",
  "Household",
  "Snacks & Confectionery",
  "Frozen Foods",
];

const ORDER_STATUSES = ["Order Confirmed", "Being Prepared", "Ready for Pickup", "Out for Delivery", "Delivered"];
const REJECTED_ORDER_STATUS = "Cancelled";
const PAYMENT_OPTIONS = ["UPI", "Card", "Wallet", "Cash on Delivery", "Net Banking"];
const DELIVERY_OPTIONS = ["Home Delivery", "Store Pickup"];
const PROMO_CODES = {
  SAVE100: { type: "flat", amount: 100, minSubtotal: 500, label: "Flat INR 100 off above INR 500" },
  FIRST20: { type: "percent", amount: 20, minSubtotal: 300, maxDiscount: 150, label: "20% off on first order" },
  FREEDEL: { type: "delivery", amount: 49, minSubtotal: 599, label: "Free delivery above INR 599" },
  FRESH15: { type: "percent", amount: 15, minSubtotal: 400, maxDiscount: 100, label: "15% off on fresh items" },
};
const SUPPORTED_LANGUAGES = ["English", "Malayalam", "Tamil", "Hindi"];
const INTEGRATIONS = ["Razorpay / Stripe", "Google Maps", "SMS / OTP API", "Push Notifications"];
const DATABASE_TABLES = ["Users", "Shops", "Products", "Orders", "Payments", "Delivery Tracking", "Reviews"];

const FALLBACK_SHOPS = [
  {
    id: "shop-1",
    name: "Fresh Mart Supermarket",
    type: "Supermarket",
    rating: 4.7,
    deliveryTime: "30 mins",
    discount: "15% OFF",
    distanceKm: 2.5,
    minOrder: 200,
    promoted: true,
    open: true,
    imageLabel: "FM",
    licenseStatus: "Verified License",
    avgDeliveryRating: 4.8,
    deliveryCharge: 40,
    freeDeliveryAbove: 599,
    products: [
      {
        id: "shop-1-prod-1",
        name: "Fresh Tomatoes (1 KG)",
        price: 60,
        mrp: 75,
        category: "Vegetables & Fruits",
        description: "Locally sourced fresh tomatoes",
        image: "🍅",
        inStock: true,
        quantity: "1 KG",
        rating: 4.6,
      },
      {
        id: "shop-1-prod-2",
        name: "Organic Milk (1 Liter)",
        price: 55,
        mrp: 65,
        category: "Dairy & Eggs",
        description: "Fresh organic cow milk",
        image: "🥛",
        inStock: true,
        quantity: "1 Liter",
        rating: 4.8,
      },
      {
        id: "shop-1-prod-3",
        name: "Whole Wheat Bread (400g)",
        price: 45,
        mrp: 55,
        category: "Bakery",
        description: "Fresh baked whole wheat bread",
        image: "🍞",
        inStock: true,
        quantity: "400g",
        rating: 4.5,
      },
      {
        id: "shop-1-prod-4",
        name: "Basmati Rice (5 KG)",
        price: 520,
        mrp: 600,
        category: "Pantry Staples",
        description: "Premium basmati rice",
        image: "🍚",
        inStock: true,
        quantity: "5 KG",
        rating: 4.7,
      },
      {
        id: "shop-1-prod-5",
        name: "Coconut Oil (500 ML)",
        price: 180,
        mrp: 220,
        category: "Pantry Staples",
        description: "Cold-pressed coconut oil",
        image: "🥥",
        inStock: true,
        quantity: "500 ML",
        rating: 4.9,
      },
    ],
    reviews: [
      { id: "shop-1-review-1", author: "Priya", rating: 5, comment: "Fresh products and quick delivery!" },
      { id: "shop-1-review-2", author: "Rajesh", rating: 4, comment: "Good variety and reasonable prices." },
    ],
  },
  {
    id: "shop-2",
    name: "Daily Needs Kirana Store",
    type: "Local Kirana",
    rating: 4.5,
    deliveryTime: "25 mins",
    discount: "10% OFF",
    distanceKm: 1.8,
    minOrder: 150,
    promoted: false,
    open: true,
    imageLabel: "DN",
    licenseStatus: "Verified License",
    avgDeliveryRating: 4.6,
    deliveryCharge: 30,
    freeDeliveryAbove: 499,
    products: [
      {
        id: "shop-2-prod-1",
        name: "Onions (2 KG)",
        price: 80,
        mrp: 100,
        category: "Vegetables & Fruits",
        description: "Fresh red onions",
        image: "🧅",
        inStock: true,
        quantity: "2 KG",
        rating: 4.4,
      },
      {
        id: "shop-2-prod-2",
        name: "Bananas (1 Bunch)",
        price: 50,
        mrp: 60,
        category: "Vegetables & Fruits",
        description: "Ripe yellow bananas",
        image: "🍌",
        inStock: true,
        quantity: "1 Bunch",
        rating: 4.7,
      },
      {
        id: "shop-2-prod-3",
        name: "Tea Powder (500g)",
        price: 160,
        mrp: 200,
        category: "Beverages",
        description: "Premium tea powder",
        image: "☕",
        inStock: true,
        quantity: "500g",
        rating: 4.6,
      },
    ],
    reviews: [
      { id: "shop-2-review-1", author: "Meera", rating: 5, comment: "Very friendly shopkeeper and quick service." },
      { id: "shop-2-review-2", author: "Ahmed", rating: 4, comment: "Good prices on household items." },
    ],
  },
  {
    id: "shop-3",
    name: "Organic Store",
    type: "Organic Store",
    rating: 4.9,
    deliveryTime: "45 mins",
    discount: "5% OFF",
    distanceKm: 4.2,
    minOrder: 300,
    promoted: true,
    open: true,
    imageLabel: "OS",
    licenseStatus: "Certified Organic",
    avgDeliveryRating: 4.9,
    deliveryCharge: 50,
    freeDeliveryAbove: 699,
    products: [
      {
        id: "shop-3-prod-1",
        name: "Organic Spinach (500g)",
        price: 120,
        mrp: 150,
        category: "Vegetables & Fruits",
        description: "Pesticide-free organic spinach",
        image: "🥬",
        inStock: true,
        quantity: "500g",
        rating: 5,
      },
      {
        id: "shop-3-prod-2",
        name: "Organic Honey (500g)",
        price: 280,
        mrp: 350,
        category: "Pantry Staples",
        description: "Pure organic honey",
        image: "🍯",
        inStock: true,
        quantity: "500g",
        rating: 4.9,
      },
    ],
    reviews: [
      { id: "shop-3-review-1", author: "Sophia", rating: 5, comment: "Best quality organic products!" },
    ],
  },
];

const DEFAULT_CART_ITEM = {
  productId: "",
  productName: "",
  price: 0,
  quantity: 1,
  shopId: "",
};

const DEFAULT_ORDER_FORM = {
  deliveryAddress: "",
  deliveryType: "Home Delivery",
  paymentMethod: "UPI",
  promoCode: "",
  phoneNumber: "",
  specialInstructions: "",
};

function LocalMarket() {
  const { currentUser = {}, mockData = {} } = useApp();
  const [currentTab, setCurrentTab] = useState("browse");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState(FALLBACK_SHOPS);
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [filterType, setFilterType] = useState("All");
  const [orderForm, setOrderForm] = useState(DEFAULT_ORDER_FORM);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [userRole, setUserRole] = useState(currentUser?.role || "buyer");
  const [newShop, setNewShop] = useState({
    name: "",
    type: "Grocery Store",
    deliveryCharge: 0,
    minOrder: 0,
    freeDeliveryAbove: 0,
  });
  const [showAddShop, setShowAddShop] = useState(false);
  const [shopOrders, setShopOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showReview, setShowReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  // Filter and sort shops
  const filteredShops = useMemo(() => {
    let result = shops;

    if (filterType !== "All") {
      result = result.filter((shop) => shop.type === filterType);
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (shop) =>
          shop.name.toLowerCase().includes(lower) || shop.type.toLowerCase().includes(lower)
      );
    }

    if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "distance") {
      result.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === "delivery") {
      result.sort((a, b) => {
        const timeA = parseInt(a.deliveryTime);
        const timeB = parseInt(b.deliveryTime);
        return timeA - timeB;
      });
    }

    return result;
  }, [shops, filterType, searchTerm, sortBy]);

  // Calculate cart totals
  const cartTotals = useMemo(() => {
    if (cart.length === 0) {
      return { subtotal: 0, discount: 0, delivery: 0, total: 0 };
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;

    if (appliedPromo) {
      const promo = PROMO_CODES[appliedPromo];
      if (promo.type === "flat") {
        discount = subtotal >= promo.minSubtotal ? promo.amount : 0;
      } else if (promo.type === "percent") {
        discount = Math.min(
          (subtotal * promo.amount) / 100,
          promo.maxDiscount || Infinity
        );
      } else if (promo.type === "delivery") {
        discount = subtotal >= promo.minSubtotal ? promo.amount : 0;
      }
    }

    let delivery = 0;
    if (orderForm.deliveryType === "Home Delivery") {
      const shopId = cart[0]?.shopId;
      const shop = shops.find((s) => s.id === shopId);
      if (shop && subtotal < shop.freeDeliveryAbove) {
        delivery = shop.deliveryCharge || 40;
      }
    }

    const total = subtotal - discount + delivery;
    return { subtotal, discount, delivery, total };
  }, [cart, appliedPromo, orderForm.deliveryType, shops]);

  // Handle adding product to cart
  const handleAddToCart = (product, shopId) => {
    if (cart.length > 0 && cart[0].shopId !== shopId) {
      if (
        !window.confirm(
          "Your cart has items from another shop. Add items from this shop will clear the cart. Continue?"
        )
      ) {
        return;
      }
      setCart([]);
    }

    const existingItem = cart.find(
      (item) => item.productId === product.id && item.shopId === shopId
    );

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id && item.shopId === shopId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          image: product.image,
          price: product.price,
          quantity: 1,
          shopId: shopId,
          category: product.category,
        },
      ]);
    }
  };

  // Handle quantity change
  const handleUpdateQuantity = (productId, shopId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => !(item.productId === productId && item.shopId === shopId)));
    } else {
      setCart(
        cart.map((item) =>
          item.productId === productId && item.shopId === shopId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  // Handle placing order
  const handlePlaceOrder = () => {
    if (!orderForm.deliveryAddress.trim()) {
      alert("Please enter delivery address");
      return;
    }

    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    const shopId = cart[0].shopId;
    const shop = shops.find((s) => s.id === shopId);

    const newOrder = {
      id: `order-${Date.now()}`,
      shopId,
      shopName: shop.name,
      items: [...cart],
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discount,
      delivery: cartTotals.delivery,
      total: cartTotals.total,
      status: "Order Confirmed",
      paymentMethod: orderForm.paymentMethod,
      deliveryType: orderForm.deliveryType,
      deliveryAddress: orderForm.deliveryAddress,
      promoCode: appliedPromo,
      orderDate: new Date().toLocaleDateString(),
      estimatedDelivery: orderForm.deliveryType === "Home Delivery" ? "30-45 mins" : "Ready in 20 mins",
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    setShowCheckout(false);
    setOrderForm(DEFAULT_ORDER_FORM);
    setAppliedPromo(null);
    alert("Order placed successfully!");
  };

  // Handle promo code
  const handleApplyPromo = (code) => {
    if (PROMO_CODES[code]) {
      setAppliedPromo(code);
    } else {
      alert("Invalid promo code");
    }
  };

  // Handle shop owner adding shop
  const handleAddShop = () => {
    if (!newShop.name.trim()) {
      alert("Please enter shop name");
      return;
    }

    const shop = {
      id: `shop-${Date.now()}`,
      name: newShop.name,
      type: newShop.type,
      rating: 4.5,
      deliveryTime: "30 mins",
      discount: "0% OFF",
      distanceKm: 1,
      minOrder: newShop.minOrder,
      promoted: false,
      open: true,
      imageLabel: newShop.name.substring(0, 2).toUpperCase(),
      licenseStatus: "Verified License",
      avgDeliveryRating: 4.5,
      deliveryCharge: newShop.deliveryCharge,
      freeDeliveryAbove: newShop.freeDeliveryAbove,
      products: [],
      reviews: [],
    };

    setShops([...shops, shop]);
    setNewShop({ name: "", type: "Grocery Store", deliveryCharge: 0, minOrder: 0, freeDeliveryAbove: 0 });
    setShowAddShop(false);
    alert("Shop added successfully!");
  };

  // Update shop orders based on orders
  useEffect(() => {
    if (userRole === "shopowner") {
      const ownerShops = shops.filter((shop) => shop.id === shops[0]?.id); // Simplified for demo
      const ownerOrders = orders.filter((order) => ownerShops.find((s) => s.id === order.shopId));
      setShopOrders(ownerOrders);
    }
  }, [orders, shops, userRole]);

  return (
    <div className="local-market">
      <div className="lm-header">
        <h1>🛒 Local Market & Grocery Delivery</h1>
        <div className="lm-role-selector">
          <label>View as: </label>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BUYER VIEW */}
      {userRole === "buyer" && (
        <div className="lm-buyer-view">
          {currentTab === "browse" && (
            <>
              <div className="lm-toolbar">
                <div className="lm-search">
                  <input
                    type="text"
                    placeholder="Search shops..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option>All</option>
                  {SHOP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="rating">Sort by Rating</option>
                  <option value="distance">Sort by Distance</option>
                  <option value="delivery">Sort by Delivery Time</option>
                </select>
                <button className="lm-btn lm-btn-primary" onClick={() => setCurrentTab("orders")}>
                  📦 My Orders ({orders.length})
                </button>
                <button
                  className="lm-btn lm-btn-secondary"
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0}
                >
                  🛒 Cart ({cart.length})
                </button>
              </div>

              <div className="lm-shops-grid">
                {filteredShops.length === 0 ? (
                  <p className="lm-empty">No shops found</p>
                ) : (
                  filteredShops.map((shop) => (
                    <div key={shop.id} className="lm-shop-card">
                      <div className="lm-shop-header">
                        <div className="lm-shop-image">{shop.imageLabel}</div>
                        {shop.promoted && <span className="lm-promoted">⭐ Promoted</span>}
                      </div>
                      <h3>{shop.name}</h3>
                      <p className="lm-shop-type">{shop.type}</p>
                      <div className="lm-shop-stats">
                        <span>⭐ {shop.rating}</span>
                        <span>⏱️ {shop.deliveryTime}</span>
                        <span>📍 {shop.distanceKm} km</span>
                      </div>
                      <div className="lm-shop-badge">{shop.discount}</div>
                      <button
                        className="lm-btn lm-btn-primary"
                        onClick={() => {
                          setSelectedShop(shop);
                          setCurrentTab("products");
                        }}
                      >
                        Browse Products
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {currentTab === "products" && selectedShop && (
            <>
              <div className="lm-back-button">
                <button onClick={() => setCurrentTab("browse")}>← Back to Shops</button>
              </div>
              <div className="lm-shop-details">
                <h2>{selectedShop.name}</h2>
                <div className="lm-shop-info">
                  <span>⭐ {selectedShop.rating}</span>
                  <span>📦 {selectedShop.licenseStatus}</span>
                  <span>🚚 ₹{selectedShop.deliveryCharge} delivery</span>
                  <span>Min order: ₹{selectedShop.minOrder}</span>
                </div>

                <div className="lm-products-grid">
                  {selectedShop.products.map((product) => (
                    <div key={product.id} className="lm-product-card">
                      <div className="lm-product-image">{product.image}</div>
                      <h4>{product.name}</h4>
                      <p className="lm-category">{product.category}</p>
                      <p className="lm-description">{product.description}</p>
                      <div className="lm-price-section">
                        <span className="lm-price">₹{product.price}</span>
                        <span className="lm-mrp">₹{product.mrp}</span>
                      </div>
                      <p className="lm-quantity">{product.quantity}</p>
                      <button
                        className="lm-btn lm-btn-primary"
                        onClick={() => handleAddToCart(product, selectedShop.id)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentTab === "orders" && (
            <>
              <div className="lm-back-button">
                <button onClick={() => setCurrentTab("browse")}>← Back to Browse</button>
              </div>
              <div className="lm-orders-section">
                <h2>My Orders</h2>
                {orders.length === 0 ? (
                  <p className="lm-empty">No orders yet</p>
                ) : (
                  <div className="lm-orders-list">
                    {orders.map((order) => (
                      <div key={order.id} className="lm-order-card">
                        <div className="lm-order-header">
                          <h3>{order.shopName}</h3>
                          <span className={`lm-status lm-status-${order.status.replace(/\s+/g, "-").toLowerCase()}`}>
                            {order.status}
                          </span>
                        </div>
                        <p>Order ID: {order.id}</p>
                        <p>Date: {order.orderDate}</p>
                        <div className="lm-order-items">
                          {order.items.map((item) => (
                            <div key={item.productId} className="lm-order-item">
                              {item.image} {item.productName} × {item.quantity}
                            </div>
                          ))}
                        </div>
                        <div className="lm-order-total">
                          <p>Subtotal: ₹{order.subtotal}</p>
                          {order.discount > 0 && <p>Discount: -₹{order.discount}</p>}
                          {order.delivery > 0 && <p>Delivery: +₹{order.delivery}</p>}
                          <h4>Total: ₹{order.total}</h4>
                        </div>
                        <button
                          className="lm-btn lm-btn-secondary"
                          onClick={() => {
                            setShowReview(order.id);
                            setReviewForm({ rating: 5, comment: "" });
                          }}
                        >
                          Leave Review
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SHOP OWNER VIEW */}
      {userRole === "shopowner" && (
        <div className="lm-shopowner-view">
          <div className="lm-shopowner-toolbar">
            <button className="lm-btn lm-btn-primary" onClick={() => setShowAddShop(true)}>
              ➕ Add New Shop
            </button>
            <button className="lm-btn lm-btn-secondary">📊 Analytics</button>
          </div>

          <div className="lm-shopowner-section">
            <h2>My Shops</h2>
            <div className="lm-shops-list">
              {shops.map((shop) => (
                <div key={shop.id} className="lm-shopowner-card">
                  <h3>{shop.name}</h3>
                  <p>{shop.type}</p>
                  <div className="lm-shop-stats">
                    <span>⭐ {shop.rating}</span>
                    <span>📦 {shop.products.length} products</span>
                  </div>
                  <button className="lm-btn lm-btn-secondary">Manage Products</button>
                  <button className="lm-btn lm-btn-secondary">View Orders</button>
                </div>
              ))}
            </div>
          </div>

          {showAddShop && (
            <div className="lm-modal-overlay" onClick={() => setShowAddShop(false)}>
              <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Add New Shop</h2>
                <form className="lm-form">
                  <input
                    type="text"
                    placeholder="Shop Name"
                    value={newShop.name}
                    onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                  />
                  <select value={newShop.type} onChange={(e) => setNewShop({ ...newShop, type: e.target.value })}>
                    {SHOP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Delivery Charge (₹)"
                    value={newShop.deliveryCharge}
                    onChange={(e) => setNewShop({ ...newShop, deliveryCharge: parseInt(e.target.value) || 0 })}
                  />
                  <input
                    type="number"
                    placeholder="Minimum Order (₹)"
                    value={newShop.minOrder}
                    onChange={(e) => setNewShop({ ...newShop, minOrder: parseInt(e.target.value) || 0 })}
                  />
                  <input
                    type="number"
                    placeholder="Free Delivery Above (₹)"
                    value={newShop.freeDeliveryAbove}
                    onChange={(e) => setNewShop({ ...newShop, freeDeliveryAbove: parseInt(e.target.value) || 0 })}
                  />
                  <button type="button" className="lm-btn lm-btn-primary" onClick={handleAddShop}>
                    Create Shop
                  </button>
                  <button type="button" className="lm-btn lm-btn-secondary" onClick={() => setShowAddShop(false)}>
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="lm-modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="lm-modal lm-checkout-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Checkout</h2>
            {cart.length === 0 ? (
              <p>Your cart is empty</p>
            ) : (
              <>
                <div className="lm-cart-items">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.shopId}`} className="lm-cart-item">
                      <span>{item.image} {item.productName}</span>
                      <div className="lm-quantity-control">
                        <button onClick={() => handleUpdateQuantity(item.productId, item.shopId, item.quantity - 1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.productId, item.shopId, item.quantity + 1)}>
                          +
                        </button>
                      </div>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="lm-form">
                  <input
                    type="text"
                    placeholder="Delivery Address"
                    value={orderForm.deliveryAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                  />
                  <select value={orderForm.deliveryType} onChange={(e) => setOrderForm({ ...orderForm, deliveryType: e.target.value })}>
                    {DELIVERY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select value={orderForm.paymentMethod} onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}>
                    {PAYMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Special Instructions (Optional)"
                    value={orderForm.specialInstructions}
                    onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                  />
                </div>

                <div className="lm-promo-section">
                  <h4>Apply Promo Code</h4>
                  <div className="lm-promo-codes">
                    {Object.entries(PROMO_CODES).map(([code, details]) => (
                      <button
                        key={code}
                        className={`lm-promo-btn ${appliedPromo === code ? "applied" : ""}`}
                        onClick={() => handleApplyPromo(code)}
                      >
                        {code} - {details.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lm-price-breakdown">
                  <p>Subtotal: ₹{cartTotals.subtotal.toFixed(2)}</p>
                  {cartTotals.discount > 0 && <p>Discount: -₹{cartTotals.discount.toFixed(2)}</p>}
                  {cartTotals.delivery > 0 && <p>Delivery: +₹{cartTotals.delivery.toFixed(2)}</p>}
                  <h3>Total: ₹{cartTotals.total.toFixed(2)}</h3>
                </div>

                <div className="lm-modal-buttons">
                  <button className="lm-btn lm-btn-primary" onClick={handlePlaceOrder}>
                    Place Order
                  </button>
                  <button className="lm-btn lm-btn-secondary" onClick={() => setShowCheckout(false)}>
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {showReview && (
        <div className="lm-modal-overlay" onClick={() => setShowReview(null)}>
          <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Leave Review</h2>
            <div className="lm-form">
              <label>Rating:</label>
              <div className="lm-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`lm-star ${reviewForm.rating >= star ? "filled" : ""}`}
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Your review..."
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              />
              <button
                className="lm-btn lm-btn-primary"
                onClick={() => {
                  alert("Review submitted!");
                  setShowReview(null);
                }}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocalMarket;
