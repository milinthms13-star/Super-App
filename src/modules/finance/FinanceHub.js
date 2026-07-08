import React, { useEffect, useMemo, useState } from "react";
import { financeApi } from "./financeApi";
import "./FinanceHub.css";

import LoanMarketplaceTab from "./components/LoanMarketplaceTab";
import EligibilityTab from "./components/EligibilityTab";
import EmiCalculatorTab from "./components/EmiCalculatorTab";
import ApplyLeadTab from "./components/ApplyLeadTab";
import TrackingDashTab from "./components/TrackingDashTab";
import SchemesTab from "./components/SchemesTab";
import FinanceOverviewTab from "./components/FinanceOverviewTab";

// New Advanced Components
import CRMPanel from "./components/CRMPanel";
import CreditBureauViewer from "./components/CreditBureauViewer";
import DocumentVerificationPanel from "./components/DocumentVerificationPanel";
import FraudDetectionWidget from "./components/FraudDetectionWidget";
import ReportsPanel from "./components/ReportsPanel";
import TaskManagerWidget from "./components/TaskManagerWidget";
import LanguageSwitcher from "./components/LanguageSwitcher";
import InstitutionPortal from "./components/InstitutionPortal";
import WorkflowAutomation from "./components/WorkflowAutomation";
import AnalyticsCharts from "./components/AnalyticsCharts";

import { calculateEmi, buildEmiSchedule, exportEmiScheduleCsv } from "./services/financeMath";
import { getLeadFormErrors, getEligibilityFormErrors } from "./services/financeValidation";
import { normalizeRoleTokens, hasAnyRole } from "./services/roleAccess";
import {
  createEmptyDocuments,
  createLeadSubmissionKey,
  formatCurrency,
  getYearlyBreakdown,
  pickInstitutions,
  pickPayload,
} from "./services/financeHubUtils";

const SOUTH_INDIA_REGIONS = {
  Kerala: ["Kollam", "Thiruvananthapuram", "Trivandrum", "Alappuzha", "Kottayam", "Pathanamthitta", "Ernakulam", "Thrissur", "Kozhikode", "Kannur"],
  TamilNadu: ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Tirunelveli", "Erode"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Shivamogga"],
  AndhraPradesh: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool", "Rajahmundry"],
  Telangana: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
};

const SOUTH_INDIA_STATES = Object.keys(SOUTH_INDIA_REGIONS);
const DEFAULT_STATE = "Kerala";
const getDistrictsForState = (state) => SOUTH_INDIA_REGIONS[state] || SOUTH_INDIA_REGIONS[DEFAULT_STATE] || [];

const LOAN_CATEGORIES = [
  { id: "business", title: "Business Loans", summary: "Working capital, machinery, MSME expansion." },
  { id: "personal", title: "Personal Loans", summary: "Salaried and self-employed personal finance." },
  { id: "gold", title: "Gold Loans", summary: "Fast secured loans with collateral-backed pricing, takeover and gold sale support." },
  { id: "loan-takeover", title: "Loan Takeover", summary: "Shift existing loans for better rate, EMI or tenure terms." },
  { id: "gold-sale", title: "Gold Sale (Gold Loan Closure)", summary: "Sell pledged gold to close gold loan and settle dues transparently." },
  { id: "home", title: "Home Loans", summary: "Purchase, construction and renovation assistance." },
  { id: "vehicle", title: "Vehicle Loans", summary: "Personal and commercial vehicle finance." },
  { id: "education", title: "Education Loans", summary: "India and abroad education support." },
  { id: "agriculture", title: "Agriculture Loans", summary: "Farm, dairy, poultry and equipment support." },
  { id: "women", title: "Women Entrepreneur Loans", summary: "Women-led enterprise and subsidy-linked support." },
  { id: "msme", title: "MSME Loans", summary: "Term loans, OD and CGTMSE-backed products." },
];

const RELATED_LOAN_CATEGORY_MAP = {
  "loan-takeover": ["loan-takeover", "personal", "business", "home", "msme", "gold"],
  "gold-sale": ["gold-sale", "gold"],
};

const getRelatedLoanCategories = (category) => {
  const normalized = String(category || "").trim().toLowerCase();
  return RELATED_LOAN_CATEGORY_MAP[normalized] || [normalized];
};

const TABS = [
  { id: "overview", label: "Finance 10/10" },
  { id: "loans", label: "Compare Offers" },
  { id: "eligibility", label: "Check Eligibility" },
  { id: "emi", label: "EMI Plan" },
  { id: "apply", label: "Apply" },
  { id: "track", label: "Track Status" },
  { id: "schemes", label: "Govt Schemes" },
  { id: "advanced", label: "Advanced Tools" },
];

const DOCUMENT_FIELDS = [
  { key: "aadhaar", label: "Aadhaar" },
  { key: "pan", label: "PAN" },
  { key: "salarySlip", label: "Salary Slip" },
  { key: "bankStatement", label: "Bank Statement" },
  { key: "gstProof", label: "GST / Business Proof" },
  { key: "collateralDocuments", label: "Collateral Documents" },
];

const GOVERNMENT_SCHEMES_ESTIMATED_COUNT = 17;

const QUICK_LOAN_TYPE_TO_CATEGORY = {
  "personal loan": "personal",
  "business loan": "business",
  "gold loan": "gold",
  "home loan": "home",
  "vehicle loan": "vehicle",
  "education loan": "education",
  "msme loan": "msme",
};

const INITIAL_ELIGIBILITY_FORM = {
  fullName: "",
  phone: "",
  loanCategory: "business",
  state: DEFAULT_STATE,
  district: getDistrictsForState(DEFAULT_STATE)[0] || "Kollam",
  age: "30",
  monthlyIncome: "50000",
  requiredAmount: "500000",
  existingEmi: "0",
  monthlyExpenses: "18000",
  employmentType: "salaried",
  employmentStabilityMonths: "24",
  cibilScore: "730",
  businessVintageMonths: "0",
  collateralAvailable: false,
  hasGstItr: false,
};

const INITIAL_EMI_FORM = {
  principal: "500000",
  annualInterest: "12",
  tenureMonths: "60",
  processingFeeType: "percentage",
  processingFeeValue: "1.5",
  prepaymentAmount: "0",
  prepaymentMonth: "0",
};

const INITIAL_OFFER_COMPARE = [
  { lender: "Bank Offer", interest: "11.5", processingFee: "1" },
  { lender: "NBFC Offer", interest: "13.25", processingFee: "1.75" },
  { lender: "Fintech Offer", interest: "14", processingFee: "2" },
];

const INITIAL_LEAD_FORM = {
  fullName: "",
  phone: "",
  loanCategory: "business",
  amount: "",
  preferredInterestRate: "12",
  preferredTenureMonths: "60",
  state: DEFAULT_STATE,
  district: getDistrictsForState(DEFAULT_STATE)[0] || "Kollam",
  institutionId: "",
  callbackWindow: "today-evening",
  documentNotes: "",
  whatsappOptIn: false,
  consentPrivacy: false,
  consentKyc: false,
  consentDisclaimer: false,
};

const INITIAL_ASSIGNMENT_FORM = {
  leadId: "",
  consultantId: "",
  consultantName: "",
  consultantPhone: "",
};

const INITIAL_STATUS_FORM = {
  leadId: "",
  status: "documents_pending",
  note: "",
};

const INITIAL_COMMISSION_FORM = {
  leadId: "",
  actualAmount: "",
  status: "pending",
};

const QUICK_ASSIST_INITIAL = {
  name: "",
  phone: "",
  loanType: "Personal Loan",
  monthlyIncome: "50000",
  employmentType: "Salaried",
  city: "",
  consent: false,
};

const FINANCE_PULSE_INITIAL = {
  monthlyIncome: "65000",
  monthlyExpenses: "28000",
  monthlyLoanEmi: "7000",
  monthlySavingsGoal: "15000",
  creditScore: "730",
  riskProfile: "medium",
};

const FinanceHub = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState("all");
  const [institutions, setInstitutions] = useState([]);
  const [institutionLoadState, setInstitutionLoadState] = useState({ loading: true, error: "" });

  const [eligibilityForm, setEligibilityForm] = useState(INITIAL_ELIGIBILITY_FORM);
  const [eligibilityState, setEligibilityState] = useState({ loading: false, error: "", result: null });

  const [emiForm, setEmiForm] = useState(INITIAL_EMI_FORM);
  const [offerCompare, setOfferCompare] = useState(INITIAL_OFFER_COMPARE);
  const [emiState, setEmiState] = useState({ error: "", result: null, yearly: [], offers: [] });

  const [leadForm, setLeadForm] = useState(INITIAL_LEAD_FORM);
  const [documentsByCategory, setDocumentsByCategory] = useState(createEmptyDocuments());
  const [leadState, setLeadState] = useState({ loading: false, error: "", success: "", consentAt: "", leadId: "", supportPhone: "" });
  const [leadSubmissionKey, setLeadSubmissionKey] = useState(createLeadSubmissionKey);

  const [trackPhone, setTrackPhone] = useState("");
  const [leadHistory, setLeadHistory] = useState([]);
  const [userDashboard, setUserDashboard] = useState(null);
  const [trackLoadError, setTrackLoadError] = useState("");

  const [roleCapabilities, setRoleCapabilities] = useState({
    loaded: false,
    isAdmin: false,
    isConsultant: false,
    isInstitutionUser: false,
    canViewCommission: false,
    accountPhone: "",
  });

  const [workflowRole, setWorkflowRole] = useState("user");
  const [consultantId, setConsultantId] = useState("");
  const [assignmentForm, setAssignmentForm] = useState(INITIAL_ASSIGNMENT_FORM);
  const [statusForm, setStatusForm] = useState(INITIAL_STATUS_FORM);
  const [commissionForm, setCommissionForm] = useState(INITIAL_COMMISSION_FORM);
  const [institutionDashboardId, setInstitutionDashboardId] = useState("");
  const [dataDeletionReason, setDataDeletionReason] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState("");

  const [consultantDashboard, setConsultantDashboard] = useState(null);
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [institutionDashboard, setInstitutionDashboard] = useState(null);
  const [commissionDashboard, setCommissionDashboard] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [slaDashboard, setSlaDashboard] = useState(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const [funnelAnalytics, setFunnelAnalytics] = useState(null);
  const [sourceChannelAnalytics, setSourceChannelAnalytics] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [governmentSchemes, setGovernmentSchemes] = useState([]);
  const [schemesLoading, setSchemesLoading] = useState(false);
  const [schemesError, setSchemesError] = useState("");
  const [quickJourney, setQuickJourney] = useState({
    loanCategory: "business",
    amount: "500000",
    interest: "12",
    tenureMonths: "60",
    monthlyIncome: "50000",
    state: DEFAULT_STATE,
    district: getDistrictsForState(DEFAULT_STATE)[0] || "Kollam",
  });
  const [quickAssist, setQuickAssist] = useState(QUICK_ASSIST_INITIAL);
  const [financePulse, setFinancePulse] = useState(FINANCE_PULSE_INITIAL);

  // Advanced Features State
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [selectedLeadForAdvanced, setSelectedLeadForAdvanced] = useState(null);
  const [advancedTab, setAdvancedTab] = useState('crm');

  const summaryCards = useMemo(
    () => [
      { id: "verified", label: "Verified Partners", value: institutions.filter((item) => item.verifiedPartner).length },
      { id: "districts", label: "City Coverage", value: SOUTH_INDIA_STATES.reduce((total, state) => total + getDistrictsForState(state).length, 0) },
      { id: "states", label: "South India States", value: SOUTH_INDIA_STATES.length },
      { id: "categories", label: "Loan Categories", value: LOAN_CATEGORIES.length },
    ],
    [institutions]
  );
  const heroSignals = useMemo(
    () => [
      {
        id: "market",
        label: "Partner Network",
        value: institutions.length,
        helper: "Banks, NBFCs, co-ops",
      },
      {
        id: "verified",
        label: "Verified",
        value: institutions.filter((item) => item.verifiedPartner).length,
        helper: "Trust-marked partners",
      },
      {
        id: "schemes",
        label: "Govt Schemes",
        value: governmentSchemes.length || GOVERNMENT_SCHEMES_ESTIMATED_COUNT,
        helper: "Regional support options",
      },
      {
        id: "categories",
        label: "State Coverage",
        value: SOUTH_INDIA_STATES.length,
        helper: "Kerala, TN, KA, AP, TS",
      },
    ],
    [institutions, governmentSchemes.length]
  );

  const filteredLoanCategories = useMemo(
    () =>
      LOAN_CATEGORIES.filter((item) => {
        const text = `${item.title} ${item.summary}`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
      }),
    [searchTerm]
  );

  const districtOptionsForFilter = useMemo(() => {
    if (stateFilter === "all") {
      return SOUTH_INDIA_STATES.flatMap((state) => getDistrictsForState(state));
    }
    return getDistrictsForState(stateFilter);
  }, [stateFilter]);

  const districtOptionsForQuickJourney = useMemo(
    () => getDistrictsForState(quickJourney.state),
    [quickJourney.state]
  );

  const quickEligibilityScore = useMemo(() => {
    const income = Number(quickAssist.monthlyIncome || 0);
    let score = 40;
    if (income >= 25000) score += 20;
    if (income >= 50000) score += 15;
    if (String(quickAssist.employmentType || "").toLowerCase() === "salaried") score += 10;
    if (String(quickAssist.city || "").trim()) score += 5;
    if (quickAssist.consent) score += 10;
    return Math.min(100, score);
  }, [quickAssist]);

  const quickEmi = useMemo(() => {
    const principal = Number(quickJourney.amount || 0);
    const annualInterest = Number(quickJourney.interest || 0);
    const months = Number(quickJourney.tenureMonths || 0);
    return calculateEmi(principal, annualInterest, months);
  }, [quickJourney.amount, quickJourney.interest, quickJourney.tenureMonths]);

  const filteredInstitutions = useMemo(
    () =>
      institutions.filter((institution) => {
        const byCategory =
          selectedCategory === "all" ||
          getRelatedLoanCategories(selectedCategory).some((categoryId) =>
            institution.loanCategories?.includes(categoryId)
          );
        const byDistrict =
          districtFilter === "all" ||
          (institution.serviceDistricts || []).includes(districtFilter);
        const byType =
          institutionTypeFilter === "all" ||
          String(institution.type || "").toLowerCase() === institutionTypeFilter;
        const bySearch = `${institution.name || ""} ${institution.branchAddress || ""} ${institution.contactPerson?.name || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return byCategory && byDistrict && byType && bySearch;
      }),
    [institutions, searchTerm, selectedCategory, districtFilter, institutionTypeFilter]
  );

  const loadAdminAndCommissionDashboards = async (isAdmin) => {
    if (!isAdmin) {
      setAdminDashboard(null);
      setCommissionDashboard(null);
      setAuditLogs([]);
      setFunnelAnalytics(null);
      setSourceChannelAnalytics([]);
      return;
    }

    try {
      setAnalyticsLoading(true);
      const [adminResponse, commissionResponse, auditResponse, funnelResponse, sourceResponse] = await Promise.all([
        financeApi.getAdminDashboard(),
        financeApi.getCommissionDashboard(),
        financeApi.getAuditLogs(15),
        financeApi.getFunnelAnalytics(),
        financeApi.getSourceChannelAnalytics(),
      ]);
      setAdminDashboard(pickPayload(adminResponse));
      setCommissionDashboard(pickPayload(commissionResponse));
      setAuditLogs(auditResponse?.data?.logs || auditResponse?.logs || []);
      setFunnelAnalytics(pickPayload(funnelResponse));
      setSourceChannelAnalytics(pickPayload(sourceResponse)?.channels || []);
    } catch (_error) {
      setWorkflowMessage("Some admin dashboard data could not be loaded.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadSlaDashboard = async (consultantScopeId = consultantId) => {
    const shouldLoad = roleCapabilities.isConsultant || roleCapabilities.isAdmin;
    if (!shouldLoad) {
      setSlaDashboard(null);
      return;
    }

    try {
      setSlaLoading(true);
      const params = {};
      if (roleCapabilities.isAdmin && consultantScopeId) {
        params.consultantId = consultantScopeId;
      }
      const response = await financeApi.getSlaDashboard(params);
      setSlaDashboard(pickPayload(response));
    } catch (_error) {
      setSlaDashboard(null);
    } finally {
      setSlaLoading(false);
    }
  };

  const loadViewerProfile = async () => {
    try {
      const response = await financeApi.getAuthProfile();
      const user = response?.user || response?.data?.user || null;
      const roleTokens = normalizeRoleTokens(user || {});
      const isAdmin = hasAnyRole(roleTokens, ["admin", "finance", "finance_admin"]);
      const isConsultant = isAdmin || hasAnyRole(roleTokens, ["consultant", "finance_consultant"]);
      const isInstitutionUser = hasAnyRole(roleTokens, ["institution", "institution_partner"]);
      const canViewCommission = isAdmin;
      const accountPhone = String(user?.phone || "").replace(/\D/g, "").slice(-10);
      const derivedConsultantId = String(user?.consultantId || user?._id || user?.id || "").trim();

      setRoleCapabilities({
        loaded: true,
        isAdmin,
        isConsultant,
        isInstitutionUser,
        canViewCommission,
        accountPhone,
      });

      if (accountPhone) {
        setTrackPhone(accountPhone);
      }
      if (derivedConsultantId) {
        setConsultantId(derivedConsultantId);
        setAssignmentForm((current) => ({ ...current, consultantId: derivedConsultantId }));
      }

      if (isAdmin) {
        setWorkflowRole("admin");
      } else if (isConsultant) {
        setWorkflowRole("consultant");
      } else if (isInstitutionUser) {
        setWorkflowRole("institution");
      } else {
        setWorkflowRole("user");
      }

      await loadAdminAndCommissionDashboards(isAdmin);
      if (isConsultant || isAdmin) {
        await loadSlaDashboard(derivedConsultantId);
      }
    } catch (_error) {
      setRoleCapabilities((current) => ({ ...current, loaded: true }));
    }
  };

  const loadInstitutions = async () => {
    setInstitutionLoadState({ loading: true, error: "" });
    try {
      const response = await financeApi.getInstitutions({
        state: stateFilter === "all" ? "" : stateFilter,
        district: districtFilter === "all" ? "" : districtFilter,
        type: institutionTypeFilter === "all" ? "" : institutionTypeFilter,
        category: selectedCategory === "all" ? "" : selectedCategory,
      });
      setInstitutions(pickInstitutions(response));
      setInstitutionLoadState({ loading: false, error: "" });
    } catch (error) {
      setInstitutionLoadState({
        loading: false,
        error: error?.response?.data?.message || "Unable to load institution marketplace.",
      });
    }
  };

  useEffect(() => {
    void loadViewerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stateFilter === "all") {
      return;
    }
    const stateDistricts = getDistrictsForState(stateFilter);
    if (districtFilter !== "all" && !stateDistricts.includes(districtFilter)) {
      setDistrictFilter("all");
    }
  }, [stateFilter, districtFilter]);

  useEffect(() => {
    const stateDistricts = getDistrictsForState(quickJourney.state);
    if (!stateDistricts.includes(quickJourney.district)) {
      setQuickJourney((current) => ({
        ...current,
        district: stateDistricts[0] || current.district,
      }));
    }
  }, [quickJourney.state, quickJourney.district]);

  useEffect(() => {
    void loadInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, districtFilter, institutionTypeFilter, selectedCategory]);

  useEffect(() => {
    if (!roleCapabilities.loaded) return;
    if (!roleCapabilities.isConsultant && !roleCapabilities.isAdmin) return;
    void loadSlaDashboard(consultantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantId, roleCapabilities.isConsultant, roleCapabilities.isAdmin, roleCapabilities.loaded]);

  useEffect(() => {
    if (activeTab !== "schemes" || governmentSchemes.length > 0 || schemesLoading) return;

    let active = true;
    const loadSchemes = async () => {
      setSchemesLoading(true);
      setSchemesError("");
      try {
        const module = await import("./data/governmentSchemes.v1");
        if (!active) return;
        const rows = Array.isArray(module.default) ? module.default : [];
        setGovernmentSchemes(rows);
      } catch (_error) {
        if (!active) return;
        setSchemesError("Unable to load scheme catalogue right now.");
      } finally {
        if (active) {
          setSchemesLoading(false);
        }
      }
    };

    void loadSchemes();

    return () => {
      active = false;
    };
  }, [activeTab, governmentSchemes.length, schemesLoading]);

  const handleEligibilitySubmit = async (event) => {
    event.preventDefault();
    setEligibilityState({ loading: true, error: "", result: null });

    const validationErrors = getEligibilityFormErrors(eligibilityForm);
    if (validationErrors.length > 0) {
      setEligibilityState({ loading: false, error: validationErrors.join(" "), result: null });
      return;
    }

    try {
      const payload = {
        ...eligibilityForm,
        age: Number(eligibilityForm.age),
        monthlyIncome: Number(eligibilityForm.monthlyIncome),
        requiredAmount: Number(eligibilityForm.requiredAmount),
        existingEmi: Number(eligibilityForm.existingEmi),
        monthlyExpenses: Number(eligibilityForm.monthlyExpenses),
        employmentStabilityMonths: Number(eligibilityForm.employmentStabilityMonths),
        cibilScore: Number(eligibilityForm.cibilScore),
        businessVintageMonths: Number(eligibilityForm.businessVintageMonths),
      };

      const response = await financeApi.saveEligibility(payload);
      setEligibilityState({ loading: false, error: "", result: pickPayload(response) });
    } catch (error) {
      setEligibilityState({
        loading: false,
        error: error?.response?.data?.message || "Eligibility check failed.",
        result: null,
      });
    }
  };

  const handleEmiCalculation = (event) => {
    event.preventDefault();

    const principal = Number(emiForm.principal || 0);
    const annualInterest = Number(emiForm.annualInterest || 0);
    const tenureMonths = Number(emiForm.tenureMonths || 0);

    if (principal <= 0) {
      setEmiState({ error: "Principal amount must be greater than zero.", result: null, yearly: [], offers: [] });
      return;
    }
    if (annualInterest < 6 || annualInterest > 36) {
      setEmiState({ error: "Interest rate must be within 6% to 36%.", result: null, yearly: [], offers: [] });
      return;
    }
    if (tenureMonths <= 0) {
      setEmiState({ error: "Tenure cannot be negative or zero.", result: null, yearly: [], offers: [] });
      return;
    }

    const processingFeeType = emiForm.processingFeeType;
    const processingFeeValue = Number(emiForm.processingFeeValue || 0);
    const processingFeeAmount = processingFeeType === "flat"
      ? processingFeeValue
      : Number(((principal * processingFeeValue) / 100).toFixed(2));

    const result = buildEmiSchedule({
      principal,
      annualInterest,
      tenureMonths,
      prepaymentAmount: Number(emiForm.prepaymentAmount || 0),
      prepaymentMonth: Number(emiForm.prepaymentMonth || 0),
    });

    const yearly = getYearlyBreakdown(result.schedule);
    const offers = offerCompare.map((offer) => {
      const offerRate = Number(offer.interest || 0);
      const offerFeePercentage = Number(offer.processingFee || 0);
      const offerEmi = calculateEmi(principal, offerRate, tenureMonths);
      const offerTotal = offerEmi * tenureMonths + (principal * offerFeePercentage) / 100;
      return {
        lender: offer.lender || "Offer",
        interest: offerRate,
        processingFee: offerFeePercentage,
        monthlyEmi: offerEmi,
        totalPayable: offerTotal,
      };
    });

    setEmiState({
      error: "",
      result: {
        ...result,
        processingFeeAmount,
        grandTotal: result.totalPayable + processingFeeAmount,
      },
      yearly,
      offers,
    });
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    setLeadState({ loading: true, error: "", success: "", consentAt: "", leadId: "", supportPhone: "" });

    const validationErrors = getLeadFormErrors(leadForm);
    if (validationErrors.length > 0) {
      setLeadState({ loading: false, error: validationErrors.join(" "), success: "", consentAt: "", leadId: "", supportPhone: "" });
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(leadForm).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (eligibilityState.result?.result) {
        formData.append("eligibilitySnapshot", JSON.stringify(eligibilityState.result.result));
      }

      DOCUMENT_FIELDS.forEach((docField) => {
        const files = Array.from(documentsByCategory[docField.key] || []);
        files.forEach((file) => {
          formData.append(docField.key, file);
        });
      });

      const response = await financeApi.createLead(formData, {
        idempotencyKey: leadSubmissionKey,
        sourceChannel: "web",
        device: {
          platform: typeof navigator !== "undefined" ? navigator.userAgent : "web",
          appVersion: "finance-hub-v1",
          buildNumber: "web",
        },
      });
      const createdLead = response?.data?.lead || response?.lead;

      setLeadState({
        loading: false,
        error: "",
        success: `${createdLead?.leadId || "Lead"} submitted successfully.${response?.data?.idempotency?.replayed ? " (Recovered from retry)" : ""}`,
        consentAt: new Date().toLocaleString(),
        leadId: createdLead?.leadId || "",
        supportPhone: String(createdLead?.phone || leadForm.phone || "").replace(/\D/g, "").slice(-10),
      });
      setLeadSubmissionKey(createLeadSubmissionKey());
      setLeadForm(INITIAL_LEAD_FORM);
      setDocumentsByCategory(createEmptyDocuments());

      if (createdLead?.phone) {
        setTrackPhone(String(createdLead.phone));
        const userSummary = await financeApi.getUserDashboard(String(createdLead.phone));
        const summaryData = pickPayload(userSummary);
        setUserDashboard(summaryData);
        setLeadHistory(summaryData?.leads || []);
      }

      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards(true);
      }
    } catch (error) {
      setLeadState({
        loading: false,
        error: error?.response?.data?.message || "Lead submission failed.",
        success: "",
        consentAt: "",
        leadId: "",
        supportPhone: "",
      });
    }
  };

  const handleTrackFetch = async () => {
    setTrackLoadError("");
    const fallbackPhone = String(roleCapabilities.accountPhone || "").trim();
    const phoneToTrack = /^\d{10}$/.test(trackPhone) ? trackPhone : fallbackPhone;

    if (!/^\d{10}$/.test(phoneToTrack)) {
      setTrackLoadError("Enter a valid 10 digit phone number to track applications.");
      return;
    }

    try {
      const response = await financeApi.getUserDashboard(phoneToTrack);
      const summaryData = pickPayload(response);
      setUserDashboard(summaryData);
      setLeadHistory(summaryData?.leads || []);
    } catch (error) {
      setTrackLoadError(error?.response?.data?.message || "Unable to fetch tracking information.");
    }
  };

  const handleAssignmentSubmit = async (event) => {
    event.preventDefault();
    setWorkflowMessage("");
    try {
      await financeApi.assignConsultant(assignmentForm.leadId, assignmentForm);
      setWorkflowMessage(`Consultant assigned for ${assignmentForm.leadId}.`);
      if (consultantId) {
        const consultantData = await financeApi.getConsultantDashboard(consultantId);
        setConsultantDashboard(pickPayload(consultantData));
      }
      await loadSlaDashboard(consultantId);
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards(true);
      }
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Consultant assignment failed.");
    }
  };

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    setWorkflowMessage("");
    try {
      await financeApi.updateLeadStatus(statusForm.leadId, {
        status: statusForm.status,
        note: statusForm.note,
      });
      setWorkflowMessage(`Status updated for ${statusForm.leadId}.`);

      if (consultantId) {
        const consultantData = await financeApi.getConsultantDashboard(consultantId);
        setConsultantDashboard(pickPayload(consultantData));
      }
      await loadSlaDashboard(consultantId);
      if (trackPhone) {
        await handleTrackFetch();
      }
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards(true);
      }
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Status update failed.");
    }
  };

  const handleCommissionSubmit = async (event) => {
    event.preventDefault();
    setWorkflowMessage("");
    try {
      await financeApi.updateCommission(commissionForm.leadId, {
        actualAmount: Number(commissionForm.actualAmount),
        status: commissionForm.status,
      });
      setWorkflowMessage(`Commission updated for ${commissionForm.leadId}.`);
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards(true);
      }
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Commission update failed.");
    }
  };

  const loadConsultantDashboard = async () => {
    setWorkflowMessage("");
    try {
      const response = await financeApi.getConsultantDashboard(consultantId);
      setConsultantDashboard(pickPayload(response));
      await loadSlaDashboard(consultantId);
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Unable to fetch consultant dashboard.");
    }
  };

  const loadInstitutionDashboard = async () => {
    setWorkflowMessage("");
    if (!institutionDashboardId) {
      setWorkflowMessage("Select an institution to view institution dashboard.");
      return;
    }

    try {
      const response = await financeApi.getInstitutionDashboard(institutionDashboardId);
      setInstitutionDashboard(pickPayload(response));
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Unable to fetch institution dashboard.");
    }
  };

  const handleDataDeletionRequest = async () => {
    setWorkflowMessage("");
    const targetPhone = /^\d{10}$/.test(trackPhone)
      ? trackPhone
      : String(roleCapabilities.accountPhone || "").trim();

    if (!/^\d{10}$/.test(targetPhone)) {
      setWorkflowMessage("Enter your 10 digit phone in tracker to request data deletion.");
      return;
    }

    if (String(dataDeletionReason || "").trim().length < 5) {
      setWorkflowMessage("Enter a valid reason for data deletion request.");
      return;
    }

    try {
      const response = await financeApi.requestDataDeletion({
        phone: targetPhone,
        reason: dataDeletionReason.trim(),
      });
      setWorkflowMessage(response?.message || response?.data?.message || "Data deletion request submitted.");
      setDataDeletionReason("");

      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards(true);
      }
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Data deletion request failed.");
    }
  };

  const openApplyWithScheme = (categoryHint) => {
    setLeadForm((current) => ({ ...current, loanCategory: categoryHint || "business" }));
    setActiveTab("apply");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const startEligibilityFromQuickJourney = () => {
    setEligibilityForm((current) => ({
      ...current,
      loanCategory: quickJourney.loanCategory,
      requiredAmount: quickJourney.amount,
      monthlyIncome: quickJourney.monthlyIncome,
      state: quickJourney.state,
      district: quickJourney.district,
    }));
    setActiveTab("eligibility");
  };

  const startApplicationFromQuickJourney = () => {
    setLeadForm((current) => ({
      ...current,
      loanCategory: quickJourney.loanCategory,
      amount: quickJourney.amount,
      state: quickJourney.state,
      district: quickJourney.district,
    }));
    setActiveTab("apply");
  };

  const continueQuickAssistToApply = () => {
    const normalizedPhone = String(quickAssist.phone || "").replace(/\D/g, "").slice(-10);
    const normalizedLoanType = String(quickAssist.loanType || "").trim().toLowerCase();
    const mappedCategory = QUICK_LOAN_TYPE_TO_CATEGORY[normalizedLoanType] || quickJourney.loanCategory;

    if (!quickAssist.name || !normalizedPhone || !quickAssist.consent) {
      setWorkflowMessage("Enter quick assist name, 10 digit phone, and consent to continue.");
      return;
    }

    setLeadForm((current) => ({
      ...current,
      fullName: quickAssist.name,
      phone: normalizedPhone,
      loanCategory: mappedCategory,
      amount: quickJourney.amount,
      preferredInterestRate: quickJourney.interest,
      preferredTenureMonths: quickJourney.tenureMonths,
      state: quickJourney.state,
      district: quickAssist.city || quickJourney.district,
      consentPrivacy: current.consentPrivacy,
      consentKyc: current.consentKyc,
      consentDisclaimer: current.consentDisclaimer,
      documentNotes:
        `${current.documentNotes || ""}${current.documentNotes ? "\n" : ""}` +
        `Quick Assist Score: ${quickEligibilityScore}/100 | Employment: ${quickAssist.employmentType} | Monthly Income: INR ${quickAssist.monthlyIncome || 0}`,
    }));

    setEligibilityForm((current) => ({
      ...current,
      fullName: quickAssist.name,
      phone: normalizedPhone,
      loanCategory: mappedCategory,
      monthlyIncome: quickAssist.monthlyIncome || current.monthlyIncome,
      requiredAmount: quickJourney.amount,
      state: quickJourney.state,
      district: quickAssist.city || quickJourney.district,
      employmentType:
        String(quickAssist.employmentType || "").toLowerCase().includes("salary")
          ? "salaried"
          : current.employmentType,
    }));

    setTrackPhone(normalizedPhone);
    setWorkflowMessage("Quick assist data moved to full apply form. Review and accept consent checkboxes before submitting.");
    setActiveTab("apply");
  };

  const openApplyWithInstitution = (institution) => {
    if (!institution) return;

    const institutionId = institution._id || institution.id || "";
    setLeadForm((current) => ({
      ...current,
      institutionId,
      loanCategory: selectedCategory === "all" ? current.loanCategory : selectedCategory,
      state: stateFilter === "all" ? current.state : stateFilter,
      district: districtFilter === "all" ? current.district : districtFilter,
      documentNotes: `${current.documentNotes || ""}${current.documentNotes ? "\n" : ""}Preferred lender: ${institution.name}`,
    }));
    setInstitutionDashboardId(institutionId);
    setActiveTab("apply");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const openTracker = () => {
    setActiveTab("track");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const canUseConsultantWorkflow = roleCapabilities.isConsultant;
  const canUseAdminWorkflow = roleCapabilities.isAdmin;
  const canUseInstitutionWorkflow = roleCapabilities.isAdmin || roleCapabilities.isConsultant || roleCapabilities.isInstitutionUser;
  const canUseCommissionWorkflow = roleCapabilities.canViewCommission;

  const handleLanguageChange = (langCode) => {
    setCurrentLanguage(langCode);
    // In real implementation, update i18n library here
    console.log('Language changed to:', langCode);
  };

  const handleSelectLeadForAdvanced = (lead) => {
    setSelectedLeadForAdvanced(lead);
    setActiveTab('advanced');
  };

  return (
    <div className="finance-hub-page">
      <section className="finance-sticky-top">
        <div className="finance-hero">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p className="finance-kicker">Nila Finance Hub</p>
            <LanguageSwitcher 
              currentLanguage={currentLanguage} 
              onLanguageChange={handleLanguageChange}
              compact={true}
            />
          </div>
          <div>
            <h1>Get loans faster across South India</h1>
            <p className="finance-subtitle">
              Personal, business, gold, loan takeover, gold-sale closure, home and MSME financing with trusted partners across Kerala,
              Tamil Nadu, Karnataka, Telangana and Andhra Pradesh.
            </p>
            <div className="finance-hero-actions">
              <button type="button" className="finance-hero-action-btn" onClick={() => setActiveTab("loans")}>
                Compare Offers
              </button>
              <button type="button" className="finance-hero-action-btn" onClick={startEligibilityFromQuickJourney}>
                Check Eligibility
              </button>
              <button type="button" className="finance-hero-action-btn" onClick={startApplicationFromQuickJourney}>
                Apply Now
              </button>
            </div>
            <div className="finance-chip-row finance-quick-loan-types" aria-label="Quick loan categories">
              {LOAN_CATEGORIES.filter((item) => ["personal", "business", "gold", "loan-takeover", "gold-sale", "home", "msme"].includes(item.id)).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={quickJourney.loanCategory === item.id ? "active" : ""}
                  onClick={() => setQuickJourney((current) => ({ ...current, loanCategory: item.id }))}
                >
                  {item.title.replace(" Loans", "").replace(" (Gold Loan Closure)", "")}
                </button>
              ))}
            </div>
            <div className="finance-hero-highlights" aria-label="Finance pulse">
              {heroSignals.map((item) => (
                <article key={item.id} className="finance-hero-signal">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.helper}</small>
                </article>
              ))}
            </div>
          </div>
          <div className="finance-hero-tools">
            <div className="finance-journey-card">
              <h3>Check Eligibility in 30 Seconds</h3>
              <div className="finance-journey-grid">
                <label>
                  Loan Amount
                  <input
                    type="number"
                    value={quickJourney.amount}
                    onChange={(event) => setQuickJourney((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="e.g. 500000"
                  />
                </label>
                <label>
                  Monthly Income
                  <input
                    type="number"
                    value={quickJourney.monthlyIncome}
                    onChange={(event) => setQuickJourney((current) => ({ ...current, monthlyIncome: event.target.value }))}
                    placeholder="e.g. 50000"
                  />
                </label>
                <label>
                  State
                  <select
                    value={quickJourney.state}
                    onChange={(event) => setQuickJourney((current) => ({ ...current, state: event.target.value }))}
                  >
                    {SOUTH_INDIA_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </label>
                <label>
                  District / City
                  <select
                    value={quickJourney.district}
                    onChange={(event) => setQuickJourney((current) => ({ ...current, district: event.target.value }))}
                  >
                    {districtOptionsForQuickJourney.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="finance-journey-actions">
                <button type="button" onClick={startEligibilityFromQuickJourney}>Check Eligibility</button>
                <button type="button" onClick={startApplicationFromQuickJourney}>Continue to Apply</button>
              </div>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search banks, NBFCs, categories, or schemes..."
            />
            <div className="finance-filter-row">
              <label>
                State
                <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
                  <option value="all">All states</option>
                  {SOUTH_INDIA_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </label>
              <label>
                District / City
                <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
                  <option value="all">All</option>
                  {districtOptionsForFilter.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </label>
              <label>
                Institution
                <select value={institutionTypeFilter} onChange={(event) => setInstitutionTypeFilter(event.target.value)}>
                  <option value="all">All</option>
                  <option value="bank">Banks</option>
                  <option value="nbfc">NBFCs</option>
                  <option value="co-operative">Co-operative</option>
                  <option value="microfinance">Microfinance</option>
                  <option value="fintech">Fintech</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="finance-primary-actions" aria-label="Finance quick actions">
          <button type="button" onClick={startEligibilityFromQuickJourney}>
            <strong>Check Eligibility</strong>
            <small>Know approval chance first</small>
          </button>
          <button type="button" onClick={() => setActiveTab("loans")}>
            <strong>Compare Loans</strong>
            <small>Bank, NBFC and partner offers</small>
          </button>
          <button type="button" onClick={startApplicationFromQuickJourney}>
            <strong>Apply for Loan</strong>
            <small>Submit enquiry with documents</small>
          </button>
          <button type="button" onClick={openTracker}>
            <strong>Track Application</strong>
            <small>Status, callback and documents</small>
          </button>
        </div>

        <div className="finance-tab-row">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="finance-summary-grid">
        {summaryCards.map((item) => (
          <article key={item.id} className="finance-summary-card">
            <p>{item.label}</p>
            <h3>{item.value}</h3>
          </article>
        ))}
      </section>

      {activeTab === "overview" ? (
        <FinanceOverviewTab
          quickJourney={quickJourney}
          setQuickJourney={setQuickJourney}
          financePulse={financePulse}
          setFinancePulse={setFinancePulse}
          quickAssist={quickAssist}
          setQuickAssist={setQuickAssist}
          quickEligibilityScore={quickEligibilityScore}
          quickEmi={quickEmi}
          onQuickAssistContinue={continueQuickAssistToApply}
          states={SOUTH_INDIA_STATES}
          districtsByState={SOUTH_INDIA_REGIONS}
          financeApiEnabled={true}
          formatCurrency={formatCurrency}
        />
      ) : null}

      {activeTab === "loans" ? (
        <LoanMarketplaceTab
          categories={LOAN_CATEGORIES}
          filters={{ selectedCategory, filteredLoanCategories, filteredInstitutions, institutionLoadState }}
          onFilterChange={{ setSelectedCategory }}
          onApplyWithInstitution={openApplyWithInstitution}
        />
      ) : null}

      {activeTab === "eligibility" ? (
        <EligibilityTab
          form={eligibilityForm}
          onChange={setEligibilityForm}
          onSubmit={handleEligibilitySubmit}
          state={eligibilityState}
          categories={LOAN_CATEGORIES}
          states={SOUTH_INDIA_STATES}
          districtsByState={SOUTH_INDIA_REGIONS}
          formatCurrency={formatCurrency}
        />
      ) : null}

      {activeTab === "emi" ? (
        <EmiCalculatorTab
          form={emiForm}
          onChange={setEmiForm}
          onCalculate={handleEmiCalculation}
          state={emiState}
          offerCompare={offerCompare}
          setOfferCompare={setOfferCompare}
          downloadScheduleCsv={exportEmiScheduleCsv}
          leadForm={leadForm}
          formatCurrency={formatCurrency}
        />
      ) : null}

      {activeTab === "apply" ? (
        <ApplyLeadTab
          form={leadForm}
          onChange={setLeadForm}
          onSubmit={handleLeadSubmit}
          state={leadState}
          documents={documentsByCategory}
          onDocumentUpload={(key, files) => {
            setDocumentsByCategory((current) => ({ ...current, [key]: files }));
          }}
          documentFields={DOCUMENT_FIELDS}
          categories={LOAN_CATEGORIES}
          states={SOUTH_INDIA_STATES}
          districtsByState={SOUTH_INDIA_REGIONS}
          institutions={institutions}
          onInstitutionSelect={setInstitutionDashboardId}
        />
      ) : null}

      {activeTab === "track" ? (
        <TrackingDashTab
          trackPhone={trackPhone}
          setTrackPhone={setTrackPhone}
          onTrackFetch={handleTrackFetch}
          trackLoadError={trackLoadError}
          userDashboard={userDashboard}
          leadHistory={leadHistory}
          formatCurrency={formatCurrency}
          workflowRole={workflowRole}
          setWorkflowRole={setWorkflowRole}
          canUseConsultantWorkflow={canUseConsultantWorkflow}
          canUseAdminWorkflow={canUseAdminWorkflow}
          canUseInstitutionWorkflow={canUseInstitutionWorkflow}
          canUseCommissionWorkflow={canUseCommissionWorkflow}
          consultantId={consultantId}
          setConsultantId={setConsultantId}
          assignmentForm={assignmentForm}
          setAssignmentForm={setAssignmentForm}
          onAssignmentSubmit={handleAssignmentSubmit}
          statusForm={statusForm}
          setStatusForm={setStatusForm}
          onStatusSubmit={handleStatusSubmit}
          consultantDashboard={consultantDashboard}
          loadConsultantDashboard={loadConsultantDashboard}
          adminDashboard={adminDashboard}
          commissionForm={commissionForm}
          setCommissionForm={setCommissionForm}
          onCommissionSubmit={handleCommissionSubmit}
          auditLogs={auditLogs}
          institutionDashboardId={institutionDashboardId}
          setInstitutionDashboardId={setInstitutionDashboardId}
          institutions={institutions}
          loadInstitutionDashboard={loadInstitutionDashboard}
          institutionDashboard={institutionDashboard}
          commissionDashboard={commissionDashboard}
          slaDashboard={slaDashboard}
          slaLoading={slaLoading}
          onRefreshSlaDashboard={() => loadSlaDashboard(consultantId)}
          funnelAnalytics={funnelAnalytics}
          sourceChannelAnalytics={sourceChannelAnalytics}
          analyticsLoading={analyticsLoading}
          dataDeletionReason={dataDeletionReason}
          setDataDeletionReason={setDataDeletionReason}
          onDataDeletionRequest={handleDataDeletionRequest}
          workflowMessage={workflowMessage}
        />
      ) : null}

      {activeTab === "schemes" ? (
        <SchemesTab
          schemes={governmentSchemes}
          loading={schemesLoading}
          error={schemesError}
          onApplyWithScheme={openApplyWithScheme}
        />
      ) : null}

      {activeTab === "advanced" ? (
        <div className="finance-advanced-tools">
          <h2 style={{ marginBottom: '1.5rem' }}>Advanced Finance Tools</h2>
          
          {/* Show Task Manager Widget at the top */}
          {(canUseConsultantWorkflow || canUseAdminWorkflow) && (
            <div style={{ marginBottom: '2rem' }}>
              <TaskManagerWidget 
                userId={consultantId}
                compact={false}
              />
            </div>
          )}

          {/* Advanced Tools Tabs */}
          <div style={{ borderBottom: '2px solid #e0e0e0', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAdvancedTab('crm')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: advancedTab === 'crm' ? '#1976d2' : 'transparent',
                  color: advancedTab === 'crm' ? 'white' : '#333',
                  cursor: 'pointer',
                  borderBottom: advancedTab === 'crm' ? '3px solid #1976d2' : 'none',
                }}
              >
                CRM Activities
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab('credit')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: advancedTab === 'credit' ? '#1976d2' : 'transparent',
                  color: advancedTab === 'credit' ? 'white' : '#333',
                  cursor: 'pointer',
                  borderBottom: advancedTab === 'credit' ? '3px solid #1976d2' : 'none',
                }}
              >
                Credit Bureau
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab('documents')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: advancedTab === 'documents' ? '#1976d2' : 'transparent',
                  color: advancedTab === 'documents' ? 'white' : '#333',
                  cursor: 'pointer',
                  borderBottom: advancedTab === 'documents' ? '3px solid #1976d2' : 'none',
                }}
              >
                Document Verification
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab('fraud')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: advancedTab === 'fraud' ? '#1976d2' : 'transparent',
                  color: advancedTab === 'fraud' ? 'white' : '#333',
                  cursor: 'pointer',
                  borderBottom: advancedTab === 'fraud' ? '3px solid #1976d2' : 'none',
                }}
              >
                Fraud Detection
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab('reports')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: advancedTab === 'reports' ? '#1976d2' : 'transparent',
                  color: advancedTab === 'reports' ? 'white' : '#333',
                  cursor: 'pointer',
                  borderBottom: advancedTab === 'reports' ? '3px solid #1976d2' : 'none',
                }}
              >
                Reports
              </button>
              {canUseAdminWorkflow && (
                <>
                  <button
                    type="button"
                    onClick={() => setAdvancedTab('workflow')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      background: advancedTab === 'workflow' ? '#1976d2' : 'transparent',
                      color: advancedTab === 'workflow' ? 'white' : '#333',
                      cursor: 'pointer',
                      borderBottom: advancedTab === 'workflow' ? '3px solid #1976d2' : 'none',
                    }}
                  >
                    Workflow Automation
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancedTab('analytics')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      background: advancedTab === 'analytics' ? '#1976d2' : 'transparent',
                      color: advancedTab === 'analytics' ? 'white' : '#333',
                      cursor: 'pointer',
                      borderBottom: advancedTab === 'analytics' ? '3px solid #1976d2' : 'none',
                    }}
                  >
                    Analytics
                  </button>
                </>
              )}
              {canUseInstitutionWorkflow && (
                <button
                  type="button"
                  onClick={() => setAdvancedTab('institutions')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    background: advancedTab === 'institutions' ? '#1976d2' : 'transparent',
                    color: advancedTab === 'institutions' ? 'white' : '#333',
                    cursor: 'pointer',
                    borderBottom: advancedTab === 'institutions' ? '3px solid #1976d2' : 'none',
                  }}
                >
                  Institution Portal
                </button>
              )}
            </div>
          </div>

          {/* Advanced Tool Content */}
          <div>
            {advancedTab === 'crm' && (
              <CRMPanel leadId={selectedLeadForAdvanced?._id || leadState.leadId} />
            )}
            
            {advancedTab === 'credit' && (
              <CreditBureauViewer leadId={selectedLeadForAdvanced?._id || leadState.leadId} />
            )}
            
            {advancedTab === 'documents' && (
              <DocumentVerificationPanel leadId={selectedLeadForAdvanced?._id || leadState.leadId} />
            )}
            
            {advancedTab === 'fraud' && (
              <FraudDetectionWidget leadId={selectedLeadForAdvanced?._id || leadState.leadId} />
            )}
            
            {advancedTab === 'reports' && (
              <ReportsPanel leadId={selectedLeadForAdvanced?._id} />
            )}
            
            {advancedTab === 'workflow' && canUseAdminWorkflow && (
              <WorkflowAutomation />
            )}
            
            {advancedTab === 'analytics' && canUseAdminWorkflow && (
              <AnalyticsCharts />
            )}
            
            {advancedTab === 'institutions' && canUseInstitutionWorkflow && (
              <InstitutionPortal />
            )}
          </div>

          {/* Helper Text */}
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: '#f5f5f5', 
            borderRadius: '8px' 
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              💡 <strong>Tip:</strong> Select a lead from the tracking dashboard and click "View Advanced Tools" 
              to see detailed CRM activities, credit reports, and fraud analysis for that specific lead.
            </p>
          </div>
        </div>
      ) : null}

      <button type="button" className="finance-floating-apply" onClick={() => setActiveTab("apply")}>Apply Now</button>
    </div>
  );
};

export default FinanceHub;

