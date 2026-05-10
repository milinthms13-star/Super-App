import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useI18n from "../hooks/useI18n";
import { getPathForModule } from "../utils/moduleRoutes";
import "../styles/EnhancedHeroSection.css";

const EnhancedHeroSection = ({ currentUser = {}, isSeller = false }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [timeGreeting, setTimeGreeting] = useState("Good Morning");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 28, condition: "Sunny", city: "Kochi" });

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

  const handleMetricClick = (moduleId) => {
    navigate(getPathForModule(moduleId));
  };

  return (
    <div className={`enhanced-hero-section ${isEarlyMorning ? "early-morning" : ""}`}>
      {/* Animated Background Gradient */}
      <div className="hero-gradient-bg"></div>

      <div className="hero-content-wrapper">
        {/* Greeting Section */}
        <div className="hero-greeting">
          <div className="greeting-text">
            <h1 className="greeting-main">
              <span className="greeting-emoji">👋</span>
              {timeGreeting}, <span className="user-name">{firstName}</span>
            </h1>
            <p className="greeting-subtitle">
              {isSeller
                ? "Manage your business ecosystem and monitor all your channels"
                : "Your NilaHub ecosystem is ready to explore"}
            </p>
          </div>

          {/* Weather Card */}
          <div className="weather-card">
            <div className="weather-icon">
              {weather.condition === "Sunny" ? "☀️" : weather.condition === "Rainy" ? "🌧️" : "⛅"}
            </div>
            <div className="weather-details">
              <p className="weather-temp">{weather.temp}°C</p>
              <p className="weather-condition">{weather.condition}</p>
            </div>
          </div>
        </div>

        {/* Live Metrics Banner */}
        <div className="live-metrics-banner">
          <div className="metrics-scroll">
            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("ecommerce")}
              title="Explore all integrated platforms"
            >
              <span className="metric-icon">🌐</span>
              <div className="metric-text">
                <p className="metric-label">Integrated Platforms</p>
                <p className="metric-value">12</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("socialmedia")}
              title="View active users"
            >
              <span className="metric-icon">👥</span>
              <div className="metric-text">
                <p className="metric-label">Active Users</p>
                <p className="metric-value">850K+</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("ecommerce")}
              title="Browse products"
            >
              <span className="metric-icon">🛍️</span>
              <div className="metric-text">
                <p className="metric-label">Products Listed</p>
                <p className="metric-value">2.1M+</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("messaging")}
              title="View messages"
            >
              <span className="metric-icon">💬</span>
              <div className="metric-text">
                <p className="metric-label">Active Chats</p>
                <p className="metric-value">340K+</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("ridesharing")}
              title="Book a ride"
            >
              <span className="metric-icon">🚗</span>
              <div className="metric-text">
                <p className="metric-label">Rides Today</p>
                <p className="metric-value">24.3K</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("realestate")}
              title="Explore properties"
            >
              <span className="metric-icon">🏠</span>
              <div className="metric-text">
                <p className="metric-label">Properties Listed</p>
                <p className="metric-value">185K+</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("fooddelivery")}
              title="Order food"
            >
              <span className="metric-icon">🍽️</span>
              <div className="metric-text">
                <p className="metric-label">Deliveries Today</p>
                <p className="metric-value">156K</p>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-item-btn"
              onClick={() => handleMetricClick("ecommerce")}
              title="View transactions"
            >
              <span className="metric-icon">💰</span>
              <div className="metric-text">
                <p className="metric-label">Transactions</p>
                <p className="metric-value">45M+</p>
              </div>
            </button>
          </div>
        </div>

        {/* Hero Tagline & Ecosystem Promise */}
        <div className="hero-ecosystem-promise">
          <p className="promise-main">
            One digital ecosystem for <span className="highlight">commerce</span>,{" "}
            <span className="highlight">communication</span>, <span className="highlight">services</span>, and{" "}
            <span className="highlight">daily life</span>.
          </p>
          <p className="promise-sub">
            Everything connected. Nothing fragmented.{" "}
            <span className="trust-badge">✓ Trusted by 850K+ Indians</span>
          </p>
        </div>
      </div>

      {/* Floating Badges - Proof Elements */}
      <div className="hero-badges">
        <div className="badge badge-unified">🔗 Unified Identity</div>
        <div className="badge badge-wallet">💳 Shared Wallet</div>
        <div className="badge badge-messaging">📨 Common Messaging</div>
        <div className="badge badge-ai">✨ AI-Powered</div>
      </div>
    </div>
  );
};

export default EnhancedHeroSection;
