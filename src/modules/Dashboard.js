import React, { useMemo, useRef, useState, useEffect } from "react";
import DashboardWebSocketClient from "../websocket/dashboardWebSocketClient";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import useI18n from "../hooks/useI18n";
import { formatCurrency } from "../utils/ecommerceHelpers";
import { getPathForModule } from "../utils/moduleRoutes";
import "../styles/DashboardEnhanced.css";
import "../styles/AdvancedAnimations.css";
import "../styles/Phase6Enhancements.css";
import "../styles/MicroInteractionsPolish.css";
import "../styles/Phase6bPolishRefinements.css";
import "../styles/Phase6bComponentPolish.css";
import "../styles/PlatformPolish.css";
import "../styles/DashboardFinalPolish.css";
import "../styles/DashboardRealFeel.css";
import "../styles/DashboardUXRefinement.css";

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
    case "tourism":
      return (
        <svg {...common}>
          <path d="M4 14h16" />
          <path d="M8 14V8l4-2 4 2v6" />
          <path d="M12 6V3" />
          <circle cx="12" cy="18" r="2" />
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
  case "photostudio":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <circle cx="12" cy="13" r="3.2" />
          <path d="M8 7V5h2l1-1h2l1 1h2v2" />
        </svg>
      );
  case "karaokeduet":
      return (
        <svg {...common}>
          <path d="M8 18V8a3 3 0 1 1 2.2 2.9V18" />
          <path d="M16 18V8a3 3 0 1 1 2.2 2.9V18" />
          <path d="M5 18h14" />
        </svg>
      );
  case "beautyai":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M7 19a5 5 0 0 1 10 0" />
          <path d="M4 12h2M18 12h2M12 2v2" />
        </svg>
      );
  case "kitchen":
      return (
        <svg {...common}>
          <path d="M5 4v8a3 3 0 0 0 6 0V4" />
          <path d="M8 4v8" />
          <path d="M14 4v16" />
          <path d="M17 4c1.7 2 1.7 6 0 8" />
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
    case "education":
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4z" />
          <path d="M8 10h8M8 14h5" />
          <path d="M12 6V4" />
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
    id: "businessbuilder",
    nameKey: "modules.businessbuilder",
    fallbackName: "AI Business Builder",
    icon: "businessbuilder",
    descriptionKey: "dashboard.moduleDescriptions.businessbuilder",
    fallbackDescription: "Build mini apps, manage business profiles, and issue branded invoices.",
    stats: "Launch mini apps & invoices",
    gradient: "linear-gradient(135deg, #0F766E 0%, #10B981 45%, #22C55E 100%)",
    emoji: "🚀",
  },
  {
    id: "gulfservices",
    nameKey: "modules.gulfservices",
    fallbackName: "Gulf Services",
    icon: "gulfservices",
    descriptionKey: "dashboard.moduleDescriptions.gulfservices",
    fallbackDescription: "Complete Gulf support hub for visas, jobs, travel, and attestation.",
    stats: "Trusted services for Gulf families",
    gradient: "linear-gradient(135deg, #0C4A6E 0%, #2563EB 45%, #38BDF8 100%)",
    emoji: "🌍",
  },
  {
    id: "hotelbooking",
    nameKey: "modules.hotelbooking",
    fallbackName: "NilaStay",
    icon: "hotelbooking",
    descriptionKey: "dashboard.moduleDescriptions.hotelbooking",
    fallbackDescription: "Book verified hotels and homestays across Kerala with direct contact and local support.",
    stats: "Kerala stays booking",
    gradient: "linear-gradient(135deg, #059669 0%, #10B981 45%, #34D399 100%)",
    emoji: "🏨",
  },
  {
    id: "healthcare",
    nameKey: "modules.healthcare",
    fallbackName: "NilaCare",
    icon: "healthcare",
    descriptionKey: "dashboard.moduleDescriptions.healthcare",
    fallbackDescription: "Complete healthcare ecosystem with doctor consultations, lab bookings, pharmacy delivery, health records, and emergency services.",
    stats: "24/7 healthcare support",
    gradient: "linear-gradient(135deg, #DC2626 0%, #EF4444 45%, #F87171 100%)",
    emoji: "🏥",
  },
  {
    id: "bustrainbooking",
    nameKey: "modules.bustrainbooking",
    fallbackName: "NilaTravel Bus/Train",
    icon: "bustrainbooking",
    descriptionKey: "dashboard.moduleDescriptions.bustrainbooking",
    fallbackDescription: "Book buses and trains across Kerala with IRCTC and KSRTC integration, PNR status tracking, fare comparison, and assisted booking.",
    stats: "Government portal integration",
    gradient: "linear-gradient(135deg, #2563EB 0%, #3B82F6 45%, #60A5FA 100%)",
    emoji: "🚆",
  },
  {
    id: "resumebuilder",
    nameKey: "modules.resumebuilder",
    fallbackName: "AI Resume Builder",
    icon: "resumebuilder",
    descriptionKey: "dashboard.moduleDescriptions.resumebuilder",
    fallbackDescription: "AI-powered resume creation with ATS optimization, job-specific tailoring, cover letters, and interview preparation for global job markets.",
    stats: "ATS-optimized resumes",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)",
    emoji: "📄",
  },
  {
    id: "photostudio",
    nameKey: "modules.photostudio",
    fallbackName: "Photo Studio AI + AR",
    icon: "photostudio",
    descriptionKey: "dashboard.moduleDescriptions.photostudio",
    fallbackDescription: "AI photo editor + AR camera with filters, templates, background tools, caption generation, and creator monetization.",
    stats: "AI + AR creator suite",
    gradient: "linear-gradient(135deg, #0EA5A7 0%, #2563EB 45%, #1D4ED8 100%)",
    emoji: "📸",
  },
  {
    id: "kidsstoryvideomaker",
    nameKey: "modules.kidsstoryvideomaker",
    fallbackName: "Kids Story Video Maker",
    icon: "photostudio",
    descriptionKey: "dashboard.moduleDescriptions.kidsstoryvideomaker",
    fallbackDescription:
      "Create kid-friendly story videos with scenes, narration flow, and easy sharing for family learning time.",
    stats: "Story video creator",
    gradient: "linear-gradient(135deg, #1D4ED8 0%, #0EA5A7 45%, #F59E0B 100%)",
    emoji: "KS",
  },
  {
    id: "promptvideogenerator",
    nameKey: "modules.promptvideogenerator",
    fallbackName: "Prompt Video Generator",
    icon: "photostudio",
    descriptionKey: "dashboard.moduleDescriptions.promptvideogenerator",
    fallbackDescription:
      "Generate real-feel videos from a prompt with optional customer character UI uploads and auto-render output.",
    stats: "Prompt-to-video pipeline",
    gradient: "linear-gradient(135deg, #0B5ED7 0%, #129e8a 45%, #f59e0b 100%)",
    emoji: "PV",
  },
  {
    id: "karaokeduet",
    nameKey: "modules.karaokeduet",
    fallbackName: "Remote Karaoke Duet",
    icon: "karaokeduet",
    descriptionKey: "dashboard.moduleDescriptions.karaokeduet",
    fallbackDescription:
      "Two-location karaoke duet with live sync, local take recording, and final MP3/WAV server-side mix.",
    stats: "Live duet + final mix export",
    gradient: "linear-gradient(135deg, #0B3C5D 0%, #2563EB 46%, #22D3EE 100%)",
    emoji: "🎤",
  },
  {
    id: "danceduet",
    nameKey: "modules.danceduet",
    fallbackName: "AI Dance Duet",
    icon: "photostudio",
    descriptionKey: "dashboard.moduleDescriptions.danceduet",
    fallbackDescription:
      "Merge two dance videos into one AI-powered duet with shared stage styles, background removal, and MP4 export.",
    stats: "Dance merge studio",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 45%, #F59E0B 100%)",
    emoji: "💃",
  },
  {
    id: "voicefriend",
    nameKey: "modules.voicefriend",
    fallbackName: "AI Voice Friend",
    icon: "messaging",
    descriptionKey: "dashboard.moduleDescriptions.voicefriend",
    fallbackDescription:
      "A compassionate voice chat companion with emotion-aware responses, motivational support, and safe guidance.",
    stats: "Emotional AI companion",
    gradient: "linear-gradient(135deg, #2563EB 0%, #60A5FA 45%, #86EFAC 100%)",
    emoji: "🗣️",
  },
  {
    id: "liveplaceexplorer",
    nameKey: "modules.liveplaceexplorer",
    fallbackName: "Live Place Explorer",
    icon: "tourism",
    descriptionKey: "dashboard.moduleDescriptions.liveplaceexplorer",
    fallbackDescription:
      "Search places, view 360° street imagery, weather, nearby photos and AI travel guidance.",
    stats: "Explore live places",
    gradient: "linear-gradient(135deg, #0F766E 0%, #0EA5A7 45%, #3B82F6 100%)",
    emoji: "🧭",
  },
  {
    id: "beautyai",
    nameKey: "modules.beautyai",
    fallbackName: "Nila Beauty AI",
    icon: "beautyai",
    descriptionKey: "dashboard.moduleDescriptions.beautyai",
    fallbackDescription:
      "AI beauty planner with selfie analysis, daily skincare routines, safety guardrails, and premium lifestyle recommendations.",
    stats: "Daily skin + beauty guidance",
    gradient: "linear-gradient(135deg, #0F766E 0%, #14B8A6 45%, #FB923C 100%)",
    emoji: "BA",
  },
  {
    id: "kitchen",
    nameKey: "modules.kitchen",
    fallbackName: "Smart Kitchen & Recipe Hub",
    icon: "kitchen",
    descriptionKey: "dashboard.moduleDescriptions.kitchen",
    fallbackDescription:
      "Kitchen tips + AI recipe generation from home ingredients, step cooking mode, grocery lists, and community recipe sharing.",
    stats: "AI cooking + kitchen utility",
    gradient: "linear-gradient(135deg, #166534 0%, #16A34A 45%, #F59E0B 100%)",
    emoji: "KH",
  },
  {
    id: "aibusinessos",
    nameKey: "modules.aibusinessos",
    fallbackName: "AI Business Operating System",
    icon: "businessbuilder",
    descriptionKey: "dashboard.moduleDescriptions.aibusinessos",
    fallbackDescription:
      "AI operating stack for SMEs with invoice, GST billing, CRM, inventory, marketing, and analytics automation.",
    stats: "SME AI infra",
    gradient: "linear-gradient(135deg, #0F172A 0%, #1D4ED8 45%, #0EA5A7 100%)",
    emoji: "OS",
  },
  {
    id: "gulfjobsmigration",
    nameKey: "modules.gulfjobsmigration",
    fallbackName: "Kerala + Gulf Jobs Migration",
    icon: "gulfservices",
    descriptionKey: "dashboard.moduleDescriptions.gulfjobsmigration",
    fallbackDescription:
      "End-to-end job and migration support with document verification, visa tracking, interview AI, and overseas onboarding.",
    stats: "Kerala-GCC talent flow",
    gradient: "linear-gradient(135deg, #0F4C81 0%, #1E3A8A 45%, #22D3EE 100%)",
    emoji: "GM",
  },
  {
    id: "womensafetyfamily",
    nameKey: "modules.womensafetyfamily",
    fallbackName: "Women Safety + Family Protection",
    icon: "sosalert",
    descriptionKey: "dashboard.moduleDescriptions.womensafetyfamily",
    fallbackDescription:
      "Family safety ecosystem with SOS tracking, trusted circles, child safety, and elderly care alerts.",
    stats: "Safety-first network",
    gradient: "linear-gradient(135deg, #7F1D1D 0%, #E11D48 45%, #FB7185 100%)",
    emoji: "SF",
  },
  {
    id: "devotionalecosystem",
    nameKey: "modules.devotionalecosystem",
    fallbackName: "Devotional Ecosystem",
    icon: "devadarshan",
    descriptionKey: "dashboard.moduleDescriptions.devotionalecosystem",
    fallbackDescription:
      "Temple bookings, vazhipadu, festival alerts, donations, streaming, and pilgrimage planning in one devotional stack.",
    stats: "Daily devotional engagement",
    gradient: "linear-gradient(135deg, #7C2D12 0%, #EA580C 45%, #F59E0B 100%)",
    emoji: "DE",
  },
  {
    id: "hyperlocalaicommerce",
    nameKey: "modules.hyperlocalaicommerce",
    fallbackName: "Hyperlocal AI Commerce",
    icon: "localmarket",
    descriptionKey: "dashboard.moduleDescriptions.hyperlocalaicommerce",
    fallbackDescription:
      "AI commerce engine for local conversion with voice shopping, captioning, recommendations, and offer optimization.",
    stats: "Conversion boost layer",
    gradient: "linear-gradient(135deg, #064E3B 0%, #059669 45%, #10B981 100%)",
    emoji: "HC",
  },
  {
    id: "nilaaistudio",
    nameKey: "modules.nilaaistudio",
    fallbackName: "Nila AI Studio",
    icon: "photostudio",
    descriptionKey: "dashboard.moduleDescriptions.nilaaistudio",
    fallbackDescription:
      "Unified AI creator platform for story videos, reels, dubbing, avatars, and business promo generation.",
    stats: "Creator growth engine",
    gradient: "linear-gradient(135deg, #312E81 0%, #7C3AED 45%, #EC4899 100%)",
    emoji: "NS",
  },
  {
    id: "trustlayer",
    nameKey: "modules.trustlayer",
    fallbackName: "Trust Layer",
    icon: "sosalert",
    descriptionKey: "dashboard.moduleDescriptions.trustlayer",
    fallbackDescription:
      "Platform-wide verification, trust scores, fraud detection, community reporting, and AI moderation safeguards.",
    stats: "Fraud defense core",
    gradient: "linear-gradient(135deg, #111827 0%, #374151 45%, #6B7280 100%)",
    emoji: "TL",
  },
  {
    id: "jobportal",
    nameKey: "modules.jobportal",
    fallbackName: "NilaJobs",
    icon: "jobportal",
    descriptionKey: "dashboard.moduleDescriptions.jobportal",
    fallbackDescription: "Local + Gulf + IT + gig job portal with verified recruiters, smart apply, resume scoring, employer dashboard, and instant job alerts.",
    stats: "Jobs for every skill",
    gradient: "linear-gradient(135deg, #0F766E 0%, #14B8A6 45%, #2DD4BF 100%)",
    emoji: "🔎",
  },
  {
    id: "businessservices",
    nameKey: "modules.businessservices",
    fallbackName: "Business Services Hub",
    icon: "businessservices",
    descriptionKey: "dashboard.moduleDescriptions.businessservices",
    fallbackDescription: "Complete business services hub with GST filing, company registration, legal consultation, digital marketing, and the 'Start Your Business in 7 Days' package for Kerala entrepreneurs.",
    stats: "Business setup in 7 days",
    gradient: "linear-gradient(135deg, #1E293B 0%, #334155 45%, #475569 100%)",
    emoji: "💼",
  },
  {
    id: "education",
    nameKey: "modules.education",
    fallbackName: "Education Ecosystem",
    icon: "education",
    descriptionKey: "dashboard.moduleDescriptions.education",
    fallbackDescription: "Online tuition, skill courses, student community, study abroad guidance, and scholarship finder.",
    stats: "Complete education solutions",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)",
    emoji: "📚",
  },
  {
    id: "tourism",
    nameKey: "modules.tourism",
    fallbackName: "NilaTravel",
    icon: "tourism",
    descriptionKey: "dashboard.moduleDescriptions.tourism",
    fallbackDescription: "Kerala tourism marketplace for curated packages, custom trips, and local experiences.",
    stats: "Curated Kerala travel plans",
    gradient: "linear-gradient(135deg, #0F766E 0%, #0EA5A7 45%, #14B8A6 100%)",
    emoji: "TR",
  },
  {
    id: "nilaaihub",
    nameKey: "modules.nilaaihub",
    fallbackName: "Nila AI Hub",
    icon: "nilaaihub",
    descriptionKey: "dashboard.moduleDescriptions.nilaaihub",
    fallbackDescription: "Your personal AI assistant for services, loans, jobs, health, travel, and daily life.",
    stats: "AI assistant for every need",
    gradient: "linear-gradient(135deg, #0D9488 0%, #14B8A6 45%, #22C55E 100%)",
    emoji: "🤖",
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

const MODULE_CATEGORY_META = [
  { id: "all", label: "All" },
  { id: "core", label: "Core" },
  { id: "travel", label: "Travel" },
  { id: "business", label: "Business" },
  { id: "utility", label: "Utility" },
];

const MODULE_CATEGORY_MAP = {
  ecommerce: "core",
  messaging: "core",
  classifieds: "core",
  realestate: "core",
  localmarket: "core",
  socialmedia: "core",
  matrimonial: "core",
  tourism: "travel",
  liveplaceexplorer: "travel",
  hotelbooking: "travel",
  bustrainbooking: "travel",
  ridesharing: "travel",
  gulfservices: "travel",
  hyperlocal: "travel",
  businessbuilder: "business",
  businessservices: "business",
  freelancer: "business",
  jobportal: "business",
  photostudio: "business",
  kidsstoryvideomaker: "business",
  karaokeduet: "business",
  beautyai: "business",
  kitchen: "business",
  aibusinessos: "business",
  gulfjobsmigration: "business",
  hyperlocalaicommerce: "business",
  nilaaistudio: "business",
  trustlayer: "business",
  skilllearning: "business",
  resumebuilder: "business",
  education: "business",
  finance: "utility",
  billpay: "utility",
  fooddelivery: "utility",
  healthcare: "utility",
  devadarshan: "utility",
  localservices: "utility",
  womensafetyfamily: "utility",
  devotionalecosystem: "utility",
  reminderalert: "utility",
  sosalert: "utility",
  astrology: "utility",
  quicklinks: "utility",
  diary: "utility",
  external: "utility",
};

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

const FAVORITE_MODULES_STORAGE_PREFIX = "nilahub:dashboard:favorites";
const MODULE_VALUE_BADGE_BY_ID = {
  ecommerce: "GlobeMart: Smart shopping",
  messaging: "LinkUp: Live updates",
  classifieds: "TradePost: Fresh leads",
  realestate: "HomeSphere: Smart discovery",
  ridesharing: "SwiftRide: Fast booking",
  fooddelivery: "Feastly: Quick reorder",
  healthcare: "NilaCare: Priority care",
  billpay: "Nila Utility Hub: Due reminders",
  finance: "Nila Finance Hub: Decision support",
};

const formatRelativeUpdateTime = (input) => {
  if (!input) {
    return "just now";
  }

  const dateValue = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dateValue.getTime())) {
    return "just now";
  }

  const delta = Date.now() - dateValue.getTime();
  const minutes = Math.max(0, Math.floor(delta / 60000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const inferActivityModuleFromFeed = (activity = {}) => {
  const directModule =
    String(activity.moduleId || activity.module || activity.targetModule || "")
      .trim()
      .toLowerCase();
  if (directModule) {
    return directModule;
  }

  const title = `${activity.title || ""} ${activity.subtitle || ""}`.toLowerCase();
  if (title.includes("globemart") || title.includes("shop") || title.includes("product")) {
    return "ecommerce";
  }
  if (title.includes("linkup") || title.includes("chat") || title.includes("message")) {
    return "messaging";
  }
  if (title.includes("ride") || title.includes("swift")) {
    return "ridesharing";
  }
  if (title.includes("home") || title.includes("property")) {
    return "realestate";
  }
  if (title.includes("food")) {
    return "fooddelivery";
  }
  return "";
};

const Dashboard = ({ enabledModules, customLinks = [], onModuleChange = null }) => {
    // Real-time analytics state
    const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
    const [dashboardAnalyticsUpdatedAt, setDashboardAnalyticsUpdatedAt] = useState(null);
    const wsClientRef = useRef(null);
    // Setup WebSocket for real-time dashboard updates
    useEffect(() => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const wsClient = new DashboardWebSocketClient();
      wsClientRef.current = wsClient;
      wsClient.connect(token).catch(() => {});
      const unsub = wsClient.on('dashboard:update', (data) => {
        const nextDashboardAnalytics = data.dashboardData || data;
        setDashboardAnalytics(nextDashboardAnalytics);
        setDashboardAnalyticsUpdatedAt(
          nextDashboardAnalytics?.updatedAt ||
            nextDashboardAnalytics?.timestamp ||
            new Date()
        );
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
  const [moduleSearch, setModuleSearch] = useState("");
  const [activeModuleCategory, setActiveModuleCategory] = useState("all");
  const [activeModuleSignalFilter, setActiveModuleSignalFilter] = useState("all");
  const [moduleSortMode, setModuleSortMode] = useState("recommended");
  const [favoriteModuleIds, setFavoriteModuleIds] = useState([]);
  const [showFavoriteManager, setShowFavoriteManager] = useState(false);
  const [showMomentumLegend, setShowMomentumLegend] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return undefined;
    }

    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const isSeller =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";
  const favoriteModulesStorageKey = useMemo(() => {
    const identity = String(currentUser?.email || currentUser?.id || "guest").trim().toLowerCase();
    return `${FAVORITE_MODULES_STORAGE_PREFIX}:${identity}`;
  }, [currentUser?.email, currentUser?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(favoriteModulesStorageKey);
      if (!storedValue) {
        setFavoriteModuleIds([]);
        return;
      }

      const parsed = JSON.parse(storedValue);
      const normalized = Array.isArray(parsed)
        ? parsed.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean)
        : [];
      setFavoriteModuleIds([...new Set(normalized)]);
    } catch {
      setFavoriteModuleIds([]);
    }
  }, [favoriteModulesStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        favoriteModulesStorageKey,
        JSON.stringify([...new Set(favoriteModuleIds)])
      );
    } catch {
      // Ignore localStorage failures gracefully.
    }
  }, [favoriteModuleIds, favoriteModulesStorageKey]);
  const businessName = currentUser?.businessName?.trim() || currentUser?.name || "Your Business";
  const subscribedCategoryIds = (currentUser?.selectedBusinessCategories || [])
    .map((category) => category?.id)
    .filter(Boolean);
  const cartItemCount = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  const undeliveredOrdersCount = orderStats.openCount || 0;
  const pendingRefundsCount = useMemo(() => {
    return orders.reduce((total, order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      return (
        total +
        items.filter(
          (item) =>
            item?.returnRequest &&
            String(item.returnRequest.refundStatus || "").trim().toLowerCase() !== "completed"
        ).length
      );
    }, 0);
  }, [orders]);
  const pendingIssueCount = Math.max(0, undeliveredOrdersCount + pendingRefundsCount);
  const hasPendingIssues = pendingIssueCount > 0;
  const pendingIssueLabel = pendingRefundsCount > 0 && undeliveredOrdersCount > 0
    ? `${undeliveredOrdersCount} deliver${undeliveredOrdersCount > 1 ? "ies" : "y"} pending, ${pendingRefundsCount} refund${pendingRefundsCount > 1 ? "s" : ""} pending`
    : pendingRefundsCount > 0
      ? `${pendingRefundsCount} refund${pendingRefundsCount > 1 ? "s" : ""} pending`
      : `${undeliveredOrdersCount} deliver${undeliveredOrdersCount > 1 ? "ies" : "y"} pending`;
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
        moduleId: inferActivityModuleFromFeed(activity),
      }));
    }

    return [
      {
        id: "market-1",
        title: "GlobeMart",
        detail: "18 new product drops in your city",
        moduleId: "ecommerce",
      },
      {
        id: "linkup-1",
        title: "LinkUp",
        detail: "3 conversations resumed in the last hour",
        moduleId: "messaging",
      },
      {
        id: "rides-1",
        title: "SwiftRide",
        detail: "Driver availability up 12% nearby",
        moduleId: "ridesharing",
      },
      {
        id: "homes-1",
        title: "HomeSphere",
        detail: "5 matching rental listings added",
        moduleId: "realestate",
      },
    ];
  }, [mockData]);
  const aiSuggestions = useMemo(() => {
    const suggestions = [];

    if (hasPendingIssues) {
      suggestions.push({
        id: "resolve-issues",
        title: "Resolve pending delivery and refund issues",
        detail: pendingIssueLabel,
        moduleId: "orders",
      });
    }

    if (cartItemCount > 0) {
      suggestions.push({
        id: "finish-cart",
        title: `Complete checkout for ${cartItemCount} cart item${cartItemCount > 1 ? "s" : ""}`,
        detail: "Bundle checkout can reduce delivery costs and speed up dispatch.",
        moduleId: "ecommerce",
      });
    }

    if ((ordersPagination.totalItems || 0) > 0) {
      suggestions.push({
        id: "track-orders",
        title: "Track active orders with live status",
        detail: `${undeliveredOrdersCount} order${undeliveredOrdersCount === 1 ? "" : "s"} currently active.`,
        moduleId: "orders",
      });
    }

    if (favoriteModuleIds.length < 3) {
      suggestions.push({
        id: "pin-favorites",
        title: "Pin your top modules for faster access",
        detail: "Use Favorites to keep your daily workflows one tap away.",
        moduleId: "",
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        id: "explore-modules",
        title: "Explore one new module today",
        detail: "Fresh usage signals help unlock more relevant recommendations.",
        moduleId: "",
      });
    }

    return suggestions.slice(0, 3);
  }, [
    cartItemCount,
    favoriteModuleIds.length,
    hasPendingIssues,
    ordersPagination.totalItems,
    pendingIssueLabel,
    undeliveredOrdersCount,
  ]);
  const currentHour = new Date().getHours();
  const dayPeriod = currentHour < 12 ? "morning" : currentHour < 18 ? "afternoon" : "evening";
  const greetingName = (currentUser?.name || "there").split(" ")[0];

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

  const toggleModuleFavorite = (moduleId) => {
    const normalizedId = String(moduleId || "").trim().toLowerCase();
    if (!normalizedId) {
      return;
    }

    setFavoriteModuleIds((currentIds) =>
      currentIds.includes(normalizedId)
        ? currentIds.filter((id) => id !== normalizedId)
        : [...currentIds, normalizedId]
    );
  };

  const isFavoriteModule = (moduleId) =>
    favoriteModuleIds.includes(String(moduleId || "").trim().toLowerCase());

  const handleModuleCardActivation = (card) => {
    if (card.cardType === "external") {
      openExternalLink(card.url);
      return;
    }
    handleModuleNavigation(card.id);
  };

  const handleModuleCardKeyDown = (event, card) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleModuleCardActivation(card);
    }
  };

  const filteredModules = MODULE_CONFIG
    .map((module) => ({
      ...module,
      name: t(module.nameKey, module.fallbackName),
      description: t(module.descriptionKey, module.fallbackDescription),
    }))
    .filter((module) => {
      // Only show modules explicitly enabled by admin toggles.
      if (!hasRecognizedEnabledModules) {
        return false;
      }

      return normalizedEnabledModuleIds.includes(module.id);
    })
    .filter(
      (module) =>
        !isSeller ||
        module.id === "finance" ||
        module.id === "freelancer" ||
        module.id === "billpay" ||
        module.id === "skilllearning" ||
        module.id === "resumebuilder" ||
        module.id === "photostudio" ||
        module.id === "kidsstoryvideomaker" ||
        module.id === "promptvideogenerator" ||
        module.id === "karaokeduet" ||
        module.id === "beautyai" ||
        module.id === "kitchen" ||
        module.id === "aibusinessos" ||
        module.id === "gulfjobsmigration" ||
        module.id === "womensafetyfamily" ||
        module.id === "devotionalecosystem" ||
        module.id === "hyperlocalaicommerce" ||
        module.id === "nilaaistudio" ||
        module.id === "trustlayer" ||
        module.id === "devadarshan" ||
        module.id === "localservices" ||
        module.id === "hyperlocal" ||
        subscribedCategoryIds.includes(module.id)
    );
  const visibleCards = useMemo(
    () => [
      ...filteredModules.map((module) => ({ ...module, cardType: "module" })),
      ...customLinks.map((link) => ({
        id: link.id,
        name: link.title,
        description: link.description || link.url,
        icon: "external",
        cardType: "external",
        url: link.url,
      })),
    ],
    [customLinks, filteredModules]
  );
  const favoriteModuleCards = useMemo(() => {
    const favoriteLookup = new Set(favoriteModuleIds);
    return visibleCards.filter(
      (card) => card.cardType === "module" && favoriteLookup.has(String(card.id || "").trim().toLowerCase())
    );
  }, [favoriteModuleIds, visibleCards]);

  useEffect(() => {
    if (favoriteModuleCards.length === 0 && showFavoriteManager) {
      setShowFavoriteManager(false);
    }
  }, [favoriteModuleCards.length, showFavoriteManager]);

  const prioritizedVisibleCards = useMemo(() => {
    if (isSeller) {
      return visibleCards;
    }

    const favoriteLookup = new Set(favoriteModuleIds);
    return [...visibleCards].sort((leftCard, rightCard) => {
      const leftFavorite =
        leftCard.cardType === "module" &&
        favoriteLookup.has(String(leftCard.id || "").trim().toLowerCase());
      const rightFavorite =
        rightCard.cardType === "module" &&
        favoriteLookup.has(String(rightCard.id || "").trim().toLowerCase());
      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1;
      }
      return String(leftCard.name || "").localeCompare(String(rightCard.name || ""));
    });
  }, [isSeller, favoriteModuleIds, visibleCards]);

  const activeModuleCount = visibleCards.filter((card) => card.cardType === "module").length;
  const favoriteModuleCount = favoriteModuleCards.length;
  const normalizedSearch = moduleSearch.trim().toLowerCase();
  const getModuleCategory = (card) => MODULE_CATEGORY_MAP[card.id] || "core";
  const enabledModuleLookup = useMemo(
    () => new Set(normalizedEnabledModuleIds),
    [normalizedEnabledModuleIds]
  );

  const getModuleValueBadge = (moduleId) =>
    MODULE_VALUE_BADGE_BY_ID[moduleId] ||
    (MODULE_CATEGORY_MAP[moduleId] === "business"
      ? "Growth-ready"
      : MODULE_CATEGORY_MAP[moduleId] === "travel"
        ? "Time-saving"
        : MODULE_CATEGORY_MAP[moduleId] === "utility"
          ? "Daily essential"
          : "Live updates");

  const getModuleContextLine = (moduleCard, isFavorite) => {
    if (moduleCard.cardType === "external") {
      return "Shared custom shortcut";
    }
    if (isFavorite) {
      return "Pinned as favorite";
    }
    if (enabledModuleLookup.has(moduleCard.id)) {
      return "Enabled on platform";
    }
    if (subscribedCategoryIds.includes(moduleCard.id)) {
      return "From your category subscriptions";
    }
    return "Recommended for your profile";
  };

  const userCategoryCounts = useMemo(
    () =>
      MODULE_CATEGORY_META.reduce((acc, category) => {
        if (category.id === "all") {
          acc[category.id] = visibleCards.length;
          return acc;
        }
        acc[category.id] = visibleCards.filter(
          (card) => getModuleCategory(card) === category.id
        ).length;
        return acc;
      }, {}),
    [visibleCards]
  );

  const moduleSignalCounts = useMemo(() => {
    const baseModuleCards = prioritizedVisibleCards.filter((card) => card.cardType === "module");
    const favoriteLookup = new Set(favoriteModuleIds);
    return {
      all: baseModuleCards.length,
      favorites: baseModuleCards.filter((card) => favoriteLookup.has(String(card.id || "").trim().toLowerCase())).length,
      enabled: baseModuleCards.filter((card) => enabledModuleLookup.has(card.id)).length,
      subscriptions: baseModuleCards.filter((card) => subscribedCategoryIds.includes(card.id)).length,
    };
  }, [enabledModuleLookup, favoriteModuleIds, prioritizedVisibleCards, subscribedCategoryIds]);

  const visibleCardsForDisplay = useMemo(() => {
    const favoriteLookup = new Set(favoriteModuleIds);
    const filteredCards = prioritizedVisibleCards.filter((card) => {
        const searchMatch =
          !normalizedSearch ||
          String(card.name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(card.description || "")
            .toLowerCase()
            .includes(normalizedSearch);
        const categoryMatch =
          activeModuleCategory === "all" || getModuleCategory(card) === activeModuleCategory;
        const signalMatch =
          activeModuleSignalFilter === "all" ||
          (activeModuleSignalFilter === "favorites" &&
            favoriteLookup.has(String(card.id || "").trim().toLowerCase())) ||
          (activeModuleSignalFilter === "enabled" && enabledModuleLookup.has(card.id)) ||
          (activeModuleSignalFilter === "subscriptions" && subscribedCategoryIds.includes(card.id));
        return searchMatch && categoryMatch && signalMatch;
      });

    if (moduleSortMode === "az") {
      return [...filteredCards].sort((leftCard, rightCard) =>
        String(leftCard.name || "").localeCompare(String(rightCard.name || ""))
      );
    }

    return filteredCards;
  }, [
    activeModuleCategory,
    activeModuleSignalFilter,
    enabledModuleLookup,
    favoriteModuleIds,
    moduleSortMode,
    normalizedSearch,
    prioritizedVisibleCards,
    subscribedCategoryIds,
  ]);

  const cardsForGridDisplay = isSeller ? visibleCards : visibleCardsForDisplay;
  const sellerAnalyticsSnapshot = {
    successRate: Number(dashboardAnalytics?.successRate?.successRate || 0),
    failedDeliveries: Number(dashboardAnalytics?.successRate?.failedDeliveries || 0),
    pendingDeliveries: Number(dashboardAnalytics?.successRate?.pendingDeliveries || 0),
    openFulfillments: Number(dashboardAnalytics?.successRate?.pendingDeliveries || sellerFulfillmentPendingCount || 0),
  };
  const sellerAtRiskActions = sellerAnalyticsSnapshot.failedDeliveries + sellerAnalyticsSnapshot.pendingDeliveries;
  const nextBestAction = (() => {
    if (hasPendingIssues) {
      return {
        title: "Resolve pending issues",
        description: pendingIssueLabel,
        cta: "Resolve pending issues",
        action: () => handleOrdersCardClick(),
      };
    }

    if ((ordersPagination.totalItems || 0) > 0) {
      return {
        title: "Keep deliveries on schedule",
        description: "Track recent orders and enable live updates for timely handoffs.",
        cta: "Track orders",
        action: () => handleOrdersCardClick(),
      };
    }

    return {
      title: "Discover services that fit your day",
      description: "Explore enabled modules and pin favorites for a faster workflow.",
      cta: "Explore modules",
      action: () =>
        exploreServicesRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
    };
  })();

  // Example: show analytics data at the top (customize as needed)
  return (
    <div className={`dashboard-container ${!isSeller ? "dashboard-container-compact" : ""}`}>
        {isSeller && (
          <section className="dashboard-analytics-panel" aria-label="Seller real-time analytics">
            <div className="dashboard-analytics-panel-header">
              <strong>Real-Time Analytics</strong>
              <span>
                Last updated {formatRelativeUpdateTime(dashboardAnalyticsUpdatedAt)}
              </span>
            </div>
            <div className="dashboard-analytics-cards">
              <article className="dashboard-analytics-card">
                <h4>Success rate</h4>
                <p>{sellerAnalyticsSnapshot.successRate}%</p>
              </article>
              <article className="dashboard-analytics-card">
                <h4>Open fulfillments</h4>
                <p>{sellerAnalyticsSnapshot.openFulfillments}</p>
              </article>
              <article className="dashboard-analytics-card attention">
                <h4>Failed / pending actions</h4>
                <p>{sellerAtRiskActions}</p>
              </article>
            </div>
          </section>
        )}
        {isLoading ? (
          <div className="premium-loading dashboard-section-skeletons">
            <div className="loading-shimmer">
              <div className="shimmer-card welcome-shimmer"></div>
              <div className="shimmer-grid dashboard-kpi-skeleton-grid">
                <div className="shimmer-card stat-shimmer"></div>
                <div className="shimmer-card stat-shimmer"></div>
                <div className="shimmer-card stat-shimmer"></div>
                <div className="shimmer-card stat-shimmer"></div>
              </div>
              <div className="shimmer-grid dashboard-workspace-skeleton-grid">
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
              </div>
              <div className="shimmer-grid dashboard-module-skeleton-grid">
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
                <div className="shimmer-card module-shimmer"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                    <p>Cart items</p>
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
                    <h3>{pendingIssueCount}</h3>
                    <p>Pending delivery/refund issues</p>
                    <span className="stat-chip stat-chip-attention">
                      {hasPendingIssues ? "Resolve active issues" : "All clear right now"}
                    </span>
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
                    <p>Orders placed</p>
                    <span className="stat-chip">History and tracking</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="stat-card stat-card-button"
                  onClick={() =>
                    exploreServicesRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <span className="stat-icon"><Icon type="user" className="stat-icon-svg" /></span>
                  <div className="stat-content">
                    <h3>{favoriteModuleCount}</h3>
                    <p>Favorites</p>
                    <span className="stat-chip">Quick launch set</span>
                  </div>
                </button>
              </div>
            )}

            {!isSeller && (
              <section className="next-best-action-card" aria-label="Next best action">
                <div className="next-best-action-copy">
                  <p className="next-best-action-kicker">Next Best Action</p>
                  <h3>{nextBestAction.title}</h3>
                  <p>{nextBestAction.description}</p>
                </div>
                <button
                  type="button"
                  className="next-best-action-button"
                  onClick={nextBestAction.action}
                >
                  {nextBestAction.cta}
                </button>
              </section>
            )}

            {!isSeller && (
              <section className="workspace-realfeel" aria-label="Live workspace overview">
                <div className="workspace-realfeel-header">
                  <p className="workspace-kicker">Today&apos;s Workspace</p>
                  <h2>
                    Good {dayPeriod}, {greetingName}
                  </h2>
                  <p>
                    Your dashboard is synced with live platform signals and {activeModuleCount}+ active
                    service modules.
                  </p>
                </div>
                <div className="workspace-realfeel-grid">
                  <article className="workspace-realfeel-card workspace-realfeel-card-trend">
                    <div className="workspace-card-title-row">
                      <h3>Momentum Pulse</h3>
                      <button
                        type="button"
                        className="workspace-legend-toggle"
                        onClick={() => setShowMomentumLegend((currentValue) => !currentValue)}
                        aria-expanded={showMomentumLegend}
                        aria-controls="momentum-pulse-legend"
                      >
                        Legend
                      </button>
                    </div>
                    <p>Engagement trend across your recent platform activity.</p>
                    {showMomentumLegend && (
                      <div id="momentum-pulse-legend" className="workspace-legend-tooltip">
                        <span><strong>Low:</strong> needs attention</span>
                        <span><strong>Mid:</strong> stable activity</span>
                        <span><strong>High:</strong> strong momentum</span>
                      </div>
                    )}
                    <div className="workspace-trend-bars" aria-hidden="true">
                      {trendSeries.map((value, index) => (
                        <span
                          key={`trend-${index}`}
                          className="workspace-trend-bar"
                          style={{ height: `${Math.max(18, value)}%` }}
                        />
                      ))}
                    </div>
                  </article>
                  <article className="workspace-realfeel-card">
                    <h3>Nearby Activity</h3>
                    <ul className="workspace-list">
                      {nearbyActivity.map((activity) => (
                        <li key={activity.id}>
                          <button
                            type="button"
                            className="workspace-list-action"
                            onClick={() =>
                              activity.moduleId
                                ? handleModuleNavigation(activity.moduleId)
                                : undefined
                            }
                            disabled={!activity.moduleId}
                          >
                            <strong>{activity.title}</strong>
                            <span>{activity.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                  <article className="workspace-realfeel-card">
                    <h3>AI Suggestions</h3>
                    <ul className="workspace-list">
                      {aiSuggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            className="workspace-list-action"
                            onClick={() =>
                              suggestion.moduleId
                                ? handleModuleNavigation(suggestion.moduleId)
                                : undefined
                            }
                            disabled={!suggestion.moduleId}
                          >
                            <strong>{suggestion.title}</strong>
                            <span>{suggestion.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              </section>
            )}

      <div className={!isSeller ? "dashboard-main-grid" : ""}>
        <div className="modules-section" ref={exploreServicesRef}>
          <h2 className="section-title-polished">{isSeller ? "My Business Categories" : t("dashboard.exploreServices", "Explore Our Services")}</h2>
          {!isSeller && favoriteModuleCards.length > 0 && (
            <div className="favorite-modules-strip" aria-label="Favorite modules quick access">
              <div className="favorite-modules-header">
                <span className="favorite-modules-label">Favorites</span>
                <button
                  type="button"
                  className="favorite-manage-btn"
                  onClick={() => setShowFavoriteManager((currentValue) => !currentValue)}
                  aria-expanded={showFavoriteManager}
                >
                  {showFavoriteManager ? "Close" : "Manage"}
                </button>
              </div>
              <div className="favorite-modules-list">
                {favoriteModuleCards.slice(0, 8).map((module) => (
                  <button
                    key={`favorite-${module.id}`}
                    type="button"
                    className="favorite-module-chip"
                    onClick={() => handleModuleNavigation(module.id)}
                  >
                    <Icon type={module.icon} className="favorite-module-chip-icon" />
                    <span>{module.name}</span>
                  </button>
                ))}
              </div>
              {showFavoriteManager && (
                <div className="favorite-manager-panel" role="region" aria-label="Manage favorite modules">
                  {favoriteModuleCards.map((module) => (
                    <div key={`favorite-manage-${module.id}`} className="favorite-manager-item">
                      <button
                        type="button"
                        className="favorite-manager-open"
                        onClick={() => handleModuleNavigation(module.id)}
                      >
                        <Icon type={module.icon} className="favorite-module-chip-icon" />
                        <span>{module.name}</span>
                      </button>
                      <button
                        type="button"
                        className="favorite-manager-remove"
                        onClick={() => toggleModuleFavorite(module.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!isSeller && (
            <div className="module-discovery-tools" aria-label="Module discovery tools">
              <div className="module-discovery-top-row">
                <input
                  type="search"
                  className="module-search-input"
                  placeholder="Search modules..."
                  value={moduleSearch}
                  onChange={(event) => setModuleSearch(event.target.value)}
                  aria-label="Search modules"
                />
                <div className="module-sort-toggle" role="group" aria-label="Sort modules">
                  <button
                    type="button"
                    className={`module-sort-btn ${moduleSortMode === "recommended" ? "active" : ""}`}
                    onClick={() => setModuleSortMode("recommended")}
                  >
                    Recommended
                  </button>
                  <button
                    type="button"
                    className={`module-sort-btn ${moduleSortMode === "az" ? "active" : ""}`}
                    onClick={() => setModuleSortMode("az")}
                  >
                    A-Z
                  </button>
                </div>
              </div>
              <div className="module-signal-filters" role="group" aria-label="Module signal filters">
                <button
                  type="button"
                  className={`module-signal-filter ${activeModuleSignalFilter === "all" ? "active" : ""}`}
                  onClick={() => setActiveModuleSignalFilter("all")}
                >
                  All <small>{moduleSignalCounts.all}</small>
                </button>
                <button
                  type="button"
                  className={`module-signal-filter ${activeModuleSignalFilter === "favorites" ? "active" : ""}`}
                  onClick={() => setActiveModuleSignalFilter("favorites")}
                >
                  Favorites <small>{moduleSignalCounts.favorites}</small>
                </button>
                <button
                  type="button"
                  className={`module-signal-filter ${activeModuleSignalFilter === "enabled" ? "active" : ""}`}
                  onClick={() => setActiveModuleSignalFilter("enabled")}
                >
                  Enabled <small>{moduleSignalCounts.enabled}</small>
                </button>
                <button
                  type="button"
                  className={`module-signal-filter ${activeModuleSignalFilter === "subscriptions" ? "active" : ""}`}
                  onClick={() => setActiveModuleSignalFilter("subscriptions")}
                >
                  Subscribed <small>{moduleSignalCounts.subscriptions}</small>
                </button>
              </div>
              <div className="module-category-tabs" role="tablist" aria-label="Module categories">
                {MODULE_CATEGORY_META.map((category) => {
                  const isActive = activeModuleCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`module-category-tab ${isActive ? "active" : ""}`}
                      onClick={() => setActiveModuleCategory(category.id)}
                    >
                      <span>{category.label}</span>
                      <small>{userCategoryCounts[category.id] || 0}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="modules-grid">
            {cardsForGridDisplay.map((module) => {
              const showFavoriteToggle = !isSeller && module.cardType === "module";
              const isFavorite = showFavoriteToggle && isFavoriteModule(module.id);
              const moduleContextLine = getModuleContextLine(module, isFavorite);
              const moduleValueBadge =
                module.cardType === "module"
                  ? getModuleValueBadge(module.id)
                  : "External shortcut";
              const moduleCardStyle =
                module.id === "education"
                  ? { background: "linear-gradient(135deg, #ff8b58 0%, #1f6fff 52%, #0fa57f 100%)" }
                  : { background: module.gradient };
              return (
              <article
                role="button"
                tabIndex={0}
                className={`module-card polished micro-glow ${isSeller ? "seller-module-card" : ""} ${
                  module.id === "education" ? "education-module-card" : ""
                }`}
                key={module.id}
                onClick={() => handleModuleCardActivation(module)}
                onKeyDown={(event) => handleModuleCardKeyDown(event, module)}
                style={moduleCardStyle}
              >
                {showFavoriteToggle && (
                  <button
                    type="button"
                    className={`module-card-favorite ${isFavorite ? "active" : ""}`}
                    aria-label={
                      isFavorite
                        ? `Remove ${module.name} from favorites`
                        : `Add ${module.name} to favorites`
                    }
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleModuleFavorite(module.id);
                    }}
                  >
                    {isFavorite ? "Fav" : "+"}
                  </button>
                )}
                <div className="module-hero-overlay" />
                <div className="module-stats-badge">{module.stats}</div>
                <div className="module-icon">
                  <Icon type={module.icon} className="module-icon-svg" />
                </div>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <p className="module-context-note">{moduleContextLine}</p>
                <span className="module-badge">
                  {moduleValueBadge}
                </span>
                <span className="module-action-hint">
                  {module.cardType === "external"
                    ? "Open link"
                    : isSeller
                      ? "Open workspace"
                      : t("common.explore", "Explore")}
                </span>
              </article>
            );
            })}
          </div>
          {isSeller && visibleCards.length === 0 && (
            <div className="recent-orders seller-empty-dashboard">
              <h2>No Subscribed Categories</h2>
              <p>Your seller account does not have any active subscribed categories visible right now.</p>
            </div>
          )}
          {!isSeller && visibleCardsForDisplay.length === 0 && (
            <div className="recent-orders seller-empty-dashboard">
              <h2>No matching modules</h2>
              <p>
                Try a different search term or switch category to find the service you need.
              </p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModuleSearch("")}
                >
                  Clear search
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveModuleCategory("all")}
                >
                  Switch to All categories
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleModuleNavigation("messaging")}
                >
                  Ask admin to enable access
                </button>
              </div>
            </div>
          )}
        </div>

        {!isSeller && (
          <>
            <div className="quick-actions-section">
              <h3>{t("dashboard.quickActions", "Quick Actions")}</h3>
              <div className="quick-actions-grid">
                <button 
                  type="button"
                  className="quick-action-btn quick-action-shop"
                  onClick={() => handleModuleNavigation("ecommerce")}
                >
                  <span className="qa-icon"><Icon type="ecommerce" className="qa-icon-svg" /></span>
                  <span className="qa-label">Shop</span>
                  <span className="qa-meta">Trending deals</span>
                </button>
                <button 
                  type="button"
                  className="quick-action-btn quick-action-messages"
                  onClick={() => handleModuleNavigation("messaging")}
                >
                  <span className="qa-icon"><Icon type="messaging" className="qa-icon-svg" /></span>
                  <span className="qa-label">Messages</span>
                  <span className="qa-meta">Unread first</span>
                </button>
                <button 
                  type="button"
                  className="quick-action-btn quick-action-browse"
                  onClick={() => handleModuleNavigation("classifieds")}
                >
                  <span className="qa-icon"><Icon type="classifieds" className="qa-icon-svg" /></span>
                  <span className="qa-label">Browse</span>
                  <span className="qa-meta">New listings</span>
                </button>
                <button
                  type="button"
                  className="quick-action-btn quick-action-education"
                  onClick={() => handleModuleNavigation("education")}
                >
                  <span className="qa-icon"><Icon type="education" className="qa-icon-svg" /></span>
                  <span className="qa-label">Learn</span>
                  <span className="qa-meta">Courses & scholarships</span>
                </button>
                <button 
                  type="button"
                  className="quick-action-btn quick-action-food"
                  onClick={() => handleModuleNavigation("fooddelivery")}
                >
                  <span className="qa-icon"><Icon type="fooddelivery" className="qa-icon-svg" /></span>
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
                <div className="dashboard-empty-orders">
                  <p className="no-orders">
                    {t("dashboard.noOrders", "No orders yet. Start shopping!")}
                  </p>
                  <div className="empty-state-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleModuleNavigation("ecommerce")}
                    >
                      Explore shopping
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        exploreServicesRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                    >
                      Explore modules
                    </button>
                  </div>
                </div>
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

      {!isSeller && (
        <div className="dashboard-mobile-cta-bar" role="region" aria-label="Quick actions">
          <button
            type="button"
            className="dashboard-mobile-cta-btn primary"
            onClick={nextBestAction.action}
          >
            {nextBestAction.cta}
          </button>
          <button
            type="button"
            className="dashboard-mobile-cta-btn"
            onClick={() =>
              exploreServicesRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Explore modules
          </button>
        </div>
      )}

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


