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

const BusinessBuilder = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [businessForm, setBusinessForm] = useState(INITIAL_BUSINESS_FORM);
  const [launchForm, setLaunchForm] = useState(() => loadFromStorage(STORAGE_KEYS.launchForm, INITIAL_LAUNCH_FORM));
  const [wizardStep, setWizardStep] = useState(0);

  const [invoiceForm, setInvoiceForm] = useState(INITIAL_INVOICE_FORM);
  const [miniAppForm, setMiniAppForm] = useState(INITIAL_MINIAPP_FORM);
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [documentForm, setDocumentForm] = useState(INITIAL_DOCUMENT_FORM);

  const [costForm, setCostForm] = useState(() => loadFromStorage(STORAGE_KEYS.costForm, INITIAL_COST_FORM));
  const [schemeProfile, setSchemeProfile] = useState(() => loadFromStorage(STORAGE_KEYS.schemeProfile, INITIAL_SCHEME_PROFILE));
  const [checklist, setChecklist] = useState(() => loadFromStorage(STORAGE_KEYS.checklist, DEFAULT_CHECKLIST));

  const [businessPlan, setBusinessPlan] = useState(() => loadFromStorage(STORAGE_KEYS.businessPlan, null));
  const [brandingIdeas, setBrandingIdeas] = useState(null);
  const [documentPreview, setDocumentPreview] = useState("");
  const [generatedDocuments, setGeneratedDocuments] = useState(() => loadFromStorage(STORAGE_KEYS.generatedDocs, []));

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
    window.localStorage.setItem(STORAGE_KEYS.launchForm, JSON.stringify(launchForm));
  }, [launchForm]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.costForm, JSON.stringify(costForm));
  }, [costForm]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.checklist, JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.businessPlan, JSON.stringify(businessPlan));
  }, [businessPlan]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.generatedDocs, JSON.stringify(generatedDocuments));
  }, [generatedDocuments]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.schemeProfile, JSON.stringify(schemeProfile));
  }, [schemeProfile]);

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
    setBusinessForm((current) => ({ ...current, [field]: value }));
  };

  const handleLaunchChange = (field, value) => {
    setLaunchForm((current) => ({ ...current, [field]: value }));
  };

  const handleCostChange = (field, value) => {
    setCostForm((current) => ({ ...current, [field]: parseNumber(value) }));
  };

  const handleInvoiceChange = (field, value) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }));
  };

  const handleInvoiceItemChange = (index, field, value) => {
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
    setMiniAppForm((current) => ({ ...current, [field]: value }));
  };

  const handleProductChange = (field, value) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const handleAiAssetChange = (field, value) => {
    setAiAssetForm((current) => ({ ...current, [field]: value }));
  };

  const handleDocumentChange = (field, value) => {
    setDocumentForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveBusiness = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        businessName: businessForm.businessName,
        businessType: businessForm.businessType,
        phone: businessForm.phone,
        email: businessForm.email,
        website: businessForm.website,
        gstin: businessForm.gstin,
        address: {
          street: businessForm.addressStreet,
          city: businessForm.addressCity,
          state: businessForm.addressState,
          pincode: businessForm.addressPincode,
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
        showStatus("Business profile saved successfully.");
      }
    } catch (error) {
      showStatus("Unable to save business profile. Check fields and try again.");
    }
  };

  const handleCreateInvoice = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before creating invoices.");
      return;
    }
    try {
      const payload = {
        businessId: activeBusinessId,
        customer: {
          name: invoiceForm.customerName,
          phone: invoiceForm.customerPhone,
          email: invoiceForm.customerEmail,
          gstin: invoiceForm.customerGSTIN,
          address: invoiceForm.customerAddress,
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
        await fetchInvoices();
        showStatus("Invoice created successfully.");
      }
    } catch (error) {
      showStatus("Unable to create invoice. Please verify item details and try again.");
    }
  };

  const handleCreateMiniApp = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before launching a mini app.");
      return;
    }
    try {
      const payload = {
        businessId: activeBusinessId,
        appName: miniAppForm.appName,
        slug: miniAppForm.slug,
        appType: miniAppForm.appType,
        appDescription: miniAppForm.description,
        branding: {
          primaryColor: miniAppForm.primaryColor,
          secondaryColor: miniAppForm.secondaryColor,
        },
        content: {
          heroTitle: miniAppForm.appName,
          heroSubtitle: miniAppForm.description,
          aboutText: miniAppForm.description,
          contactInfo: {
            email: miniAppForm.email,
            phone: miniAppForm.phone,
            address: miniAppForm.address,
            website: miniAppForm.website,
          },
        },
      };
      const response = await axios.post("/api/business-builder/mini-apps", payload);
      if (response.data?.success) {
        setMiniAppForm(INITIAL_MINIAPP_FORM);
        await Promise.all([fetchMiniApps(), fetchEntitlements()]);
        showStatus("Mini app created successfully.");
      }
    } catch (error) {
      showStatus("Unable to create mini app. Try a different slug and check required fields.");
    }
  };

  const handleSaveSubscription = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before changing subscription.");
      return;
    }
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
      showStatus("Unable to update subscription. Please try again.");
    }
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!selectedMiniAppId) {
      showStatus("Create/select a mini app before adding products.");
      return;
    }
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
      showStatus("Unable to add product. Check fields and try again.");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!selectedMiniAppId) return;
    try {
      const response = await axios.delete(`/api/business-builder/mini-apps/${selectedMiniAppId}/products/${productId}`);
      if (response.data?.success) {
        await fetchMiniAppProducts(selectedMiniAppId);
        showStatus("Product removed.");
      }
    } catch (error) {
      showStatus("Unable to remove product right now.");
    }
  };

  const handleGenerateAsset = async (event) => {
    event.preventDefault();
    if (!activeBusinessId) {
      showStatus("Create and save a business profile before generating assets.");
      return;
    }
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
        await Promise.all([fetchAIAssets(), fetchEntitlements()]);
        showStatus("AI asset generated and saved.");
      }
    } catch (error) {
      showStatus(error?.response?.data?.message || "Unable to generate AI asset.");
    }
  };

  const handleOrderStatusUpdate = async (orderId, status) => {
    try {
      const response = await axios.patch(`/api/business-builder/orders/${orderId}/status`, { status });
      if (response.data?.success) {
        await Promise.all([fetchMiniAppOrders(selectedMiniAppId), fetchMiniAppFunnel(selectedMiniAppId), fetchBusinessAnalytics()]);
        showStatus("Order status updated.");
      }
    } catch (error) {
      showStatus("Unable to update order status.");
    }
  };

  const downloadPdf = async (invoiceId, invoiceNumber) => {
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
      showStatus("Unable to download PDF. Please try again later.");
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

  const generateDocument = () => {
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
    showStatus(`${documentForm.type} generated successfully.`);
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

  const toggleChecklist = (id) => {
    setChecklist((current) =>
      current.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
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
  const selectedMiniApp = miniApps.find((app) => (app.miniAppId || app._id) === selectedMiniAppId) || null;

  return (
    <div className="business-builder-page">
      <div className="page-header">
        <div>
          <p className="module-label">AI Business Builder</p>
          <h1>SME Growth Studio</h1>
          <p className="page-description">
            Practical launch workflows, AI-ready business planning, startup cost intelligence, government scheme matching, documents, and execution checklists.
          </p>
        </div>
      </div>

      <div className="business-builder-tabs">
        {[
          ["dashboard", "Growth Dashboard"],
          ["wizard", "Launch Wizard"],
          ["ai-plan", "AI Plan Generator"],
          ["cost", "Startup Cost"],
          ["schemes", "Scheme Hub"],
          ["documents", "Document Generator"],
          ["checklist", "Launch Checklist"],
          ["overview", "Business Profile"],
          ["invoices", "Invoice Studio"],
          ["miniapps", "Mini App Builder"],
          ["ops360", "360 Operations"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`tab-button ${activeTab === id ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {statusMessage && <div className="status-banner">{statusMessage}</div>}
      {loading && <div className="status-banner info">Refreshing data...</div>}

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
            <button type="button" className="button-primary" onClick={generateDocument}>Generate Document</button>
            <button type="button" className="button-secondary" onClick={copyDocument}>Copy</button>
            <button type="button" className="button-secondary" onClick={downloadDocument}>Download .txt</button>
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
            ) : null}
            <label>
              Business name
              <input
                value={businessForm.businessName}
                onChange={(event) => handleBusinessChange("businessName", event.target.value)}
                required
              />
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
                value={businessForm.phone}
                onChange={(event) => handleBusinessChange("phone", event.target.value)}
                required
              />
            </label>
            <label>
              Contact email
              <input
                type="email"
                value={businessForm.email}
                onChange={(event) => handleBusinessChange("email", event.target.value)}
                required
              />
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
                value={businessForm.gstin}
                onChange={(event) => handleBusinessChange("gstin", event.target.value)}
              />
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
                value={businessForm.addressPincode}
                onChange={(event) => handleBusinessChange("addressPincode", event.target.value)}
              />
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
            <button type="submit" className="button-primary">
              Save business profile
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
                value={invoiceForm.customerName}
                onChange={(event) => handleInvoiceChange("customerName", event.target.value)}
                required
              />
            </label>
            <label>
              Customer phone
              <input
                value={invoiceForm.customerPhone}
                onChange={(event) => handleInvoiceChange("customerPhone", event.target.value)}
              />
            </label>
            <label>
              Customer email
              <input
                type="email"
                value={invoiceForm.customerEmail}
                onChange={(event) => handleInvoiceChange("customerEmail", event.target.value)}
              />
            </label>
            <label>
              Customer GSTIN
              <input
                value={invoiceForm.customerGSTIN}
                onChange={(event) => handleInvoiceChange("customerGSTIN", event.target.value)}
              />
            </label>
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
                value={invoiceForm.dueDate}
                onChange={(event) => handleInvoiceChange("dueDate", event.target.value)}
                required
              />
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
                  value={item.name}
                  onChange={(event) => handleInvoiceItemChange(index, "name", event.target.value)}
                  placeholder="Item name"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(event) => handleInvoiceItemChange(index, "quantity", event.target.value)}
                  min="1"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(event) => handleInvoiceItemChange(index, "unitPrice", event.target.value)}
                  min="0"
                  placeholder="Unit price"
                />
                <input
                  type="number"
                  value={item.taxRate}
                  onChange={(event) => handleInvoiceItemChange(index, "taxRate", event.target.value)}
                  min="0"
                  placeholder="Tax %"
                />
              </div>
            ))}
            <button type="button" className="button-secondary" onClick={handleAddInvoiceItem}>
              Add item
            </button>
            <button type="submit" className="button-primary">
              Create invoice
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
                        onClick={() => downloadPdf(invoice.invoiceId || invoice._id, invoice.invoiceNumber)}
                      >
                        Download PDF
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
                value={miniAppForm.appName}
                onChange={(event) => handleMiniAppChange("appName", event.target.value)}
                required
              />
            </label>
            <label>
              App slug
              <input
                value={miniAppForm.slug}
                onChange={(event) => handleMiniAppChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
                placeholder="my-store"
              />
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
                value={miniAppForm.email}
                onChange={(event) => handleMiniAppChange("email", event.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                value={miniAppForm.phone}
                onChange={(event) => handleMiniAppChange("phone", event.target.value)}
              />
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
            <button type="submit" className="button-primary">
              Launch mini app
            </button>
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
                <button type="submit" className="button-primary">Save plan</button>
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
                  <textarea value={aiAssetForm.prompt} onChange={(event) => handleAiAssetChange("prompt", event.target.value)} />
                </label>
                <button type="submit" className="button-primary">Generate</button>
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
                      <button type="submit" className="button-primary">Add product</button>
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
                            <button type="button" className="button-secondary" onClick={() => handleDeleteProduct(product.productId || product._id)}>
                              Remove
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
                            <button type="button" onClick={() => handleOrderStatusUpdate(order.orderId || order._id, "confirmed")}>Confirm</button>
                            <button type="button" onClick={() => handleOrderStatusUpdate(order.orderId || order._id, "completed")}>Complete</button>
                            <button type="button" onClick={() => handleOrderStatusUpdate(order.orderId || order._id, "cancelled")}>Cancel</button>
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
