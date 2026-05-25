import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./BusinessBuilder.css";

const BUSINESS_TYPES = [
  "Retail",
  "Service",
  "Food",
  "Education",
  "Health",
  "Travel",
  "RealEstate",
  "Beauty",
  "Fitness",
  "Other",
];

const MINIAPP_TYPES = [
  "Business Card",
  "Product Showcase",
  "Service Booking",
  "Store Locator",
  "Contact Form",
];

const WIZARD_STEPS = [
  { key: "businessIdea", title: "Business idea", placeholder: "What business do you want to start?" },
  { key: "targetCustomers", title: "Target customers", placeholder: "Who are your ideal customers?" },
  { key: "serviceArea", title: "Location / service area", placeholder: "City, district, or service radius" },
  { key: "plannedBudget", title: "Budget", placeholder: "How much can you invest initially?" },
  { key: "productsServices", title: "Products/services", placeholder: "List your key products or services" },
  { key: "pricingModel", title: "Pricing", placeholder: "How will you price your offering?" },
  { key: "marketingPlan", title: "Marketing plan", placeholder: "How will customers discover you?" },
  { key: "executionNotes", title: "Final business plan notes", placeholder: "Any final launch details or constraints" },
];

const GOVERNMENT_SCHEMES = [
  {
    id: "mudra",
    name: "PM Mudra Loan",
    fit: "Micro businesses and first-time entrepreneurs",
    supports: ["Retail", "Service", "Food", "Beauty", "Fitness", "Other"],
    budgetCeiling: 1000000,
    benefit: "Collateral-free loans through Shishu, Kishore, and Tarun categories.",
    tags: ["loan", "working capital"],
  },
  {
    id: "pmegp",
    name: "PMEGP",
    fit: "Manufacturing and service startups seeking subsidy support",
    supports: ["Retail", "Service", "Food", "Education", "Other"],
    budgetCeiling: 5000000,
    benefit: "Subsidy-linked credit for new micro-enterprise setup.",
    tags: ["subsidy", "new unit"],
  },
  {
    id: "msme",
    name: "MSME / Udyam Registration",
    fit: "All eligible micro/small/medium enterprises",
    supports: BUSINESS_TYPES,
    budgetCeiling: Infinity,
    benefit: "Improves access to tenders, bank loans, and government benefits.",
    tags: ["registration", "compliance"],
  },
  {
    id: "women",
    name: "Women Entrepreneur Support",
    fit: "Women-led businesses requiring credit or training support",
    supports: BUSINESS_TYPES,
    budgetCeiling: Infinity,
    benefit: "Special interest concessions and mentoring under women-focused schemes.",
    tags: ["women"],
    womenOnly: true,
  },
  {
    id: "kerala-startup",
    name: "Kerala Startup Mission Programs",
    fit: "Innovation-led startups in Kerala",
    supports: ["Service", "Education", "Health", "Travel", "RealEstate", "Other"],
    budgetCeiling: Infinity,
    benefit: "Incubation, grants, and market-linkage support through KSUM channels.",
    tags: ["kerala", "innovation"],
    keralaOnly: true,
  },
  {
    id: "scst",
    name: "SC/ST Entrepreneur Schemes",
    fit: "SC/ST-owned enterprises for credit and procurement support",
    supports: BUSINESS_TYPES,
    budgetCeiling: Infinity,
    benefit: "Targeted subsidy and credit support with priority procurement programs.",
    tags: ["scst"],
    scstOnly: true,
  },
  {
    id: "minority",
    name: "Minority Entrepreneur Schemes",
    fit: "Minority-owned startups and self-employment ventures",
    supports: BUSINESS_TYPES,
    budgetCeiling: Infinity,
    benefit: "Concessional loans and skilling support for minority entrepreneurs.",
    tags: ["minority"],
    minorityOnly: true,
  },
];

const INTEGRATION_SUGGESTIONS = {
  Food: ["Loan Assist for kitchen setup", "Freelancer Marketplace for menu design", "Job Portal for chef/helper hiring", "Business Services for FSSAI and GST", "Local Services listing for nearby orders"],
  Retail: ["Ecommerce module for catalog sales", "Classifieds for inventory clearance", "Loan Assist for stocking capital", "Freelancer Marketplace for store branding", "Business Services for GST and billing"],
  Service: ["Freelancer Marketplace for project partnerships", "Local Services for lead generation", "Business Services for legal contracts", "Job Portal for assistant hiring", "Ecommerce for prepaid service packages"],
  Education: ["Local Services for coaching discovery", "Freelancer Marketplace for content creators", "Job Portal for tutor recruitment", "Business Services for compliance setup", "Classifieds for used books/materials"],
  Health: ["Business Services for registration support", "Loan Assist for equipment funding", "Local Services for appointment leads", "Freelancer Marketplace for social media setup", "Job Portal for staff hiring"],
  Travel: ["Loan Assist for fleet expansion", "Freelancer Marketplace for ads and creatives", "Classifieds for travel packages", "Business Services for licensing", "Local Services for booking lead flow"],
  RealEstate: ["Classifieds for property demand generation", "Freelancer Marketplace for brochure design", "Job Portal for field executives", "Business Services for documentation", "Loan Assist for office setup"],
  Other: ["Loan Assist for startup capital", "Business Services for registration and tax", "Freelancer Marketplace for branding and digital setup", "Job Portal for early hiring", "Local Services for first customer traction"],
};

const DEFAULT_CHECKLIST = [
  { id: "register-business", title: "Register business", completed: false },
  { id: "create-logo", title: "Create logo and brand identity", completed: false },
  { id: "open-bank-account", title: "Open current bank account", completed: false },
  { id: "apply-loan", title: "Apply for eligible loan/scheme", completed: false },
  { id: "create-social", title: "Create social media business pages", completed: false },
  { id: "add-products", title: "Add products/services in mini app", completed: false },
  { id: "start-marketing", title: "Start first marketing campaign", completed: false },
];

const STORAGE_KEYS = {
  launchForm: "business_builder_launch_form_v2",
  costForm: "business_builder_cost_form_v2",
  checklist: "business_builder_checklist_v2",
  businessPlan: "business_builder_plan_v2",
  generatedDocs: "business_builder_generated_docs_v2",
  schemeProfile: "business_builder_scheme_profile_v2",
  builder10Form: "business_builder_10x_form_v1",
  builder10Plans: "business_builder_10x_plans_v1",
};

const INITIAL_BUSINESS_FORM = {
  businessName: "",
  businessType: "Retail",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressPincode: "",
  primaryColor: "#0f766e",
  secondaryColor: "#10b981",
};

const INITIAL_LAUNCH_FORM = {
  businessIdea: "",
  targetCustomers: "",
  serviceArea: "",
  plannedBudget: "",
  productsServices: "",
  pricingModel: "",
  marketingPlan: "",
  executionNotes: "",
};

const INITIAL_INVOICE_FORM = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerGSTIN: "",
  customerAddress: "",
  dueDate: "",
  discountAmount: 0,
  currency: "INR",
  notes: "",
  items: [
    {
      name: "Consulting",
      description: "Business setup support",
      quantity: 1,
      unitPrice: 1000,
      taxRate: 18,
    },
  ],
};

const INITIAL_MINIAPP_FORM = {
  appName: "",
  slug: "",
  appType: "Business Card",
  description: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  primaryColor: "#0f766e",
  secondaryColor: "#10b981",
};

const INITIAL_PRODUCT_FORM = {
  name: "",
  category: "",
  description: "",
  price: "",
  discountedPrice: "",
  stock: "",
};

const INITIAL_AI_ASSET_FORM = {
  assetType: "poster",
  prompt: "",
  offer: "",
  cta: "",
};

const INITIAL_COST_FORM = {
  rent: 0,
  staffSalary: 0,
  inventory: 0,
  marketing: 0,
  licenseCost: 0,
  equipment: 0,
  utilities: 0,
  otherMonthly: 0,
  expectedMonthlyRevenue: 0,
};

const INITIAL_DOCUMENT_FORM = {
  type: "Quotation",
  customerName: "",
  customerCompany: "",
  subject: "",
  lineItems: "",
  notes: "",
};

const INITIAL_SCHEME_PROFILE = {
  isWomenEntrepreneur: false,
  isKeralaBased: false,
  isSCSTEntrepreneur: false,
  isMinorityEntrepreneur: false,
};

const BUSINESS_BUILDER_10X_CATEGORIES = [
  "Ecommerce",
  "Food",
  "Services",
  "Tourism",
  "Healthcare",
  "Education",
  "Technology",
  "Beauty",
];

const INITIAL_BUILDER10_FORM = {
  businessName: "",
  category: "Ecommerce",
  location: "Kerala",
  targetCustomers: "",
  investment: 50000,
  monthlyTarget: 100000,
  language: "English",
};

const BUSINESS_BUILDER_10X_UPGRADE_MAP = [
  { area: "Idea Builder", upgrade: "Business idea, category, and target customers", status: "ready" },
  { area: "Brand Kit", upgrade: "Name, tagline, logo prompt, and color palette", status: "ready" },
  { area: "Legal Setup", upgrade: "GST, Udyam, and company structure checklist", status: "ready" },
  { area: "Finance", upgrade: "Startup cost view, revenue model, and monthly target", status: "ready" },
  { area: "Documents", upgrade: "Business plan docs, pitch summary, and invoice flows", status: "ready" },
  { area: "Launch", upgrade: "30-day action roadmap with execution checklist", status: "ready" },
  { area: "AI", upgrade: "Plan generation connected to OpenAI-backed APIs", status: "next" },
  { area: "Monetization", upgrade: "Premium plan exports, legal leads, and referral engine", status: "next" },
];

const BUSINESS_PLAN_SECTIONS = [
  { key: "businessSummary", label: "Business summary" },
  { key: "marketAnalysis", label: "Market analysis" },
  { key: "competitorAnalysis", label: "Competitor analysis" },
  { key: "revenueModel", label: "Revenue model" },
  { key: "costEstimation", label: "Cost estimation" },
  { key: "profitProjection", label: "Profit projection" },
  { key: "swot", label: "SWOT analysis" },
  { key: "roadmap90", label: "3-month roadmap" },
  { key: "roadmap180", label: "6-month roadmap" },
];

const TAB_CONFIG = [
  { id: "dashboard", label: "Growth Dashboard", subtitle: "Readiness KPIs, milestones, and next best action." },
  { id: "wizard", label: "Launch Wizard", subtitle: "Guided inputs from business idea to execution details." },
  { id: "ai-plan", label: "AI Plan Generator", subtitle: "Generate strategy, roadmap, and brand assets." },
  { id: "builder10x", label: "10X Builder", subtitle: "Brand kit + legal + finance + launch roadmap in one panel." },
  { id: "cost", label: "Startup Cost", subtitle: "Project investment, burn rate, and break-even window." },
  { id: "schemes", label: "Scheme Hub", subtitle: "Find subsidy, loan, and eligibility-based opportunities." },
  { id: "documents", label: "Document Generator", subtitle: "Produce operational and sales-ready business docs." },
  { id: "checklist", label: "Launch Checklist", subtitle: "Track practical execution progress before scaling." },
  { id: "overview", label: "Business Profile", subtitle: "Maintain business identity and contact standards." },
  { id: "invoices", label: "Invoice Studio", subtitle: "Create invoices and distribute downloadable PDFs." },
  { id: "miniapps", label: "Mini App Builder", subtitle: "Launch mini-app surfaces for customer discovery." },
  { id: "ops360", label: "360 Operations", subtitle: "Control entitlements, assets, products, and funnel ops." },
];

const HEADER_HIGHLIGHTS = [
  "Unified control plane for SME growth",
  "Built-in AI + mini app + billing workflows",
  "Mobile-first execution with premium UX",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "checkout",
  "dashboard",
  "help",
  "login",
  "logout",
  "orders",
  "payment",
  "public",
  "settings",
  "support",
]);

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const parseNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const safeParse = (value, fallback) => {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const hasValue = (value) => {
  if (value == null) return false;
  if (typeof value === "number") return value > 0;
  return String(value).trim().length > 0;
};

const loadFromStorage = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  return safeParse(window.localStorage.getItem(key), fallback);
};

const buildScopedStorageKey = (key, businessId) => `${key}__${businessId || "draft"}`;

const loadScopedState = (key, businessId, fallback) => {
  return loadFromStorage(buildScopedStorageKey(key, businessId), fallback);
};

const cleanSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const buildErrorMessage = (error, fallback) => {
  const apiMessage = error?.response?.data?.message;
  if (apiMessage && typeof apiMessage === "string") {
    return apiMessage;
  }
  return fallback;
};

const validateBusinessForm = (form = {}) => {
  const errors = {};
  if (!hasValue(form.businessName)) {
    errors.businessName = "Business name is required.";
  }
  if (!hasValue(form.phone)) {
    errors.phone = "Phone number is required.";
  } else if (!PHONE_REGEX.test(String(form.phone).trim())) {
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  }
  if (!hasValue(form.email)) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(String(form.email).trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (hasValue(form.gstin) && !GSTIN_REGEX.test(String(form.gstin).trim().toUpperCase())) {
    errors.gstin = "Enter a valid GSTIN format.";
  }
  if (hasValue(form.addressPincode) && !PINCODE_REGEX.test(String(form.addressPincode).trim())) {
    errors.addressPincode = "PIN code must be 6 digits.";
  }
  return errors;
};

const validateInvoiceForm = (form = {}) => {
  const errors = {};
  const itemErrors = [];
  if (!hasValue(form.customerName)) {
    errors.customerName = "Customer name is required.";
  }
  if (!hasValue(form.customerPhone) && !hasValue(form.customerEmail)) {
    errors.customerContact = "Add at least phone or email.";
  }
  if (hasValue(form.customerPhone) && !PHONE_REGEX.test(String(form.customerPhone).trim())) {
    errors.customerPhone = "Enter a valid 10-digit Indian mobile number.";
  }
  if (hasValue(form.customerEmail) && !EMAIL_REGEX.test(String(form.customerEmail).trim())) {
    errors.customerEmail = "Enter a valid email address.";
  }
  if (hasValue(form.customerGSTIN) && !GSTIN_REGEX.test(String(form.customerGSTIN).trim().toUpperCase())) {
    errors.customerGSTIN = "Enter a valid GSTIN format.";
  }
  if (!hasValue(form.dueDate)) {
    errors.dueDate = "Due date is required.";
  }
  if (!Array.isArray(form.items) || form.items.length === 0) {
    errors.items = "Add at least one invoice item.";
  } else {
    form.items.forEach((item, index) => {
      const currentErrors = {};
      if (!hasValue(item.name) && !hasValue(item.description)) {
        currentErrors.name = "Item name is required.";
      }
      if (Number(item.quantity || 0) <= 0) {
        currentErrors.quantity = "Quantity must be at least 1.";
      }
      if (Number(item.unitPrice || 0) < 0) {
        currentErrors.unitPrice = "Unit price cannot be negative.";
      }
      if (Number(item.taxRate || 0) < 0) {
        currentErrors.taxRate = "Tax cannot be negative.";
      }
      itemErrors[index] = currentErrors;
    });
  }
  return { errors, itemErrors };
};

const validateMiniAppForm = (form = {}) => {
  const errors = {};
  const slug = cleanSlug(form.slug || form.appName);
  if (!hasValue(form.appName)) {
    errors.appName = "App display name is required.";
  }
  if (!hasValue(slug)) {
    errors.slug = "App slug is required.";
  } else if (slug.length < 3 || slug.length > 40) {
    errors.slug = "Slug must be between 3 and 40 characters.";
  } else if (!SLUG_REGEX.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and single hyphens only.";
  } else if (RESERVED_SLUGS.has(slug)) {
    errors.slug = "This slug is reserved. Choose a different one.";
  }
  if (hasValue(form.email) && !EMAIL_REGEX.test(String(form.email).trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (hasValue(form.phone) && !PHONE_REGEX.test(String(form.phone).trim())) {
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  }
  return { errors, slug };
};

const validateAiAssetForm = (form = {}) => {
  const errors = {};
  if (!hasValue(form.prompt)) {
    errors.prompt = "Prompt is required to generate an asset.";
  }
  return errors;
};

const buildPlanFromInputs = ({ businessForm, launchForm, costForm }) => {
  const businessName = businessForm.businessName || "Your business";
  const businessType = businessForm.businessType || "business";
  const idea = launchForm.businessIdea || "a focused local business";
  const audience = launchForm.targetCustomers || "local customers";
  const serviceArea = launchForm.serviceArea || "your primary area";
  const products = launchForm.productsServices || "core services";
  const pricingModel = launchForm.pricingModel || "value-based pricing";

  const oneTimeInvestment = parseNumber(costForm.inventory) + parseNumber(costForm.licenseCost) + parseNumber(costForm.equipment);
  const monthlyExpenses =
    parseNumber(costForm.rent) +
    parseNumber(costForm.staffSalary) +
    parseNumber(costForm.marketing) +
    parseNumber(costForm.utilities) +
    parseNumber(costForm.otherMonthly);

  const targetRevenue = Math.max(parseNumber(costForm.expectedMonthlyRevenue), monthlyExpenses * 1.35);
  const projectedProfit = targetRevenue - monthlyExpenses;
  const breakEvenMonths =
    projectedProfit > 0
      ? Math.ceil(oneTimeInvestment / projectedProfit)
      : null;

  return {
    generatedAt: new Date().toISOString(),
    businessSummary: `${businessName} is a ${businessType.toLowerCase()} venture focused on ${idea}. It targets ${audience} in ${serviceArea} and plans to launch with ${products}.`,
    marketAnalysis: `Demand is likely to come from recurring local needs and digital discovery. Focus on quick customer feedback loops, neighborhood partnerships, and online listings to validate demand in ${serviceArea}.`,
    competitorAnalysis: `Top competitors will include existing ${businessType.toLowerCase()} operators, social-media sellers, and price-focused informal players. Differentiate through consistent quality, transparent pricing, and faster response time.`,
    revenueModel: `Primary revenue will come from ${products}. Pricing strategy: ${pricingModel}. Secondary revenue can come from add-on services, subscriptions, bundles, and repeat-customer loyalty campaigns.`,
    costEstimation: `Estimated one-time setup cost: ${formatINR(oneTimeInvestment)}. Estimated monthly operating cost: ${formatINR(monthlyExpenses)}. Main cost drivers are staff, rent, and promotion.`,
    profitProjection: `Estimated monthly revenue target: ${formatINR(targetRevenue)}. Estimated monthly profit: ${formatINR(projectedProfit)}.${breakEvenMonths ? ` Projected break-even: ${breakEvenMonths} months.` : " Improve margin or reduce fixed costs to reach break-even faster."}`,
    swot: {
      strengths: [
        "Localized customer understanding",
        "Agile decision-making with low overhead",
        "Direct owner control on quality",
      ],
      weaknesses: [
        "Initial brand visibility is limited",
        "Cash-flow pressure in early months",
        "Dependency on founder execution bandwidth",
      ],
      opportunities: [
        "Digital marketplace onboarding",
        "Government subsidy/loan support",
        "Upsell through premium services",
      ],
      threats: [
        "Price competition from established players",
        "Seasonal demand fluctuations",
        "Rising customer acquisition cost",
      ],
    },
    roadmap90: [
      "Month 1: Finalize registration, branding, and pilot customer set.",
      "Month 2: Launch digital channels, collect testimonials, optimize pricing.",
      "Month 3: Stabilize operations, track unit economics, and improve conversion rates.",
    ],
    roadmap180: [
      "Month 4: Expand channel mix and referral partnerships.",
      "Month 5: Add one premium/high-margin offering and automate follow-ups.",
      "Month 6: Prepare scale plan, hire key support role, and formalize recurring revenue strategy.",
    ],
    confidenceNote: `Plan tuned for ${businessType} in ${serviceArea}. Re-run after real sales data for sharper projections.`,
    oneTimeInvestment,
    monthlyExpenses,
    targetRevenue,
    projectedProfit,
    breakEvenMonths,
  };
};

const generateBrandIdeas = ({ businessForm, launchForm }) => {
  const businessType = businessForm.businessType || "Business";
  const base = (businessForm.businessName || launchForm.businessIdea || "Nila Ventures").split(" ")[0];
  const audience = launchForm.targetCustomers || "local customers";

  return {
    nameIdeas: [
      `${base} Prime ${businessType}`,
      `${base} Smart Hub`,
      `${base} Growth Studio`,
    ],
    logoSuggestions: [
      `Minimal monogram logo with ${businessForm.primaryColor} accent and geometric icon`,
      "Rounded badge logo symbolizing trust and local presence",
      "Wordmark + icon combination optimized for social profile images",
    ],
    taglines: [
      `Built for ${audience}`,
      "Grow local. Deliver better.",
      "Professional service, neighborhood trust.",
    ],
    brandColors: [
      businessForm.primaryColor || "#0f766e",
      businessForm.secondaryColor || "#10b981",
      "#0f172a",
      "#f8fafc",
    ],
    posterCopy: `Grand launch offer available now. Contact us today for trusted ${businessType.toLowerCase()} support.`,
    socialCaption: "We are now live. Practical solutions, transparent pricing, and fast support for every customer. Message us to get started today.",
  };
};

const createDocumentContent = ({ type, businessForm, launchForm, documentForm, plan }) => {
  const businessName = businessForm.businessName || "Business Name";
  const customer = documentForm.customerName || "Customer";
  const subject = documentForm.subject || `${type} for ${customer}`;
  const today = new Date().toLocaleDateString("en-IN");
  const lineItems = documentForm.lineItems || "- Item 1\n- Item 2";
  const notes = documentForm.notes || "Thank you for your business.";

  if (type === "Quotation") {
    return `${businessName}\nQuotation\nDate: ${today}\nTo: ${customer}\n\nSubject: ${subject}\n\nQuoted Items:\n${lineItems}\n\nTerms:\n- Validity: 15 days\n- Payment: 50% advance\n\nNotes: ${notes}`;
  }

  if (type === "Receipt") {
    return `${businessName}\nReceipt\nDate: ${today}\nReceived From: ${customer}\n\nPurpose: ${subject}\n\nAmount Received: __________\nPayment Mode: __________\nTransaction Ref: __________\n\nAuthorized Signatory\n${businessName}`;
  }

  if (type === "Proposal") {
    return `${businessName}\nBusiness Proposal\nDate: ${today}\nClient: ${customer}\n\nObjective:\n${subject}\n\nScope:\n${lineItems}\n\nExecution Snapshot:\n${launchForm.executionNotes || "Phased delivery with milestone tracking."}\n\nEstimated Timeline:\n${plan?.roadmap90?.join("\n") || "To be finalized"}\n\nNotes: ${notes}`;
  }

  if (type === "GST Bill Format") {
    return `${businessName}\nGST Ready Bill Format\nDate: ${today}\nGSTIN: ${businessForm.gstin || "____________"}\nBill To: ${customer}\n\nDescription / HSN / Qty / Taxable Value / GST% / GST Amount / Total\n${lineItems}\n\nSubtotal: ______\nCGST: ______\nSGST: ______\nIGST (if applicable): ______\nGrand Total: ______\n\nAuthorized Signatory`;
  }

  if (type === "Brochure Content") {
    return `${businessName}\n${launchForm.businessIdea || "Business Overview"}\n\nWho We Serve:\n${launchForm.targetCustomers || "Customers looking for reliable local service."}\n\nWhat We Offer:\n${launchForm.productsServices || "Products and services tailored to customer needs."}\n\nWhy Choose Us:\n- Trusted quality\n- Transparent pricing\n- Fast support\n\nContact:\nPhone: ${businessForm.phone || "__________"}\nEmail: ${businessForm.email || "__________"}\nArea: ${launchForm.serviceArea || "__________"}`;
  }

  if (type === "Visiting Card Text") {
    return `${businessName}\n${launchForm.businessIdea || "Business Services"}\n${businessForm.phone || "Phone"} | ${businessForm.email || "Email"}\n${businessForm.website || "Website"}\n${launchForm.serviceArea || "Service Area"}\nTagline: ${generateBrandIdeas({ businessForm, launchForm }).taglines[1]}`;
  }

  return `${businessName}\n${type}\nDate: ${today}\n\n${subject}\n\n${lineItems}\n\n${notes}`;
};

const getNextAction = ({ businessForm, launchForm, plan, checklist }) => {
  if (!businessForm.businessName || !businessForm.phone || !businessForm.email) {
    return "Complete and save your business profile.";
  }

  const wizardIncomplete = WIZARD_STEPS.some((step) => !hasValue(launchForm[step.key]));
  if (wizardIncomplete) {
    return "Finish the launch wizard to unlock better plan quality.";
  }

  if (!plan) {
    return "Generate AI business plan and review roadmap.";
  }

  const pending = checklist.find((item) => !item.completed);
  if (pending) {
    return `Complete checklist task: ${pending.title}.`;
  }

  return "Create your first invoice or mini app listing to start execution.";
};

const map10xCategoryToBusinessType = (category) => {
  if (category === "Ecommerce") return "Retail";
  if (category === "Food") return "Food";
  if (category === "Services") return "Service";
  if (category === "Tourism") return "Travel";
  if (category === "Healthcare") return "Health";
  if (category === "Education") return "Education";
  if (category === "Beauty") return "Beauty";
  return "Other";
};

const BusinessBuilder = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [businessForm, setBusinessForm] = useState(INITIAL_BUSINESS_FORM);
  const [launchForm, setLaunchForm] = useState(() => loadScopedState(STORAGE_KEYS.launchForm, "", INITIAL_LAUNCH_FORM));
  const [wizardStep, setWizardStep] = useState(0);

  const [invoiceForm, setInvoiceForm] = useState(INITIAL_INVOICE_FORM);
  const [miniAppForm, setMiniAppForm] = useState(INITIAL_MINIAPP_FORM);
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [documentForm, setDocumentForm] = useState(INITIAL_DOCUMENT_FORM);

  const [costForm, setCostForm] = useState(() => loadScopedState(STORAGE_KEYS.costForm, "", INITIAL_COST_FORM));
  const [schemeProfile, setSchemeProfile] = useState(() => loadScopedState(STORAGE_KEYS.schemeProfile, "", INITIAL_SCHEME_PROFILE));
  const [checklist, setChecklist] = useState(() => loadScopedState(STORAGE_KEYS.checklist, "", DEFAULT_CHECKLIST));

  const [businessPlan, setBusinessPlan] = useState(() => loadScopedState(STORAGE_KEYS.businessPlan, "", null));
  const [brandingIdeas, setBrandingIdeas] = useState(null);
  const [documentPreview, setDocumentPreview] = useState("");
  const [generatedDocuments, setGeneratedDocuments] = useState(() => loadScopedState(STORAGE_KEYS.generatedDocs, "", []));
  const [builder10Form, setBuilder10Form] = useState(() => loadScopedState(STORAGE_KEYS.builder10Form, "", INITIAL_BUILDER10_FORM));
  const [builder10Plans, setBuilder10Plans] = useState(() => loadScopedState(STORAGE_KEYS.builder10Plans, "", []));
  const [builder10AiPlan, setBuilder10AiPlan] = useState(null);
  const [builder10Generating, setBuilder10Generating] = useState(false);

  const [businesses, setBusinesses] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [miniApps, setMiniApps] = useState([]);
  const [selectedMiniAppId, setSelectedMiniAppId] = useState("");
  const [miniAppProducts, setMiniAppProducts] = useState([]);
  const [miniAppOrders, setMiniAppOrders] = useState([]);
  const [miniAppFunnel, setMiniAppFunnel] = useState(null);
  const [businessAnalytics, setBusinessAnalytics] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState("free");
  const [aiAssetForm, setAiAssetForm] = useState(INITIAL_AI_ASSET_FORM);
  const [aiAssets, setAiAssets] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [creatingMiniApp, setCreatingMiniApp] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState("");
  const [generatingAsset, setGeneratingAsset] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState("");
  const [downloadingBuilderPdf, setDownloadingBuilderPdf] = useState(false);

  const [businessErrors, setBusinessErrors] = useState({});
  const [invoiceErrors, setInvoiceErrors] = useState({});
  const [invoiceItemErrors, setInvoiceItemErrors] = useState([]);
  const [miniAppErrors, setMiniAppErrors] = useState({});
  const [aiAssetErrors, setAiAssetErrors] = useState({});

  const workspaceScopeId = activeBusinessId || "draft";

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        await fetchBusiness();
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchDependentData = async () => {
      await Promise.all([
        fetchInvoices(),
        fetchMiniApps(),
        fetchEntitlements(),
        fetchBusinessAnalytics(),
        fetchAIAssets(),
      ]);
    };

    fetchDependentData();
  }, [activeBusinessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMiniAppId) {
      setMiniAppProducts([]);
      setMiniAppOrders([]);
      setMiniAppFunnel(null);
      return;
    }
    const fetchMiniAppOps = async () => {
      await Promise.all([fetchMiniAppProducts(selectedMiniAppId), fetchMiniAppOrders(selectedMiniAppId), fetchMiniAppFunnel(selectedMiniAppId)]);
    };
    fetchMiniAppOps();
  }, [selectedMiniAppId]);

  useEffect(() => {
    setLaunchForm(loadScopedState(STORAGE_KEYS.launchForm, workspaceScopeId, INITIAL_LAUNCH_FORM));
    setCostForm(loadScopedState(STORAGE_KEYS.costForm, workspaceScopeId, INITIAL_COST_FORM));
    setChecklist(loadScopedState(STORAGE_KEYS.checklist, workspaceScopeId, DEFAULT_CHECKLIST));
    setBusinessPlan(loadScopedState(STORAGE_KEYS.businessPlan, workspaceScopeId, null));
    setGeneratedDocuments(loadScopedState(STORAGE_KEYS.generatedDocs, workspaceScopeId, []));
    setSchemeProfile(loadScopedState(STORAGE_KEYS.schemeProfile, workspaceScopeId, INITIAL_SCHEME_PROFILE));
    setBuilder10Form(loadScopedState(STORAGE_KEYS.builder10Form, workspaceScopeId, INITIAL_BUILDER10_FORM));
    setBuilder10Plans(loadScopedState(STORAGE_KEYS.builder10Plans, workspaceScopeId, []));
    setBuilder10AiPlan(null);
    setDocumentPreview("");
    setWizardStep(0);
    setBusinessErrors({});
    setInvoiceErrors({});
    setInvoiceItemErrors([]);
    setMiniAppErrors({});
    setAiAssetErrors({});
  }, [workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.launchForm, workspaceScopeId), JSON.stringify(launchForm));
  }, [launchForm, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.costForm, workspaceScopeId), JSON.stringify(costForm));
  }, [costForm, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.checklist, workspaceScopeId), JSON.stringify(checklist));
  }, [checklist, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.businessPlan, workspaceScopeId), JSON.stringify(businessPlan));
  }, [businessPlan, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.generatedDocs, workspaceScopeId), JSON.stringify(generatedDocuments));
  }, [generatedDocuments, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.schemeProfile, workspaceScopeId), JSON.stringify(schemeProfile));
  }, [schemeProfile, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.builder10Form, workspaceScopeId), JSON.stringify(builder10Form));
  }, [builder10Form, workspaceScopeId]);

  useEffect(() => {
    window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.builder10Plans, workspaceScopeId), JSON.stringify(builder10Plans));
  }, [builder10Plans, workspaceScopeId]);

  useEffect(() => {
    setBuilder10Form((current) => {
      if (hasValue(current.businessName) || !hasValue(businessForm.businessName)) {
        return current;
      }
      return {
        ...current,
        businessName: businessForm.businessName,
      };
    });
  }, [businessForm.businessName]);

  const applyBusinessToForm = (business = {}) => {
    const address = business.address || {};
    setBusinessForm({
      businessName: business.businessName || "",
      businessType: business.businessType || "Retail",
      phone: business.phone || "",
      email: business.email || "",
      website: business.website || "",
      gstin: business.gstin || "",
      addressStreet: address.street || "",
      addressCity: address.city || "",
      addressState: address.state || "",
      addressPincode: address.pincode || "",
      primaryColor: business.primaryColor || "#0f766e",
      secondaryColor: business.secondaryColor || "#10b981",
    });
  };

  const hydrateWorkspaceFromBusiness = (business = {}) => {
    if (!business || typeof business !== "object") return;
    const scopeId = business.businessId || "draft";

    if (business.launchForm && typeof business.launchForm === "object") {
      const nextLaunchForm = {
        ...INITIAL_LAUNCH_FORM,
        ...business.launchForm,
      };
      setLaunchForm(nextLaunchForm);
      window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.launchForm, scopeId), JSON.stringify(nextLaunchForm));
    }
    if (business.costForm && typeof business.costForm === "object") {
      const nextCostForm = {
        ...INITIAL_COST_FORM,
        ...business.costForm,
      };
      setCostForm(nextCostForm);
      window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.costForm, scopeId), JSON.stringify(nextCostForm));
    }
    if (business.schemeProfile && typeof business.schemeProfile === "object") {
      const nextSchemeProfile = {
        ...INITIAL_SCHEME_PROFILE,
        ...business.schemeProfile,
      };
      setSchemeProfile(nextSchemeProfile);
      window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.schemeProfile, scopeId), JSON.stringify(nextSchemeProfile));
    }
    if (Array.isArray(business.checklist) && business.checklist.length > 0) {
      const nextChecklist = business.checklist.map((item) => ({
        id: item.id,
        title: item.title,
        completed: Boolean(item.completed),
      }));
      setChecklist(nextChecklist);
      window.localStorage.setItem(buildScopedStorageKey(STORAGE_KEYS.checklist, scopeId), JSON.stringify(nextChecklist));
    }
    if (business.businessPlan && typeof business.businessPlan === "object") {
      setBusinessPlan(business.businessPlan);
      window.localStorage.setItem(
        buildScopedStorageKey(STORAGE_KEYS.businessPlan, scopeId),
        JSON.stringify(business.businessPlan)
      );
    }
  };

  const fetchBusiness = async () => {
    try {
      const response = await axios.get("/api/business-builder/businesses");
      if (response.data?.success) {
        const list = Array.isArray(response.data.data) ? response.data.data : [];
        setBusinesses(list);
        if (list.length > 0) {
          const selected = list.find((business) => business.businessId === activeBusinessId) || list[0];
          setActiveBusinessId(selected.businessId);
          applyBusinessToForm(selected);
          hydrateWorkspaceFromBusiness(selected);
        } else {
          setActiveBusinessId("");
        }
      }
    } catch (error) {
      // no-op for first-time users
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get("/api/business-builder/invoices", {
        params: activeBusinessId ? { businessId: activeBusinessId } : {},
      });
      if (response.data?.success) {
        setInvoices(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      setInvoices([]);
    }
  };

  const fetchMiniApps = async () => {
    try {
      const response = await axios.get("/api/business-builder/mini-apps", {
        params: activeBusinessId ? { businessId: activeBusinessId } : {},
      });
      if (response.data?.success) {
        const list = Array.isArray(response.data.data) ? response.data.data : [];
        setMiniApps(list);
        if (list.length > 0) {
          setSelectedMiniAppId((current) => {
            if (current && list.some((app) => (app.miniAppId || app._id) === current)) {
              return current;
            }
            return list[0].miniAppId || list[0]._id;
          });
        } else {
          setSelectedMiniAppId("");
        }
      }
    } catch (error) {
      setMiniApps([]);
      setSelectedMiniAppId("");
    }
  };

  const fetchEntitlements = async () => {
    if (!activeBusinessId) {
      setEntitlements(null);
      return;
    }
    try {
      const response = await axios.get(`/api/business-builder/businesses/${activeBusinessId}/entitlements`);
      if (response.data?.success) {
        setEntitlements(response.data.data || null);
        if (response.data?.data?.plan) {
          setSubscriptionPlan(response.data.data.plan);
        }
      }
    } catch (error) {
      setEntitlements(null);
    }
  };

  const fetchBusinessAnalytics = async () => {
    if (!activeBusinessId) {
      setBusinessAnalytics(null);
      return;
    }
    try {
      const response = await axios.get(`/api/business-builder/businesses/${activeBusinessId}/analytics/dashboard`, {
        params: { days: 30 },
      });
      if (response.data?.success) {
        setBusinessAnalytics(response.data.data || null);
      }
    } catch (error) {
      setBusinessAnalytics(null);
    }
  };

  const fetchAIAssets = async () => {
    if (!activeBusinessId) {
      setAiAssets([]);
      return;
    }
    try {
      const response = await axios.get(`/api/business-builder/businesses/${activeBusinessId}/ai/assets`);
      if (response.data?.success) {
        setAiAssets(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      setAiAssets([]);
    }
  };

  const fetchMiniAppProducts = async (miniAppId) => {
    try {
      const response = await axios.get(`/api/business-builder/mini-apps/${miniAppId}/products`);
      if (response.data?.success) {
        setMiniAppProducts(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      setMiniAppProducts([]);
    }
  };

  const fetchMiniAppOrders = async (miniAppId) => {
    try {
      const response = await axios.get(`/api/business-builder/mini-apps/${miniAppId}/orders`);
      if (response.data?.success) {
        const items = Array.isArray(response.data?.data?.items) ? response.data.data.items : [];
        setMiniAppOrders(items);
      }
    } catch (error) {
      setMiniAppOrders([]);
    }
  };

  const fetchMiniAppFunnel = async (miniAppId) => {
    try {
      const response = await axios.get(`/api/business-builder/mini-apps/${miniAppId}/funnel`, {
        params: { days: 30 },
      });
      if (response.data?.success) {
        setMiniAppFunnel(response.data.data || null);
      }
    } catch (error) {
      setMiniAppFunnel(null);
    }
  };

  const showStatus = (message) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 4500);
  };

  const handleBusinessChange = (field, value) => {
    setBusinessErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: "" };
    });
    setBusinessForm((current) => ({ ...current, [field]: value }));
  };

  const handleLaunchChange = (field, value) => {
    setLaunchForm((current) => ({ ...current, [field]: value }));
  };

  const handleCostChange = (field, value) => {
    setCostForm((current) => ({ ...current, [field]: parseNumber(value) }));
  };

  const handleInvoiceChange = (field, value) => {
    setInvoiceErrors((current) => {
      if (!current[field] && !(field === "customerPhone" || field === "customerEmail")) return current;
      const next = { ...current, [field]: "" };
      if (field === "customerPhone" || field === "customerEmail") {
        next.customerContact = "";
      }
      return next;
    });
    setInvoiceForm((current) => ({ ...current, [field]: value }));
  };

  const handleInvoiceItemChange = (index, field, value) => {
    setInvoiceItemErrors((current) =>
      current.map((itemErrors, idx) => {
        if (idx !== index || !itemErrors || !itemErrors[field]) return itemErrors;
        return { ...itemErrors, [field]: "" };
      })
    );
    setInvoiceForm((current) => {
      const items = [...current.items];
      items[index] = {
        ...items[index],
        [field]: field === "quantity" || field === "unitPrice" || field === "taxRate" ? Number(value) : value,
      };
      return { ...current, items };
    });
  };

  const handleAddInvoiceItem = () => {
    setInvoiceErrors((current) => ({ ...current, items: "" }));
    setInvoiceItemErrors((current) => [...current, {}]);
    setInvoiceForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          name: "New service",
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
        },
      ],
    }));
  };

  const handleMiniAppChange = (field, value) => {
    setMiniAppErrors((current) => {
      if (!current[field] && !(field === "slug" || field === "appName")) return current;
      const next = { ...current, [field]: "" };
      if (field === "slug" || field === "appName") {
        next.slug = "";
      }
      return next;
    });
    setMiniAppForm((current) => ({ ...current, [field]: value }));
  };

  const handleProductChange = (field, value) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const handleAiAssetChange = (field, value) => {
    setAiAssetErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: "" };
    });
    setAiAssetForm((current) => ({ ...current, [field]: value }));
  };

  const handleDocumentChange = (field, value) => {
    setDocumentForm((current) => ({ ...current, [field]: value }));
  };

  const handleBuilder10Change = (field, value) => {
    setBuilder10Form((current) => ({ ...current, [field]: value }));
  };

  const handleSaveBusiness = async (event) => {
    event.preventDefault();
    const validationErrors = validateBusinessForm(businessForm);
    if (Object.keys(validationErrors).length > 0) {
      setBusinessErrors(validationErrors);
      showStatus("Please fix highlighted business profile fields.");
      return;
    }

    setSavingBusiness(true);
    try {
      const payload = {
        businessName: String(businessForm.businessName || "").trim(),
        businessType: businessForm.businessType,
        phone: String(businessForm.phone || "").trim(),
        email: String(businessForm.email || "").trim(),
        website: String(businessForm.website || "").trim(),
        gstin: String(businessForm.gstin || "").trim().toUpperCase(),
        address: {
          street: String(businessForm.addressStreet || "").trim(),
          city: String(businessForm.addressCity || "").trim(),
          state: String(businessForm.addressState || "").trim(),
          pincode: String(businessForm.addressPincode || "").trim(),
          country: "India",
        },
        primaryColor: businessForm.primaryColor,
        secondaryColor: businessForm.secondaryColor,
      };
      const response = activeBusinessId
        ? await axios.put(`/api/business-builder/businesses/${activeBusinessId}`, payload)
        : await axios.post("/api/business-builder/businesses", payload);
      if (response.data?.success) {
        const savedBusiness = response.data.data;
        if (savedBusiness?.businessId) {
          setActiveBusinessId(savedBusiness.businessId);
        }
        await fetchBusiness();
        setBusinessErrors({});
        showStatus("Business profile saved successfully.");
      }
    } catch (error) {
      const message = buildErrorMessage(error, "Unable to save business profile. Check fields and try again.");
      if (message.includes("phone")) {
        setBusinessErrors((current) => ({ ...current, phone: "Enter a valid 10-digit Indian mobile number." }));
      }
      if (message.includes("email")) {
        setBusinessErrors((current) => ({ ...current, email: "Enter a valid email address." }));
      }
      if (message.toLowerCase().includes("gstin")) {
        setBusinessErrors((current) => ({ ...current, gstin: "Enter a valid GSTIN format." }));
      }
      showStatus(message);
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleCreateInvoice = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before creating invoices.");
      return;
    }
    const validation = validateInvoiceForm(invoiceForm);
    const hasItemErrors = validation.itemErrors.some((itemError) => Object.keys(itemError || {}).length > 0);
    if (Object.keys(validation.errors).length > 0 || hasItemErrors) {
      setInvoiceErrors(validation.errors);
      setInvoiceItemErrors(validation.itemErrors);
      showStatus("Please fix highlighted invoice fields.");
      return;
    }
    setCreatingInvoice(true);
    try {
      const payload = {
        businessId: activeBusinessId,
        customer: {
          name: String(invoiceForm.customerName || "").trim(),
          phone: String(invoiceForm.customerPhone || "").trim(),
          email: String(invoiceForm.customerEmail || "").trim(),
          gstin: String(invoiceForm.customerGSTIN || "").trim().toUpperCase(),
          address: String(invoiceForm.customerAddress || "").trim(),
        },
        dueDate: invoiceForm.dueDate,
        discount: Number(invoiceForm.discountAmount || 0),
        notes: invoiceForm.notes,
        items: invoiceForm.items.map((item) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || 0);
          return {
            description: String(item.description || item.name || "Item").trim(),
            quantity,
            unitPrice,
            total: quantity * unitPrice,
            hsnCode: "",
          };
        }),
      };
      const response = await axios.post("/api/business-builder/invoices", payload);
      if (response.data?.success) {
        setInvoiceForm(INITIAL_INVOICE_FORM);
        setInvoiceErrors({});
        setInvoiceItemErrors([]);
        await fetchInvoices();
        showStatus("Invoice created successfully.");
      }
    } catch (error) {
      const message = buildErrorMessage(error, "Unable to create invoice. Please verify item details and try again.");
      if (message.includes("customer.name")) {
        setInvoiceErrors((current) => ({ ...current, customerName: "Customer name is required." }));
      }
      if (message.toLowerCase().includes("due date")) {
        setInvoiceErrors((current) => ({ ...current, dueDate: "Due date is required." }));
      }
      showStatus(message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleCreateMiniApp = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before launching a mini app.");
      return;
    }
    if (isMiniAppLimitReached) {
      showStatus("Mini app limit reached for your current plan. Upgrade to create more mini apps.");
      return;
    }
    const validation = validateMiniAppForm(miniAppForm);
    const slugAlreadyExists = miniApps.some((app) => String(app.slug || "").toLowerCase() === validation.slug);
    if (slugAlreadyExists) {
      validation.errors.slug = "This slug already exists in your mini apps. Try another slug.";
    }
    if (Object.keys(validation.errors).length > 0) {
      setMiniAppErrors(validation.errors);
      showStatus("Please fix highlighted mini app fields.");
      return;
    }
    setCreatingMiniApp(true);
    try {
      const payload = {
        businessId: activeBusinessId,
        appName: String(miniAppForm.appName || "").trim(),
        slug: validation.slug,
        appType: miniAppForm.appType,
        appDescription: String(miniAppForm.description || "").trim(),
        branding: {
          primaryColor: miniAppForm.primaryColor,
          secondaryColor: miniAppForm.secondaryColor,
        },
        content: {
          heroTitle: String(miniAppForm.appName || "").trim(),
          heroSubtitle: String(miniAppForm.description || "").trim(),
          aboutText: String(miniAppForm.description || "").trim(),
          contactInfo: {
            email: String(miniAppForm.email || "").trim(),
            phone: String(miniAppForm.phone || "").trim(),
            address: String(miniAppForm.address || "").trim(),
            website: String(miniAppForm.website || "").trim(),
          },
        },
      };
      const response = await axios.post("/api/business-builder/mini-apps", payload);
      if (response.data?.success) {
        setMiniAppForm(INITIAL_MINIAPP_FORM);
        setMiniAppErrors({});
        await Promise.all([fetchMiniApps(), fetchEntitlements()]);
        showStatus("Mini app created successfully.");
      }
    } catch (error) {
      const message = buildErrorMessage(error, "Unable to create mini app. Try a different slug and check required fields.");
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes("duplicate key") || normalizedMessage.includes("slug")) {
        setMiniAppErrors((current) => ({ ...current, slug: "This slug is already in use. Please choose another." }));
      }
      if (normalizedMessage.includes("limit reached")) {
        showStatus("Mini app limit reached for your current plan. Upgrade to create more mini apps.");
        return;
      }
      showStatus(message);
    } finally {
      setCreatingMiniApp(false);
    }
  };

  const handleSaveSubscription = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before changing subscription.");
      return;
    }
    setSavingSubscription(true);
    try {
      const payload = {
        plan: subscriptionPlan,
        status: "active",
      };
      const response = await axios.put(`/api/business-builder/businesses/${activeBusinessId}/subscription`, payload);
      if (response.data?.success) {
        await fetchEntitlements();
        showStatus("Subscription settings updated.");
      }
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to update subscription. Please try again."));
    } finally {
      setSavingSubscription(false);
    }
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!selectedMiniAppId) {
      showStatus("Create/select a mini app before adding products.");
      return;
    }
    setCreatingProduct(true);
    try {
      const payload = {
        name: productForm.name,
        category: productForm.category,
        description: productForm.description,
        price: Number(productForm.price || 0),
        discountedPrice: productForm.discountedPrice ? Number(productForm.discountedPrice) : undefined,
        stock: Number(productForm.stock || 0),
      };
      const response = await axios.post(`/api/business-builder/mini-apps/${selectedMiniAppId}/products`, payload);
      if (response.data?.success) {
        setProductForm(INITIAL_PRODUCT_FORM);
        await fetchMiniAppProducts(selectedMiniAppId);
        showStatus("Mini app product added successfully.");
      }
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to add product. Check fields and try again."));
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!selectedMiniAppId) return;
    const confirmed = window.confirm("Remove this product from your mini app? This action cannot be undone.");
    if (!confirmed) return;
    setDeletingProductId(productId);
    try {
      const response = await axios.delete(`/api/business-builder/mini-apps/${selectedMiniAppId}/products/${productId}`);
      if (response.data?.success) {
        await fetchMiniAppProducts(selectedMiniAppId);
        showStatus("Product removed.");
      }
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to remove product right now."));
    } finally {
      setDeletingProductId("");
    }
  };

  const handleGenerateAsset = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before generating assets.");
      return;
    }
    if (isAiAssetLimitReached) {
      showStatus("You've reached your monthly AI asset limit. Upgrade your plan to continue.");
      return;
    }
    const validationErrors = validateAiAssetForm(aiAssetForm);
    if (Object.keys(validationErrors).length > 0) {
      setAiAssetErrors(validationErrors);
      showStatus("Please fix highlighted AI asset fields.");
      return;
    }
    setGeneratingAsset(true);
    try {
      const payload = {
        assetType: aiAssetForm.assetType,
        prompt: aiAssetForm.prompt,
        offer: aiAssetForm.offer,
        cta: aiAssetForm.cta,
      };
      const response = await axios.post(`/api/business-builder/businesses/${activeBusinessId}/ai/assets/generate`, payload);
      if (response.data?.success) {
        setAiAssetForm((current) => ({ ...current, prompt: "", offer: "", cta: "" }));
        setAiAssetErrors({});
        await Promise.all([fetchAIAssets(), fetchEntitlements()]);
        showStatus("AI asset generated and saved.");
      }
    } catch (error) {
      const message = buildErrorMessage(error, "Unable to generate AI asset.");
      if (message.toLowerCase().includes("limit reached")) {
        showStatus("You've reached your monthly AI asset limit. Upgrade your plan to continue.");
        return;
      }
      showStatus(message);
    } finally {
      setGeneratingAsset(false);
    }
  };

  const handleOrderStatusUpdate = async (orderId, status) => {
    const confirmed = window.confirm(`Change order status to "${status}"?`);
    if (!confirmed) return;
    setUpdatingOrderId(orderId);
    try {
      const response = await axios.patch(`/api/business-builder/orders/${orderId}/status`, { status });
      if (response.data?.success) {
        await Promise.all([fetchMiniAppOrders(selectedMiniAppId), fetchMiniAppFunnel(selectedMiniAppId), fetchBusinessAnalytics()]);
        showStatus("Order status updated.");
      }
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to update order status."));
    } finally {
      setUpdatingOrderId("");
    }
  };

  const downloadPdf = async (invoiceId, invoiceNumber) => {
    setDownloadingInvoiceId(invoiceId);
    try {
      const response = await axios.get(`/api/business-builder/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to download PDF. Please try again later."));
    } finally {
      setDownloadingInvoiceId("");
    }
  };

  const generateAIPlan = () => {
    const plan = buildPlanFromInputs({ businessForm, launchForm, costForm });
    setBusinessPlan(plan);
    showStatus("AI business plan generated. Review and refine before launch.");
  };

  const generateBrandingIdeas = () => {
    const ideas = generateBrandIdeas({ businessForm, launchForm });
    setBrandingIdeas(ideas);
    showStatus("Branding suggestions generated.");
  };

  const generateDocument = async () => {
    setGeneratingDocument(true);
    try {
      const content = createDocumentContent({
        type: documentForm.type,
        businessForm,
        launchForm,
        documentForm,
        plan: businessPlan,
      });

      const doc = {
        id: `doc-${Date.now()}`,
        createdAt: new Date().toISOString(),
        type: documentForm.type,
        title: `${documentForm.type} - ${documentForm.customerName || "General"}`,
        content,
      };

      setDocumentPreview(content);
      setGeneratedDocuments((current) => [doc, ...current].slice(0, 30));
      showStatus(`${documentForm.type} generated locally (offline preview).`);
    } finally {
      setGeneratingDocument(false);
    }
  };

  const downloadDocument = () => {
    if (!documentPreview) {
      showStatus("Generate a document before downloading.");
      return;
    }

    const blob = new Blob([documentPreview], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(documentForm.type || "document").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const copyDocument = async () => {
    if (!documentPreview) {
      showStatus("Generate a document before copying.");
      return;
    }

    try {
      await navigator.clipboard.writeText(documentPreview);
      showStatus("Document copied to clipboard.");
    } catch (error) {
      showStatus("Copy failed. Please copy manually from preview.");
    }
  };

  const saveBuilder10Plan = () => {
    const record = {
      id: `bb10-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...builder10Form,
      businessType: map10xCategoryToBusinessType(builder10Form.category),
    };
    setBuilder10Plans((current) => [record, ...current].slice(0, 30));
    showStatus("Business Builder 10X plan saved.");
  };

  const copyBuilder10Plan = async () => {
    const legalChecklist = [
      "Choose structure: Proprietorship / Partnership / Pvt Ltd",
      "Apply Udyam registration (MSME) if eligible",
      "Check GST applicability by turnover and business type",
      "Open current account and setup invoicing",
      "Define payment and compliance process",
    ];
    const text = [
      `Business Name: ${builder10Form.businessName || "Your Business"}`,
      `Category: ${builder10Form.category}`,
      `Location: ${builder10Form.location}`,
      `Target Customers: ${builder10Form.targetCustomers || "Not specified"}`,
      `Investment: ${formatINR(builder10Form.investment)}`,
      `Monthly Revenue Target: ${formatINR(builder10Form.monthlyTarget)}`,
      "",
      "Legal Checklist:",
      ...legalChecklist.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      showStatus("10X plan copied to clipboard.");
    } catch (error) {
      showStatus("Copy failed. Please copy manually from the panel.");
    }
  };

  const applyBuilder10PlanToWorkspace = () => {
    const mappedType = map10xCategoryToBusinessType(builder10Form.category);
    setBusinessForm((current) => ({
      ...current,
      businessName: builder10Form.businessName || current.businessName,
      businessType: mappedType,
    }));
    setLaunchForm((current) => ({
      ...current,
      targetCustomers: builder10Form.targetCustomers || current.targetCustomers,
      serviceArea: builder10Form.location || current.serviceArea,
      plannedBudget: String(builder10Form.investment || current.plannedBudget || ""),
    }));
    setCostForm((current) => ({
      ...current,
      expectedMonthlyRevenue: parseNumber(builder10Form.monthlyTarget || current.expectedMonthlyRevenue),
    }));
    showStatus("Applied 10X inputs to your workspace. Open AI Plan for full strategy generation.");
  };

  const generateBuilder10AiPlan = async () => {
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before generating AI plan.");
      return;
    }

    try {
      setBuilder10Generating(true);
      const response = await axios.post(
        `/api/business-builder/businesses/${activeBusinessId}/generate-plan-ai`,
        { ...builder10Form }
      );
      if (response.data?.success && response.data?.data) {
        setBuilder10AiPlan(response.data.data);
        showStatus("AI 10X plan generated successfully.");
      }
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to generate AI 10X plan right now."));
    } finally {
      setBuilder10Generating(false);
    }
  };

  const downloadBuilder10PlanPdf = async () => {
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before downloading plan PDF.");
      return;
    }

    try {
      setDownloadingBuilderPdf(true);
      const response = await axios.post(
        `/api/business-builder/businesses/${activeBusinessId}/ai-plan/pdf`,
        {
          blueprint: builder10Form,
          plan: builder10AiPlan || builder10Plan,
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `business-plan-${activeBusinessId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showStatus("Business plan PDF downloaded.");
    } catch (error) {
      showStatus(buildErrorMessage(error, "Unable to export business plan PDF."));
    } finally {
      setDownloadingBuilderPdf(false);
    }
  };

  const toggleChecklist = async (id) => {
    const nextChecklist = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(nextChecklist);

    if (!activeBusinessId) return;

    try {
      await axios.put(`/api/business-builder/businesses/${activeBusinessId}/checklist`, {
        checklistUpdates: nextChecklist,
      });
    } catch (error) {
      showStatus("Checklist update saved locally. Server sync failed and will retry on next change.");
    }
  };

  const moveWizard = (delta) => {
    setWizardStep((current) => {
      const next = current + delta;
      if (next < 0) return 0;
      if (next > WIZARD_STEPS.length - 1) return WIZARD_STEPS.length - 1;
      return next;
    });
  };

  const wizardProgress = useMemo(() => {
    const complete = WIZARD_STEPS.filter((step) => hasValue(launchForm[step.key])).length;
    return Math.round((complete / WIZARD_STEPS.length) * 100);
  }, [launchForm]);

  const checklistCompletion = useMemo(() => {
    const done = checklist.filter((item) => item.completed).length;
    return {
      done,
      total: checklist.length,
      percent: Math.round((done / checklist.length) * 100),
    };
  }, [checklist]);

  const costSummary = useMemo(() => {
    const oneTimeInvestment = parseNumber(costForm.inventory) + parseNumber(costForm.licenseCost) + parseNumber(costForm.equipment);
    const monthlyExpenses =
      parseNumber(costForm.rent) +
      parseNumber(costForm.staffSalary) +
      parseNumber(costForm.marketing) +
      parseNumber(costForm.utilities) +
      parseNumber(costForm.otherMonthly);
    const revenue = parseNumber(costForm.expectedMonthlyRevenue);
    const monthlyProfit = revenue - monthlyExpenses;
    const breakEvenMonths = monthlyProfit > 0 ? Math.ceil(oneTimeInvestment / monthlyProfit) : null;

    return {
      oneTimeInvestment,
      monthlyExpenses,
      revenue,
      monthlyProfit,
      breakEvenMonths,
    };
  }, [costForm]);

  const schemeSuggestions = useMemo(() => {
    const type = businessForm.businessType || "Other";
    const budget = parseNumber(launchForm.plannedBudget);

    return GOVERNMENT_SCHEMES.filter((scheme) => {
      const supportsType = scheme.supports.includes(type) || scheme.supports.includes("Other");
      const withinBudget = budget <= 0 || budget <= scheme.budgetCeiling;
      if (!supportsType || !withinBudget) return false;

      if (scheme.womenOnly && !schemeProfile.isWomenEntrepreneur) return false;
      if (scheme.keralaOnly && !schemeProfile.isKeralaBased) return false;
      if (scheme.scstOnly && !schemeProfile.isSCSTEntrepreneur) return false;
      if (scheme.minorityOnly && !schemeProfile.isMinorityEntrepreneur) return false;

      return true;
    });
  }, [businessForm.businessType, launchForm.plannedBudget, schemeProfile]);

  const builder10Plan = useMemo(() => {
    const businessName = builder10Form.businessName || "Your Business";
    const monthlyTarget = parseNumber(builder10Form.monthlyTarget);
    const investment = parseNumber(builder10Form.investment);
    const runwayMonths = monthlyTarget > 0 ? Math.max(1, Math.floor(investment / (monthlyTarget * 0.45 || 1))) : 0;

    const revenueModel =
      builder10Form.category === "Ecommerce"
        ? "Product sales, seller commission, delivery fees, and featured listings."
        : "Service fees, subscriptions, consultation packages, and partner commissions.";

    return {
      tagline: `${businessName} - Trusted solutions for modern customers`,
      revenueModel,
      legalChecklist: [
        "Choose structure: Proprietorship / Partnership / Pvt Ltd",
        "Apply Udyam registration (MSME) if eligible",
        "Check GST applicability by turnover and business type",
        "Open a current account with accounting workflow",
        "Setup invoice process and compliance cadence",
      ],
      launchPlan: [
        "Week 1: Finalize business name, positioning, and core offer.",
        "Week 2: Launch landing page, WhatsApp profile, and social handles.",
        "Week 3: Close first 10 customers or vendors with feedback loops.",
        "Week 4: Run acquisition campaign and track conversion economics.",
      ],
      logoPrompt: `Create a premium logo for ${businessName} in the ${builder10Form.category} category, with a modern, trustworthy style suitable for ${builder10Form.location} and global customers.`,
      monthlyTarget,
      investment,
      runwayMonths,
    };
  }, [builder10Form]);

  const builder10Readiness = useMemo(() => {
    const checks = [
      hasValue(builder10Form.businessName),
      hasValue(builder10Form.targetCustomers),
      hasValue(builder10Form.location),
      parseNumber(builder10Form.investment) > 0,
      parseNumber(builder10Form.monthlyTarget) > 0,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [builder10Form]);

  const activeBuilder10Plan = builder10AiPlan || builder10Plan;

  const dashboardMetrics = useMemo(() => {
    const profileReady = businessForm.businessName && businessForm.phone && businessForm.email;
    const costReady = costSummary.monthlyExpenses > 0 || costSummary.oneTimeInvestment > 0;
    const planReady = Boolean(businessPlan);

    const completedCriteria = [profileReady, wizardProgress === 100, costReady, planReady, checklistCompletion.percent >= 50].filter(Boolean).length;
    const completion = Math.round((completedCriteria / 5) * 100);

    const hasDraft = Object.values(launchForm).some((value) => hasValue(value));

    return {
      activeDrafts: hasDraft ? 1 : 0,
      completion,
      pendingTasks: checklist.filter((item) => !item.completed).length,
      revenueEstimate: businessPlan?.targetRevenue || costSummary.revenue,
      documentsCreated: invoices.length + generatedDocuments.length,
      nextAction: getNextAction({
        businessForm,
        launchForm,
        plan: businessPlan,
        checklist,
      }),
    };
  }, [businessForm, launchForm, wizardProgress, costSummary, businessPlan, checklist, checklistCompletion.percent, invoices.length, generatedDocuments.length]);

  const integrationSuggestions = useMemo(() => {
    return INTEGRATION_SUGGESTIONS[businessForm.businessType] || INTEGRATION_SUGGESTIONS.Other;
  }, [businessForm.businessType]);

  const currentWizardConfig = WIZARD_STEPS[wizardStep];
  const selectedBusiness = businesses.find((business) => business.businessId === activeBusinessId) || null;
  const selectedMiniApp = miniApps.find((app) => (app.miniAppId || app._id) === selectedMiniAppId) || null;
  const activeTabConfig = TAB_CONFIG.find((tab) => tab.id === activeTab) || TAB_CONFIG[0];
  const effectiveMiniAppSlug = cleanSlug(miniAppForm.slug || miniAppForm.appName);
  const slugAlreadyInUse = Boolean(
    effectiveMiniAppSlug &&
      miniApps.some((app) => String(app.slug || "").toLowerCase() === effectiveMiniAppSlug)
  );
  const slugIsReserved = RESERVED_SLUGS.has(effectiveMiniAppSlug);
  const isAiAssetLimitReached = useMemo(() => {
    if (!entitlements?.limits || !entitlements?.usage) return false;
    const used = Number(entitlements.usage.aiAssetsGenerated || 0);
    const allowed = Number(entitlements.limits.maxAiAssetsPerMonth);
    if (!Number.isFinite(allowed)) return false;
    return used >= allowed;
  }, [entitlements]);
  const isMiniAppLimitReached = useMemo(() => {
    if (!entitlements?.limits) return false;
    const allowed = Number(entitlements.limits.maxMiniApps);
    if (!Number.isFinite(allowed)) return false;
    return miniApps.length >= allowed;
  }, [entitlements, miniApps.length]);

  return (
    <div className="business-builder-page">
      <div className="page-header">
        <div>
          <p className="module-label">AI Business Builder</p>
          <h1>SME Growth Studio</h1>
          <p className="page-description">
            Practical launch workflows, AI-ready business planning, startup cost intelligence, government scheme matching, documents, and execution checklists.
          </p>
          <div className="header-chip-row">
            {HEADER_HIGHLIGHTS.map((item) => (
              <span key={item} className="header-chip">{item}</span>
            ))}
          </div>
          <div className="header-actions">
            <button type="button" className="action-ghost" onClick={() => setActiveTab("wizard")}>
              Start Guided Launch
            </button>
            <button type="button" className="action-ghost" onClick={() => setActiveTab("ai-plan")}>
              Generate AI Plan
            </button>
            <button type="button" className="action-ghost" onClick={() => setActiveTab("ops360")}>
              Open 360 Ops
            </button>
          </div>
        </div>
      </div>

      <div className="business-builder-tabs">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="active-view-banner">
        <p className="active-view-label">Current Workspace</p>
        <h3>{activeTabConfig.label}</h3>
        <p>{activeTabConfig.subtitle}</p>
      </div>

      <div className="workspace-banner">
        <strong>Workspace business:</strong>{" "}
        {selectedBusiness ? `${selectedBusiness.businessName} (${selectedBusiness.businessType})` : "Draft (not yet saved)"}
      </div>

      {statusMessage && <div className="status-banner">{statusMessage}</div>}
      {loading && <div className="status-banner info">Refreshing data...</div>}
      {generatingAsset && <div className="status-banner info">Generating AI asset... this may take around 30-60 seconds.</div>}
      {builder10Generating && <div className="status-banner info">Generating AI 10X plan... this may take around 30-60 seconds.</div>}

      {activeTab === "dashboard" && (
        <div className="section-card">
          <h2>Business Builder Dashboard</h2>
          <p className="section-subtitle">Track what is complete, what is pending, and the highest-value next move.</p>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Active business drafts</span>
              <strong>{dashboardMetrics.activeDrafts}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Completion percentage</span>
              <strong>{dashboardMetrics.completion}%</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Pending tasks</span>
              <strong>{dashboardMetrics.pendingTasks}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Revenue estimate</span>
              <strong>{formatINR(dashboardMetrics.revenueEstimate)}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Documents created</span>
              <strong>{dashboardMetrics.documentsCreated}</strong>
            </div>
            <div className="kpi-card highlight">
              <span className="kpi-label">Recommended next action</span>
              <strong>{dashboardMetrics.nextAction}</strong>
            </div>
          </div>

          <div className="insight-panels">
            <div className="insight-card">
              <h3>Marketplace Integration Suggestions</h3>
              <p>Based on your business type ({businessForm.businessType}), these linked modules can accelerate launch:</p>
              <ul>
                {integrationSuggestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="insight-card">
              <h3>Monetization Levers to Activate</h3>
              <ul>
                <li>Premium AI plan export packages</li>
                <li>Loan assistance referral commissions</li>
                <li>GST and company registration lead conversion</li>
                <li>Design and marketing content upsells</li>
                <li>Website and featured listing upgrades</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "wizard" && (
        <div className="section-card">
          <h2>Business Idea to Launch Wizard</h2>
          <p className="section-subtitle">Beginner-friendly guided flow from idea to execution-ready launch notes.</p>

          <div className="wizard-progress-wrap">
            <div className="wizard-progress-row">
              <strong>Step {wizardStep + 1} of {WIZARD_STEPS.length}</strong>
              <span>{wizardProgress}% complete</span>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${wizardProgress}%` }} />
            </div>
          </div>

          <div className="wizard-card">
            <h3>{currentWizardConfig.title}</h3>
            <textarea
              value={launchForm[currentWizardConfig.key]}
              onChange={(event) => handleLaunchChange(currentWizardConfig.key, event.target.value)}
              placeholder={currentWizardConfig.placeholder}
            />
            <div className="wizard-actions">
              <button type="button" className="button-secondary" onClick={() => moveWizard(-1)} disabled={wizardStep === 0}>
                Previous
              </button>
              <button type="button" className="button-secondary" onClick={() => moveWizard(1)} disabled={wizardStep === WIZARD_STEPS.length - 1}>
                Next
              </button>
            </div>
          </div>

          <div className="list-section compact">
            <h3>Quick launch summary</h3>
            <div className="wizard-summary-grid">
              {WIZARD_STEPS.map((step) => (
                <div className="wizard-summary-item" key={step.key}>
                  <strong>{step.title}</strong>
                  <p>{launchForm[step.key] || "Not filled yet"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai-plan" && (
        <div className="section-card">
          <h2>AI Business Plan Generator</h2>
          <p className="section-subtitle">
            Generate a practical plan using your wizard and cost inputs: summary, market, competitors, revenue, costs, profit, SWOT, and roadmap.
          </p>

          <div className="ai-actions-row">
            <button type="button" className="button-primary" onClick={generateAIPlan}>
              Generate AI Plan
            </button>
            <button type="button" className="button-secondary" onClick={generateBrandingIdeas}>
              Generate Branding Builder
            </button>
          </div>

          {businessPlan ? (
            <div className="plan-output">
              {BUSINESS_PLAN_SECTIONS.map((section) => (
                <div key={section.key} className="plan-section">
                  <h3>{section.label}</h3>
                  {section.key === "swot" ? (
                    <div className="swot-grid">
                      <div>
                        <h4>Strengths</h4>
                        <ul>{businessPlan.swot.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <h4>Weaknesses</h4>
                        <ul>{businessPlan.swot.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <h4>Opportunities</h4>
                        <ul>{businessPlan.swot.opportunities.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <h4>Threats</h4>
                        <ul>{businessPlan.swot.threats.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                    </div>
                  ) : section.key === "roadmap90" || section.key === "roadmap180" ? (
                    <ul>
                      {businessPlan[section.key].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{businessPlan[section.key]}</p>
                  )}
                </div>
              ))}
              <p className="section-note">{businessPlan.confidenceNote}</p>
            </div>
          ) : (
            <p>No plan generated yet. Complete launch wizard fields and click Generate AI Plan.</p>
          )}

          {brandingIdeas && (
            <div className="list-section">
              <h3>Branding Builder Output</h3>
              <div className="branding-grid">
                <div>
                  <h4>Business name ideas</h4>
                  <ul>{brandingIdeas.nameIdeas.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h4>Logo suggestions</h4>
                  <ul>{brandingIdeas.logoSuggestions.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h4>Taglines</h4>
                  <ul>{brandingIdeas.taglines.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h4>Brand colors</h4>
                  <div className="brand-color-row">
                    {brandingIdeas.brandColors.map((color) => (
                      <span key={color} className="brand-color-chip" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                  <p><strong>Poster content:</strong> {brandingIdeas.posterCopy}</p>
                  <p><strong>Social caption:</strong> {brandingIdeas.socialCaption}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "builder10x" && (
        <div className="section-card">
          <h2>Business Builder 10X Upgrade</h2>
          <p className="section-subtitle">
            Convert idea to launch-ready business blueprint with brand kit, legal checklist, finance targets, and a 30-day rollout.
          </p>

          <div className="bb10x-hero">
            <div className="bb10x-hero-copy">
              <p className="bb10x-tag">MGRAND HUB Business Builder</p>
              <h3>Build your business plan, brand kit, and launch roadmap</h3>
              <p>
                This workspace merges your proposed upgrade directly into the current module and keeps data compatible with AI Plan, Cost, and Documents tabs.
              </p>
            </div>
            <div className="bb10x-readiness">
              <span>Startup readiness</span>
              <strong>{builder10Readiness}%</strong>
              <p>Complete name, customer segment, budget, and monthly target for stronger plan quality.</p>
            </div>
          </div>

          <div className="bb10x-layout">
            <aside className="bb10x-form card-shell">
              <h3>Business details</h3>
              <label>
                Business Name
                <input
                  value={builder10Form.businessName}
                  onChange={(event) => handleBuilder10Change("businessName", event.target.value)}
                  placeholder="Example: MalabarBazaar"
                />
              </label>

              <label>
                Category
                <select
                  value={builder10Form.category}
                  onChange={(event) => handleBuilder10Change("category", event.target.value)}
                >
                  {BUSINESS_BUILDER_10X_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                Location
                <input
                  value={builder10Form.location}
                  onChange={(event) => handleBuilder10Change("location", event.target.value)}
                />
              </label>

              <label>
                Target Customers
                <textarea
                  value={builder10Form.targetCustomers}
                  onChange={(event) => handleBuilder10Change("targetCustomers", event.target.value)}
                  placeholder="Example: Kerala homemade product sellers and global buyers"
                />
              </label>

              <label>
                Initial Investment (INR)
                <input
                  type="number"
                  min="0"
                  value={builder10Form.investment}
                  onChange={(event) => handleBuilder10Change("investment", parseNumber(event.target.value))}
                />
              </label>

              <label>
                Monthly Revenue Target (INR)
                <input
                  type="number"
                  min="0"
                  value={builder10Form.monthlyTarget}
                  onChange={(event) => handleBuilder10Change("monthlyTarget", parseNumber(event.target.value))}
                />
              </label>

              <label>
                Language
                <select
                  value={builder10Form.language}
                  onChange={(event) => handleBuilder10Change("language", event.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam</option>
                </select>
              </label>

              <div className="bb10x-action-row">
                <button type="button" className="button-primary" onClick={saveBuilder10Plan}>
                  Save 10X Plan
                </button>
                <button type="button" className="button-secondary" onClick={copyBuilder10Plan}>
                  Copy Plan
                </button>
                <button type="button" className="button-secondary" onClick={applyBuilder10PlanToWorkspace}>
                  Apply to Workspace
                </button>
                <button type="button" className="button-primary" onClick={generateBuilder10AiPlan} disabled={builder10Generating}>
                  {builder10Generating ? "Generating AI Plan..." : "Generate AI 10X Plan"}
                </button>
                <button type="button" className="button-secondary" onClick={downloadBuilder10PlanPdf} disabled={downloadingBuilderPdf}>
                  {downloadingBuilderPdf ? "Downloading PDF..." : "Download Plan PDF"}
                </button>
              </div>
            </aside>

            <main className="bb10x-preview">
              <div className="card-shell bb10x-card">
                <h3>{builder10Form.businessName || "Your Business Name"}</h3>
                <p className="bb10x-tagline">{activeBuilder10Plan?.tagline || activeBuilder10Plan?.branding?.tagline || builder10Plan.tagline}</p>
                <div className="bb10x-mini-grid">
                  <div>
                    <strong>Category</strong>
                    <span>{builder10Form.category}</span>
                  </div>
                  <div>
                    <strong>Location</strong>
                    <span>{builder10Form.location}</span>
                  </div>
                  <div>
                    <strong>Investment</strong>
                    <span>{formatINR(activeBuilder10Plan?.investment || builder10Plan.investment)}</span>
                  </div>
                  <div>
                    <strong>Monthly Target</strong>
                    <span>{formatINR(activeBuilder10Plan?.monthlyTarget || builder10Plan.monthlyTarget)}</span>
                  </div>
                </div>
              </div>

              <div className="card-shell bb10x-card">
                <h3>Revenue Model</h3>
                <p>{activeBuilder10Plan?.revenueModel || builder10Plan.revenueModel}</p>
                <p className="section-note">Estimated runway: {activeBuilder10Plan?.runwayMonths || builder10Plan.runwayMonths} months (early-stage heuristic).</p>
              </div>

              {builder10AiPlan && (
                <div className="card-shell bb10x-card">
                  <h3>AI Strategy Breakdown</h3>
                  <p><strong>Summary:</strong> {builder10AiPlan.summary}</p>
                  <p><strong>Market Analysis:</strong> {builder10AiPlan.marketAnalysis}</p>
                  <p><strong>Competitor Analysis:</strong> {builder10AiPlan.competitorAnalysis}</p>
                  <p><strong>Cost Estimation:</strong> {builder10AiPlan.costEstimation}</p>
                  <p><strong>Profit Projection:</strong> {builder10AiPlan.profitProjection}</p>
                </div>
              )}

              <div className="card-shell bb10x-card">
                <h3>Legal and Setup Checklist</h3>
                <div className="bb10x-checklist">
                  {(activeBuilder10Plan?.legalChecklist || builder10Plan.legalChecklist).map((item) => (
                    <label key={item} className="bb10x-check">
                      <input type="checkbox" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="card-shell bb10x-card">
                <h3>30-Day Launch Plan</h3>
                <ol>
                  {(activeBuilder10Plan?.launchPlan || activeBuilder10Plan?.roadmap30 || builder10Plan.launchPlan).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>

              <div className="card-shell bb10x-card">
                <h3>Logo and Branding Prompt</h3>
                <p>{activeBuilder10Plan?.logoPrompt || activeBuilder10Plan?.branding?.logoPrompt || builder10Plan.logoPrompt}</p>
              </div>

              <div className="card-shell bb10x-card">
                <h3>10/10 Improvement Plan</h3>
                <div className="bb10x-roadmap">
                  {BUSINESS_BUILDER_10X_UPGRADE_MAP.map((item) => (
                    <div className="bb10x-roadmap-item" key={item.area}>
                      <div>
                        <strong>{item.area}</strong>
                        <p>{item.upgrade}</p>
                      </div>
                      <span className={`bb10x-badge ${item.status}`}>{item.status === "ready" ? "Available" : "Next phase"}</span>
                    </div>
                  ))}
                </div>
                <p className="section-note">
                  Current rating: 8.8/10. To reach 10/10, connect AI plan generation to backend model APIs, add PDF-ready business-plan exports, and create verified legal partner lead flow.
                </p>
              </div>
            </main>
          </div>

          <div className="list-section">
            <h3>Saved 10X plans</h3>
            {builder10Plans.length === 0 ? (
              <p>No 10X plans saved yet.</p>
            ) : (
              <div className="document-history">
                {builder10Plans.map((plan) => (
                  <div key={plan.id} className="document-card">
                    <strong>{plan.businessName || "Untitled Plan"}</strong>
                    <p>{plan.category} | {plan.location}</p>
                    <p>{new Date(plan.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "cost" && (
        <div className="section-card">
          <h2>Startup Cost Calculator</h2>
          <p className="section-subtitle">Estimate investment, monthly burn, and break-even period.</p>

          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              Rent (monthly)
              <input type="number" min="0" value={costForm.rent} onChange={(event) => handleCostChange("rent", event.target.value)} />
            </label>
            <label>
              Staff salary (monthly)
              <input type="number" min="0" value={costForm.staffSalary} onChange={(event) => handleCostChange("staffSalary", event.target.value)} />
            </label>
            <label>
              Inventory (one-time)
              <input type="number" min="0" value={costForm.inventory} onChange={(event) => handleCostChange("inventory", event.target.value)} />
            </label>
            <label>
              Marketing (monthly)
              <input type="number" min="0" value={costForm.marketing} onChange={(event) => handleCostChange("marketing", event.target.value)} />
            </label>
            <label>
              License cost (one-time)
              <input type="number" min="0" value={costForm.licenseCost} onChange={(event) => handleCostChange("licenseCost", event.target.value)} />
            </label>
            <label>
              Equipment (one-time)
              <input type="number" min="0" value={costForm.equipment} onChange={(event) => handleCostChange("equipment", event.target.value)} />
            </label>
            <label>
              Utilities (monthly)
              <input type="number" min="0" value={costForm.utilities} onChange={(event) => handleCostChange("utilities", event.target.value)} />
            </label>
            <label>
              Other monthly expenses
              <input type="number" min="0" value={costForm.otherMonthly} onChange={(event) => handleCostChange("otherMonthly", event.target.value)} />
            </label>
            <label className="full-width">
              Expected monthly revenue
              <input type="number" min="0" value={costForm.expectedMonthlyRevenue} onChange={(event) => handleCostChange("expectedMonthlyRevenue", event.target.value)} />
            </label>
          </form>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Estimated one-time investment</span>
              <strong>{formatINR(costSummary.oneTimeInvestment)}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Estimated monthly expenses</span>
              <strong>{formatINR(costSummary.monthlyExpenses)}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Estimated monthly profit</span>
              <strong>{formatINR(costSummary.monthlyProfit)}</strong>
            </div>
            <div className="kpi-card highlight">
              <span className="kpi-label">Break-even period</span>
              <strong>{costSummary.breakEvenMonths ? `${costSummary.breakEvenMonths} months` : "Not reached yet"}</strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === "schemes" && (
        <div className="section-card">
          <h2>Government Scheme Hub</h2>
          <p className="section-subtitle">Get scheme recommendations based on business type and entrepreneur profile.</p>

          <div className="toggle-grid">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={schemeProfile.isWomenEntrepreneur}
                onChange={(event) => setSchemeProfile((current) => ({ ...current, isWomenEntrepreneur: event.target.checked }))}
              />
              Women entrepreneur
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={schemeProfile.isKeralaBased}
                onChange={(event) => setSchemeProfile((current) => ({ ...current, isKeralaBased: event.target.checked }))}
              />
              Kerala-based business
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={schemeProfile.isSCSTEntrepreneur}
                onChange={(event) => setSchemeProfile((current) => ({ ...current, isSCSTEntrepreneur: event.target.checked }))}
              />
              SC/ST entrepreneur
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={schemeProfile.isMinorityEntrepreneur}
                onChange={(event) => setSchemeProfile((current) => ({ ...current, isMinorityEntrepreneur: event.target.checked }))}
              />
              Minority entrepreneur
            </label>
          </div>

          <div className="list-section">
            <h3>Recommended schemes</h3>
            {schemeSuggestions.length === 0 ? (
              <p>No exact match found with current profile. Try updating business type, budget, or eligibility filters.</p>
            ) : (
              <div className="scheme-grid">
                {schemeSuggestions.map((scheme) => (
                  <div key={scheme.id} className="scheme-card">
                    <h4>{scheme.name}</h4>
                    <p><strong>Best fit:</strong> {scheme.fit}</p>
                    <p>{scheme.benefit}</p>
                    <p className="scheme-tags">{scheme.tags.join(" | ")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="section-card">
          <h2>Document Generator</h2>
          <p className="section-subtitle">Create ready-to-use business documents for operations and sales.</p>
          <p className="section-note">Current mode: local/offline preview. Generated documents are saved in this browser workspace and download as `.txt`.</p>

          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              Document type
              <select value={documentForm.type} onChange={(event) => handleDocumentChange("type", event.target.value)}>
                {["Quotation", "Receipt", "Proposal", "GST Bill Format", "Brochure Content", "Visiting Card Text"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Customer name
              <input value={documentForm.customerName} onChange={(event) => handleDocumentChange("customerName", event.target.value)} />
            </label>
            <label>
              Customer/company
              <input value={documentForm.customerCompany} onChange={(event) => handleDocumentChange("customerCompany", event.target.value)} />
            </label>
            <label>
              Subject
              <input value={documentForm.subject} onChange={(event) => handleDocumentChange("subject", event.target.value)} />
            </label>
            <label className="full-width">
              Line items / content blocks
              <textarea
                value={documentForm.lineItems}
                onChange={(event) => handleDocumentChange("lineItems", event.target.value)}
                placeholder="- Service 1\n- Service 2"
              />
            </label>
            <label className="full-width">
              Notes
              <textarea value={documentForm.notes} onChange={(event) => handleDocumentChange("notes", event.target.value)} />
            </label>
          </form>

          <div className="ai-actions-row">
            <button type="button" className="button-primary" onClick={generateDocument} disabled={generatingDocument}>
              {generatingDocument ? "Generating..." : "Generate Document"}
            </button>
            <button type="button" className="button-secondary" onClick={copyDocument} disabled={generatingDocument}>Copy</button>
            <button type="button" className="button-secondary" onClick={downloadDocument} disabled={generatingDocument}>Download .txt</button>
          </div>

          <div className="document-preview">
            <h3>Preview</h3>
            <pre>{documentPreview || "Your generated document will appear here."}</pre>
          </div>

          <div className="list-section">
            <h3>Generated documents history</h3>
            {generatedDocuments.length === 0 ? (
              <p>No generated documents yet.</p>
            ) : (
              <div className="document-history">
                {generatedDocuments.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <strong>{doc.title}</strong>
                    <p>{new Date(doc.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "checklist" && (
        <div className="section-card">
          <h2>Business Launch Checklist</h2>
          <p className="section-subtitle">Execution tracker after planning. Keep this at 100% before scaling spend.</p>
          <p className="section-note">{activeBusinessId ? "Checklist changes sync to this business profile." : "Checklist is currently in draft mode until you save a business profile."}</p>

          <div className="wizard-progress-wrap">
            <div className="wizard-progress-row">
              <strong>{checklistCompletion.done}/{checklistCompletion.total} tasks complete</strong>
              <span>{checklistCompletion.percent}% complete</span>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${checklistCompletion.percent}%` }} />
            </div>
          </div>

          <div className="checklist-list">
            {checklist.map((item) => (
              <label key={item.id} className={`checklist-item ${item.completed ? "done" : ""}`}>
                <input type="checkbox" checked={item.completed} onChange={() => toggleChecklist(item.id)} />
                <span>{item.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="section-card">
          <h2>Business profile</h2>
          <p className="section-subtitle">
            Save your identity so plan, invoices, mini app, and documents stay consistent.
          </p>

          <form className="form-grid" onSubmit={handleSaveBusiness}>
            {businesses.length > 1 ? (
              <>
                <label className="full-width">
                  Select business profile
                  <select
                    value={activeBusinessId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setActiveBusinessId(nextId);
                      const selected = businesses.find((business) => business.businessId === nextId);
                      if (selected) {
                        applyBusinessToForm(selected);
                        hydrateWorkspaceFromBusiness(selected);
                      }
                    }}
                  >
                    {businesses.map((business) => (
                      <option key={business.businessId} value={business.businessId}>
                        {business.businessName} ({business.businessType})
                      </option>
                    ))}
                  </select>
                </label>
                <p className="section-note full-width">Workspace forms are loaded per selected business.</p>
              </>
            ) : null}
            <label>
              Business name
              <input
                className={businessErrors.businessName ? "input-invalid" : ""}
                value={businessForm.businessName}
                onChange={(event) => handleBusinessChange("businessName", event.target.value)}
                required
              />
              {businessErrors.businessName ? <span className="field-error">{businessErrors.businessName}</span> : null}
            </label>
            <label>
              Business type
              <select
                value={businessForm.businessType}
                onChange={(event) => handleBusinessChange("businessType", event.target.value)}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact phone
              <input
                className={businessErrors.phone ? "input-invalid" : ""}
                value={businessForm.phone}
                onChange={(event) => handleBusinessChange("phone", event.target.value)}
                required
              />
              {businessErrors.phone ? <span className="field-error">{businessErrors.phone}</span> : null}
            </label>
            <label>
              Contact email
              <input
                type="email"
                className={businessErrors.email ? "input-invalid" : ""}
                value={businessForm.email}
                onChange={(event) => handleBusinessChange("email", event.target.value)}
                required
              />
              {businessErrors.email ? <span className="field-error">{businessErrors.email}</span> : null}
            </label>
            <label>
              Website
              <input
                value={businessForm.website}
                onChange={(event) => handleBusinessChange("website", event.target.value)}
              />
            </label>
            <label>
              GSTIN
              <input
                className={businessErrors.gstin ? "input-invalid" : ""}
                value={businessForm.gstin}
                onChange={(event) => handleBusinessChange("gstin", event.target.value.toUpperCase())}
              />
              {businessErrors.gstin ? <span className="field-error">{businessErrors.gstin}</span> : null}
            </label>
            <label>
              Street address
              <input
                value={businessForm.addressStreet}
                onChange={(event) => handleBusinessChange("addressStreet", event.target.value)}
              />
            </label>
            <label>
              City
              <input
                value={businessForm.addressCity}
                onChange={(event) => handleBusinessChange("addressCity", event.target.value)}
              />
            </label>
            <label>
              State
              <input
                value={businessForm.addressState}
                onChange={(event) => handleBusinessChange("addressState", event.target.value)}
              />
            </label>
            <label>
              PIN code
              <input
                className={businessErrors.addressPincode ? "input-invalid" : ""}
                value={businessForm.addressPincode}
                onChange={(event) => handleBusinessChange("addressPincode", event.target.value)}
              />
              {businessErrors.addressPincode ? <span className="field-error">{businessErrors.addressPincode}</span> : null}
            </label>
            <label>
              Primary accent
              <input
                type="color"
                value={businessForm.primaryColor}
                onChange={(event) => handleBusinessChange("primaryColor", event.target.value)}
              />
            </label>
            <label>
              Secondary accent
              <input
                type="color"
                value={businessForm.secondaryColor}
                onChange={(event) => handleBusinessChange("secondaryColor", event.target.value)}
              />
            </label>
            <button type="submit" className="button-primary" disabled={savingBusiness}>
              {savingBusiness ? "Saving..." : "Save business profile"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="section-card">
          <h2>Invoice Studio</h2>
          <p className="section-subtitle">
            Create customer invoices, preview totals, and download PDF receipts instantly.
          </p>

          <form className="form-grid" onSubmit={handleCreateInvoice}>
            <label>
              Customer name
              <input
                className={invoiceErrors.customerName ? "input-invalid" : ""}
                value={invoiceForm.customerName}
                onChange={(event) => handleInvoiceChange("customerName", event.target.value)}
                required
              />
              {invoiceErrors.customerName ? <span className="field-error">{invoiceErrors.customerName}</span> : null}
            </label>
            <label>
              Customer phone
              <input
                className={invoiceErrors.customerPhone || invoiceErrors.customerContact ? "input-invalid" : ""}
                value={invoiceForm.customerPhone}
                onChange={(event) => handleInvoiceChange("customerPhone", event.target.value)}
              />
              {invoiceErrors.customerPhone ? <span className="field-error">{invoiceErrors.customerPhone}</span> : null}
            </label>
            <label>
              Customer email
              <input
                type="email"
                className={invoiceErrors.customerEmail || invoiceErrors.customerContact ? "input-invalid" : ""}
                value={invoiceForm.customerEmail}
                onChange={(event) => handleInvoiceChange("customerEmail", event.target.value)}
              />
              {invoiceErrors.customerEmail ? <span className="field-error">{invoiceErrors.customerEmail}</span> : null}
            </label>
            <label>
              Customer GSTIN
              <input
                className={invoiceErrors.customerGSTIN ? "input-invalid" : ""}
                value={invoiceForm.customerGSTIN}
                onChange={(event) => handleInvoiceChange("customerGSTIN", event.target.value.toUpperCase())}
              />
              {invoiceErrors.customerGSTIN ? <span className="field-error">{invoiceErrors.customerGSTIN}</span> : null}
            </label>
            {invoiceErrors.customerContact ? <p className="field-error full-width">{invoiceErrors.customerContact}</p> : null}
            <label className="full-width">
              Customer address
              <textarea
                value={invoiceForm.customerAddress}
                onChange={(event) => handleInvoiceChange("customerAddress", event.target.value)}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                className={invoiceErrors.dueDate ? "input-invalid" : ""}
                value={invoiceForm.dueDate}
                onChange={(event) => handleInvoiceChange("dueDate", event.target.value)}
                required
              />
              {invoiceErrors.dueDate ? <span className="field-error">{invoiceErrors.dueDate}</span> : null}
            </label>
            <label>
              Discount (INR)
              <input
                type="number"
                min="0"
                value={invoiceForm.discountAmount}
                onChange={(event) => handleInvoiceChange("discountAmount", event.target.value)}
              />
            </label>
            <label>
              Currency
              <input value={invoiceForm.currency} disabled />
            </label>
            <label className="full-width">
              Notes
              <textarea
                value={invoiceForm.notes}
                onChange={(event) => handleInvoiceChange("notes", event.target.value)}
              />
            </label>

            <div className="invoice-items-header">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Tax %</span>
            </div>
            {invoiceForm.items.map((item, index) => (
              <div className="invoice-item-row" key={`item-${index}`}>
                <input
                  type="text"
                  className={invoiceItemErrors?.[index]?.name ? "input-invalid" : ""}
                  value={item.name}
                  onChange={(event) => handleInvoiceItemChange(index, "name", event.target.value)}
                  placeholder="Item name"
                />
                <input
                  type="number"
                  className={invoiceItemErrors?.[index]?.quantity ? "input-invalid" : ""}
                  value={item.quantity}
                  onChange={(event) => handleInvoiceItemChange(index, "quantity", event.target.value)}
                  min="1"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  className={invoiceItemErrors?.[index]?.unitPrice ? "input-invalid" : ""}
                  value={item.unitPrice}
                  onChange={(event) => handleInvoiceItemChange(index, "unitPrice", event.target.value)}
                  min="0"
                  placeholder="Unit price"
                />
                <input
                  type="number"
                  className={invoiceItemErrors?.[index]?.taxRate ? "input-invalid" : ""}
                  value={item.taxRate}
                  onChange={(event) => handleInvoiceItemChange(index, "taxRate", event.target.value)}
                  min="0"
                  placeholder="Tax %"
                />
                {(invoiceItemErrors?.[index]?.name || invoiceItemErrors?.[index]?.quantity || invoiceItemErrors?.[index]?.unitPrice || invoiceItemErrors?.[index]?.taxRate) ? (
                  <p className="field-error full-width">
                    {invoiceItemErrors?.[index]?.name || invoiceItemErrors?.[index]?.quantity || invoiceItemErrors?.[index]?.unitPrice || invoiceItemErrors?.[index]?.taxRate}
                  </p>
                ) : null}
              </div>
            ))}
            {invoiceErrors.items ? <p className="field-error full-width">{invoiceErrors.items}</p> : null}
            <button type="button" className="button-secondary" onClick={handleAddInvoiceItem} disabled={creatingInvoice}>
              Add item
            </button>
            <button type="submit" className="button-primary" disabled={creatingInvoice}>
              {creatingInvoice ? "Creating..." : "Create invoice"}
            </button>
          </form>

          <div className="list-section">
            <h3>Recent invoices</h3>
            {invoices.length === 0 ? (
              <p>No invoices created yet.</p>
            ) : (
              <div className="invoice-list">
                {invoices.map((invoice) => (
                  <div className="invoice-card" key={invoice.invoiceId || invoice._id}>
                    <div>
                      <strong>{invoice.invoiceNumber}</strong>
                      <p>{invoice?.customer?.name || "Customer"}</p>
                      <p>{formatINR(invoice.totalAmount)}</p>
                    </div>
                    <div className="invoice-card-actions">
                      <button
                        type="button"
                        disabled={downloadingInvoiceId === (invoice.invoiceId || invoice._id)}
                        onClick={() => downloadPdf(invoice.invoiceId || invoice._id, invoice.invoiceNumber)}
                      >
                        {downloadingInvoiceId === (invoice.invoiceId || invoice._id) ? "Downloading..." : "Download PDF"}
                      </button>
                      <span className="invoice-status">{invoice.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "miniapps" && (
        <div className="section-card">
          <h2>Mini App Builder</h2>
          <p className="section-subtitle">
            Launch a lightweight mini app for your business with a custom landing page and customer touchpoints.
          </p>

          <form className="form-grid" onSubmit={handleCreateMiniApp}>
            <label>
              App display name
              <input
                className={miniAppErrors.appName ? "input-invalid" : ""}
                value={miniAppForm.appName}
                onChange={(event) => handleMiniAppChange("appName", event.target.value)}
                required
              />
              {miniAppErrors.appName ? <span className="field-error">{miniAppErrors.appName}</span> : null}
            </label>
            <label>
              App slug
              <input
                className={miniAppErrors.slug ? "input-invalid" : ""}
                value={miniAppForm.slug}
                onChange={(event) => handleMiniAppChange("slug", cleanSlug(event.target.value))}
                required
                placeholder="my-store"
              />
              <span className="slug-preview">Public path preview: /{effectiveMiniAppSlug || "your-slug"}</span>
              {slugIsReserved ? <span className="field-error">This slug is reserved. Choose another.</span> : null}
              {slugAlreadyInUse ? <span className="field-error">This slug is already in use in your account.</span> : null}
              {miniAppErrors.slug ? <span className="field-error">{miniAppErrors.slug}</span> : null}
            </label>
            <label>
              App type
              <select
                value={miniAppForm.appType}
                onChange={(event) => handleMiniAppChange("appType", event.target.value)}
              >
                {MINIAPP_TYPES.map((appType) => (
                  <option key={appType} value={appType}>
                    {appType}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-width">
              Description
              <textarea
                value={miniAppForm.description}
                onChange={(event) => handleMiniAppChange("description", event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                className={miniAppErrors.email ? "input-invalid" : ""}
                value={miniAppForm.email}
                onChange={(event) => handleMiniAppChange("email", event.target.value)}
              />
              {miniAppErrors.email ? <span className="field-error">{miniAppErrors.email}</span> : null}
            </label>
            <label>
              Phone
              <input
                className={miniAppErrors.phone ? "input-invalid" : ""}
                value={miniAppForm.phone}
                onChange={(event) => handleMiniAppChange("phone", event.target.value)}
              />
              {miniAppErrors.phone ? <span className="field-error">{miniAppErrors.phone}</span> : null}
            </label>
            <label>
              Website
              <input
                value={miniAppForm.website}
                onChange={(event) => handleMiniAppChange("website", event.target.value)}
              />
            </label>
            <label className="full-width">
              Address
              <textarea
                value={miniAppForm.address}
                onChange={(event) => handleMiniAppChange("address", event.target.value)}
              />
            </label>
            <label>
              Primary color
              <input
                type="color"
                value={miniAppForm.primaryColor}
                onChange={(event) => handleMiniAppChange("primaryColor", event.target.value)}
              />
            </label>
            <label>
              Secondary color
              <input
                type="color"
                value={miniAppForm.secondaryColor}
                onChange={(event) => handleMiniAppChange("secondaryColor", event.target.value)}
              />
            </label>
            <button type="submit" className="button-primary" disabled={creatingMiniApp || isMiniAppLimitReached}>
              {creatingMiniApp ? "Launching..." : "Launch mini app"}
            </button>
            {isMiniAppLimitReached ? (
              <p className="field-error full-width">Mini app limit reached for your plan. Upgrade to create more mini apps.</p>
            ) : null}
          </form>

          <div className="list-section">
            <h3>My mini apps</h3>
            {miniApps.length === 0 ? (
              <p>No mini apps created yet.</p>
            ) : (
              <div className="miniapp-grid">
                {miniApps.map((app) => (
                  <div key={app.miniAppId || app._id} className="miniapp-card">
                    <div>
                      <strong>{app.appName}</strong>
                      <p>{app.appType} - {app.status}</p>
                      <p>/{app.slug}</p>
                      <p className="muted-inline">Public API: /api/business-builder/public/mini-apps/{app.slug}</p>
                    </div>
                    <div className="invoice-card-actions">
                      <button type="button" onClick={() => setSelectedMiniAppId(app.miniAppId || app._id)}>
                        Manage in 360
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ops360" && (
        <div className="section-card">
          <h2>360 Operations Center</h2>
          <p className="section-subtitle">
            Manage entitlements, AI assets, mini app products, order lifecycle, and funnel analytics in one place.
          </p>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Plan</span>
              <strong>{entitlements?.plan || "free"}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">AI assets used</span>
              <strong>{entitlements?.usage?.aiAssetsGenerated || 0}/{entitlements?.limits?.maxAiAssetsPerMonth ?? "-"}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Mini app limit</span>
              <strong>{miniApps.length}/{entitlements?.limits?.maxMiniApps ?? "-"}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">30-day views</span>
              <strong>{businessAnalytics?.summary?.views || 0}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">30-day paid orders</span>
              <strong>{businessAnalytics?.summary?.paidOrders || 0}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">30-day revenue</span>
              <strong>{formatINR(businessAnalytics?.summary?.revenue || 0)}</strong>
            </div>
          </div>

          <div className="insight-panels">
            <div className="insight-card">
              <h3>Plan and monetization</h3>
              <form className="form-grid compact-grid" onSubmit={handleSaveSubscription}>
                <label>
                  Subscription plan
                  <select value={subscriptionPlan} onChange={(event) => setSubscriptionPlan(event.target.value)}>
                    {["free", "starter", "pro", "enterprise"].map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="button-primary" disabled={savingSubscription}>
                  {savingSubscription ? "Saving..." : "Save plan"}
                </button>
              </form>
              <p className="section-note">
                Featured directory: {entitlements?.monetization?.featuredDirectory ? "Enabled" : "Disabled"}
              </p>
            </div>

            <div className="insight-card">
              <h3>Generate AI asset</h3>
              <form className="form-grid compact-grid" onSubmit={handleGenerateAsset}>
                <label>
                  Asset type
                  <select value={aiAssetForm.assetType} onChange={(event) => handleAiAssetChange("assetType", event.target.value)}>
                    {["poster", "caption", "website"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Offer
                  <input value={aiAssetForm.offer} onChange={(event) => handleAiAssetChange("offer", event.target.value)} />
                </label>
                <label>
                  CTA
                  <input value={aiAssetForm.cta} onChange={(event) => handleAiAssetChange("cta", event.target.value)} />
                </label>
                <label className="full-width">
                  Prompt
                  <textarea
                    className={aiAssetErrors.prompt ? "input-invalid" : ""}
                    value={aiAssetForm.prompt}
                    onChange={(event) => handleAiAssetChange("prompt", event.target.value)}
                  />
                  {aiAssetErrors.prompt ? <span className="field-error">{aiAssetErrors.prompt}</span> : null}
                </label>
                <button type="submit" className="button-primary" disabled={generatingAsset || isAiAssetLimitReached}>
                  {generatingAsset ? "Generating..." : "Generate"}
                </button>
                {isAiAssetLimitReached ? (
                  <p className="field-error full-width">You've reached your monthly AI asset limit. Upgrade plan to continue.</p>
                ) : null}
              </form>
            </div>
          </div>

          <div className="list-section">
            <h3>Recent AI assets</h3>
            {aiAssets.length === 0 ? (
              <p>No AI assets generated yet.</p>
            ) : (
              <div className="document-history">
                {aiAssets.slice(0, 6).map((asset) => (
                  <div key={asset.assetId || asset._id} className="document-card">
                    <strong>{asset.assetType}</strong>
                    <p>{new Date(asset.createdAt).toLocaleString()}</p>
                    <p className="truncate-text">{asset.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="list-section">
            <h3>Mini app operations</h3>
            {miniApps.length === 0 ? (
              <p>Create at least one mini app to manage products, orders, and funnel.</p>
            ) : (
              <>
                <label className="inline-selector">
                  Select mini app
                  <select value={selectedMiniAppId} onChange={(event) => setSelectedMiniAppId(event.target.value)}>
                    {miniApps.map((app) => (
                      <option key={app.miniAppId || app._id} value={app.miniAppId || app._id}>
                        {app.appName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="kpi-grid">
                  <div className="kpi-card">
                    <span className="kpi-label">Views</span>
                    <strong>{miniAppFunnel?.metrics?.views || 0}</strong>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Leads</span>
                    <strong>{miniAppFunnel?.metrics?.leads || 0}</strong>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Orders</span>
                    <strong>{miniAppFunnel?.metrics?.orders || 0}</strong>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Paid orders</span>
                    <strong>{miniAppFunnel?.metrics?.paidOrders || 0}</strong>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Lead conversion</span>
                    <strong>{miniAppFunnel?.metrics?.leadConversionRate || 0}%</strong>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Payment success</span>
                    <strong>{miniAppFunnel?.metrics?.paymentSuccessRate || 0}%</strong>
                  </div>
                </div>

                <div className="insight-panels">
                  <div className="insight-card">
                    <h3>Add product for {selectedMiniApp?.appName || "mini app"}</h3>
                    <form className="form-grid compact-grid" onSubmit={handleCreateProduct}>
                      <label>
                        Product name
                        <input value={productForm.name} onChange={(event) => handleProductChange("name", event.target.value)} required />
                      </label>
                      <label>
                        Category
                        <input value={productForm.category} onChange={(event) => handleProductChange("category", event.target.value)} />
                      </label>
                      <label className="full-width">
                        Description
                        <textarea value={productForm.description} onChange={(event) => handleProductChange("description", event.target.value)} />
                      </label>
                      <label>
                        Price
                        <input type="number" min="0" value={productForm.price} onChange={(event) => handleProductChange("price", event.target.value)} required />
                      </label>
                      <label>
                        Discounted price
                        <input type="number" min="0" value={productForm.discountedPrice} onChange={(event) => handleProductChange("discountedPrice", event.target.value)} />
                      </label>
                      <label>
                        Stock
                        <input type="number" min="0" value={productForm.stock} onChange={(event) => handleProductChange("stock", event.target.value)} />
                      </label>
                      <button type="submit" className="button-primary" disabled={creatingProduct}>
                        {creatingProduct ? "Adding..." : "Add product"}
                      </button>
                    </form>
                  </div>

                  <div className="insight-card">
                    <h3>Products ({miniAppProducts.length})</h3>
                    {miniAppProducts.length === 0 ? (
                      <p>No products added yet.</p>
                    ) : (
                      <div className="document-history">
                        {miniAppProducts.map((product) => (
                          <div key={product.productId || product._id} className="document-card">
                            <strong>{product.name}</strong>
                            <p>{formatINR(product.price)}{product.discountedPrice ? ` -> ${formatINR(product.discountedPrice)}` : ""}</p>
                            <p>{product.category || "General"} | Stock: {product.stock ?? "-"}</p>
                            <button
                              type="button"
                              className="button-secondary"
                              disabled={deletingProductId === (product.productId || product._id)}
                              onClick={() => handleDeleteProduct(product.productId || product._id)}
                            >
                              {deletingProductId === (product.productId || product._id) ? "Removing..." : "Remove"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="list-section">
                  <h3>Order lifecycle</h3>
                  {miniAppOrders.length === 0 ? (
                    <p>No orders yet for this mini app.</p>
                  ) : (
                    <div className="invoice-list">
                      {miniAppOrders.map((order) => (
                        <div className="invoice-card" key={order.orderId || order._id}>
                          <div>
                            <strong>{order.orderId}</strong>
                            <p>{order?.customer?.name || "Customer"} | {formatINR(order.totalAmount)}</p>
                            <p>Payment: {order?.payment?.status || "not_started"}</p>
                            <p>Status: {order.status}</p>
                          </div>
                          <div className="invoice-card-actions">
                            <button
                              type="button"
                              disabled={updatingOrderId === (order.orderId || order._id)}
                              onClick={() => handleOrderStatusUpdate(order.orderId || order._id, "confirmed")}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={updatingOrderId === (order.orderId || order._id)}
                              onClick={() => handleOrderStatusUpdate(order.orderId || order._id, "completed")}
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              disabled={updatingOrderId === (order.orderId || order._id)}
                              onClick={() => handleOrderStatusUpdate(order.orderId || order._id, "cancelled")}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessBuilder;
