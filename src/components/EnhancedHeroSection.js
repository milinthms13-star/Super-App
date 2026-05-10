import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { getPathForModule } from "../utils/moduleRoutes";
import "../styles/EnhancedHeroSection.css";

const EnhancedHeroSection = ({
  currentUser = {},
  isSeller = false,
  enabledModules = [],
  onEnabledModulesClick = null,
}) => {
  const navigate = useNavigate();
  const { cart, ordersPagination, orderStats, ecommerceProducts, mockData } = useApp();
  const [timeGreeting, setTimeGreeting] = useState("Good Morning");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) {
        setTimeGreeting("Good Morning");
      } else if (hour < 18) {
        setTimeGreeting("Good Afternoon");
      } else {
        setTimeGreeting("Good Evening");
      }
      setCurrentTime(new Date());
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const firstName = currentUser?.name?.split(" ")[0] || "there";
  const isEarlyMorning = currentTime.getHours() < 6;

  const liveMetrics = useMemo(() => {
    const cartItems = (cart || []).reduce((total, item) => total + Number(item.quantity || 1), 0);
    const totalOrders = Number(ordersPagination?.totalItems || 0);
    const openOrders = Number(orderStats?.openCount || 0);
    const products = Array.isArray(ecommerceProducts) ? ecommerceProducts.length : 0;
    const conversations = Array.isArray(mockData?.conversations) ? mockData.conversations.length : 0;
    const rides = Array.isArray(mockData?.rideOffers) ? mockData.rideOffers.length : 0;
    const properties = Array.isArray(mockData?.realestateProperties)
      ? mockData.realestateProperties.length
      : 0;
    const deliveryPartners = Array.isArray(mockData?.restaurants) ? mockData.restaurants.length : 0;

    return [
      { moduleId: "dashboard", icon: "#", label: "Enabled Modules", value: Number(enabledModules?.length || 0) },
      { moduleId: "ecommerce", icon: "P", label: "Products Listed", value: products },
      { moduleId: "messaging", icon: "C", label: "Active Chats", value: conversations },
      { moduleId: "ridesharing", icon: "R", label: "Ride Listings", value: rides },
      { moduleId: "realestate", icon: "H", label: "Properties Listed", value: properties },
      { moduleId: "fooddelivery", icon: "F", label: "Delivery Partners", value: deliveryPartners },
      { moduleId: "orders", icon: "O", label: "Orders", value: totalOrders },
      { moduleId: "cart", icon: "T", label: "Cart Items", value: cartItems },
      { moduleId: "orders", icon: "U", label: "Open Orders", value: openOrders },
    ];
  }, [cart, ecommerceProducts, enabledModules, mockData, orderStats, ordersPagination]);

  const handleMetricClick = (moduleId) => {
    if (moduleId === "dashboard" && typeof onEnabledModulesClick === "function") {
      onEnabledModulesClick();
      return;
    }

    navigate(getPathForModule(moduleId));
  };

  return (
    <div className={`enhanced-hero-section ${isEarlyMorning ? "early-morning" : ""}`}>
      <div className="hero-gradient-bg"></div>

      <div className="hero-content-wrapper">
        <div className="hero-greeting">
          <div className="greeting-text">
            <h1 className="greeting-main">
              <span className="greeting-emoji">Hi</span>
              {timeGreeting}, <span className="user-name">{firstName}</span>
            </h1>
            <p className="greeting-subtitle">
              {isSeller
                ? "Manage your business workspace and monitor your channels"
                : "Your NilaHub dashboard is synced with live platform data"}
            </p>
          </div>

          <div className="weather-card">
            <div className="weather-icon">TIME</div>
            <div className="weather-details">
              <p className="weather-temp">
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="weather-condition">
                {currentTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </p>
            </div>
          </div>
        </div>

        <div className="live-metrics-banner">
          <div className="metrics-scroll">
            {liveMetrics.map((metric) => (
              <button
                key={`${metric.moduleId}-${metric.label}`}
                type="button"
                className="metric-item metric-item-btn"
                onClick={() => handleMetricClick(metric.moduleId)}
                title={metric.label}
              >
                <span className="metric-icon">{metric.icon}</span>
                <div className="metric-text">
                  <p className="metric-label">{metric.label}</p>
                  <p className="metric-value">{Number(metric.value || 0)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="hero-ecosystem-promise">
          <p className="promise-main">
            One digital ecosystem for <span className="highlight">commerce</span>,{" "}
            <span className="highlight">communication</span>, <span className="highlight">services</span>, and{" "}
            <span className="highlight">daily life</span>.
          </p>
          <p className="promise-sub">
            Everything connected. Nothing fragmented.{" "}
            <span className="trust-badge">Enabled modules: {Number(enabledModules?.length || 0)}</span>
          </p>
        </div>
      </div>

      <div className="hero-badges">
        <div className="badge badge-unified">Unified Identity</div>
        <div className="badge badge-wallet">Shared Wallet</div>
        <div className="badge badge-messaging">Common Messaging</div>
        <div className="badge badge-ai">AI Assisted</div>
      </div>
    </div>
  );
};

export default EnhancedHeroSection;
