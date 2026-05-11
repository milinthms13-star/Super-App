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
  FaUser,
  FaBriefcase,
  FaCheckCircle,
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
  FaUser,
  FaBriefcase,
  FaCheckCircle,
};

const moduleFallbacks = {
  skilllearning: {
    title: "Nila Skill Hub",
    description: "Skill learning, mock tests, interview prep, and certification tracking.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  billpay: {
    title: "Nila Utility Hub",
    description: "BBPS sandbox bill fetch/pay, reminders, saved billers, and receipt vault.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  freelancer: {
    title: "NilaWorks",
    description: "Digital freelancers, local services, instant hiring, and verified professionals.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  finance: {
    title: "Nila Finance Hub",
    description: "Loan guidance, EMI tools, institution compare, and finance support.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  localmarket: {
    title: "Local Market",
    description: "Shop from local vendors and fresh producers.",
    icon: "FaStore",
    isComingSoon: false,
  },
  hyperlocal: {
    title: "Nila Hyperlocal Delivery",
    description: "Grocery, pharmacy, food, and local pickup/drop with fast delivery workflows.",
    icon: "FaUtensils",
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

const ecosystemRoles = [
  { icon: "FaUser", label: "Users" },
  { icon: "FaStore", label: "Vendors" },
  { icon: "FaCar", label: "Drivers" },
  { icon: "FaStar", label: "Creators" },
  { icon: "FaBriefcase", label: "Businesses" },
];

const heroHighlights = [
  "One login for every core service",
  "Built for users, professionals, and businesses",
  "Simple start, powerful growth path",
];

const heroProofPoints = [
  { value: "10+", label: "Services" },
  { value: "Real-Time", label: "Platform" },
  { value: "Trusted", label: "Experience" },
];

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
    "Nila Finance Hub": "finance",
    NilaWorks: "freelancer",
    "Nila Utility Hub": "billpay",
    "Nila Skill Hub": "skilllearning",
    Feastly: "fooddelivery",
    "Nila Hyperlocal Delivery": "hyperlocal",
    "Local Market": "localmarket",
    SwiftRide: "ridesharing",
    SoulMatch: "matrimonial",
    VibeHub: "socialmedia",
    "ReminderAlert - Todo List": "reminderalert",
    "SOS Safety Center": "sosalert",
    MyDiary: "mydiary",
    AstroNila: "astrology",
  };

  const filteredFeatures = launch.features.filter(([name]) =>
    enabledModules.includes(moduleMapping[name])
  );
  const visibleModuleIds = new Set(
    filteredFeatures.map(([name]) => moduleMapping[name]).filter(Boolean)
  );
  const missingEnabledFeatures = Object.entries(moduleFallbacks)
    .filter(
      ([moduleId]) => enabledModules.includes(moduleId) && !visibleModuleIds.has(moduleId)
    )
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

  const renderIcon = (iconName, className = "feature-icon") => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  const handleExploreServices = () => {
    document.getElementById("features-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
          <div className="hero-highlights" aria-label="Platform highlights">
            {heroHighlights.map((item) => (
              <span key={item} className="hero-highlight-pill">
                <FaCheckCircle className="hero-highlight-icon" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
          <div className="hero-proof-strip" aria-label="Quick platform proof">
            {heroProofPoints.map((point) => (
              <div className="hero-proof-item" key={point.label}>
                <span className="hero-proof-value">{point.value}</span>
                <span className="hero-proof-label">{point.label}</span>
              </div>
            ))}
          </div>

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

      <section className="launch-features" id="features-section" aria-labelledby="features-heading">
        <div className="launch-section-heading">
          <p>{launch.featuresLabel}</p>
          <h2 id="features-heading">{launch.featuresTitle}</h2>
          <span className="section-subtitle">Choose any module to enter directly.</span>
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
                  : onSelectRegistrationType(
                      "login",
                      feature.moduleId || moduleMapping[feature.title]
                    ))
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
              ) : (
                <span className="feature-card-cta">Explore</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="ecosystem-flow" aria-labelledby="flow-heading">
        <div className="flow-container">
          <h2 id="flow-heading" className="flow-title">
            How NilaHub Works
          </h2>
          <p className="flow-subtitle">One platform connecting every role in your ecosystem</p>
          <div className="flow-visualization">
            <div className="flow-track">
              {ecosystemRoles.map((role, index) => (
                <React.Fragment key={role.label}>
                  <div className="flow-item">
                    <div className="flow-step">{renderIcon(role.icon, "flow-step-icon")}</div>
                    <div className="flow-text">{role.label}</div>
                  </div>
                  {index < ecosystemRoles.length - 1 ? (
                    <div className="flow-connector" aria-hidden="true">
                      <span className="flow-line" />
                      <span className="flow-arrow" />
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
          <p className="flow-conclusion">All connected. All earning. All growing together.</p>
        </div>
      </section>

      <section className="trust-indicators" aria-labelledby="trust-heading">
        <div className="trust-container">
          <h2 id="trust-heading" className="trust-title">
            Why Choose NilaHub
          </h2>
          <p className="section-subtitle">Designed to feel simple for users and strong for growth.</p>
          <div className="trust-grid">
            <div className="trust-item">
              <span className="trust-check">
                <FaCheckCircle aria-hidden="true" />
              </span>
              <span className="trust-text">Multi-Service Platform</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">
                <FaCheckCircle aria-hidden="true" />
              </span>
              <span className="trust-text">AI-Powered Features</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">
                <FaCheckCircle aria-hidden="true" />
              </span>
              <span className="trust-text">Secure Authentication</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">
                <FaCheckCircle aria-hidden="true" />
              </span>
              <span className="trust-text">Real-Time Infrastructure</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">
                <FaCheckCircle aria-hidden="true" />
              </span>
              <span className="trust-text">Verified Ecosystem</span>
            </div>
            <div className="trust-item">
              <span className="trust-check">
                <FaCheckCircle aria-hidden="true" />
              </span>
              <span className="trust-text">Global Ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="launch-cta" aria-labelledby="cta-heading">
        <div className="cta-container">
          <p className="cta-kicker">Ready to Experience the NilaHub Ecosystem?</p>
          <h2 id="cta-heading">Launch your journey across Kerala&apos;s growing digital super platform.</h2>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-button cta-primary"
              onClick={() => onSelectRegistrationType("user")}
            >
              Launch Your Journey
            </button>
            <button
              type="button"
              className="cta-button cta-secondary"
              onClick={handleExploreServices}
            >
              Explore the Ecosystem
            </button>
          </div>
          <p className="cta-subnote">Built for everyday users, professionals, creators, and businesses.</p>
        </div>
      </section>
    </main>
  );
};

export default LaunchPage;
