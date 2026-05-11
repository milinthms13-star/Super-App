import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import "../styles/RecommendedServices.css";

const MODULE_CATALOG = [
  { id: "ecommerce", title: "GlobeMart", icon: "E", gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)" },
  { id: "fooddelivery", title: "Feastly", icon: "F", gradient: "linear-gradient(135deg, #FF5252 0%, #FF6B5B 100%)" },
  { id: "ridesharing", title: "SwiftRide", icon: "R", gradient: "linear-gradient(135deg, #3498DB 0%, #2980B9 100%)" },
  { id: "realestate", title: "HomeSphere", icon: "H", gradient: "linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)" },
  { id: "finance", title: "Nila Finance Hub", icon: "N", gradient: "linear-gradient(135deg, #0F766E 0%, #115E59 45%, #1D4ED8 100%)" },
  { id: "freelancer", title: "NilaWorks", icon: "W", gradient: "linear-gradient(135deg, #0A2342 0%, #164E63 55%, #1D4ED8 100%)" },
  { id: "messaging", title: "LinkUp", icon: "M", gradient: "linear-gradient(135deg, #4ECDC4 0%, #44A5C2 100%)" },
  { id: "classifieds", title: "TradePost", icon: "T", gradient: "linear-gradient(135deg, #F39C12 0%, #E67E22 100%)" },
  { id: "socialmedia", title: "VibeHub", icon: "S", gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)" },
  { id: "localmarket", title: "Local Market", icon: "L", gradient: "linear-gradient(135deg, #00B894 0%, #00A86B 100%)" },
  { id: "matrimonial", title: "SoulMatch", icon: "U", gradient: "linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)" },
  { id: "reminderalert", title: "ReminderAlert", icon: "A", gradient: "linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)" },
  { id: "quicklinks", title: "Quick Links", icon: "Q", gradient: "linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)" },
  { id: "sosalert", title: "SOS Safety Center", icon: "X", gradient: "linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)" },
  { id: "astrology", title: "AstroNila", icon: "Z", gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
];

const RecommendedServices = () => {
  const navigate = useNavigate();
  const { ecommerceProducts, orders, cart, mockData, currentUser } = useApp();
  const [activeCategory, setActiveCategory] = useState("trending");

  const moduleStats = useMemo(() => {
    const values = {
      ecommerce: Array.isArray(ecommerceProducts) ? ecommerceProducts.length : 0,
      fooddelivery: Array.isArray(mockData?.restaurants) ? mockData.restaurants.length : 0,
      ridesharing: Array.isArray(mockData?.rideOffers) ? mockData.rideOffers.length : 0,
      realestate: Array.isArray(mockData?.realestateProperties) ? mockData.realestateProperties.length : 0,
      finance: Array.isArray(mockData?.financeLeads) ? mockData.financeLeads.length : 0,
      freelancer: Array.isArray(mockData?.freelancerBookings) ? mockData.freelancerBookings.length : 0,
      messaging: Array.isArray(mockData?.conversations) ? mockData.conversations.length : 0,
      classifieds: Array.isArray(mockData?.classifiedsListings) ? mockData.classifiedsListings.length : 0,
      socialmedia: Array.isArray(mockData?.socialMediaPosts) ? mockData.socialMediaPosts.length : 0,
      localmarket: Number((cart || []).reduce((total, item) => total + Number(item.quantity || 1), 0) || 0),
      matrimonial: Array.isArray(mockData?.matrimonialProfiles) ? mockData.matrimonialProfiles.length : 0,
      reminderalert: 0,
      quicklinks: 0,
      sosalert: 0,
      astrology: 0,
      orders: Array.isArray(orders) ? orders.length : 0,
    };

    return values;
  }, [cart, ecommerceProducts, mockData, orders]);

  const recommendations = useMemo(() => {
    const ranked = MODULE_CATALOG
      .map((module) => ({
        ...module,
        count: Number(moduleStats[module.id] || 0),
      }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

    const preferredModules = (currentUser?.selectedBusinessCategories || [])
      .map((item) => String(item?.id || "").trim().toLowerCase())
      .filter(Boolean);

    const personalizedPool = ranked.filter((module) => preferredModules.includes(module.id));

    const categoryMap = {
      trending: ranked.slice(0, 4),
      personalized: (personalizedPool.length > 0 ? personalizedPool : ranked).slice(0, 4),
      bestsellers: ranked.slice(0, 4),
    };

    return (categoryMap[activeCategory] || ranked.slice(0, 4)).map((module) => ({
      ...module,
      badge: activeCategory === "personalized" ? "For You" : activeCategory === "bestsellers" ? "Top" : "Live",
      description: `Current records: ${Number(module.count || 0)}`,
      trend: `Activity: ${Number(module.count || 0)}`,
    }));
  }, [activeCategory, currentUser, moduleStats]);

  const categories = [
    { value: "trending", label: "Trending Now", icon: "T" },
    { value: "personalized", label: "For You", icon: "U" },
    { value: "bestsellers", label: "Best Sellers", icon: "B" },
  ];

  return (
    <div className="recommended-services">
      <div className="recommendations-header">
        <h2>Recommendations</h2>
        <p className="recommendations-subtitle">Live suggestions from current platform data</p>
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
            onClick={() => navigate(`/${rec.id}`)}
          >
            <div className="card-overlay"></div>
            <span className="card-badge">{rec.badge}</span>

            <div className="card-content">
              <div className="card-icon">{rec.icon}</div>
              <h3 className="card-title">{rec.title}</h3>
              <p className="card-description">{rec.description}</p>
              <div className="card-meta">
                <p className="card-trend">{rec.trend}</p>
              </div>
            </div>

            <div className="card-cta">
              <span className="cta-arrow">-&gt;</span>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-indicator">
        <p className="indicator-text">All counts show live tracked records. If no data is present, it remains 0.</p>
      </div>
    </div>
  );
};

export default RecommendedServices;
