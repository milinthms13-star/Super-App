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
  FaHotel,
  FaHeartbeat,
  FaBus,
  FaFileAlt,
  FaBuilding,
  FaRocket,
  FaShieldAlt,
  FaGlobeAsia,
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
  FaHotel,
  FaHeartbeat,
  FaBus,
  FaFileAlt,
  FaBuilding,
  FaRocket,
  FaShieldAlt,
  FaGlobeAsia,
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
  tourism: {
    title: "NilaTravel",
    description: "Kerala tourism marketplace for curated packages, custom trips, and local experiences.",
    icon: "FaCar",
    isComingSoon: false,
  },
  gulfservices: {
    title: "Gulf Services",
    description: "Complete Gulf support hub for visas, jobs, travel, attestation, and returnee services.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  hotelbooking: {
    title: "NilaStay",
    description: "Book verified hotels and homestays across Kerala with direct contact, WhatsApp booking, and local support.",
    icon: "FaHotel",
    isComingSoon: false,
  },
  healthcare: {
    title: "NilaCare",
    description: "Complete healthcare ecosystem with doctor consultations, lab bookings, pharmacy delivery, health records, and emergency services.",
    icon: "FaHeartbeat",
    isComingSoon: false,
  },
  bustrainbooking: {
    title: "NilaTravel Bus/Train",
    description: "Book buses and trains across Kerala with IRCTC and KSRTC integration, PNR status tracking, fare comparison, and assisted booking.",
    icon: "FaBus",
    isComingSoon: false,
  },
  resumebuilder: {
    title: "AI Resume Builder",
    description: "AI-powered resume creation with ATS optimization, job-specific tailoring, cover letters, and interview preparation for global job markets.",
    icon: "FaFileAlt",
    isComingSoon: false,
  },
  photostudio: {
    title: "Photo Studio AI + AR",
    description: "Edit photos, apply filters, use AR camera effects, and run AI enhancements from one creator suite.",
    icon: "FaFileAlt",
    isComingSoon: false,
  },
  jobportal: {
    title: "NilaJobs",
    description: "Local + Gulf + IT + gig job portal with verified recruiters, smart apply, resume scoring, and employer dashboard.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  businessservices: {
    title: "Business Services Hub",
    description: "Complete business services hub with GST filing, company registration, legal consultation, digital marketing, and the 'Start Your Business in 7 Days' package for Kerala entrepreneurs.",
    icon: "FaBuilding",
    isComingSoon: false,
  },
  education: {
    title: "Education Ecosystem",
    description: "Online tuition, skill courses, student community, study abroad guidance, and scholarship finder.",
    icon: "FaBook",
    isComingSoon: false,
  },
  businessbuilder: {
    title: "AI Business Builder",
    description: "Create business profiles, invoices, and mini apps from one smart platform.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  nilaaihub: {
    title: "Nila AI Hub",
    description: "A conversational AI ecosystem for discovery, planning, travel, loans, and daily tasks.",
    icon: "FaBriefcase",
    isComingSoon: false,
  },
  kidsstoryvideomaker: {
    title: "AI Kids Story Video Generator",
    description: "Paste a story, choose language, and get a fun animated video with voice and subtitles.",
    icon: "FaStar",
    isComingSoon: false,
  },
  hyperlocal: {
    title: "Nila Hyperlocal Delivery",
    description: "Grocery, pharmacy, food, and local pickup/drop with fast delivery workflows.",
    icon: "FaUtensils",
    isComingSoon: false,
  },
  devadarshan: {
    title: "Devadarshan",
    description: "Temple vazhipadu, event booking, hall booking, donation receipts, and schedule tracking.",
    icon: "FaStar",
    isComingSoon: false,
  },
  localservices: {
    title: "Local Services Marketplace",
    description: "Book caterers, decorators, photographers, and complete local event service bundles.",
    icon: "FaBriefcase",
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
  aibusinessos: {
    title: "AI Business Operating System",
    description: "AI infrastructure for SMEs with billing, CRM, inventory, and growth automation.",
    icon: "FaBuilding",
    isComingSoon: false,
  },
  gulfjobsmigration: {
    title: "Kerala + Gulf Jobs Migration",
    description: "Verified migration workflows with document checks, visa tracking, and interview AI.",
    icon: "FaGlobeAsia",
    isComingSoon: false,
  },
  womensafetyfamily: {
    title: "Women Safety + Family Protection",
    description: "Trusted SOS, child and elderly care alerts, and safety-first family protection stack.",
    icon: "FaShieldAlt",
    isComingSoon: false,
  },
  devotionalecosystem: {
    title: "Devotional Ecosystem",
    description: "Temple booking, vazhipadu, festival alerts, donations, and pilgrimage planning.",
    icon: "FaStar",
    isComingSoon: false,
  },
  hyperlocalaicommerce: {
    title: "Hyperlocal AI Commerce",
    description: "AI-powered local shopping conversion with voice ordering, offers, and seller automation.",
    icon: "FaStore",
    isComingSoon: false,
  },
  nilaaistudio: {
    title: "Nila AI Studio",
    description: "AI creator platform for reels, dubbing, cartoons, avatars, and promo videos.",
    icon: "FaRocket",
    isComingSoon: false,
  },
  trustlayer: {
    title: "Trust Layer",
    description: "Verified users, trust scoring, fraud detection, reporting, and moderation architecture.",
    icon: "FaShieldAlt",
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

const launchPillars = [
  {
    icon: "FaRocket",
    title: "Faster Start",
    description: "Open modules in one tap with guided onboarding for users and businesses.",
  },
  {
    icon: "FaShieldAlt",
    title: "Trust Built-In",
    description: "Verified flows, role-based access, and moderation support across categories.",
  },
  {
    icon: "FaGlobeAsia",
    title: "Kerala to Global",
    description: "Built for local growth while staying ready for Gulf and global expansion.",
  },
];

const trustReasons = [
  "Multi-Service Platform",
  "AI-Powered Features",
  "Secure Authentication",
  "Real-Time Infrastructure",
  "Verified Ecosystem",
  "Global Ready",
];

const featureCategoryConfig = [
  { id: "core", label: "Core", subtitle: "Daily essentials for your superapp life." },
  { id: "travel", label: "Travel", subtitle: "Trips, stays, mobility, and location services." },
  { id: "business", label: "Business", subtitle: "Work, growth, hiring, and professional tools." },
  { id: "utility", label: "Utility", subtitle: "Payments, reminders, safety, and support systems." },
];

const moduleCategoryMap = {
  ecommerce: "core",
  messaging: "core",
  classifieds: "core",
  realestate: "core",
  socialmedia: "core",
  matrimonial: "core",
  localmarket: "core",
  localservices: "core",
  hyperlocal: "travel",
  tourism: "travel",
  hotelbooking: "travel",
  bustrainbooking: "travel",
  ridesharing: "travel",
  gulfservices: "travel",
  businessbuilder: "business",
  businessservices: "business",
  freelancer: "business",
  jobportal: "business",
  skilllearning: "business",
  education: "business",
  resumebuilder: "business",
  photostudio: "business",
  nilaaihub: "business",
  aibusinessos: "business",
  gulfjobsmigration: "business",
  hyperlocalaicommerce: "business",
  nilaaistudio: "business",
  trustlayer: "business",
  finance: "utility",
  billpay: "utility",
  fooddelivery: "utility",
  healthcare: "utility",
  womensafetyfamily: "utility",
  devotionalecosystem: "utility",
  reminderalert: "utility",
  sosalert: "utility",
  devadarshan: "utility",
  astrology: "utility",
  mydiary: "utility",
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
    "Nila Finance Hub": "finance",
    NilaWorks: "freelancer",
    "Nila Utility Hub": "billpay",
    "Nila Skill Hub": "skilllearning",
    Feastly: "fooddelivery",
    Devadarshan: "devadarshan",
    "Nila Hyperlocal Delivery": "hyperlocal",
    "Local Services Marketplace": "localservices",
    "Local Market": "localmarket",
    NilaTravel: "tourism",
    "Gulf Support Hub": "gulfservices",
    NilaStay: "hotelbooking",
    NilaCare: "healthcare",
    "NilaTravel Bus/Train": "bustrainbooking",
    "AI Resume Builder": "resumebuilder",
    "Photo Studio AI + AR": "photostudio",
    "NilaJobs": "jobportal",
    "Business Services Hub": "businessservices",
    "Nila AI Hub": "nilaaihub",
    "Nila Kids Story Video Maker": "kidsstoryvideomaker",
    "AI Business Operating System": "aibusinessos",
    "Kerala + Gulf Jobs Migration": "gulfjobsmigration",
    "Women Safety + Family Protection": "womensafetyfamily",
    "Devotional Ecosystem": "devotionalecosystem",
    "Hyperlocal AI Commerce": "hyperlocalaicommerce",
    "Nila AI Studio": "nilaaistudio",
    "Trust Layer": "trustlayer",
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

  const resolveFeatureCategory = (feature) => {
    if (feature.type === "external") {
      return "utility";
    }
    return moduleCategoryMap[feature.moduleId] || "core";
  };

  const groupedFeatureCards = featureCategoryConfig
    .map((category) => ({
      ...category,
      items: featureCards.filter((feature) => resolveFeatureCategory(feature) === category.id),
    }))
    .filter((category) => category.items.length > 0);

  const activeModuleCount = featureCards.filter(
    (feature) => feature.type === "module" && !feature.isComingSoon
  ).length;
  const externalLinkCount = featureCards.filter((feature) => feature.type === "external").length;
  const spotlightModules = featureCards
    .filter((feature) => feature.type === "module" && !feature.isComingSoon)
    .slice(0, 4);
  const heroProofPoints = [
    { value: `${Math.max(activeModuleCount, 18)}+`, label: "Modules" },
    { value: "Real-Time", label: "Platform" },
    { value: "Trusted", label: "Experience" },
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
          <div className="launch-hero-grid">
            <div className="launch-hero-main">
              <img src="/logo.svg" alt="NilaHub" className="launch-logo" />
              <p className="launch-eyebrow">{launch.brand}</p>
              <h1>{launch.title}</h1>
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
            </div>

            <aside className="hero-spotlight-panel" aria-label="Launch overview">
              <p className="hero-spotlight-kicker">Platform at a glance</p>
              <div className="hero-spotlight-metrics">
                <div className="hero-spotlight-metric">
                  <strong>{activeModuleCount}+</strong>
                  <span>Live modules</span>
                </div>
                <div className="hero-spotlight-metric">
                  <strong>{ecosystemRoles.length}</strong>
                  <span>Role journeys</span>
                </div>
                <div className="hero-spotlight-metric">
                  <strong>{externalLinkCount}</strong>
                  <span>Custom links</span>
                </div>
              </div>
              <div className="hero-spotlight-list">
                {spotlightModules.map((feature) => (
                  <div key={feature.key} className="hero-spotlight-item">
                    <span className="hero-spotlight-icon-wrap">
                      {feature.icon ? renderIcon(feature.icon, "hero-spotlight-icon") : null}
                    </span>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

        </div>
      </section>

      <section className="launch-features" id="features-section" aria-labelledby="features-heading">
        <div className="launch-section-heading">
          <p>{launch.featuresLabel}</p>
          <h2 id="features-heading">{launch.featuresTitle}</h2>
          <span className="section-subtitle">Choose any module to enter directly.</span>
        </div>

        <div className="feature-groups">
          {groupedFeatureCards.map((group) => (
            <article className={`feature-group feature-group-${group.id}`} key={group.id}>
              <header className="feature-group-header">
                <h3>{group.label}</h3>
                <span>{group.items.length} modules</span>
              </header>
              <p className="feature-group-subtitle">{group.subtitle}</p>
              <div className="feature-grid" data-group={group.id}>
                {group.items.map((feature) => (
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
                    {feature.icon ? renderIcon(feature.icon) : <FaGlobeAsia className="feature-icon" />}
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
            </article>
          ))}
        </div>
      </section>

      <section className="launch-compact-overview" aria-labelledby="compact-overview-heading">
        <div className="launch-section-heading">
          <p>Quick Overview</p>
          <h2 id="compact-overview-heading">How NilaHub Works in One View</h2>
          <span className="section-subtitle">Everything important, without long scrolling.</span>
        </div>
        <div className="compact-overview-grid">
          <article className="compact-block">
            <h3>Role Flow</h3>
            <p>One platform connecting all key participants.</p>
            <div className="compact-role-pills">
              {ecosystemRoles.map((role) => (
                <span className="compact-role-pill" key={role.label}>
                  {renderIcon(role.icon, "compact-role-icon")}
                  {role.label}
                </span>
              ))}
            </div>
          </article>
          <article className="compact-block">
            <h3>Launch Advantage</h3>
            <p>Built to convert faster and scale confidently.</p>
            <div className="compact-pillar-list">
              {launchPillars.map((pillar) => (
                <div className="compact-pillar-item" key={pillar.title}>
                  <span className="compact-pillar-icon">{renderIcon(pillar.icon, "compact-pillar-svg")}</span>
                  <div>
                    <strong>{pillar.title}</strong>
                    <span>{pillar.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className="compact-trust-strip" aria-label="Why choose NilaHub">
          {trustReasons.map((reason) => (
            <span className="compact-trust-pill" key={reason}>
              <FaCheckCircle aria-hidden="true" />
              {reason}
            </span>
          ))}
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
