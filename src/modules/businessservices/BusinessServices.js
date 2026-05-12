import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./BusinessServices.css";
import { BACKEND_BASE_URL } from "../../utils/api";

const SERVICE_CATEGORIES = [
  {
    id: "gst-services",
    name: "GST Registration / Filing",
    icon: "📊",
    description: "GST registration, monthly filing, and compliance assistance for growing businesses.",
    services: [
      { id: "gst-registration", name: "GST Registration", price: "₹1,500", duration: "3-5 days" },
      { id: "gst-filing-basic", name: "GST Filing Basic", price: "₹499", duration: "2-3 days" },
      { id: "gst-filing-standard", name: "GST Filing Standard", price: "₹1,499", duration: "2-3 days" },
      { id: "gst-filing-premium", name: "GST Filing Premium", price: "₹2,499", duration: "2-3 days" },
      { id: "gst-return-correction", name: "GST Return Correction", price: "₹999", duration: "3-5 days" },
    ],
  },
  {
    id: "company-registration",
    name: "Company Registration",
    icon: "🏢",
    description: "Entity registration for proprietorships, partnerships, LLPs, and private limited companies.",
    services: [
      { id: "proprietorship", name: "Proprietorship Registration", price: "₹2,500", duration: "5-7 days" },
      { id: "partnership", name: "Partnership Firm Registration", price: "₹5,000", duration: "7-10 days" },
      { id: "llp", name: "LLP Registration", price: "₹15,000", duration: "15-20 days" },
      { id: "private-limited", name: "Private Limited Company Registration", price: "₹25,000", duration: "20-25 days" },
    ],
  },
  {
    id: "msme-udyam",
    name: "MSME / Udyam Registration",
    icon: "🧾",
    description: "MSME/Udyam registration and scheme assistance for small and medium enterprises.",
    services: [
      { id: "msme-registration", name: "MSME / Udyam Registration", price: "₹1,000", duration: "2-3 days" },
      { id: "scheme-assistance", name: "Government Scheme Assistance", price: "₹2,500", duration: "5-7 days" },
    ],
  },
  {
    id: "trademark",
    name: "Trademark Registration",
    icon: "®️",
    description: "Brand protection with trademark search, filing, and post-registration support.",
    services: [
      { id: "trademark-registration", name: "Trademark Registration", price: "₹8,000", duration: "30-45 days" },
      { id: "trademark-search", name: "Trademark Search & Opinion", price: "₹3,500", duration: "3-5 days" },
    ],
  },
  {
    id: "legal-consultation",
    name: "Legal Consultation",
    icon: "⚖️",
    description: "Legal advice for agreements, notices, contract review, and compliance queries.",
    services: [
      { id: "business-agreement", name: "Business Agreement Drafting", price: "₹3,500", duration: "3-5 days" },
      { id: "legal-notice", name: "Legal Notice Drafting", price: "₹2,500", duration: "2-3 days" },
      { id: "company-law-consultation", name: "Company Law Consultation", price: "₹2,000/hour", duration: "1 hour" },
    ],
  },
  {
    id: "accounting-bookkeeping",
    name: "Accounting & Bookkeeping",
    icon: "📒",
    description: "Accounting, bookkeeping, TDS filing, and financial reporting for businesses.",
    services: [
      { id: "monthly-bookkeeping", name: "Monthly Bookkeeping", price: "₹4,000/month", duration: "Monthly" },
      { id: "income-tax-filing", name: "Income Tax Filing", price: "₹2,500", duration: "7-10 days" },
      { id: "tds-filing", name: "TDS Filing", price: "₹1,000", duration: "3-5 days" },
    ],
  },
  {
    id: "digital-marketing",
    name: "Digital Marketing",
    icon: "📱",
    description: "Branding, social media, SEO, and advertising services to grow your visibility.",
    services: [
      { id: "logo-design", name: "Logo Design", price: "₹3,000", duration: "5-7 days" },
      { id: "social-media-setup", name: "Social Media Setup", price: "₹1,999", duration: "3-5 days" },
      { id: "seo-service", name: "SEO Service", price: "₹5,000/month", duration: "Monthly" },
    ],
  },
  {
    id: "webapp-development",
    name: "Website / App Development",
    icon: "💻",
    description: "Create websites, landing pages, and mobile-ready apps with expert support.",
    services: [
      { id: "website-basic", name: "Website Basic", price: "₹8,000", duration: "10-15 days" },
      { id: "website-pro", name: "Website Pro", price: "₹15,000", duration: "15-20 days" },
      { id: "app-mvp", name: "App MVP Development", price: "₹45,000", duration: "30-45 days" },
    ],
  },
  {
    id: "loan-funding",
    name: "Loan / Funding Documentation",
    icon: "💰",
    description: "Loan, subsidy, and funding documentation support for business owners.",
    services: [
      { id: "mudra-loan-docs", name: "Mudra Loan Documentation", price: "₹3,500", duration: "5-7 days" },
      { id: "pmegpsupport", name: "PMEGP Scheme Documentation", price: "₹4,500", duration: "7-10 days" },
      { id: "loan-proposal", name: "Loan & Funding Proposal", price: "₹5,500", duration: "7-10 days" },
    ],
  },
  {
    id: "business-planning",
    name: "Business Plan / Pitch Deck Support",
    icon: "📊",
    description: "Investor-ready business plans, pitch decks, and proposal documents.",
    services: [
      { id: "business-plan", name: "Business Plan Preparation", price: "₹4,999", duration: "7-10 days" },
      { id: "pitch-deck", name: "Pitch Deck Design", price: "₹6,999", duration: "7-10 days" },
      { id: "proposal-draft", name: "Proposal / Tender Drafting", price: "₹3,500", duration: "5-7 days" },
    ],
  },
];

const SERVICE_DETAILS = {
  "gst-registration": {
    overview: "GST registration service with document preparation, filing, and follow-up support.",
    included: [
      "GST application filing",
      "Form GST REG-06 preparation",
      "Help with documents and registration certificate",
      "Dedicated CA consultant review",
    ],
    requiredDocuments: ["PAN card", "Aadhaar card", "Business address proof", "Bank statement"],
    timeline: [
      "Request submitted",
      "Documents pending",
      "Under review",
      "Application filed",
      "GSTIN issued",
    ],
    packages: [
      {
        tier: "Basic",
        price: "₹1,500",
        description: "GST registration with application filing and confirmation.",
        features: ["Form submission", "Document review", "3-day support"],
      },
      {
        tier: "Standard",
        price: "₹2,500",
        description: "GST registration with follow-up and personalized onboarding.",
        features: ["Basic package", "GST orientation", "5-day support"],
      },
      {
        tier: "Premium",
        price: "₹3,999",
        description: "End-to-end registration with priority support and filing advisory.",
        features: ["Standard package", "Priority review", "10-day support"],
      },
    ],
    consultant: {
      name: "CA Arjun Menon",
      title: "GST & Compliance Specialist",
      rating: 4.9,
      reviews: 74,
      experience: "10 years",
    },
    vendor: {
      name: "Sahyog Business Partners",
      title: "GST Service Partner",
      rating: 4.8,
      reviews: 120,
      responseTime: "Within 24 hours",
      location: "Pan-India",
      type: "Verified GST Partner",
      highlights: ["Priority support", "Expert documentation team", "Trusted by 600+ businesses"],
    },
    faqs: [
      { question: "How long does GST registration take?", answer: "Most applications are processed within 3-5 business days." },
      { question: "Can I apply without a business address proof?", answer: "You need a valid local address proof to complete the registration." },
    ],
    refundPolicy: "Full refund if the application is rejected by GST authorities before filing. Otherwise, service fees are non-refundable.",
  },
  "gst-filing-basic": {
    overview: "Standard GST filing support for your monthly returns with validation checks.",
    included: ["GSTR-1 review", "GSTR-3B filing", "Compliance checklist", "Return status update"],
    requiredDocuments: ["Sales invoices", "Purchase invoices", "Bank statement"],
    timeline: ["Request submitted", "Document review", "Filing completed", "Confirmation received"],
    packages: [
      { tier: "Basic", price: "₹499", description: "Basic tax return filing for small businesses.", features: ["GSTR-1 summary", "GSTR-3B filing"] },
      { tier: "Standard", price: "₹1,499", description: "Detailed filing with tax advisory and support.", features: ["Basic package", "Tax review", "Compliance guidance"] },
      { tier: "Premium", price: "₹2,499", description: "CA-assisted filing with follow-up and query handling.", features: ["Standard package", "CA review", "3 months support"] },
    ],
    consultant: { name: "CA Nisha Reddy", title: "Tax Advisory Lead", rating: 4.8, reviews: 58, experience: "8 years" },
    faqs: [
      { question: "Can you file for a previous month?", answer: "Yes, we can assist with delayed filings for an additional fee." },
      { question: "Do you support composition scheme?", answer: "Yes, we can file GST returns for composition taxpayers." },
    ],
    refundPolicy: "If filing is rejected due to our error, we will refund the service fee after reviewing the case.",
  },
  "trademark-registration": {
    overview: "Trademark application filing to protect your brand in India.",
    included: ["Trademark search", "Application filing", "Document preparation", "Status monitoring"],
    requiredDocuments: ["Logo design file", "Business PAN", "Authorization letter"],
    timeline: ["Request submitted", "Search completed", "Application filed", "Examination report", "Trademark granted"],
    packages: [
      { tier: "Basic", price: "₹8,000", description: "Single-class trademark filing.", features: ["Search report", "Application filing"] },
      { tier: "Standard", price: "₹12,000", description: "Trademark filing with objection support.", features: ["Basic package", "Exam report handling"] },
      { tier: "Premium", price: "₹18,000", description: "End-to-end trademark filing with priority processing.", features: ["Standard package", "Priority support", "Post-registration support"] },
    ],
    consultant: { name: "Adv. Meera Suresh", title: "IP & Trademark Advisor", rating: 4.7, reviews: 42, experience: "9 years" },
    faqs: [
      { question: "How many classes can I file in?", answer: "The basic package covers one class. We can quote for additional classes separately." },
      { question: "Will I get a certificate?", answer: "Yes, you will receive a trademark registration certificate upon grant." },
    ],
    refundPolicy: "Refund available only if the application is not filed. No refund after formal filing with the Registry.",
  },
  "business-plan": {
    overview: "Create an investor-ready business plan and financial model for your startup.",
    included: ["Executive summary", "Market analysis", "Financial projections", "Go-to-market plan"],
    requiredDocuments: ["Business idea summary", "Revenue model", "Current financial data"],
    timeline: ["Request submitted", "Draft created", "Review meeting", "Final delivery"],
    packages: [
      { tier: "Basic", price: "₹4,999", description: "Standard business plan with key sections.", features: ["Plan document", "1 revision"] },
      { tier: "Standard", price: "₹7,999", description: "Detailed plan with financial forecasts.", features: ["Basic package", "Financial model", "2 revisions"] },
      { tier: "Premium", price: "₹12,999", description: "Investor pitch-ready plan with deck and strategy.", features: ["Standard package", "Pitch deck", "3 revisions"] },
    ],
    consultant: { name: "Shruti Raj", title: "Startup Strategy Consultant", rating: 4.9, reviews: 29, experience: "11 years" },
    faqs: [
      { question: "Can you help with investor presentations?", answer: "Yes, the premium package includes a pitch deck." },
      { question: "Do you support SaaS and service businesses?", answer: "Yes, we tailor the plan for your industry." },
    ],
    refundPolicy: "Refunds are available before the first draft is delivered. After draft delivery, fees are non-refundable.",
  },
};

const BUSINESS_STARTER_PACKAGE = {
  name: "Start Your Business in 7 Days",
  price: "₹15,000",
  originalPrice: "₹25,000",
  discount: "40% OFF",
  services: [
    "GST Registration",
    "MSME / Udyam Registration",
    "Trade License",
    "Professional Logo Design",
    "Google Business Profile Setup",
    "Basic Website Creation",
    "Social Media Setup",
    "Business Consultation",
  ],
  features: [
    "Complete documentation support",
    "Priority handling by experts",
    "Digital setup starter kit",
    "Post-registration handholding",
  ],
};

const DEFAULT_SERVICE_DETAILS = {
  overview: "A complete business service designed to help you grow with expert support and trusted delivery.",
  included: ["Service planning", "Documentation support", "Consultant review", "Post-delivery guidance"],
  requiredDocuments: ["PAN card", "Aadhaar card", "Business proof"],
  timeline: ["Request submitted", "Documents pending", "Under review", "Work in progress", "Completed"],
  packages: [
    { tier: "Basic", price: "₹2,499", description: "Essential support to get started.", features: ["Core service", "Standard support"] },
    { tier: "Standard", price: "₹4,999", description: "Extended support with advisor input.", features: ["Basic package", "Priority support"] },
    { tier: "Premium", price: "₹7,999", description: "Full-service delivery with expert consultation.", features: ["Standard package", "Fast-track delivery"] },
  ],
  consultant: { name: "Expert Consultant", title: "Business Specialist", rating: 4.8, reviews: 21, experience: "8 years" },
  vendor: {
    name: "Trusted Partner Network",
    title: "Verified Service Marketplace",
    rating: 4.7,
    reviews: 320,
    responseTime: "Same-day response",
    location: "Nationwide",
    type: "Marketplace Partner",
    highlights: ["Same-day response", "Verified service delivery", "Dedicated account support"],
  },
  faqs: [
    { question: "How long does this service take?", answer: "Delivery times vary by service, typically 5-15 days." },
    { question: "Can I chat before booking?", answer: "Yes, use the chat before booking button on the service detail page." },
  ],
  refundPolicy: "Refunds depend on the service stage. Contact support for detailed policy.",
};

const ORDER_STATUSES = [
  { id: "submitted", label: "Request submitted", color: "#f59e0b", icon: "📝" },
  { id: "documents-pending", label: "Documents pending", color: "#f97316", icon: "📎" },
  { id: "under-review", label: "Under review", color: "#3b82f6", icon: "🔍" },
  { id: "assigned-to-expert", label: "Assigned to expert", color: "#8b5cf6", icon: "👩‍💼" },
  { id: "work-in-progress", label: "Work in progress", color: "#0ea5e9", icon: "⚙️" },
  { id: "approval-pending", label: "Customer approval pending", color: "#facc15", icon: "⏳" },
  { id: "invoice-generated", label: "Invoice generated", color: "#14b8a6", icon: "🧾" },
  { id: "completed", label: "Completed", color: "#10b981", icon: "✅" },
];

const getServiceDetails = (serviceId) => SERVICE_DETAILS[serviceId] || DEFAULT_SERVICE_DETAILS;

const parseINRToNumber = (priceText = "") => {
  const numeric = Number(String(priceText).replace(/[^0-9]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const BusinessServices = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const [serviceOrders, setServiceOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [orderForm, setOrderForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    packageTier: "Standard",
    documents: [],
    requirements: "",
    preferredDate: "",
    budget: "",
    // extra fields for invoice generator
    address: "",
    gstin: "",
  });

  const navigationSections = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: "🏠" },
      { id: "services", label: "All Services", icon: "📋" },
      { id: "business-starter", label: "Business Starter", icon: "🚀" },
      { id: "orders", label: "My Orders", icon: "📦" },
      { id: "consultation", label: "Consultation", icon: "💬" },
    ],
    []
  );

  const refreshOrders = async () => {
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/business-services/orders/me`);
      if (response.data?.success && response.data.data?.orders) {
        setServiceOrders(response.data.data.orders);
      } else {
        setServiceOrders([]);
      }
    } catch (err) {
      // keep UI stable; show empty list
      setServiceOrders([]);
    }
  };

  useEffect(() => {
    void refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenServiceDetail = (category, service) => {
    setSelectedCategory(category);
    setSelectedService(service);
    setActiveSection("service-detail");
    setSubmitError("");
  };

  const handleServiceSelect = (category, service) => {
    setSelectedCategory(category);
    setSelectedService(service);
    setShowOrderForm(true);
    setSubmitError("");
  };

  const handleFileUpload = (files) => {
    const fileList = Array.from(files).map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));

    setOrderForm((prev) => ({ ...prev, documents: [...prev.documents, ...fileList] }));
  };

  const selectedServiceDetails = useMemo(
    () => (selectedService ? getServiceDetails(selectedService.id) : null),
    [selectedService]
  );

  const requiredDocuments = selectedServiceDetails?.requiredDocuments || [];

  const missingDocuments = requiredDocuments.filter((required) =>
    !orderForm.documents.some((doc) =>
      doc.name.toLowerCase().includes(required.toLowerCase().split(" ")[0])
    )
  );

  const selectedPackageDetails = selectedServiceDetails?.packages?.find(
    (pkg) => pkg.tier === orderForm.packageTier
  );

  const serviceVendor = selectedServiceDetails?.vendor || DEFAULT_SERVICE_DETAILS.vendor;

  const handleOrderSubmit = async () => {
    if (!selectedService || !selectedCategory) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("categoryId", selectedCategory.id);
      formData.append("categoryName", selectedCategory.name || "");
      formData.append("serviceId", selectedService.id);
      formData.append("serviceName", selectedService.name || "");
      formData.append("isStarterPackage", "false");

      formData.append(
        "pricing",
        JSON.stringify({
          priceText: selectedPackageDetails?.price || selectedService.price,
          priceNumber: parseINRToNumber(selectedPackageDetails?.price || selectedService.price),
          durationText: selectedService.duration,
          packageTier: orderForm.packageTier,
        })
      );

      formData.append(
        "formData",
        JSON.stringify({
          name: orderForm.name,
          email: orderForm.email,
          phone: orderForm.phone,
          businessName: orderForm.businessName,
          businessType: orderForm.businessType,
          address: orderForm.address,
          gstin: orderForm.gstin,
        })
      );

      formData.append("packageTier", orderForm.packageTier);
      formData.append("requirements", orderForm.requirements || "");
      // backend expects estimatedCompletion as ISO date string (optional)
      formData.append("estimatedCompletion", orderForm.preferredDate ? `${orderForm.preferredDate}T00:00:00.000Z` : "");

      // Upload documents
      for (const doc of orderForm.documents) {
        if (doc?.file) {
          formData.append("documents", doc.file);
        }
      }

      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/orders`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Order could not be created.");
      }

      const order = response.data.data?.order;
      setCurrentOrder(order);
      setShowOrderForm(false);

      // reset form
      setOrderForm({
        name: "",
        email: "",
        phone: "",
        businessName: "",
        businessType: "",
        documents: [],
        requirements: "",
        preferredDate: "",
        budget: "",
        address: "",
        gstin: "",
      });

      await refreshOrders();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusinessStarterOrder = async () => {
    // Use same backend endpoint, but encode "starter package" as a pseudo service
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const syntheticCategory = { id: "business-starter", name: "Business Starter Package" };
      const syntheticService = { id: "business-starter", name: BUSINESS_STARTER_PACKAGE.name, price: BUSINESS_STARTER_PACKAGE.price, duration: "7 days" };

      const formData = new FormData();
      formData.append("categoryId", syntheticCategory.id);
      formData.append("categoryName", syntheticCategory.name);
      formData.append("serviceId", syntheticService.id);
      formData.append("serviceName", syntheticService.name);
      formData.append("isStarterPackage", "true");

      formData.append(
        "pricing",
        JSON.stringify({
          priceText: syntheticService.price,
          priceNumber: parseINRToNumber(syntheticService.price),
          durationText: syntheticService.duration,
        })
      );

      formData.append(
        "formData",
        JSON.stringify({
          name: orderForm.name,
          email: orderForm.email,
          phone: orderForm.phone,
          businessName: orderForm.businessName,
          businessType: orderForm.businessType,
          address: orderForm.address,
          gstin: orderForm.gstin,
        })
      );

      formData.append("requirements", orderForm.requirements || "");
      formData.append("estimatedCompletion", ""); // optional

      // no document uploads for starter unless user adds them
      for (const doc of orderForm.documents) {
        if (doc?.file) formData.append("documents", doc.file);
      }

      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/orders`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Order could not be created.");
      }

      const order = response.data.data?.order;
      setCurrentOrder(order);
      await refreshOrders();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const statusObj = ORDER_STATUSES.find((s) => s.id === status);
    return statusObj ? statusObj.color : "#6b7280";
  };

  const getStatusIcon = (status) => {
    const statusObj = ORDER_STATUSES.find((s) => s.id === status);
    return statusObj ? statusObj.icon : "❓";
  };

  const downloadInvoice = async (orderId) => {
    try {
      const response = await axios.get(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/invoice/pdf`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `business_service_invoice_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Invoice download failed.");
    }
  };

  return (
    <div className="business-services-shell">
      <div className="business-services-hero">
        <div className="business-services-hero-copy">
          <h1>Business Services Hub</h1>
          <p>Complete business solutions from registration to marketing. Start, manage, and grow your business with expert support.</p>
          <div className="business-services-hero-tags">
            <span>🏢 Business Registration</span>
            <span>📊 GST & Tax Services</span>
            <span>⚖️ Legal Consultation</span>
            <span>📱 Digital Marketing</span>
          </div>
        </div>
        <div className="business-services-hero-stats">
          <div className="stat-card">
            <span className="stat-number">500+</span>
            <span className="stat-label">Businesses Served</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">98%</span>
            <span className="stat-label">Success Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Support</span>
          </div>
        </div>
      </div>

      <div className="business-services-nav">
        {navigationSections.map((section) => (
          <button
            key={section.id}
            className={`business-services-nav-item ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {submitError ? <div className="app-loading" style={{ color: "#ef4444" }}>{submitError}</div> : null}

      <div className="business-services-content">
        {activeSection === "overview" && (
          <div className="business-services-section">
            <div className="overview-grid">
              <div className="overview-card business-starter-highlight">
                <div className="card-header">
                  <h3>🚀 Start Your Business in 7 Days</h3>
                  <div className="pricing">
                    <span className="current-price">{BUSINESS_STARTER_PACKAGE.price}</span>
                    <span className="original-price">{BUSINESS_STARTER_PACKAGE.originalPrice}</span>
                    <span className="discount-badge">{BUSINESS_STARTER_PACKAGE.discount}</span>
                  </div>
                </div>
                <p>Get everything you need to start your business: GST, Udyam, Trade License, Logo, Website, and Digital Presence.</p>
                <div className="package-services">
                  {BUSINESS_STARTER_PACKAGE.services.map((service, i) => (
                    <span key={i} className="service-item">
                      ✓ {service}
                    </span>
                  ))}
                </div>
                <button className="primary-button" onClick={handleBusinessStarterOrder} disabled={isSubmitting} type="button">
                  {isSubmitting ? "Placing..." : "Get Started Now"}
                </button>
              </div>

              {[
                {
                  title: "📊 GST & Tax Services",
                  desc: "Complete compliance solutions for GST filing, tax returns, and business accounting.",
                  highlights: ["GST Registration", "Monthly Filing", "Tax Consultation"],
                },
                {
                  title: "🏢 Company Registration",
                  desc: "Register your business as proprietorship, partnership, LLP, or private limited company.",
                  highlights: ["Proprietorship", "LLP Registration", "MSME Registration"],
                },
                {
                  title: "⚖️ Legal Consultation",
                  desc: "Expert legal advice, agreement drafting, and business law consultation.",
                  highlights: ["Agreement Drafting", "Legal Notice", "Trademark"],
                },
                {
                  title: "📱 Digital Marketing",
                  desc: "Build your online presence with logo design, website creation, and social media marketing.",
                  highlights: ["Logo Design", "Website Creation", "Social Media Setup"],
                },
              ].map((card) => (
                <div key={card.title} className="overview-card">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                  <div className="service-highlights">
                    {card.highlights.map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                  <button className="secondary-button" onClick={() => setActiveSection("services")} type="button">
                    View All Services
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "services" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>📋 All Business Services</h2>
              <p>Choose from our comprehensive range of business services</p>
            </div>

            <div className="services-categories">
              {SERVICE_CATEGORIES.map((category) => (
                <div key={category.id} className="category-card">
                  <div className="category-header">
                    <span className="category-icon">{category.icon}</span>
                    <h3>{category.name}</h3>
                  </div>
                  <p>{category.description}</p>

                  <div className="category-services">
                    {category.services.slice(0, 4).map((service) => (
                      <div key={service.id} className="service-item">
                        <div className="service-info">
                          <h4>{service.name}</h4>
                          <div className="service-meta">
                            <span className="price">{service.price}</span>
                            <span className="duration">{service.duration}</span>
                          </div>
                        </div>
                        <div className="service-actions-inline">
                          <button className="secondary-button" onClick={() => handleOpenServiceDetail(category, service)} type="button">
                            View Details
                          </button>
                          <button className="select-service-btn" onClick={() => handleServiceSelect(category, service)} type="button">
                            Book Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="view-all-btn"
                    onClick={() => {
                      setSelectedCategory(category);
                      setActiveSection("category-detail");
                    }}
                    type="button"
                  >
                    View All Services ({category.services.length})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "business-starter" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>🚀 Start Your Business in 7 Days</h2>
              <p>Complete business setup package with everything you need to start your business</p>
            </div>

            <div className="business-starter-detail">
              <div className="package-overview">
                <div className="package-header">
                  <h3>{BUSINESS_STARTER_PACKAGE.name}</h3>
                  <div className="package-pricing">
                    <span className="current-price">{BUSINESS_STARTER_PACKAGE.price}</span>
                    <span className="original-price">{BUSINESS_STARTER_PACKAGE.originalPrice}</span>
                    <span className="discount">{BUSINESS_STARTER_PACKAGE.discount}</span>
                  </div>
                </div>

                <div className="package-services-grid">
                  <div className="services-included">
                    <h4>Services Included:</h4>
                    <ul>
                      {BUSINESS_STARTER_PACKAGE.services.map((service, i) => (
                        <li key={i}>{service}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="package-features">
                    <h4>Additional Benefits:</h4>
                    <ul>
                      {BUSINESS_STARTER_PACKAGE.features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="package-actions">
                  <button className="primary-button" onClick={handleBusinessStarterOrder} disabled={isSubmitting} type="button">
                    {isSubmitting ? "Placing..." : "Order Business Starter Package"}
                  </button>
                  <div className="package-meta">
                    <span>⚡ Processing in 7 days</span>
                    <span>🎯 Priority support</span>
                    <span>📞 Dedicated consultant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "orders" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>📦 My Service Orders</h2>
              <p>Track your service requests and download completed documents</p>
            </div>

            {serviceOrders.length === 0 ? (
              <div className="empty-orders">
                <span className="empty-icon">📋</span>
                <h3>No orders yet</h3>
                <p>Start your business journey by ordering a service</p>
                <button className="primary-button" onClick={() => setActiveSection("services")} type="button">
                  Browse Services
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {serviceOrders.map((order) => (
                  <div key={order._id || order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h4>{order.serviceName || order.service?.name || "Business Service"}</h4>
                        <p>Order #{String(order._id || order.id || "").slice(-6)}</p>
                        <p>Ordered on {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="order-status">
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                          {getStatusIcon(order.status)} {ORDER_STATUSES.find((s) => s.id === order.status)?.label || order.status}
                        </span>
                      </div>
                    </div>

                    <div className="order-details">
                      <div className="order-meta">
                        <span>
                          Estimated:{" "}
                          {order.estimatedCompletion ? new Date(order.estimatedCompletion).toLocaleDateString() : "—"}
                        </span>
                        <span>Price: {order.pricing?.priceText || "—"}</span>
                      </div>

                      <div className="order-timeline">
                        {ORDER_STATUSES.map((step, index) => {
                          const currentIndex = ORDER_STATUSES.findIndex((status) => status.id === order.status);
                          const isActive = currentIndex >= index;
                          return (
                            <div key={step.id} className={`timeline-step ${isActive ? "active" : ""}`}>
                              <span>{step.icon}</span>
                              <span>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="order-actions">
                        <button className="chat-btn" type="button" onClick={() => setSubmitError("Consultant chat/call is not wired yet.")}>
                          💬 Chat with Consultant
                        </button>
                        <button className="call-btn" type="button" onClick={() => setSubmitError("Request call is not wired yet.")}>
                          📞 Request Call
                        </button>
                        {(order.status === "completed" || order.status === "invoice-generated") && (
                          <button
                            className="download-btn"
                            type="button"
                            onClick={() => downloadInvoice(String(order._id || order.id))}
                          >
                            🧾 Download Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "consultation" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>💬 Business Consultation</h2>
              <p>Get expert advice for your business needs</p>
            </div>

            <div className="consultation-options">
              {[
                { title: "📞 Quick Consultation", desc: "15-minute phone consultation for immediate guidance", price: "₹500" },
                { title: "💼 Business Planning", desc: "Comprehensive business plan and strategy consultation", price: "₹2,500" },
                { title: "📊 Financial Consultation", desc: "GST, tax, and financial planning advice", price: "₹1,500" },
                { title: "⚖️ Legal Consultation", desc: "Legal advice and documentation review", price: "₹2,000" },
              ].map((c) => (
                <div key={c.title} className="consultation-card">
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <div className="consultation-price">{c.price}</div>
                  <button className="primary-button" type="button" onClick={() => setSubmitError("Consultation booking not wired yet.")}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "category-detail" && selectedCategory && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>
                {selectedCategory.icon} {selectedCategory.name}
              </h2>
              <p>{selectedCategory.description}</p>
              <button className="back-btn" onClick={() => setActiveSection("services")} type="button">
                ← Back to All Services
              </button>
            </div>

            <div className="services-grid">
              {selectedCategory.services.map((service) => (
                <div key={service.id} className="service-detail-card">
                  <div className="service-header">
                    <h4>{service.name}</h4>
                    <div className="service-pricing">
                      <span className="price">{service.price}</span>
                      <span className="duration">{service.duration}</span>
                    </div>
                  </div>
                  <div className="service-detail-actions">
                    <button className="secondary-button" onClick={() => handleOpenServiceDetail(selectedCategory, service)} type="button">
                      View Details
                    </button>
                    <button className="primary-button" onClick={() => handleServiceSelect(selectedCategory, service)} type="button">
                      Order This Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "service-detail" && selectedService && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>{selectedService.name}</h2>
              <p>{selectedServiceDetails?.overview}</p>
              <button className="back-btn" onClick={() => setActiveSection("category-detail")} type="button">
                ← Back to {selectedCategory?.name || "Services"}
              </button>
            </div>

            <div className="service-detail-grid">
              <div className="detail-left">
                <div className="detail-card">
                  <h4>What is included</h4>
                  <ul>
                    {(selectedServiceDetails?.included || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="detail-card">
                  <h4>Required documents</h4>
                  <ul>
                    {(selectedServiceDetails?.requiredDocuments || []).map((doc, index) => (
                      <li key={index}>{doc}</li>
                    ))}
                  </ul>
                  {missingDocuments.length > 0 && (
                    <div className="missing-docs-alert">
                      <strong>Missing documents:</strong> {missingDocuments.join(", ")}.
                    </div>
                  )}
                </div>

                <div className="detail-card">
                  <h4>Timeline</h4>
                  <ol>
                    {(selectedServiceDetails?.timeline || []).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="detail-card">
                  <h4>FAQs</h4>
                  {(selectedServiceDetails?.faqs || []).map((faq, index) => (
                    <div key={index} className="faq-item">
                      <strong>{faq.question}</strong>
                      <p>{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="detail-right">
                <div className="detail-card consultant-card">
                  <h4>Consultant profile</h4>
                  <p className="consultant-name">{selectedServiceDetails?.consultant?.name}</p>
                  <p>{selectedServiceDetails?.consultant?.title}</p>
                  <p>{selectedServiceDetails?.consultant?.experience} experience</p>
                  <p>⭐ {selectedServiceDetails?.consultant?.rating} ({selectedServiceDetails?.consultant?.reviews} reviews)</p>
                  <button className="chat-btn" type="button" onClick={() => setSubmitError("Chat before booking is not wired yet.")}>
                    💬 Chat before booking
                  </button>
                </div>

                <div className="detail-card vendor-card">
                  <div className="vendor-badge">Verified Partner</div>
                  <h4>Expert vendor</h4>
                  <p className="vendor-name">{serviceVendor.name}</p>
                  <p>{serviceVendor.title}</p>
                  <div className="vendor-profile-tags">
                    <span>{serviceVendor.type}</span>
                    <span>{serviceVendor.location}</span>
                  </div>
                  <p>⭐ {serviceVendor.rating} ({serviceVendor.reviews} reviews)</p>
                  <p>Response: {serviceVendor.responseTime}</p>
                  {serviceVendor.highlights?.length > 0 && (
                    <ul className="vendor-highlights">
                      {serviceVendor.highlights.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                  <button className="secondary-button" type="button" onClick={() => setSubmitError("Vendor contact is not available yet.")}>View Vendor Profile</button>
                </div>

                <div className="detail-card package-grid">
                  <h4>Package pricing</h4>
                  {(selectedServiceDetails?.packages || []).map((pkg) => (
                    <div key={pkg.tier} className={`package-card ${orderForm.packageTier === pkg.tier ? "selected" : ""}`}>
                      <div className="package-card-header">
                        <strong>{pkg.tier}</strong>
                        <span>{pkg.price}</span>
                      </div>
                      <p>{pkg.description}</p>
                      <ul>
                        {pkg.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                      <button
                        className={`secondary-button ${orderForm.packageTier === pkg.tier ? "selected-action" : ""}`}
                        type="button"
                        onClick={() => setOrderForm((prev) => ({ ...prev, packageTier: pkg.tier }))}
                      >
                        {orderForm.packageTier === pkg.tier ? "Selected" : "Select"}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="detail-card refund-card">
                  <h4>Refund & cancellation</h4>
                  <p>{selectedServiceDetails?.refundPolicy}</p>
                </div>

                <div className="detail-card">
                  <h4>Ready to book?</h4>
                  <p>Choose a package and upload documents to start the order.</p>
                  <button className="primary-button" type="button" onClick={() => handleServiceSelect(selectedCategory, selectedService)}>
                    Book {selectedService.name}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>

      {showOrderForm && selectedService && (
        <div className="order-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Order {selectedService.name}</h3>
              <button className="close-btn" onClick={() => setShowOrderForm(false)} type="button">
                ×
              </button>
            </div>

            <div className="order-form">
              <div className="form-section">
                <h4>Personal Information</h4>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={orderForm.name}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={orderForm.email}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="form-section">
                <h4>Business Information</h4>
                <input
                  type="text"
                  placeholder="Business Name"
                  value={orderForm.businessName}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, businessName: e.target.value }))}
                />
                <select
                  value={orderForm.businessType}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, businessType: e.target.value }))}
                >
                  <option value="">Select Business Type</option>
                  <option value="proprietorship">Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llp">LLP</option>
                  <option value="private-limited">Private Limited</option>
                  <option value="other">Other</option>
                </select>
                {selectedServiceDetails?.packages && (
                  <select
                    value={orderForm.packageTier}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, packageTier: e.target.value }))}
                  >
                    {(selectedServiceDetails.packages || []).map((pkg) => (
                      <option key={pkg.tier} value={pkg.tier}>
                        {pkg.tier} — {pkg.price}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-section">
                <h4>Documents Upload</h4>
                <p className="doc-vault-note">Secure document vault: Your uploads are stored safely and only shared with your assigned consultant.</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {selectedServiceDetails?.requiredDocuments?.length > 0 && (
                  <div className="document-checklist">
                    <h5>Checklist</h5>
                    <ul>
                      {selectedServiceDetails.requiredDocuments.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {missingDocuments.length > 0 && (
                  <div className="missing-docs-alert">
                    <strong>Missing documents:</strong> {missingDocuments.join(", ")}.
                  </div>
                )}
                {orderForm.documents.length > 0 && (
                  <div className="uploaded-files">
                    {orderForm.documents.map((file, i) => (
                      <div key={i} className="file-item">
                        <span>{file.name}</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section">
                <h4>Additional Requirements</h4>
                <textarea
                  placeholder="Describe your specific requirements..."
                  value={orderForm.requirements}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, requirements: e.target.value }))}
                  rows={4}
                />
                <input
                  type="date"
                  value={orderForm.preferredDate}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                />
              </div>

              <div className="order-summary">
                <h4>Order Summary</h4>
                <div className="summary-item">
                  <span>Service:</span>
                  <span>{selectedService.name}</span>
                </div>
                <div className="summary-item">
                  <span>Package:</span>
                  <span>{orderForm.packageTier}</span>
                </div>
                <div className="summary-item">
                  <span>Price:</span>
                  <span>{selectedPackageDetails?.price || selectedService.price}</span>
                </div>
                <div className="summary-item">
                  <span>Duration:</span>
                  <span>{selectedService.duration}</span>
                </div>
              </div>

              <div className="form-actions">
                <button className="secondary-button" onClick={() => setShowOrderForm(false)} type="button">
                  Cancel
                </button>
                <button className="primary-button" onClick={handleOrderSubmit} disabled={isSubmitting} type="button">
                  {isSubmitting ? "Placing..." : "Place Order"}
                </button>
              </div>

              {submitError ? <div style={{ color: "#ef4444" }}>{submitError}</div> : null}
            </div>
          </div>
        </div>
      )}

      {currentOrder && (
        <div className="order-confirmation-modal">
          <div className="modal-content">
            <div className="confirmation-header">
              <span className="success-icon">✅</span>
              <h3>Order Placed Successfully!</h3>
            </div>

            <div className="order-details">
              <p>
                <strong>Order ID:</strong> #{String(currentOrder._id || currentOrder.id || "").slice(-6)}
              </p>
              <p>
                <strong>Service:</strong> {currentOrder.serviceName || selectedService?.name || "Business Service"}
              </p>
              <p>
                <strong>Status:</strong> {currentOrder.status || "submitted"}
              </p>
              <p>
                <strong>Estimated Completion:</strong>{" "}
                {currentOrder.estimatedCompletion ? new Date(currentOrder.estimatedCompletion).toLocaleDateString() : "—"}
              </p>
            </div>

            <div className="confirmation-actions">
              <button className="primary-button" onClick={() => { setCurrentOrder(null); setActiveSection("orders"); }} type="button">
                Track Order
              </button>
              <button className="secondary-button" onClick={() => setCurrentOrder(null)} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessServices;
