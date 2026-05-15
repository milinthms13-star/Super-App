import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import useI18n from "../hooks/useI18n";
import { getPathForModule, getProtectedModuleFromPathname } from "../utils/moduleRoutes";
import GlobalSearch from "./GlobalSearch";
import "../styles/NavigationEnhanced.css";
import "../styles/PlatformPolish.css";

const ALWAYS_VISIBLE_MODULE_IDS = new Set(["dashboard"]);
const USER_IMAGE_KEYS = ["photoURL", "avatar", "photo", "profileImage", "picture"];
const MODULE_ID_ALIASES = {
  quicklink: "quicklinks",
  "quick-links": "quicklinks",
  mydiary: "diary",
  personaldiary: "diary",
  map: "maps",
};

const normalizeModuleId = (moduleId) => {
  const normalizedId = String(moduleId || "").trim().toLowerCase();
  return MODULE_ID_ALIASES[normalizedId] || normalizedId;
};

const isImageLikeUrl = (value) =>
  typeof value === "string" &&
  /^(https?:\/\/|data:image\/|blob:)/i.test(value.trim());

// Module categories for organized navigation
const MODULE_CATEGORIES = {
  commerce: {
    label: "Commerce",
    icon: "🛍️",
    modules: ["ecommerce", "classifieds", "localmarket"],
  },
  social: {
    label: "Social",
    icon: "👥",
    modules: ["messaging", "socialmedia", "matrimonial"],
  },
  services: {
    label: "Services",
    icon: "🚗",
    modules: ["fooddelivery", "tourism", "devadarshan", "hyperlocal", "localservices", "nilaaihub", "gulfservices", "hotelbooking", "healthcare", "education", "businessbuilder", "ridesharing", "realestate", "finance", "freelancer", "maps", "diary", "resumebuilder", "photostudio", "karaokeduet", "beautyai", "kitchen", "aibusinessos", "gulfjobsmigration", "womensafetyfamily", "devotionalecosystem", "hyperlocalaicommerce", "nilaaistudio", "trustlayer"],
  },
  utilities: {
    label: "Utilities",
    icon: "⚙️",
    modules: ["billpay", "skilllearning", "diary", "reminderalert", "quicklinks", "astrology", "sosalert", "support"],
  },
};

const Navigation = ({ onLogout, loggedInUser, enabledModules = [] }) => {
  const { currentUser, cart } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const moreMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const displayUser = loggedInUser || currentUser;
  const profileImageSrc =
    USER_IMAGE_KEYS.map((key) => displayUser?.[key]).find(isImageLikeUrl) || "";
  const displayName =
    displayUser?.name ||
    displayUser?.username ||
    displayUser?.email ||
    "User";
  const avatarFallback =
    displayUser?.avatar && !isImageLikeUrl(displayUser.avatar)
      ? displayUser.avatar
      : displayName?.[0]?.toUpperCase() || "U";
  const isAdmin = displayUser?.role === "admin" || displayUser?.registrationType === "admin";
  const isSeller =
    displayUser?.registrationType === "entrepreneur" || displayUser?.role === "business";
  const defaultHomeModule = isAdmin ? "admin-dashboard" : "dashboard";
  const currentModule = getProtectedModuleFromPathname(location.pathname) || defaultHomeModule;
  const subscribedCategoryIds = (displayUser?.selectedBusinessCategories || [])
    .map((category) => normalizeModuleId(category?.id))
    .filter(Boolean);
  const enabledModuleIds = new Set(
    (Array.isArray(enabledModules) ? enabledModules : [])
      .map((moduleId) => normalizeModuleId(moduleId))
      .filter(Boolean)
  );
  const cartItemCount = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);

  const allBusinessModules = [
    { id: "dashboard", label: isSeller ? "Seller Dashboard" : t("modules.dashboard", "Dashboard"), icon: "📊" },
    { id: "ecommerce", label: t("modules.ecommerce", "GlobeMart"), icon: "🛍️" },
    { id: "messaging", label: t("modules.messaging", "LinkUp"), icon: "💬" },
    { id: "classifieds", label: t("modules.classifieds", "TradePost"), icon: "📋" },
    { id: "realestate", label: t("modules.realestate", "HomeSphere"), icon: "🏠" },
    { id: "finance", label: t("modules.finance", "Nila Finance Hub"), icon: "💰", sellerVisible: true },
    { id: "freelancer", label: t("modules.freelancer", "NilaWorks"), icon: "W", sellerVisible: true },
    { id: "billpay", label: t("modules.billpay", "Nila Utility Hub"), icon: "B", sellerVisible: true },
    { id: "skilllearning", label: t("modules.skilllearning", "Nila Skill Hub"), icon: "K", sellerVisible: true },
    { id: "tourism", label: t("modules.tourism", "NilaTravel"), icon: "T", sellerVisible: true },
    { id: "fooddelivery", label: t("modules.fooddelivery", "Feastly"), icon: "🍽️" },
    { id: "devadarshan", label: t("modules.devadarshan", "Devadarshan"), icon: "DV", sellerVisible: true },
    { id: "hyperlocal", label: t("modules.hyperlocal", "Nila Hyperlocal Delivery"), icon: "HD", sellerVisible: true },
    { id: "localservices", label: t("modules.localservices", "Local Services Marketplace"), icon: "LS", sellerVisible: true },
    { id: "nilaaihub", label: t("modules.nilaaihub", "Nila AI Hub"), icon: "🤖" },
    { id: "kidsstoryvideomaker", label: t("modules.kidsstoryvideomaker", "AI Kids Story Video Generator"), icon: "🎬" },
    { id: "gulfservices", label: t("modules.gulfservices", "Gulf Services"), icon: "🌍" },
    { id: "hotelbooking", label: t("modules.hotelbooking", "NilaStay"), icon: "🏨" },
    { id: "healthcare", label: t("modules.healthcare", "NilaCare"), icon: "🏥" },
    { id: "bustrainbooking", label: t("modules.bustrainbooking", "NilaTravel Bus/Train"), icon: "🚆" },
    { id: "resumebuilder", label: t("modules.resumebuilder", "AI Resume Builder"), icon: "📄" },
    { id: "photostudio", label: t("modules.photostudio", "Photo Studio AI + AR"), icon: "PS", sellerVisible: true },
    { id: "karaokeduet", label: t("modules.karaokeduet", "Remote Karaoke Duet"), icon: "KD", sellerVisible: true },
    { id: "beautyai", label: t("modules.beautyai", "Nila Beauty AI"), icon: "BA", sellerVisible: true },
    { id: "kitchen", label: t("modules.kitchen", "Smart Kitchen & Recipe Hub"), icon: "KH", sellerVisible: true },
    { id: "aibusinessos", label: t("modules.aibusinessos", "AI Business Operating System"), icon: "OS", sellerVisible: true },
    { id: "gulfjobsmigration", label: t("modules.gulfjobsmigration", "Kerala + Gulf Jobs Migration"), icon: "GM", sellerVisible: true },
    { id: "womensafetyfamily", label: t("modules.womensafetyfamily", "Women Safety + Family Protection"), icon: "SF", sellerVisible: true },
    { id: "devotionalecosystem", label: t("modules.devotionalecosystem", "Devotional Ecosystem"), icon: "DE", sellerVisible: true },
    { id: "hyperlocalaicommerce", label: t("modules.hyperlocalaicommerce", "Hyperlocal AI Commerce"), icon: "HC", sellerVisible: true },
    { id: "nilaaistudio", label: t("modules.nilaaistudio", "Nila AI Studio"), icon: "NS", sellerVisible: true },
    { id: "trustlayer", label: t("modules.trustlayer", "Trust Layer"), icon: "TL", sellerVisible: true },
    { id: "businessservices", label: t("modules.businessservices", "Business Services Hub"), icon: "💼" },
    { id: "jobportal", label: t("modules.jobportal", "NilaJobs"), icon: "🔎" },
    { id: "localmarket", label: t("modules.localmarket", "Local Market"), icon: "🏪" },
    { id: "businessbuilder", label: t("modules.businessbuilder", "AI Business Builder"), icon: "🚀", sellerVisible: true },
    { id: "ridesharing", label: t("modules.ridesharing", "SwiftRide"), icon: "🚗" },
    { id: "maps", label: t("modules.maps", "Maps"), icon: "🗺️", sellerVisible: true },
    { id: "matrimonial", label: t("modules.matrimonial", "SoulMatch"), icon: "💕" },
    { id: "socialmedia", label: t("modules.socialmedia", "VibeHub"), icon: "🌐" },
    { id: "diary", label: t("modules.diary", "My Diary"), icon: "📔" },
    { id: "reminderalert", label: t("modules.reminderalert", "ReminderAlert - Todo List"), icon: "⏰" },
    { id: "quicklinks", label: t("modules.quicklinks", "Quick Links"), icon: "🔗" },
    { id: "sosalert", label: t("modules.sosalert", "SOS Safety Center"), icon: "🆘" },
    { id: "astrology", label: t("modules.astrology", "AstroNila"), icon: "✨" },
    { id: "support", label: t("modules.support", "Support"), icon: "🛟", sellerVisible: true },
    { id: "voicefriend", label: t("modules.voicefriend", "AI Voice Friend"), icon: "🎙️" },
  ];
  const isModuleVisible = (moduleId) =>
    ALWAYS_VISIBLE_MODULE_IDS.has(moduleId) || enabledModuleIds.has(moduleId);

  const modules = isAdmin
    ? [
        { id: "admin-dashboard", label: t("modules.admin", "Admin Dashboard") },
        ...allBusinessModules,
      ]
    : allBusinessModules.filter(
        (module) =>
          isModuleVisible(module.id) &&
          (!isSeller ||
            module.id === "dashboard" ||
            module.sellerVisible === true ||
            subscribedCategoryIds.includes(module.id))
      );
  const showSosButton = enabledModuleIds.has("sosalert");

  useEffect(() => {
    setIsSidebarOpen(false);
    setShowUserMenu(false);
    setShowMoreMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profileImageSrc]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;

      const clickedInsideMore = moreMenuRef.current?.contains(target);
      const clickedInsideUser = userMenuRef.current?.contains(target);

      if (showMoreMenu && !clickedInsideMore) {
        setShowMoreMenu(false);
      }
      if (showUserMenu && !clickedInsideUser) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("touchstart", handleOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("touchstart", handleOutsideClick, true);
    };
  }, [showMoreMenu, showUserMenu]);

  useEffect(() => {
    const widget = document.getElementById("google_translate_element");
    if (!widget) {
      return;
    }

    if (isTranslateOpen) {
      widget.classList.add("visible");
      setTimeout(() => {
        const select = widget.querySelector(".goog-te-combo");
        if (select) {
          select.focus();
        }
      }, 100);
    } else {
      widget.classList.remove("visible");
    }
  }, [isTranslateOpen]);

  const handleModuleClick = (moduleId) => {
    navigate(getPathForModule(moduleId, getPathForModule(defaultHomeModule)));
    setIsSidebarOpen(false);
    setShowMoreMenu(false);
    setShowUserMenu(false);
  };

  const handleMoreToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowMoreMenu((prev) => !prev);
    setShowUserMenu(false);
  };

  // Get modules to show in primary nav (limit 5) and rest in "More" dropdown
  const getPrimaryNavModules = () => {
    const primaryCount = isMobile ? 3 : 5;
    return modules.slice(0, primaryCount);
  };

  const getMoreNavModules = () => {
    const primaryCount = isMobile ? 3 : 5;
    return modules.slice(primaryCount);
  };

  const getCategorizedModules = () => {
    const moreModules = getMoreNavModules();
    const categorized = {};

    Object.entries(MODULE_CATEGORIES).forEach(([catKey, catData]) => {
      categorized[catKey] = {
        label: catData.label,
        icon: catData.icon,
        modules: moreModules.filter((m) =>
          catData.modules.includes(m.id)
        ),
      };
    });

    return Object.entries(categorized).filter(([_, catData]) => catData.modules.length > 0);
  };
  const moreNavModules = getMoreNavModules();
  const categorizedMoreModules = getCategorizedModules();

  const handleSOSButtonClick = () => {
    if (!showSosButton) {
      return;
    }

    navigate(getPathForModule("sosalert", getPathForModule(defaultHomeModule)));
    setIsSidebarOpen(false);

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("malabarbazaar:sos-requested"));
    }, currentModule === "sosalert" ? 0 : 150);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-top-row">
            <div
              className="nav-logo"
              onClick={() => handleModuleClick(defaultHomeModule)}
            >
              <img src="/logo.svg" alt="NilaHub Logo" className="logo-image" />
              <span>NilaHub</span>
            </div>

            <GlobalSearch />

            <div className="nav-right">
              {showSosButton && (
                <button
                  type="button"
                  className="sos-alert-button"
                  onClick={handleSOSButtonClick}
                  title="Emergency SOS - triggers immediate help"
                >
                  SOS
                </button>
              )}
              <button
                type="button"
                className="translate-button polished"
                onClick={() => setIsTranslateOpen((prev) => !prev)}
                title={t("navigation.translate", "Translate this page")}
              >
                {t("navigation.translate", "Translate")}
              </button>
              <div
                className="user-profile"
                ref={userMenuRef}
                onClick={(event) => {
                  event.stopPropagation();
                  setShowUserMenu((prev) => !prev);
                  setShowMoreMenu(false);
                }}
              >
                <span className="user-avatar">
                  {profileImageSrc && !avatarLoadError ? (
                    <img
                      src={profileImageSrc}
                      alt={displayName}
                      className="avatar-image"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    avatarFallback
                  )}
                </span>
                <span className="user-name">{displayName}</span>
                <span className="dropdown-icon">v</span>

                {showUserMenu && (
                  <div className="user-menu" onClick={(event) => event.stopPropagation()}>
                    <div className="user-menu-item">
                      <strong>{displayUser.email}</strong>
                    </div>
                    <div className="user-menu-item">
                      <span>
                        {isAdmin
                          ? t("navigation.adminAccess", "Admin access")
                          : isSeller
                            ? "Seller access"
                            : t("navigation.businessAccess", "Business access")}
                      </span>
                    </div>
                    <button 
                      className="profile-btn"
                      onClick={() => {
                        navigate("/profile");
                        setShowUserMenu(false);
                      }}
                    >
                      {t("common.profile", "Profile")}
                    </button>
                    <button className="logout-btn" onClick={onLogout}>
                      {t("common.logout", "Logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="nav-bottom-row">
            <button className="hamburger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {t("common.menu", "Menu")}
            </button>

            <div className="nav-menu-wrapper">
              <div className="nav-menu" aria-label="Primary navigation">
                {getPrimaryNavModules().map((module) => (
                  <button
                    key={module.id}
                    className={`nav-link polished ${currentModule === module.id ? "nav-link-active" : ""}`}
                    onClick={() => handleModuleClick(module.id)}
                    aria-current={currentModule === module.id ? "page" : undefined}
                  >
                    {module.label}
                  </button>
                ))}

                {moreNavModules.length > 0 && (
                  <div className="nav-more-wrapper" ref={moreMenuRef} onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className={`nav-more-btn polished ${showMoreMenu ? "active" : ""}`}
                      onClick={handleMoreToggle}
                      title="View more modules"
                      aria-expanded={showMoreMenu}
                      aria-haspopup="menu"
                    >
                      <span>More</span>
                      <span className="more-indicator">▼</span>
                    </button>

                    {showMoreMenu && (
                      <div className="nav-categories-dropdown" role="menu" onClick={(event) => event.stopPropagation()}>
                      {categorizedMoreModules.map(([catKey, catData]) => (
                        <div key={catKey} className="nav-categories-group">
                          <div className="nav-category-header">
                            <span className="nav-category-header-icon">{catData.icon}</span>
                            {catData.label}
                          </div>
                          {catData.modules.map((module) => (
                            <button
                              key={module.id}
                              type="button"
                              className={`nav-category-link ${
                                currentModule === module.id ? "active" : ""
                              }`}
                              onClick={() => handleModuleClick(module.id)}
                            >
                              <span className="nav-category-icon">
                                {module.icon || "•"}
                              </span>
                              <span>{module.label}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                      {moreNavModules.length > 0 && (
                        <div className="nav-categories-group">
                          <div className="nav-category-header">
                            <span className="nav-category-header-icon">✦</span>
                            All Modules
                          </div>
                          {moreNavModules.map((module) => (
                            <button
                              key={`all-${module.id}`}
                              type="button"
                              className={`nav-category-link ${
                                currentModule === module.id ? "active" : ""
                              }`}
                              onClick={() => handleModuleClick(module.id)}
                            >
                              <span className="nav-category-icon">{module.icon || "•"}</span>
                              <span>{module.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {moreNavModules.length === 0 && (
                        <div className="nav-empty-state">
                          No additional modules enabled
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </nav>

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>NilaHub</h3>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>
            {t("common.close", "Close")}
          </button>
        </div>
        <div className="sidebar-menu">
          {modules.map((module) => (
            <button
              key={module.id}
              className={`sidebar-link ${currentModule === module.id ? "sidebar-link-active" : ""}`}
              onClick={() => handleModuleClick(module.id)}
              aria-current={currentModule === module.id ? "page" : undefined}
            >
              {module.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navigation;


