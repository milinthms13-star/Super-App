import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RecommendedServices.css";

const RecommendedServices = ({ currentUser }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [activeCategory, setActiveCategory] = useState("trending");

  useEffect(() => {
    // Simulated AI recommendations based on user behavior
    const mockRecommendations = {
      trending: [
        {
          id: 1,
          module: "ecommerce",
          title: "Summer Fashion Sale",
          description: "40% off on premium brands",
          trend: "🔥 Trending +2.3K this week",
          icon: "👔",
          gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
          badge: "Hot Deal",
        },
        {
          id: 2,
          module: "fooddelivery",
          title: "Cloud Kitchen Specials",
          description: "New restaurants in your area",
          trend: "⭐ 4.8★ (2.1K reviews)",
          icon: "🍕",
          gradient: "linear-gradient(135deg, #FF5252 0%, #FF6B5B 100%)",
          badge: "New",
        },
        {
          id: 3,
          module: "ridesharing",
          title: "Weekend Rides 20% Off",
          description: "Grab your weekend ride deal",
          trend: "🎉 Limited time offer",
          icon: "🚗",
          gradient: "linear-gradient(135deg, #3498DB 0%, #2980B9 100%)",
          badge: "Limited",
        },
        {
          id: 4,
          module: "realestate",
          title: "Luxury Apartments Launch",
          description: "2BHK starting ₹65L in Kochi",
          trend: "📈 Pre-booking open",
          icon: "🏠",
          gradient: "linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)",
          badge: "Featured",
        },
      ],
      personalized: [
        {
          id: 5,
          module: "ecommerce",
          title: "Headphones & Accessories",
          description: "Similar to your recent purchase",
          reason: "✓ Based on your browsing",
          icon: "🎧",
          gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
          badge: "For You",
        },
        {
          id: 6,
          module: "messaging",
          title: "Your Friends Are Online",
          description: "7 contacts available now",
          reason: "✓ Connect with friends",
          icon: "👋",
          gradient: "linear-gradient(135deg, #4ECDC4 0%, #44A5C2 100%)",
          badge: "Friends",
        },
        {
          id: 7,
          module: "localmarket",
          title: "Organic Fresh Produce",
          description: "Local vendors near you",
          reason: "✓ From your locality",
          icon: "🥕",
          gradient: "linear-gradient(135deg, #00B894 0%, #00A86B 100%)",
          badge: "Local",
        },
        {
          id: 8,
          module: "matrimonial",
          title: "New Matches for You",
          description: "5 new compatible profiles",
          reason: "✓ Verified & compatible",
          icon: "💕",
          gradient: "linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)",
          badge: "Matches",
        },
      ],
      bestsellers: [
        {
          id: 9,
          module: "ecommerce",
          title: "#1 Smartwatch Category",
          description: "Over 50K purchases this month",
          trend: "⭐ #1 Product",
          icon: "⌚",
          gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
          badge: "#1",
        },
        {
          id: 10,
          module: "fooddelivery",
          title: "Most Ordered Biryani",
          description: "FoodHub's signature dish",
          trend: "❤️ 9.2K loved",
          icon: "🍲",
          gradient: "linear-gradient(135deg, #FF5252 0%, #FF6B5B 100%)",
          badge: "Popular",
        },
        {
          id: 11,
          module: "classifieds",
          title: "Luxury Car Listings",
          description: "Premium vehicles trending",
          trend: "🏎️ Top category",
          icon: "🚙",
          gradient: "linear-gradient(135deg, #F39C12 0%, #E67E22 100%)",
          badge: "Premium",
        },
        {
          id: 12,
          module: "socialmedia",
          title: "Trending Challenges",
          description: "Join 50K+ participants",
          trend: "🎬 Most shared",
          icon: "🎥",
          gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
          badge: "Viral",
        },
      ],
    };

    setRecommendations(mockRecommendations[activeCategory] || []);
  }, [activeCategory]);

  const categories = [
    { value: "trending", label: "Trending Now", icon: "🔥" },
    { value: "personalized", label: "For You", icon: "✨" },
    { value: "bestsellers", label: "Best Sellers", icon: "⭐" },
  ];

  return (
    <div className="recommended-services">
      <div className="recommendations-header">
        <h2>Recommendations</h2>
        <p className="recommendations-subtitle">
          Personalized picks based on your activity
        </p>
      </div>

      <div className="recommendation-categories">
        {categories.map((cat) => (
          <button
            key={cat.value}
            className={`category-btn ${activeCategory === cat.value ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.value)}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-label">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="recommendations-carousel">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="recommendation-card"
            style={{ background: rec.gradient }}
            onClick={() => navigate(`/${rec.module}`)}
          >
            {/* Overlay */}
            <div className="card-overlay"></div>

            {/* Badge */}
            <span className="card-badge">{rec.badge}</span>

            {/* Content */}
            <div className="card-content">
              <div className="card-icon">{rec.icon}</div>
              <h3 className="card-title">{rec.title}</h3>
              <p className="card-description">{rec.description}</p>
              <div className="card-meta">
                {rec.trend && <p className="card-trend">{rec.trend}</p>}
                {rec.reason && <p className="card-reason">{rec.reason}</p>}
              </div>
            </div>

            {/* CTA */}
            <div className="card-cta">
              <span className="cta-arrow">→</span>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-indicator">
        <p className="indicator-text">
          Swipe for more recommendations based on your preferences
        </p>
      </div>
    </div>
  );
};

export default RecommendedServices;
