import React, { useMemo, useRef, useState, useEffect } from "react";
import DashboardWebSocketClient from "../websocket/dashboardWebSocketClient";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import useI18n from "../hooks/useI18n";
import { formatCurrency } from "../utils/ecommerceHelpers";
import { getPathForModule } from "../utils/moduleRoutes";
import EnhancedHeroSection from "../components/EnhancedHeroSection";
import EcosystemVisualization from "../components/EcosystemVisualization";
import PersonalizedActivityFeed from "../components/PersonalizedActivityFeed";
import RecommendedServices from "../components/RecommendedServices";
import EngagementScore from "../components/EngagementScore";
import ScrollAnimationObserver from "../components/ScrollAnimationObserver";
import "../styles/DashboardEnhanced.css";
import "../styles/AdvancedAnimations.css";
import "../styles/Phase6Enhancements.css";
import "../styles/MicroInteractionsPolish.css";
import "../styles/Phase6bPolishRefinements.css";
import "../styles/Phase6bComponentPolish.css";
import "../styles/PlatformPolish.css";
import "../styles/DashboardFinalPolish.css";

const normalizeOrderStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!normalizedStatus || normalizedStatus === "paid" || normalizedStatus === "cash on delivery") {
    return "Confirmed";
  }

  if (normalizedStatus === "packed") {
    return "Packed";
  }

  if (normalizedStatus === "shipped") {
    return "Shipped";
  }

  if (normalizedStatus === "delivered") {
    return "Delivered";
  }

  return "Confirmed";
};

const isReturnedForReview = (product) =>
  product?.approvalStatus === "pending" && Boolean(product?.moderationNote?.trim());

const Icon = ({ type, className = "" }) => {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (type) {
    case "cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M3 4h2l2.5 11h10.5l2-8H6.2" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5" />
          <path d="M10 12h6M10 16h6" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "ecommerce":
      return (
        <svg {...common}>
          <path d="M3 5h2l2 10h10l2-7H7" />
          <circle cx="10" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      );
    case "messaging":
      return (
        <svg {...common}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
        </svg>
      );
    case "classifieds":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "realestate":
      return (
        <svg {...common}>
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10.5V20h14v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "finance":
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M16.5 6.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" />
        </svg>
      );
    case "freelancer":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M9 5V3h6v2" />
          <path d="M4 10h16" />
        </svg>
      );
    case "billpay":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h5" />
          <path d="M16 4v4h4" />
        </svg>
      );
    case "skilllearning":
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4z" />
          <path d="M8 10h8M8 14h5" />
          <path d="M12 6V4" />
        </svg>
      );
    case "fooddelivery":
      return (
        <svg {...common}>
          <path d="M7 4v8M10 4v8M7 8h3" />
          <path d="M14 4v16" />
          <path d="M17 4c1.7 2 1.7 6 0 8" />
        </svg>
      );
    case "devadarshan":
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M6 20V10h12v10" />
          <path d="M12 4 4 10h16L12 4Z" />
          <path d="M10 14h4" />
        </svg>
      );
    case "localservices":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
          <circle cx="16.5" cy="16.5" r="1.5" />
        </svg>
      );
    case "hyperlocal":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="13" rx="2" />
          <path d="M8 6V4h8v2" />
          <path d="M9 11h6M9 15h4" />
        </svg>
      );
    case "ridesharing":
      return (
        <svg {...common}>
          <path d="M6 16h12l-1.5-6a2 2 0 0 0-2-1.5H9.5a2 2 0 0 0-2 1.5z" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
          <path d="M6 13h12" />
        </svg>
      );
    case "matrimonial":
      return (
        <svg {...common}>
          <path d="M12 20s-6-3.7-6-8.5A3.5 3.5 0 0 1 12 9a3.5 3.5 0 0 1 6 2.5C18 16.3 12 20 12 20Z" />
        </svg>
      );
    case "socialmedia":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "reminderalert":
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M6 9a6 6 0 1 1 12 0c0 2.4.8 3.8 2 5H4c1.2-1.2 2-2.6 2-5Z" />
        </svg>
      );
    case "quicklinks":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "sosalert":
      return (
        <svg {...common}>
          <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
          <path d="M12 8v6" />
          <path d="M9 11h6" />
        </svg>
      );
  case "localmarket":
      return (
        <svg {...common}>
          <path d="M3 5h2l2 10h10l2-7H7" />
          <circle cx="10" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      );
case "astrology":
      return (
        <svg {...common}>
          <path d="M12 2v20M2 12h20" />
          <path d="M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 18.36l1.42-1.42M18.36 4.22l1.42-1.42" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  case "external":
      return (
        <svg {...common}>
          <path d="M14 5h5v5" />
          <path d="M10 14 19 5" />
          <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
};

const MODULE_CONFIG = [
  {
    id: "ecommerce",
    nameKey: "modules.ecommerce",
    fallbackName: "GlobeMart",
    icon: "ecommerce",
    descriptionKey: "dashboard.moduleDescriptions.ecommerce",
    fallbackDescription: "Global marketplace for products, daily needs, fashion, and electronics",
    stats: "2.1M+ Products",
    gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
    emoji: "🛍️",
  },
  {
    id: "messaging",
    nameKey: "modules.messaging",
    fallbackName: "LinkUp",
    icon: "messaging",
    descriptionKey: "dashboard.moduleDescriptions.messaging",
    fallbackDescription: "Real-time messaging for customers, sellers, and service providers",
    stats: "340K+ Chats",
    gradient: "linear-gradient(135deg, #4ECDC4 0%, #44A5C2 100%)",
    emoji: "💬",
  },
  {
    id: "classifieds",
    nameKey: "modules.classifieds",
    fallbackName: "TradePost",
    icon: "classifieds",
    descriptionKey: "dashboard.moduleDescriptions.classifieds",
    fallbackDescription: "Trusted listings for buying, selling, and discovering deals",
    stats: "850K+ Listings",
    gradient: "linear-gradient(135deg, #F39C12 0%, #E67E22 100%)",
    emoji: "📋",
  },
  {
    id: "realestate",
    nameKey: "modules.realestate",
    fallbackName: "HomeSphere",
    icon: "realestate",
    descriptionKey: "dashboard.moduleDescriptions.realestate",
    fallbackDescription: "Explore homes, rentals, land, and commercial spaces",
    stats: "185K+ Properties",
    gradient: "linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)",
    emoji: "🏠",
  },
  {
    id: "finance",
    nameKey: "modules.finance",
    fallbackName: "Nila Finance Hub",
    icon: "finance",
    descriptionKey: "dashboard.moduleDescriptions.finance",
    fallbackDescription: "Loan guidance, institution marketplace, EMI planning, and financial support connectivity",
    stats: "85K+ Finance Leads",
    gradient: "linear-gradient(135deg, #0F766E 0%, #115E59 45%, #1D4ED8 100%)",
    emoji: "💰",
  },
  {
    id: "freelancer",
    nameKey: "modules.freelancer",
    fallbackName: "NilaWorks",
    icon: "freelancer",
    descriptionKey: "dashboard.moduleDescriptions.freelancer",
    fallbackDescription: "Digital freelancers, local service booking, instant hiring, and verified professional ecosystem",
    stats: "120K+ Service Requests",
    gradient: "linear-gradient(135deg, #0A2342 0%, #164E63 55%, #1D4ED8 100%)",
    emoji: "W",
  },
  {
    id: "billpay",
    nameKey: "modules.billpay",
    fallbackName: "Nila Utility Hub",
    icon: "billpay",
    descriptionKey: "dashboard.moduleDescriptions.billpay",
    fallbackDescription: "Utility bill fetch and pay, reminders, saved billers, and receipt vault with BBPS sandbox architecture",
    stats: "210K+ Utility Events",
    gradient: "linear-gradient(135deg, #0B2545 0%, #134E4A 55%, #1D4ED8 100%)",
    emoji: "B",
  },
  {
    id: "skilllearning",
    nameKey: "modules.skilllearning",
    fallbackName: "Nila Skill Hub",
    icon: "skilllearning",
    descriptionKey: "dashboard.moduleDescriptions.skilllearning",
    fallbackDescription: "Learning platform with courses, mock tests, certification wallet, and AI career guidance",
    stats: "300K+ Learning Actions",
    gradient: "linear-gradient(135deg, #1E1B4B 0%, #0F4C81 55%, #0EA5A7 100%)",
    emoji: "K",
  },
  {
    id: "fooddelivery",
    nameKey: "modules.fooddelivery",
    fallbackName: "Feastly",
    icon: "fooddelivery",
    descriptionKey: "dashboard.moduleDescriptions.fooddelivery",
    fallbackDescription: "Restaurant discovery and food delivery made simple",
    stats: "156K Deliveries",
    gradient: "linear-gradient(135deg, #FF5252 0%, #FF6B5B 100%)",
    emoji: "🍽️",
  },
  {
    id: "devadarshan",
    nameKey: "modules.devadarshan",
    fallbackName: "Devadarshan",
    icon: "devadarshan",
    descriptionKey: "dashboard.moduleDescriptions.devadarshan",
    fallbackDescription: "Temple vazhipadu, event and hall booking with donation receipts and Kerala-focused workflows.",
    stats: "42K+ Temple Bookings",
    gradient: "linear-gradient(135deg, #0F4C81 0%, #1E3A8A 45%, #0EA5A7 100%)",
    emoji: "DV",
  },
  {
    id: "localservices",
    nameKey: "modules.localservices",
    fallbackName: "Local Services Marketplace",
    icon: "localservices",
    descriptionKey: "dashboard.moduleDescriptions.localservices",
    fallbackDescription: "Find and book local caterers, decorators, photographers, and full event service packages.",
    stats: "68K+ Service Leads",
    gradient: "linear-gradient(135deg, #0A2342 0%, #0F766E 48%, #1D4ED8 100%)",
    emoji: "LS",
  },
  {
    id: "hyperlocal",
    nameKey: "modules.hyperlocal",
    fallbackName: "Nila Hyperlocal Delivery",
    icon: "hyperlocal",
    descriptionKey: "dashboard.moduleDescriptions.hyperlocal",
    fallbackDescription: "Hyperlocal delivery for grocery, pharmacy, food, and parcel pickup/drop with live tracking.",
    stats: "95K+ Local Deliveries",
    gradient: "linear-gradient(135deg, #0F766E 0%, #0EA5A7 48%, #1D4ED8 100%)",
    emoji: "HD",
  },
  {
    id: "localmarket",
    nameKey: "modules.localmarket",
    fallbackName: "Local Market",
    icon: "localmarket",
    descriptionKey: "dashboard.moduleDescriptions.localmarket",
    fallbackDescription: "Local vendors, fresh produce, handmade goods, and neighborhood services",
    stats: "50K+ Vendors",
    gradient: "linear-gradient(135deg, #00B894 0%, #00A86B 100%)",
    emoji: "🏪",
  },
  {
    id: "ridesharing",
    nameKey: "modules.ridesharing",
    fallbackName: "SwiftRide",
    icon: "ridesharing",
    descriptionKey: "dashboard.moduleDescriptions.ridesharing",
    fallbackDescription: "Reliable ride booking and shared transport options",
    stats: "24.3K Rides/Day",
    gradient: "linear-gradient(135deg, #3498DB 0%, #2980B9 100%)",
    emoji: "🚗",
  },
  {
    id: "matrimonial",
    nameKey: "modules.matrimonial",
    fallbackName: "SoulMatch",
    icon: "matrimonial",
    descriptionKey: "dashboard.moduleDescriptions.matrimonial",
    fallbackDescription: "Find your perfect life partner with verified profiles",
    stats: "500K+ Matches",
    gradient: "linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)",
    emoji: "💕",
  },
  {
    id: "socialmedia",
    nameKey: "modules.socialmedia",
    fallbackName: "VibeHub",
    icon: "socialmedia",
    descriptionKey: "dashboard.moduleDescriptions.socialmedia",
    fallbackDescription: "Social space to connect, share, and grow across borders",
    stats: "2M+ Members",
    gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    emoji: "👥",
  },
  {
    id: "diary",
    nameKey: "modules.diary",
    fallbackName: "My Diary",
    icon: "diary",
    descriptionKey: "dashboard.moduleDescriptions.diary",
    fallbackDescription: "Personal journaling, memories, and secure note keeping",
    stats: "24K+ Entries",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)",
    emoji: "📔",
  },
  {
    id: "reminderalert",
    nameKey: "modules.reminderalert",
    fallbackName: "ReminderAlert - Todo List",
    icon: "reminderalert",
    descriptionKey: "dashboard.moduleDescriptions.reminderalert",
    fallbackDescription: "Smart task planning with alarms, SMS reminders, and automated call alerts",
    stats: "100K+ Tasks",
    gradient: "linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)",
    emoji: "✓",
  },
  {
    id: "quicklinks",
    nameKey: "modules.quicklinks",
    fallbackName: "Quick Links",
    icon: "quicklinks",
    descriptionKey: "dashboard.moduleDescriptions.quicklinks",
    fallbackDescription: "Save and manage shortcuts to your favorite websites and services",
    stats: "10K+ Links",
    gradient: "linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)",
    emoji: "🔗",
  },
  {
    id: "sosalert",
    nameKey: "modules.sosalert",
    fallbackName: "SOS Safety Center",
    icon: "sosalert",
    descriptionKey: "dashboard.moduleDescriptions.sosalert",
    fallbackDescription: "Emergency alerts with live location sharing, escalation, and trusted contact tracking",
    stats: "24/7 Safety",
    gradient: "linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)",
    emoji: "🚨",
  },
  {
    id: "astrology",
    nameKey: "modules.astrology",
    fallbackName: "AstroNila",
    icon: "astrology",
    descriptionKey: "dashboard.moduleDescriptions.astrology",
    fallbackDescription: "Daily horoscope, Vedic insights, and personalized astrology readings for all zodiac signs",
    stats: "75K+ Readings",
    gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
    emoji: "✨",
  },
];

const openExternalLink = (url = "") => {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

const normalizeEnabledModuleIds = (modules) => {
  if (!Array.isArray(modules)) {
    return [];
  }

  return modules
    .map((moduleEntry) => {
      if (typeof moduleEntry === "string") {
        return moduleEntry.trim().toLowerCase();
      }

      if (moduleEntry && typeof moduleEntry === "object") {
        return String(moduleEntry.id || moduleEntry.moduleId || moduleEntry.module || "")
          .trim()
          .toLowerCase();
      }

      return "";
    })
    .filter(Boolean);
};

const Dashboard = ({ enabledModules, customLinks = [], onModuleChange = null }) => {
    // Real-time analytics state
    const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
    const wsClientRef = useRef(null);
    // Setup WebSocket for real-time dashboard updates
    useEffect(() => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const wsClient = new DashboardWebSocketClient();
      wsClientRef.current = wsClient;
      wsClient.connect(token).catch(() => {});
      const unsub = wsClient.on('dashboard:update', (data) => {
        setDashboardAnalytics(data.dashboardData || data);
      });
      return () => {
        unsub && unsub();
        wsClient.disconnect();
      };
    }, []);
  const navigate = useNavigate();
  const {
    currentUser,
    cart,
    orders,
    mockData,
    sellerOrders,
    managedProducts,
    orderStats,
    sellerOrderStats,
    ordersPagination,
    sellerOrdersPagination,
    managedProductsPagination,
    loadMoreOrders,
    loadMoreSellerOrders,
    loadMoreManagedProducts,
  } = useApp();
  const { t } = useI18n();
  const recentOrdersRef = useRef(null);
  const listingsRef = useRef(null);
  const exploreServicesRef = useRef(null);
  const [isLoading, setIsLoading] = useState(process.env.NODE_ENV !== "test");

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return undefined;
    }

    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const isSeller =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";
  const businessName = currentUser?.businessName?.trim() || currentUser?.name || "Your Business";
  const subscribedCategoryIds = (currentUser?.selectedBusinessCategories || [])
    .map((category) => category?.id)
    .filter(Boolean);
  const cartItemCount = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  const undeliveredOrdersCount = orderStats.openCount || 0;
  const sellerListingCount = managedProductsPagination.totalItems || 0;
  const sellerListings = managedProducts.filter(
    (product) => product.sellerEmail === currentUser?.email
  );
  const sellerReturnedListings = sellerListings.filter((product) => isReturnedForReview(product));
  const visibleSellerListings = sellerListings.filter((product) => !isReturnedForReview(product));
  const sellerFulfillmentPendingCount = sellerOrderStats.openFulfillmentCount || 0;
  const normalizedEnabledModuleIds = useMemo(
    () => normalizeEnabledModuleIds(enabledModules),
    [enabledModules]
  );
  const hasRecognizedEnabledModules = normalizedEnabledModuleIds.some((enabledModuleId) =>
    MODULE_CONFIG.some((module) => module.id === enabledModuleId)
  );
  const trendSeries = useMemo(() => {
    const baseVolume = Math.max(8, Number(ordersPagination?.totalItems || 0));
    const pendingPenalty = Math.max(0, Number(undeliveredOrdersCount || 0));
    const chartSeed = [58, 63, 61, 68, 72, 70, 77];

    return chartSeed.map((seedValue, index) => {
      const volumeNudge = Math.min(12, Math.floor(baseVolume / 4));
      const pendingAdjustment = pendingPenalty > 0 ? Math.min(6, pendingPenalty) : 0;
      const cartSignal = Math.min(5, Math.floor(cartItemCount / 2));
      const analyticBoost = dashboardAnalytics?.successRate?.successRate
        ? Math.floor(Number(dashboardAnalytics.successRate.successRate) / 15)
        : 0;
      const directionalBias = index > 3 ? 2 : -1;

      return Math.max(
        42,
        Math.min(96, seedValue + volumeNudge + cartSignal + analyticBoost + directionalBias - pendingAdjustment)
      );
    });
  }, [cartItemCount, dashboardAnalytics, ordersPagination?.totalItems, undeliveredOrdersCount]);
  const nearbyActivity = useMemo(() => {
    const availableActivities = Array.isArray(mockData?.activityFeed) ? mockData.activityFeed : [];

    if (availableActivities.length > 0) {
      return availableActivities.slice(0, 4).map((activity, index) => ({
        id: activity.id || `nearby-${index}`,
        title: activity.title || "Platform activity updated",
        detail: activity.subtitle || "Fresh engagement detected",
      }));
    }

    return [
      { id: "market-1", title: "GlobeMart", detail: "18 new product drops in your city" },
      { id: "linkup-1", title: "LinkUp", detail: "3 conversations resumed in the last hour" },
      { id: "rides-1", title: "SwiftRide", detail: "Driver availability up 12% nearby" },
      { id: "homes-1", title: "HomeSphere", detail: "5 matching rental listings added" },
    ];
  }, [mockData]);
  const aiSuggestions = useMemo(() => {
    const suggestions = [];

    if (cartItemCount > 0) {
      suggestions.push(`You have ${cartItemCount} cart item${cartItemCount > 1 ? "s" : ""}. Bundle checkout can reduce delivery costs.`);
    }

    if (undeliveredOrdersCount > 0) {
      suggestions.push(`${undeliveredOrdersCount} order${undeliveredOrdersCount > 1 ? "s" : ""} still active. Turn on real-time tracking alerts.`);
    }

    if (Number(enabledModules?.length || 0) > 6) {
      suggestions.push("Pin top modules to quick actions for faster daily flow.");
    }

    if (!suggestions.length) {
      suggestions.push("Engagement is stable. Explore one new module today to improve discovery signals.");
    }

    return suggestions.slice(0, 3);
  }, [cartItemCount, enabledModules, undeliveredOrdersCount]);

  const handleModuleNavigation = (moduleId) => {
    if (typeof onModuleChange === "function") {
      onModuleChange(moduleId);
      return;
    }

    navigate(getPathForModule(moduleId));
  };

  const handleOrdersCardClick = () => {
    if (!isSeller) {
      handleModuleNavigation("orders");
      return;
    }

    recentOrdersRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleListingsCardClick = () => {
    listingsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleEnabledModulesClick = () => {
    exploreServicesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const filteredModules = MODULE_CONFIG
    .map((module) => ({
      ...module,
      name: t(module.nameKey, module.fallbackName),
      description: t(module.descriptionKey, module.fallbackDescription),
    }))
    .filter((module) => {
      // Show all modules when enabled list is absent or has no recognized IDs.
      if (!hasRecognizedEnabledModules) {
        return true;
      }

      return (
        module.id === "finance" ||
        module.id === "freelancer" ||
        module.id === "billpay" ||
        module.id === "skilllearning" ||
        module.id === "devadarshan" ||
        module.id === "localservices" ||
        module.id === "hyperlocal" ||
        normalizedEnabledModuleIds.includes(module.id)
      );
    })
    .filter(
      (module) =>
        !isSeller ||
        module.id === "finance" ||
        module.id === "freelancer" ||
        module.id === "billpay" ||
        module.id === "skilllearning" ||
        module.id === "devadarshan" ||
        module.id === "localservices" ||
        module.id === "hyperlocal" ||
        subscribedCategoryIds.includes(module.id)
    );
  const visibleCards = [
    ...filteredModules.map((module) => ({ ...module, cardType: "module" })),
    ...customLinks.map((link) => ({
      id: link.id,
      name: link.title,
      description: link.description || link.url,
      icon: "external",
      cardType: "external",
      url: link.url,
    })),
  ];

  // Example: show analytics data at the top (customize as needed)
  return (
    <div className={`dashboard-container ${!isSeller ? "dashboard-container-compact" : ""}`}>
        {dashboardAnalytics && (
          <div className="dashboard-analytics-bar">
            <strong>Real-Time Analytics:</strong>
            <span> Success Rate: {dashboardAnalytics.successRate?.successRate ?? '-'}% </span>
            <span> Total Deliveries: {dashboardAnalytics.successRate?.totalDeliveries ?? '-'} </span>
            <span> Failed: {dashboardAnalytics.successRate?.failedDeliveries ?? '-'} </span>
            <span> Pending: {dashboardAnalytics.successRate?.pendingDeliveries ?? '-'} </span>
          </div>
        )}
        {isLoading ? (
          <div className="premium-loading">
            <div className="loading-shimmer">
              <div className="shimmer-card welcome-shimmer"></div>
              <div className="shimmer-grid">
                <div className="shimmer-card stat-shimmer"></div>
                <div className="shimmer-card stat-shimmer"></div>
                <div className="shimmer-card stat-shimmer"></div>
                <div className="shimmer-card stat-shimmer"></div>
              </div>
              <div className="shimmer-grid">
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {!isSeller && (
              <>
                <EnhancedHeroSection
                  currentUser={currentUser}
                  isSeller={isSeller}
                  enabledModules={enabledModules}
                  onEnabledModulesClick={handleEnabledModulesClick}
                />
                <EcosystemVisualization />
                <ScrollAnimationObserver>
                  <PersonalizedActivityFeed currentUser={currentUser} />
                </ScrollAnimationObserver>
                <ScrollAnimationObserver threshold={0.15}>
                  <RecommendedServices currentUser={currentUser} />
                </ScrollAnimationObserver>
                <ScrollAnimationObserver threshold={0.2}>
                  <EngagementScore currentUser={currentUser} />
                </ScrollAnimationObserver>
              </>
            )}

            {isSeller && (
              <div className={`welcome-section seller-welcome-section`}>
                <img src="/logo.svg" alt="NilaHub" className="welcome-logo" />
                <h1>{businessName} Seller Dashboard</h1>
                <p>
                  Manage your subscribed NilaHub business categories, monitor seller orders,
                  and jump directly into the services your business registered for.
                </p>
              </div>
            )}

            {isSeller && (
              <div className="stats-section">
                <div className="stat-card">
                  <span className="stat-icon"><Icon type="ecommerce" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{subscribedCategoryIds.length}</h3>
                    <p>Subscribed Categories</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={handleOrdersCardClick}
                >
                  <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{sellerOrdersPagination.totalItems || 0}</h3>
                    <p>Seller Orders</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={handleOrdersCardClick}
                >
                  <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{sellerFulfillmentPendingCount}</h3>
                    <p>Open Fulfillments</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={handleListingsCardClick}
                >
                  <span className="stat-icon"><Icon type="classifieds" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{sellerListingCount}</h3>
                    <p>My Listings</p>
                  </div>
                </button>
                <div className="stat-card">
                  <span className="stat-icon"><Icon type="user" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{businessName}</h3>
                    <p>Seller Account</p>
                  </div>
                </div>
              </div>
            )}

            {!isSeller && (
              <div className="stats-section">
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={() => handleModuleNavigation("cart")}
                >
                  <span className="stat-icon"><Icon type="cart" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{cartItemCount}</h3>
                    <p>{t("dashboard.itemsInCart", "Items in Cart")}</p>
                    <span className="stat-chip stat-chip-live">Live basket pulse</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={handleOrdersCardClick}
                >
                  <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{ordersPagination.totalItems || 0}</h3>
                    <p>{t("dashboard.ordersPlaced", "Orders Placed")}</p>
                    <span className="stat-chip">Weekly growth</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={handleOrdersCardClick}
                >
                  <span className="stat-icon"><Icon type="orders" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{undeliveredOrdersCount}</h3>
                    <p>Orders Not Delivered</p>
                    <span className="stat-chip stat-chip-attention">Action suggested</span>
                  </div>
                </button>
                <div className="stat-card">
                  <span className="stat-icon"><Icon type="user" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{currentUser.name}</h3>
                    <p>{t("dashboard.loggedIn", "Logged In")}</p>
                    <span className="stat-chip">Unified account</span>
                  </div>
                </div>
              </div>
            )}

      <div className={!isSeller ? "dashboard-main-grid" : ""}>
        <div className="modules-section" ref={exploreServicesRef}>
          <h2 className="section-title-polished">{isSeller ? "My Business Categories" : t("dashboard.exploreServices", "Explore Our Services")}</h2>
          <div className="modules-grid">
            {visibleCards.map((module) => (
              <button
                type="button"
                className={`module-card polished micro-glow ${isSeller ? "seller-module-card" : ""}`}
                key={module.id}
                onClick={() =>
                  module.cardType === "external"
                    ? openExternalLink(module.url)
                    : handleModuleNavigation(module.id)
                }
                style={{ background: module.gradient }}
              >
                <div className="module-hero-overlay" />
                <div className="module-stats-badge">{module.stats}</div>
                <div className="module-icon">
                  <Icon type={module.icon} className="module-icon-svg" />
                </div>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <span className="module-badge">
                  {module.cardType === "external"
                    ? "Open Link"
                    : isSeller
                      ? "Open Workspace"
                      : t("common.explore", "Explore")}
                </span>
              </button>
            ))}
          </div>
          {isSeller && visibleCards.length === 0 && (
            <div className="recent-orders seller-empty-dashboard">
              <h2>No Subscribed Categories</h2>
              <p>Your seller account does not have any active subscribed categories visible right now.</p>
            </div>
          )}
          {!isSeller && visibleCards.length === 0 && (
            <div className="recent-orders seller-empty-dashboard">
              <h2>No Enabled Services Found</h2>
              <p>
                No service modules are currently visible. If modules are enabled in admin, refresh once
                or re-open the dashboard.
              </p>
            </div>
          )}
        </div>

        {!isSeller && (
          <>
            <div className="notifications-section">
              <h2>{t("dashboard.notifications", "Quick Updates")}</h2>
              <div className="notification-cards">
                {cartItemCount > 0 && (
                  <div className="notification-card notification-card-cart">
                    <div className="notification-badge">
                      <Icon type="cart" className="notification-icon" />
                    </div>
                    <div className="notification-content">
                      <p className="notification-label">Items in Cart</p>
                      <p className="notification-value">{cartItemCount} items</p>
                    </div>
                    <button 
                      type="button"
                      className="notification-action"
                      onClick={() => handleModuleNavigation("ecommerce")}
                    >
                      →
                    </button>
                  </div>
                )}
                <div className="notification-card notification-card-orders">
                  <div className="notification-badge">
                    <Icon type="orders" className="notification-icon" />
                  </div>
                  <div className="notification-content">
                    <p className="notification-label">Active Orders</p>
                    <p className="notification-value">{undeliveredOrdersCount || 0} pending</p>
                  </div>
                  <button 
                    type="button"
                    className="notification-action"
                    onClick={handleOrdersCardClick}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            <div className="quick-actions-section">
              <h3>{t("dashboard.quickActions", "Quick Actions")}</h3>
              <div className="quick-actions-grid">
                <button 
                  type="button"
                  className="quick-action-btn quick-action-shop"
                  onClick={() => handleModuleNavigation("ecommerce")}
                >
                  <span className="qa-icon">🛍️</span>
                  <span className="qa-label">Shop</span>
                  <span className="qa-meta">Trending deals</span>
                </button>
                <button 
                  type="button"
                  className="quick-action-btn quick-action-messages"
                  onClick={() => handleModuleNavigation("messaging")}
                >
                  <span className="qa-icon">💬</span>
                  <span className="qa-label">Messages</span>
                  <span className="qa-meta">Unread first</span>
                </button>
                <button 
                  type="button"
                  className="quick-action-btn quick-action-browse"
                  onClick={() => handleModuleNavigation("classifieds")}
                >
                  <span className="qa-icon">🔍</span>
                  <span className="qa-label">Browse</span>
                  <span className="qa-meta">New listings</span>
                </button>
                <button 
                  type="button"
                  className="quick-action-btn quick-action-food"
                  onClick={() => handleModuleNavigation("fooddelivery")}
                >
                  <span className="qa-icon">🍽️</span>
                  <span className="qa-label">Food</span>
                  <span className="qa-meta">Nearby kitchens</span>
                </button>
              </div>
            </div>

            <div className="recent-orders recent-orders-compact" ref={recentOrdersRef}>
              <h2>{t("dashboard.recentOrders", "Recent Orders")}</h2>
            {orders.length > 0 ? (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order.id} className="order-item">
                      <span className="order-date">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Recent"}
                      </span>
                      <span
                        className={`order-status order-status-${normalizeOrderStatus(order.status).toLowerCase()}`}
                      >
                        {normalizeOrderStatus(order.status)}
                      </span>
                      <span className="order-amount">Total: INR {formatCurrency(order.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-orders">
                  {t("dashboard.noOrders", "No orders yet. Start shopping!")}
                </p>
              )}
            {ordersPagination.hasNextPage && (
              <button type="button" className="btn btn-outline" onClick={loadMoreOrders}>
                Load more orders
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline dashboard-return-btn"
              onClick={() => handleModuleNavigation("returns")}
            >
              Open Returns & Refunds
            </button>
          </div>
          </>
        )}
      </div>

      {isSeller && (
        <div className="recent-orders seller-listings-section" ref={listingsRef}>
          <h2>Returned For Review</h2>
          {sellerReturnedListings.length > 0 ? (
            <div className="orders-list seller-returned-list">
              {sellerReturnedListings.map((product) => (
                <div key={product.id} className="order-item seller-listing-item seller-returned-item">
                  <span className="order-date">{product.category}</span>
                  <span className="order-status order-status-returned">Returned</span>
                  <span className="order-amount">
                    {product.name}
                    {product.moderationNote ? ` · ${product.moderationNote}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-orders">No products are currently waiting for your review updates.</p>
          )}

          <h2>My Listed Items</h2>
          {visibleSellerListings.length > 0 ? (
            <div className="orders-list">
              {visibleSellerListings.map((product) => (
                <div key={product.id} className="order-item seller-listing-item">
                  <span className="order-date">{product.category}</span>
                  <span
                    className={`order-status order-status-${String(product.approvalStatus || "pending").toLowerCase()}`}
                  >
                    {product.approvalStatus || "pending"}
                  </span>
                  <span className="order-amount">
                    {product.name} · INR {product.price}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-orders">No listed items yet. Your seller listings will appear here.</p>
          )}
          {managedProductsPagination.hasNextPage && (
            <button type="button" className="btn btn-outline" onClick={loadMoreManagedProducts}>
              Load more listings
            </button>
          )}
        </div>
      )}

      {isSeller && (
        <div className="recent-orders" ref={recentOrdersRef}>
          <h2>Seller Activity</h2>

          {sellerOrders.length > 0 ? (
            <div className="orders-list">
              {sellerOrders.map((order) => {
                const myFulfillment = (order.sellerFulfillments || []).find(
                  (fulfillment) =>
                    fulfillment.sellerEmail === currentUser?.email ||
                    fulfillment.businessName === businessName
                );

                return (
                  <div key={order.id} className="order-item">
                    <span className="order-date">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>

                    <span
                      className={`order-status order-status-${normalizeOrderStatus(myFulfillment?.status).toLowerCase()}`}
                    >
                      {normalizeOrderStatus(myFulfillment?.status)}
                    </span>

                    <span className="order-amount">
                      Order Total: INR {formatCurrency(order.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-orders">
              No seller orders yet. New business activity will appear here.
            </p>
          )}

          {sellerOrdersPagination.hasNextPage && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadMoreSellerOrders}
            >
              Load more seller orders
            </button>
          )}
        </div>
      )}
          </>
        )}
    </div>
  );
};

export default Dashboard;
