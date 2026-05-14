import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import Ecommerce from "./Ecommerce";
import { API_BASE_URL } from "../../utils/api";
import "../../styles/GlobeMartEntry.css";

const DEFAULT_SELLER_ONBOARDING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    registrationFee: 499,
    monthlyFee: 0,
    yearlyFee: 0,
    transactionFee: "12%",
    description: "No monthly subscription. Higher transaction fee.",
    features: ["Fast onboarding", "Basic seller tools"],
  },
  {
    id: "growth",
    name: "Growth",
    registrationFee: 999,
    monthlyFee: 999,
    yearlyFee: 9999,
    transactionFee: "8%",
    description: "Balanced recurring fee with reduced commission.",
    features: ["Lower commission", "Growth dashboard"],
  },
  {
    id: "pro",
    name: "Pro",
    registrationFee: 4999,
    monthlyFee: 4999,
    yearlyFee: 49999,
    transactionFee: "4%",
    description: "Advanced analytics, ads credits, and priority support.",
    features: ["Priority support", "Ads credits", "Advanced analytics"],
  },
];

const LAYERS = [
  { id: "identity", title: "Seller Identity & Compliance", steps: [1, 2, 3] },
  { id: "operations", title: "Business Operations", steps: [4, 5] },
  { id: "billing", title: "Billing + Subscription Setup", steps: [6, 7] },
];

const WIZARD_STEPS = [
  { id: "account", label: "Account", layer: "identity" },
  { id: "business", label: "Business Info", layer: "identity" },
  { id: "verification", label: "Verification", layer: "identity" },
  { id: "store", label: "Store Setup", layer: "operations" },
  { id: "banking", label: "Banking & Payouts", layer: "operations" },
  { id: "subscription", label: "Subscription Plan", layer: "billing" },
  { id: "payment", label: "Payment & Review", layer: "billing" },
];

const SELLER_STATUS_LIFECYCLE = [
  "REGISTERED",
  "PENDING_KYC",
  "KYC_APPROVED",
  "SUBSCRIPTION_PENDING",
  "ACTIVE",
  "SUSPENDED",
  "BLOCKED",
];

const BUSINESS_TYPES = [
  "Individual",
  "Sole Proprietor",
  "Partnership",
  "Private Limited",
  "LLP",
  "Enterprise",
];

const KYC_STATUSES = ["Pending", "Under Review", "Approved", "Rejected"];
const PAYOUT_SCHEDULES = ["Weekly payouts", "Monthly payouts"];
const BILLING_CYCLES = [
  { id: "monthly", label: "Monthly", helper: "Lower upfront, recurring auto-renew." },
  { id: "yearly", label: "Yearly", helper: "Discounted annual billing." },
  { id: "per_transaction", label: "Per Transaction", helper: "No subscription, only commission." },
];

const GLOBEMART_QUICK_STATS = [
  { label: "Active users", value: "5000+" },
  { label: "Trusted sellers", value: "1200+" },
  { label: "Support", value: "24/7" },
  { label: "Regional focus", value: "Kerala-first" },
];

const GLOBEMART_VALUE_PILLARS = [
  {
    id: "payments",
    title: "Secure payments",
    description: "Protected checkout and trusted transaction flow for every order.",
  },
  {
    id: "delivery",
    title: "Hyperlocal delivery",
    description: "Fast nearby fulfillment with real-time delivery coordination.",
  },
  {
    id: "language",
    title: "Malayalam support",
    description: "User-friendly experience for English and Malayalam-first users.",
  },
  {
    id: "ai",
    title: "AI recommendations",
    description: "Smarter discovery, reorder nudges, and personalized suggestions.",
  },
];

const DEFAULT_GLOBEMART_CATEGORIES = ["Electronics", "Grocery", "Fashion", "Food", "Home", "Beauty"];

const QUICK_ENTRY_ACTIONS = [
  { id: "shop", label: "Shop Products", emoji: "🛍️", type: "buyer" },
  { id: "sell", label: "Sell Products", emoji: "📦", type: "seller" },
  { id: "orders", label: "Orders", emoji: "📄", type: "buyer" },
  { id: "cart", label: "Cart", emoji: "🛒", type: "buyer" },
];

const TRENDING_ITEMS = ["Smartphones", "Groceries", "Fashion", "Food"];
const NEARBY_STORES = ["Nila Mart", "Fresh Hub", "Style Corner", "Daily Grocer"];

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeTransactionFee = (value) => {
  if (typeof value === "number") {
    return `${value}%`;
  }
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "0%";
  }
  return normalized.includes("%") ? normalized : `${normalized}%`;
};

const normalizeSellerPlans = (plans = []) =>
  (Array.isArray(plans) ? plans : [])
    .map((plan, index) => {
      const planId = String(plan?.id || plan?.planId || plan?.name || `plan-${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      return {
        id: planId,
        name: String(plan?.name || plan?.title || `Plan ${index + 1}`).trim(),
        registrationFee: Number(
          plan?.registrationFee ?? plan?.oneTimeRegistrationFee ?? plan?.onboardingFee ?? 0
        ),
        monthlyFee: Number(
          plan?.monthlyFee ?? plan?.subscriptionMonthlyFee ?? plan?.recurringFee ?? 0
        ),
        yearlyFee: Number(plan?.yearlyFee ?? plan?.subscriptionYearlyFee ?? 0),
        transactionFee: normalizeTransactionFee(
          plan?.transactionFee ?? plan?.commissionFee ?? plan?.commissionPercent ?? 0
        ),
        description: String(plan?.description || "").trim(),
        features: Array.isArray(plan?.features)
          ? plan.features.filter(Boolean).map((feature) => String(feature))
          : [],
      };
    })
    .filter((plan) => plan.id && plan.name);

const resolveSellerPlans = (businessCategories = []) => {
  if (!Array.isArray(businessCategories)) {
    return DEFAULT_SELLER_ONBOARDING_PLANS;
  }

  const ecommerceCategory = businessCategories.find((category) => {
    const categoryId = String(category?.id || "").trim().toLowerCase();
    const categoryName = String(category?.name || "").trim().toLowerCase();
    return categoryId === "ecommerce" || categoryName === "globemart";
  });

  const adminConfiguredPlans =
    ecommerceCategory?.sellerOnboardingPlans ||
    ecommerceCategory?.sellerPlans ||
    ecommerceCategory?.plans ||
    [];

  const normalizedPlans = normalizeSellerPlans(adminConfiguredPlans);
  return normalizedPlans.length > 0 ? normalizedPlans : DEFAULT_SELLER_ONBOARDING_PLANS;
};

const createInitialForm = (loggedInUser, normalizedEmail) => ({
  account: {
    fullName: loggedInUser?.name || "",
    businessName: loggedInUser?.businessName || "",
    email: normalizedEmail,
    mobile: loggedInUser?.phone || "",
    password: "",
    businessType: BUSINESS_TYPES[0],
    country: "India",
    state: "",
    city: loggedInUser?.location || "",
    preferredCurrency: "INR",
    referralCode: "",
  },
  business: {
    legalBusinessName: loggedInUser?.businessName || "",
    tradeName: "",
    registrationNumber: "",
    taxId: "",
    dateOfIncorporation: "",
    registeredAddress: "",
    pickupAddress: "",
    returnAddress: "",
    governmentIdDoc: "",
    businessCertificateDoc: "",
    taxCertificateDoc: "",
    addressProofDoc: "",
    bankProofDoc: "",
    kycStatus: "Pending",
  },
  verification: {
    otpVerified: false,
    panGstValidated: false,
    bankVerified: false,
    ipLoggingEnabled: true,
    deviceFingerprintEnabled: true,
    duplicateSellerChecked: false,
  },
  store: {
    storeLogo: "",
    storeBanner: "",
    storeDescription: "",
    categoriesSellingIn: "",
    productTypes: "",
    brandNames: "",
    shippingRegions: "",
    deliveryOptions: "",
    returnPolicy: "",
    warrantyPolicy: "",
    supportEmail: normalizedEmail,
    supportPhone: loggedInUser?.phone || "",
    monthlySalesVolume: "",
    existingMarketplacePresence: "",
    websiteUrl: "",
    socialLinks: "",
  },
  banking: {
    accountHolderName: loggedInUser?.name || "",
    bankName: "",
    accountNumber: "",
    ifscSwift: "",
    iban: "",
    upiId: "",
    payoutSchedule: PAYOUT_SCHEDULES[0],
    minimumPayoutThreshold: "1000",
  },
  billing: {
    billingCycle: "monthly",
    autoRenew: true,
    subscriptionStartAfterKyc: true,
    registrationFeePaid: false,
    termsAccepted: false,
  },
});

const getSubscriptionAmount = (plan, billingCycle) => {
  if (billingCycle === "yearly") {
    return Number(plan?.yearlyFee || 0);
  }
  if (billingCycle === "monthly") {
    return Number(plan?.monthlyFee || 0);
  }
  return 0;
};

const GlobeMartEntry = ({
  globeMartCategories = [],
  businessCategories = [],
  loggedInUser = null,
}) => {
  const normalizedEmail = useMemo(
    () => String(loggedInUser?.email || "").trim().toLowerCase(),
    [loggedInUser?.email]
  );
  const sellerOnboardingPlans = useMemo(
    () => resolveSellerPlans(businessCategories),
    [businessCategories]
  );
  const isNativeSeller =
    loggedInUser?.registrationType === "entrepreneur" || loggedInUser?.role === "business";

  const [entryMode, setEntryMode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sellerRegistration, setSellerRegistration] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState(DEFAULT_SELLER_ONBOARDING_PLANS[0].id);
  const [formState, setFormState] = useState(() => createInitialForm(loggedInUser, normalizedEmail));
  const [registrationError, setRegistrationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan =
    sellerOnboardingPlans.find((plan) => plan.id === selectedPlanId) ||
    sellerOnboardingPlans[0] ||
    DEFAULT_SELLER_ONBOARDING_PLANS[0];
  const selectedSubscriptionAmount = getSubscriptionAmount(
    selectedPlan,
    formState.billing.billingCycle
  );
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / WIZARD_STEPS.length) * 100);

  useEffect(() => {
    if (!selectedPlanId || !sellerOnboardingPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(sellerOnboardingPlans[0]?.id || DEFAULT_SELLER_ONBOARDING_PLANS[0].id);
    }
  }, [selectedPlanId, sellerOnboardingPlans]);

  useEffect(() => {
    setEntryMode("");
    setCurrentStep(0);
    setRegistrationError("");
    setFormState(createInitialForm(loggedInUser, normalizedEmail));
  }, [normalizedEmail, loggedInUser?.businessName, loggedInUser?.location, loggedInUser?.name, loggedInUser?.phone]);

  const openBuyerPage = () => {
    setEntryMode("buyer");
    setRegistrationError("");
  };

  const openSellerFlow = () => {
    setRegistrationError("");
    if (isNativeSeller || sellerRegistration?.registeredAt) {
      setEntryMode("seller");
      return;
    }
    setEntryMode("seller-registration");
  };

  const renderEntryModeSelection = () => {
    const firstName = String(loggedInUser?.name || "").trim().split(" ")[0];
    const welcomeName = firstName || "there";
    const topCategories = (Array.isArray(globeMartCategories) && globeMartCategories.length
      ? globeMartCategories.slice(0, 6).map((category) => String(category).trim())
      : DEFAULT_GLOBEMART_CATEGORIES
    ).filter(Boolean);

    const handleQuickAction = (type) => {
      if (type === "seller") {
        openSellerFlow();
        return;
      }
      openBuyerPage();
    };

    return (
      <section className="globemart-entry-shell globemart-dashboard-shell" aria-label="GlobeMart dashboard">
        <div className="globemart-entry-card globemart-home-card">
          <div className="globemart-home-header">
            <div>
              <span className="globemart-entry-kicker">GlobeMart</span>
              <h2>Welcome back, {welcomeName}</h2>
            </div>
            <div className="globemart-home-toolbar">
              <button type="button" className="globemart-home-icon-btn" aria-label="Search">🔍</button>
              <button type="button" className="globemart-home-icon-btn" aria-label="Cart">🛒</button>
              <button type="button" className="globemart-home-icon-btn" aria-label="Profile">👤</button>
            </div>
          </div>

          <div className="globemart-home-search">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products, stores, offers..."
              aria-label="Search GlobeMart"
            />
          </div>

          <div className="globemart-home-quick-actions">
            {QUICK_ENTRY_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`globemart-home-action-btn ${action.type === "seller" ? "seller" : "buyer"}`}
                onClick={() => handleQuickAction(action.type)}
              >
                <span aria-hidden="true">{action.emoji}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <div className="globemart-home-chips" aria-label="Top categories">
            {topCategories.map((category) => (
              <button key={category} type="button" className="globemart-home-chip">
                {category}
              </button>
            ))}
          </div>

          <article className="globemart-home-hero">
            <div>
              <span className="globemart-home-hero-kicker">Seasonal offer</span>
              <h3>Flash deals on local favorites</h3>
              <p>Shop nearby stores. Short. Fast. Clear.</p>
              <button type="button" className="btn btn-primary" onClick={openBuyerPage}>
                Start shopping
              </button>
            </div>
          </article>

          <div className="globemart-home-badges" aria-label="GlobeMart highlights">
            <span>⭐ 5000+ Users</span>
            <span>🚚 Fast Delivery</span>
            <span>🛡 Secure Checkout</span>
            <span>🌐 Malayalam</span>
          </div>

          <section className="globemart-home-row" aria-label="Trending products">
            <div className="globemart-home-row-header">
              <h3>Trending deals</h3>
              <button type="button" className="globemart-home-link">See all</button>
            </div>
            <div className="globemart-home-scroll">
              {TRENDING_ITEMS.map((item) => (
                <div key={item} className="globemart-home-pill-card">
                  <strong>{item}</strong>
                  <span>Best prices nearby</span>
                </div>
              ))}
            </div>
          </section>

          <section className="globemart-home-row" aria-label="Nearby stores">
            <div className="globemart-home-row-header">
              <h3>Nearby stores</h3>
              <button type="button" className="globemart-home-link">Explore</button>
            </div>
            <div className="globemart-home-scroll">
              {NEARBY_STORES.map((store) => (
                <div key={store} className="globemart-home-store-card">
                  <strong>{store}</strong>
                  <span>2 km away</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    );
  };

  const updateField = (section, field, value) => {
    setFormState((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const onInput = (section, field) => (event) => updateField(section, field, event.target.value);
  const onCheck = (section, field) => (event) => updateField(section, field, event.target.checked);

  const validateStep = (stepIndex) => {
    const account = formState.account;
    const business = formState.business;
    const verification = formState.verification;
    const store = formState.store;
    const banking = formState.banking;
    const billing = formState.billing;

    if (stepIndex === 0) {
      const required = [
        account.fullName,
        account.businessName,
        account.email,
        account.mobile,
        account.password,
        account.businessType,
        account.country,
        account.state,
        account.city,
        account.preferredCurrency,
      ];
      if (required.some((value) => !String(value || "").trim())) {
        setRegistrationError("Please complete all required account fields.");
        return false;
      }
    }

    if (stepIndex === 1) {
      const required = [
        business.legalBusinessName,
        business.registrationNumber,
        business.taxId,
        business.registeredAddress,
        business.pickupAddress,
        business.returnAddress,
        business.governmentIdDoc,
        business.businessCertificateDoc,
        business.taxCertificateDoc,
        business.addressProofDoc,
      ];
      if (required.some((value) => !String(value || "").trim())) {
        setRegistrationError("Please complete required business verification details.");
        return false;
      }
    }

    if (stepIndex === 2) {
      if (!verification.otpVerified || !verification.panGstValidated) {
        setRegistrationError("OTP verification and PAN/GST validation are mandatory.");
        return false;
      }
      if (!verification.bankVerified) {
        setRegistrationError("Bank verification is mandatory before moving ahead.");
        return false;
      }
    }

    if (stepIndex === 3) {
      const required = [
        store.storeDescription,
        store.categoriesSellingIn,
        store.shippingRegions,
        store.deliveryOptions,
        store.returnPolicy,
        store.supportEmail,
        store.supportPhone,
      ];
      if (required.some((value) => !String(value || "").trim())) {
        setRegistrationError("Please complete required store setup fields.");
        return false;
      }
    }

    if (stepIndex === 4) {
      const required = [banking.accountHolderName, banking.bankName, banking.accountNumber, banking.ifscSwift];
      if (required.some((value) => !String(value || "").trim())) {
        setRegistrationError("Please complete required banking and payout fields.");
        return false;
      }
    }

    if (stepIndex === 5) {
      if (!selectedPlan?.id) {
        setRegistrationError("Please select a seller plan.");
        return false;
      }
      if (!formState.billing.billingCycle) {
        setRegistrationError("Please select a billing cycle.");
        return false;
      }
    }

    if (stepIndex === 6) {
      if (!billing.registrationFeePaid) {
        setRegistrationError("Registration fee payment confirmation is required.");
        return false;
      }
      if (!billing.termsAccepted) {
        setRegistrationError("Accept terms and policy to submit onboarding.");
        return false;
      }
    }

    setRegistrationError("");
    return true;
  };

  const onNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, WIZARD_STEPS.length - 1));
  };

  const onBack = () => {
    setRegistrationError("");
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const submitRegistration = async () => {
    const account = formState.account;
    const business = formState.business;
    const store = formState.store;
    const banking = formState.banking;
    const verification = formState.verification;
    const billing = formState.billing;

    if (!normalizedEmail) {
      setRegistrationError("Seller email is required to complete registration.");
      return;
    }

    setIsSubmitting(true);

    const payload = new FormData();
    payload.append("applicantName", String(account.fullName || "").trim());
    payload.append("businessName", String(account.businessName || "").trim());
    payload.append("email", normalizedEmail);
    payload.append("registrationType", "entrepreneur");
    payload.append("phone", String(account.mobile || "").trim());
    payload.append("location", String(account.city || "").trim());
    payload.append("registrationFee", String(selectedPlan.registrationFee));
    payload.append("monthlyFee", String(selectedPlan.monthlyFee));
    payload.append("yearlyFee", String(selectedPlan.yearlyFee));
    payload.append("transactionFee", selectedPlan.transactionFee);
    payload.append("planId", selectedPlan.id);
    payload.append("planName", selectedPlan.name);
    payload.append("billingCycle", billing.billingCycle);
    payload.append("subscriptionAmount", String(selectedSubscriptionAmount));
    payload.append("sellerStatus", "PENDING_KYC");
    payload.append("kycStatus", business.kycStatus);
    payload.append(
      "onboardingPayload",
      JSON.stringify({
        account,
        business,
        verification,
        store,
        banking,
        billing,
        statuses: SELLER_STATUS_LIFECYCLE,
        selectedPlan,
      })
    );

    try {
      const response = await axios.post(`${API_BASE_URL}/app-data/registration-applications`, payload);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Seller registration could not be saved.");
      }

      setSellerRegistration({
        registeredAt: new Date().toISOString(),
        selectedPlan,
        sellerStatus: "PENDING_KYC",
      });
      setEntryMode("seller");
      setRegistrationError("");
    } catch (error) {
      setRegistrationError(
        error?.response?.data?.message ||
          error?.message ||
          "Seller registration could not be saved. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!validateStep(currentStep)) {
      return;
    }
    await submitRegistration();
  };

  const renderLayerCards = () => (
    <div className="globemart-layer-grid">
      {LAYERS.map((layer) => {
        const layerStepIndexes = layer.steps.map((stepNo) => stepNo - 1);
        const min = Math.min(...layerStepIndexes);
        const max = Math.max(...layerStepIndexes);
        const state = currentStep > max ? "done" : currentStep >= min ? "active" : "pending";
        return (
          <article key={layer.id} className={`globemart-layer-card ${state}`}>
            <h4>{layer.title}</h4>
            <p>
              Steps {layer.steps[0]}-{layer.steps[layer.steps.length - 1]}
            </p>
          </article>
        );
      })}
    </div>
  );

  const renderStepBody = () => {
    if (currentStep === 0) {
      return (
        <div className="globemart-step-stack">
          <p className="globemart-step-note">Most fields are prefilled from your profile. Update only what changed.</p>
          <div className="globemart-step-grid">
            <label><span>Full Name</span><input value={formState.account.fullName} onChange={onInput("account", "fullName")} /></label>
            <label><span>Business Name</span><input value={formState.account.businessName} onChange={onInput("account", "businessName")} /></label>
            <label><span>Email</span><input type="email" value={formState.account.email} onChange={onInput("account", "email")} /></label>
            <label><span>Mobile Number</span><input value={formState.account.mobile} onChange={onInput("account", "mobile")} /></label>
            <label><span>Password</span><input type="password" value={formState.account.password} onChange={onInput("account", "password")} /></label>
            <label>
              <span>Business Type</span>
              <select value={formState.account.businessType} onChange={onInput("account", "businessType")}>
                {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label><span>Country</span><input value={formState.account.country} onChange={onInput("account", "country")} /></label>
            <label><span>State</span><input value={formState.account.state} onChange={onInput("account", "state")} /></label>
            <label><span>City</span><input value={formState.account.city} onChange={onInput("account", "city")} /></label>
            <label><span>Preferred Currency</span><input value={formState.account.preferredCurrency} onChange={onInput("account", "preferredCurrency")} /></label>
            <label><span>Referral Code (optional)</span><input value={formState.account.referralCode} onChange={onInput("account", "referralCode")} /></label>
          </div>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="globemart-step-grid">
          <label><span>Legal Business Name</span><input value={formState.business.legalBusinessName} onChange={onInput("business", "legalBusinessName")} /></label>
          <label><span>Trade Name / Store Name</span><input value={formState.business.tradeName} onChange={onInput("business", "tradeName")} /></label>
          <label><span>Business Registration Number</span><input value={formState.business.registrationNumber} onChange={onInput("business", "registrationNumber")} /></label>
          <label><span>Tax ID / GST / VAT</span><input value={formState.business.taxId} onChange={onInput("business", "taxId")} /></label>
          <label><span>Date of Incorporation</span><input type="date" value={formState.business.dateOfIncorporation} onChange={onInput("business", "dateOfIncorporation")} /></label>
          <label className="globemart-field-wide"><span>Registered Address</span><textarea rows="2" value={formState.business.registeredAddress} onChange={onInput("business", "registeredAddress")} /></label>
          <label className="globemart-field-wide"><span>Pickup/Warehouse Address</span><textarea rows="2" value={formState.business.pickupAddress} onChange={onInput("business", "pickupAddress")} /></label>
          <label className="globemart-field-wide"><span>Return Address</span><textarea rows="2" value={formState.business.returnAddress} onChange={onInput("business", "returnAddress")} /></label>
          <label><span>Government ID (reference)</span><input value={formState.business.governmentIdDoc} onChange={onInput("business", "governmentIdDoc")} /></label>
          <label><span>Business Registration Certificate</span><input value={formState.business.businessCertificateDoc} onChange={onInput("business", "businessCertificateDoc")} /></label>
          <label><span>Tax Certificate</span><input value={formState.business.taxCertificateDoc} onChange={onInput("business", "taxCertificateDoc")} /></label>
          <label><span>Address Proof</span><input value={formState.business.addressProofDoc} onChange={onInput("business", "addressProofDoc")} /></label>
          <label><span>Bank Proof / Cancelled Cheque</span><input value={formState.business.bankProofDoc} onChange={onInput("business", "bankProofDoc")} /></label>
          <label>
            <span>KYC Status</span>
            <select value={formState.business.kycStatus} onChange={onInput("business", "kycStatus")}>
              {KYC_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="globemart-step-stack">
          <p className="globemart-step-note">Mandatory trust and risk controls before activation.</p>
          <div className="globemart-checkbox-list">
            <label className="globemart-check"><input type="checkbox" checked={formState.verification.otpVerified} onChange={onCheck("verification", "otpVerified")} /><span>OTP verification completed</span></label>
            <label className="globemart-check"><input type="checkbox" checked={formState.verification.panGstValidated} onChange={onCheck("verification", "panGstValidated")} /><span>PAN/GST validation completed</span></label>
            <label className="globemart-check"><input type="checkbox" checked={formState.verification.bankVerified} onChange={onCheck("verification", "bankVerified")} /><span>Bank verification completed</span></label>
            <label className="globemart-check"><input type="checkbox" checked={formState.verification.duplicateSellerChecked} onChange={onCheck("verification", "duplicateSellerChecked")} /><span>Duplicate seller detection checked</span></label>
            <label className="globemart-check"><input type="checkbox" checked={formState.verification.ipLoggingEnabled} onChange={onCheck("verification", "ipLoggingEnabled")} /><span>IP logging enabled</span></label>
            <label className="globemart-check"><input type="checkbox" checked={formState.verification.deviceFingerprintEnabled} onChange={onCheck("verification", "deviceFingerprintEnabled")} /><span>Device fingerprint enabled</span></label>
          </div>
          <div className="globemart-status-strip">
            <strong>Seller status lifecycle</strong>
            <div>{SELLER_STATUS_LIFECYCLE.map((status) => <span key={status}>{status}</span>)}</div>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="globemart-step-grid">
          <label><span>Store Logo</span><input value={formState.store.storeLogo} onChange={onInput("store", "storeLogo")} placeholder="Logo URL" /></label>
          <label><span>Store Banner</span><input value={formState.store.storeBanner} onChange={onInput("store", "storeBanner")} placeholder="Banner URL" /></label>
          <label className="globemart-field-wide"><span>Store Description</span><textarea rows="3" value={formState.store.storeDescription} onChange={onInput("store", "storeDescription")} /></label>
          <label><span>Categories Selling In</span><input value={formState.store.categoriesSellingIn} onChange={onInput("store", "categoriesSellingIn")} placeholder={`Ex: ${globeMartCategories.join(", ") || "Groceries, Electronics"}`} /></label>
          <label><span>Product Types</span><input value={formState.store.productTypes} onChange={onInput("store", "productTypes")} /></label>
          <label><span>Brand Names</span><input value={formState.store.brandNames} onChange={onInput("store", "brandNames")} /></label>
          <label><span>Shipping Regions</span><input value={formState.store.shippingRegions} onChange={onInput("store", "shippingRegions")} /></label>
          <label><span>Delivery Options</span><input value={formState.store.deliveryOptions} onChange={onInput("store", "deliveryOptions")} /></label>
          <label className="globemart-field-wide"><span>Return Policy</span><textarea rows="2" value={formState.store.returnPolicy} onChange={onInput("store", "returnPolicy")} /></label>
          <label className="globemart-field-wide"><span>Warranty Policy</span><textarea rows="2" value={formState.store.warrantyPolicy} onChange={onInput("store", "warrantyPolicy")} /></label>
          <label><span>Customer Support Email</span><input type="email" value={formState.store.supportEmail} onChange={onInput("store", "supportEmail")} /></label>
          <label><span>Support Phone</span><input value={formState.store.supportPhone} onChange={onInput("store", "supportPhone")} /></label>
          <label><span>Monthly Sales Volume</span><input value={formState.store.monthlySalesVolume} onChange={onInput("store", "monthlySalesVolume")} /></label>
          <label><span>Existing Marketplace Presence</span><input value={formState.store.existingMarketplacePresence} onChange={onInput("store", "existingMarketplacePresence")} /></label>
          <label><span>Website URL</span><input value={formState.store.websiteUrl} onChange={onInput("store", "websiteUrl")} /></label>
          <label><span>Social Links</span><input value={formState.store.socialLinks} onChange={onInput("store", "socialLinks")} /></label>
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className="globemart-step-grid">
          <label><span>Account Holder Name</span><input value={formState.banking.accountHolderName} onChange={onInput("banking", "accountHolderName")} /></label>
          <label><span>Bank Name</span><input value={formState.banking.bankName} onChange={onInput("banking", "bankName")} /></label>
          <label><span>Account Number</span><input value={formState.banking.accountNumber} onChange={onInput("banking", "accountNumber")} /></label>
          <label><span>IFSC / SWIFT</span><input value={formState.banking.ifscSwift} onChange={onInput("banking", "ifscSwift")} /></label>
          <label><span>IBAN (optional)</span><input value={formState.banking.iban} onChange={onInput("banking", "iban")} /></label>
          <label><span>UPI ID (optional)</span><input value={formState.banking.upiId} onChange={onInput("banking", "upiId")} /></label>
          <label>
            <span>Payout Schedule</span>
            <select value={formState.banking.payoutSchedule} onChange={onInput("banking", "payoutSchedule")}>
              {PAYOUT_SCHEDULES.map((schedule) => <option key={schedule} value={schedule}>{schedule}</option>)}
            </select>
          </label>
          <label><span>Minimum Payout Threshold</span><input type="number" min="0" value={formState.banking.minimumPayoutThreshold} onChange={onInput("banking", "minimumPayoutThreshold")} /></label>
        </div>
      );
    }

    if (currentStep === 5) {
      return (
        <div className="globemart-step-stack">
          <p className="plan-section-caption">Only plan fees/percentages configured by admin are shown here.</p>
          <div className="globemart-plan-options">
            {sellerOnboardingPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`globemart-plan-card ${selectedPlanId === plan.id ? "selected" : ""}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="plan-card-header">
                  <strong>{plan.name}</strong>
                  <span className="plan-amount">{formatCurrency(plan.registrationFee)}</span>
                </div>
                <p className="plan-description">{plan.description || "Admin-configured seller plan."}</p>
                <div className="plan-meta">
                  <span>{plan.monthlyFee ? `${formatCurrency(plan.monthlyFee)}/month` : "Free monthly"}</span>
                  <span>{plan.yearlyFee ? `${formatCurrency(plan.yearlyFee)}/year` : "Free yearly"}</span>
                  <span>{plan.transactionFee} transaction fee</span>
                </div>
              </button>
            ))}
          </div>
          <div className="globemart-billing-cycles">
            {BILLING_CYCLES.map((cycle) => (
              <button
                key={cycle.id}
                type="button"
                className={`globemart-billing-cycle ${formState.billing.billingCycle === cycle.id ? "selected" : ""}`}
                onClick={() => updateField("billing", "billingCycle", cycle.id)}
              >
                <strong>{cycle.label}</strong>
                <span>{cycle.helper}</span>
              </button>
            ))}
          </div>
          <div className="globemart-plan-summary">
            <div><span>Selected Plan</span><strong>{selectedPlan.name}</strong></div>
            <div><span>Registration Fee</span><strong>{formatCurrency(selectedPlan.registrationFee)}</strong></div>
            <div><span>Subscription</span><strong>{selectedSubscriptionAmount ? formatCurrency(selectedSubscriptionAmount) : "No subscription fee"}</strong></div>
            <div><span>Transaction Fee</span><strong>{selectedPlan.transactionFee}</strong></div>
          </div>
        </div>
      );
    }

    return (
      <div className="globemart-step-stack">
        <div className="globemart-payment-card">
          <h4>Payment and Activation Review</h4>
          <p>Registration fee is charged now. Subscription billing starts after KYC approval.</p>
          <div className="globemart-plan-summary">
            <div><span>One-time registration fee</span><strong>{formatCurrency(selectedPlan.registrationFee)}</strong></div>
            <div><span>Billing cycle</span><strong>{formState.billing.billingCycle.replace("_", " ")}</strong></div>
            <div><span>Subscription fee</span><strong>{selectedSubscriptionAmount ? formatCurrency(selectedSubscriptionAmount) : "No subscription fee"}</strong></div>
            <div><span>Status on submit</span><strong>PENDING_KYC</strong></div>
          </div>
        </div>
        <div className="globemart-checkbox-list">
          <label className="globemart-check"><input type="checkbox" checked={formState.billing.registrationFeePaid} onChange={onCheck("billing", "registrationFeePaid")} /><span>I confirm registration fee payment is completed.</span></label>
          <label className="globemart-check"><input type="checkbox" checked={formState.billing.autoRenew} onChange={onCheck("billing", "autoRenew")} /><span>Enable subscription auto-renew.</span></label>
          <label className="globemart-check"><input type="checkbox" checked={formState.billing.subscriptionStartAfterKyc} onChange={onCheck("billing", "subscriptionStartAfterKyc")} /><span>Start subscription only after KYC approval.</span></label>
          <label className="globemart-check"><input type="checkbox" checked={formState.billing.termsAccepted} onChange={onCheck("billing", "termsAccepted")} /><span>I accept terms, KYC policy, and payout policy.</span></label>
        </div>
        <div className="globemart-status-strip">
          <strong>Final workflow</strong>
          <div>{SELLER_STATUS_LIFECYCLE.map((status) => <span key={status}>{status}</span>)}</div>
        </div>
      </div>
    );
  };

  if (entryMode === "buyer") {
    return <Ecommerce globeMartCategories={globeMartCategories} entryMode="buyer" />;
  }

  if (entryMode === "seller") {
    return <Ecommerce globeMartCategories={globeMartCategories} entryMode="seller" />;
  }

  if (entryMode === "seller-registration") {
    const activeStep = WIZARD_STEPS[currentStep];
    const remainingSteps = Math.max(0, WIZARD_STEPS.length - currentStep - 1);

    return (
      <section className="globemart-entry-shell" aria-label="GlobeMart seller onboarding wizard">
        <div className="globemart-entry-card globemart-entry-card-wide globemart-onboarding-shell">
          <div className="globemart-onboarding-header">
            <div>
              <span className="globemart-onboarding-kicker">Seller onboarding</span>
              <h2>GlobeMart Seller Onboarding Wizard</h2>
              <p>Complete identity, operations, and billing in one guided flow designed for quick setup.</p>
            </div>
            <div className="globemart-onboarding-badges" aria-label="Onboarding highlights">
              <span>3 layers</span>
              <span>7 guided steps</span>
              <span>Secure verification</span>
            </div>
          </div>

          <div className="globemart-onboarding-layout">
            <div className="globemart-onboarding-main">
              {renderLayerCards()}
              <div className="globemart-wizard-progress">
                <div className="globemart-progress-header">
                  <strong>Step {currentStep + 1} of {WIZARD_STEPS.length}</strong>
                  <span>{activeStep.label}</span>
                </div>
                <div className="globemart-progress-track" role="progressbar" aria-valuenow={progressPercent}>
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="globemart-step-pills">
                  {WIZARD_STEPS.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      className={`globemart-step-pill ${index === currentStep ? "active" : index < currentStep ? "done" : ""}`}
                      onClick={() => setCurrentStep(index)}
                    >
                      {index + 1}. {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <form className="globemart-registration-form" onSubmit={onSubmit}>
                {renderStepBody()}
                {registrationError ? <p className="globemart-entry-error" role="alert">{registrationError}</p> : null}
                <div className="globemart-entry-actions">
                  {currentStep > 0 ? <button type="button" className="btn btn-outline" onClick={onBack}>Back</button> : null}
                  {!isLastStep ? (
                    <button type="button" className="btn btn-primary" onClick={onNext}>Save and Continue</button>
                  ) : (
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Review and Submit"}
                    </button>
                  )}
                  <button type="button" className="btn btn-outline" onClick={() => setEntryMode("")}>Cancel</button>
                </div>
              </form>
            </div>

            <aside className="globemart-onboarding-aside" aria-label="Onboarding guide">
              <div className="globemart-onboarding-aside-card">
                <span className="globemart-onboarding-aside-label">Progress</span>
                <strong>{progressPercent}%</strong>
                <p>{remainingSteps} step{remainingSteps === 1 ? "" : "s"} remaining</p>
              </div>
              <div className="globemart-onboarding-aside-card">
                <span className="globemart-onboarding-aside-label">Current focus</span>
                <strong>{activeStep.label}</strong>
                <p>Complete required fields only and continue. You can refine details later.</p>
              </div>
              <div className="globemart-onboarding-aside-card">
                <span className="globemart-onboarding-aside-label">Selected plan</span>
                <strong>{selectedPlan.name}</strong>
                <p>
                  Registration {formatCurrency(selectedPlan.registrationFee)} | Transaction{" "}
                  {selectedPlan.transactionFee}
                </p>
              </div>
              <div className="globemart-onboarding-aside-card">
                <span className="globemart-onboarding-aside-label">Activation tip</span>
                <p>
                  Keep KYC and bank proof references ready to finish identity and payouts quickly.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  return renderEntryModeSelection();
};

GlobeMartEntry.propTypes = {
  globeMartCategories: PropTypes.array,
  businessCategories: PropTypes.array,
  loggedInUser: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    location: PropTypes.string,
    businessName: PropTypes.string,
    role: PropTypes.string,
    registrationType: PropTypes.string,
  }),
};

export default GlobeMartEntry;

