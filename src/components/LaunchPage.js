import React from "react";
import { getTranslation, languageOptions } from "../data/translations";
import "../styles/LaunchPage.css";
import {
  FaShoppingCart,
  FaComments,
  FaTag,
  FaHome,
  FaUtensils,
  FaStore,
  FaCar,
  FaHeart,
  FaFire,
  FaBell,
  FaExclamationTriangle,
  FaBook,
  FaStar,
} from "react-icons/fa";

const iconMap = {
  FaShoppingCart,
  FaComments,
  FaTag,
  FaHome,
  FaUtensils,
  FaStore,
  FaCar,
  FaHeart,
  FaFire,
  FaBell,
  FaExclamationTriangle,
  FaBook,
  FaStar,
};

const moduleFallbacks = {
  localmarket: {
    title: "Local Market",
    description: "Shop from local vendors and fresh producers.",
    icon: "FaStore",
    isComingSoon: false,
  },
  mydiary: {
    title: "MyDiary",
    description: "Personal diary, journaling, and memory storage.",
    icon: "FaBook",
    isComingSoon: true,
  },
  astrology: {
    title: "AstroNila",
    description: "Daily horoscope and personalized astrology readings.",
    icon: "FaStar",
    isComingSoon: false,
  },
};

const openExternalLink = (url) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const LaunchPage = ({
  language,
  onLanguageChange,
  onSelectRegistrationType,
  enabledModules,
  customLinks = [],
}) => {
  const { launch, direction } = getTranslation(language);

  const moduleMapping = {
    GlobeMart: "ecommerce",
    LinkUp: "messaging",
    TradePost: "classifieds",
    HomeSphere: "realestate",
    Feastly: "fooddelivery",
    "Local Market": "localmarket",
    SwiftRide: "ridesharing",
    SoulMatch: "matrimonial",
    VibeHub: "socialmedia",
    "ReminderAlert - Todo List": "reminderalert",
    "SOS Safety Center": "sosalert",
    MyDiary: "mydiary",
    AstroNila: "astrology",
  };

  const filteredFeatures = launch.features.filter(
    ([name]) => enabledModules.includes(moduleMapping[name])
  );
  const visibleModuleIds = new Set(
    filteredFeatures.map(([name]) => moduleMapping[name]).filter(Boolean)
  );
  const missingEnabledFeatures = Object.entries(moduleFallbacks)
    .filter(([moduleId]) => enabledModules.includes(moduleId) && !visibleModuleIds.has(moduleId))
    .map(([moduleId, feature]) => ({
      key: moduleId,
      title: feature.title,
      description: feature.description,
      icon: feature.icon,
      isComingSoon: feature.isComingSoon,
      type: "module",
      moduleId,
    }));
  const featureCards = [
    ...filteredFeatures.map(([title, description, icon, isComingSoon]) => ({
      key: title,
      title,
      description,
      icon,
      isComingSoon,
      type: "module",
      moduleId: moduleMapping[title],
    })),
    ...missingEnabledFeatures,
    ...customLinks.map((link) => ({
      key: link.id,
      title: link.title,
      description: link.description || link.url,
      type: "external",
      url: link.url,
    })),
  ];

  const renderIcon = (iconName) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="feature-icon" /> : null;
  };

  return (
    <main className="launch-page" dir={direction}>
      <section className="launch-hero">
        <div className="kerala-hero-art" aria-hidden="true" />
        <div className="launch-hero-content">
          <div className="language-control">
            <label htmlFor="language-select">{launch.languageLabel}</label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value)}
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <img src="/logo.svg" alt="NilaHub" className="launch-logo" />
          <p className="launch-eyebrow">{launch.brand}</p>
          <h1>{launch.title}</h1>
          <p className="launch-tagline">{launch.tagline}</p>
          <p className="launch-intro">{launch.intro}</p>

          <div className="registration-actions" aria-label="Registration options">
            <button
              type="button"
              className="registration-option login-option"
              onClick={() => onSelectRegistrationType("login")}
            >
              <span>{launch.login}</span>
              <small>{launch.loginHelp}</small>
            </button>
            <button
              type="button"
              className="registration-option primary-option"
              onClick={() => onSelectRegistrationType("user")}
            >
              <span>{launch.user}</span>
              <small>{launch.userHelp}</small>
            </button>
          </div>
        </div>
      </section>

      <section className="launch-features" aria-labelledby="features-heading">
        <div className="launch-section-heading">
          <p>{launch.featuresLabel}</p>
          <h2 id="features-heading">{launch.featuresTitle}</h2>
        </div>

        <div className="feature-grid">
          {featureCards.map((feature) => (
            <button
              type="button"
              className={`feature-card ${feature.isComingSoon ? "coming-soon" : ""}`}
              key={feature.key}
              onClick={() =>
                !feature.isComingSoon &&
                (feature.type === "external"
                  ? openExternalLink(feature.url)
                  : onSelectRegistrationType("login", feature.moduleId || moduleMapping[feature.title]))
              }
              disabled={feature.isComingSoon}
            >
              {feature.icon && renderIcon(feature.icon)}
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.isComingSoon ? (
                <span className="coming-soon-badge">Coming Soon</span>
              ) : feature.type === "external" ? (
                <span className="feature-card-link-badge">Open link</span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {/* Ecosystem Statistics Section */}
      <section className="ecosystem-stats" aria-labelledby="stats-heading">
        <div className="stats-container">
          <h2 id="stats-heading" className="stats-title">NilaHub Ecosystem at a Glance</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🚀</div>
              <div className="stat-value">10+</div>
              <div className="stat-label">Integrated Services</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">Real-Time</div>
              <div className="stat-label">Infrastructure</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔒</div>
              <div className="stat-value">Secure</div>
              <div className="stat-label">Verified Platform</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🌍</div>
              <div className="stat-value">Global</div>
              <div className="stat-label">Ecosystem Ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Flow Section */}
      <section className="ecosystem-flow" aria-labelledby="flow-heading">
        <div className="flow-container">
          <h2 id="flow-heading" className="flow-title">How NilaHub Works</h2>
          <p className="flow-subtitle">One platform connecting every role in your ecosystem</p>
          <div className="flow-visualization">
            <div className="flow-item">
              <div className="flow-step">👤</div>
              <div className="flow-text">Users</div>
            </div>
            <div className="flow-connector">→</div>
            <div className="flow-item">
              <div className="flow-step">🏪</div>
              <div className="flow-text">Vendors</div>
            </div>
            <div className="flow-connector">→</div>
            <div className="flow-item">
              <div className="flow-step">🚗</div>
              <div className="flow-text">Drivers</div>
            </div>
            <div className="flow-connector">→</div>
            <div className="flow-item">
              <div className="flow-step">✨</div>
              <div className="flow-text">Creators</div>
            </div>
            <div className="flow-connector">→</div>
            <div className="flow-item">
              <div className="flow-step">💼</div>
              <div className="flow-text">Businesses</div>
            </div>
          </div>
          <p className="flow-conclusion">All connected. All earning. All growing together.</p>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="trust-indicators" aria-labelledby="trust-heading">
        <div className="trust-container">
          <h2 id="trust-heading" className="trust-title">Why Choose NilaHub</h2>
          <div className="trust-grid">
            <div className="trust-item">
              <span className="trust-check">✓</span>
              <span className="trust-text">Multi-Service Platform</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">✓</span>
              <span className="trust-text">AI-Powered Features</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">✓</span>
              <span className="trust-text">Secure Authentication</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">✓</span>
              <span className="trust-text">Real-Time Infrastructure</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">✓</span>
              <span className="trust-text">Verified Ecosystem</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">✓</span>
              <span className="trust-text">Global Ready</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LaunchPage;
