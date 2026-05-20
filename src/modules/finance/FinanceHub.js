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

import { calculateEmi, buildEmiSchedule, exportEmiScheduleCsv } from "./services/financeMath";
import { getLeadFormErrors, getEligibilityFormErrors } from "./services/financeValidation";
import { normalizeRoleTokens, hasAnyRole } from "./services/roleAccess";

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
];

const DOCUMENT_FIELDS = [
  { key: "aadhaar", label: "Aadhaar" },
  { key: "pan", label: "PAN" },
  { key: "salarySlip", label: "Salary Slip" },
  { key: "bankStatement", label: "Bank Statement" },
  { key: "gstProof", label: "GST / Business Proof" },
  { key: "collateralDocuments", label: "Collateral Documents" },
];

const GOVERNMENT_SCHEMES = [
  {
    id: "central-pm-mudra",
    name: "PMMY (Pradhan Mantri Mudra Yojana)",
    schemeType: "Central",
    categoryHint: "business",
    eligibility: "Non-corporate micro/small businesses in manufacturing, trading, services and allied activities.",
    maxAmount: "Up to INR 20 lakh (Shishu/Kishor/Tarun/Tarun Plus as per borrower profile)",
    documents: "KYC, business/activity proof, bank statement, quotation/invoice for funding need.",
    benefit: "Collateral-free business credit through formal banking channels.",
  },
  {
    id: "central-pmegp",
    name: "PMEGP (Prime Minister's Employment Generation Programme)",
    schemeType: "Central",
    categoryHint: "msme",
    eligibility: "New micro-enterprises; applicant 18+; project and category should satisfy PMEGP guidelines.",
    maxAmount: "Project cost for subsidy: up to INR 50 lakh (manufacturing) and INR 20 lakh (service/business)",
    documents: "Detailed project report, KYC, educational proof where applicable, category certificates, Udyam (post setup).",
    benefit: "Credit-linked margin money subsidy via KVIC/KVIB/DIC with special-category support.",
  },
  {
    id: "central-stand-up-india",
    name: "Stand-Up India",
    schemeType: "Central",
    categoryHint: "women",
    eligibility: "Women and SC/ST entrepreneurs for greenfield project.",
    maxAmount: "INR 10 lakh to INR 1 crore",
    documents: "KYC, project report, category certificate, business registration.",
    benefit: "Bank loans with handholding support and working capital options.",
  },
  {
    id: "central-cgtmse",
    name: "CGTMSE Credit Guarantee Support",
    schemeType: "Central",
    categoryHint: "msme",
    eligibility: "Micro and Small Enterprises borrowing through CGTMSE member lending institutions.",
    maxAmount: "Guarantee on unsecured credit portion up to INR 10 crore (not a direct loan scheme)",
    documents: "Lender loan application set: KYC, Udyam, financials, GST/ITR, business plan.",
    benefit: "Enables collateral-free MSME lending by providing guarantee cover to the lender.",
  },
  {
    id: "central-pm-vishwakarma",
    name: "PM Vishwakarma",
    schemeType: "Central",
    categoryHint: "women",
    eligibility: "Traditional artisans/craftspeople in notified trades, as per scheme registration criteria.",
    maxAmount: "Collateral-free enterprise loan up to INR 3 lakh in two tranches (INR 1 lakh + INR 2 lakh)",
    documents: "Aadhaar-linked KYC, trade declaration, scheme portal registration details.",
    benefit: "Concessional credit, toolkit incentive, skill upgradation and market support.",
  },
  {
    id: "central-pmfme",
    name: "PMFME (Micro Food Processing Enterprises)",
    schemeType: "Central",
    categoryHint: "business",
    eligibility: "Existing micro food processing units, SHGs, FPOs and cooperatives under PMFME norms.",
    maxAmount: "Credit-linked subsidy up to 35% of eligible project cost; ceiling up to INR 10 lakh for individual units",
    documents: "KYC, Udyam/FSSAI where applicable, project report, bank sanction details.",
    benefit: "Formalization, modernization and branding support for micro food businesses.",
  },
  {
    id: "kerala-ess",
    name: "Kerala Entrepreneur Support Scheme (ESS)",
    schemeType: "Kerala",
    categoryHint: "msme",
    eligibility: "Udyam-registered MSMEs in manufacturing in Kerala; support linked to fixed capital investment.",
    maxAmount: "15%-45% assistance slab by category/sector; overall ceiling as per current ESS limits",
    documents: "KYC, Udyam, fixed asset proof, project report, commencement and investment documents.",
    benefit: "Capital subsidy with additional support for women, youth, SC/ST, NRK and priority sectors.",
  },
  {
    id: "kerala-kels",
    name: "Kerala Entrepreneur Loan Scheme (KELS)",
    schemeType: "Kerala",
    categoryHint: "business",
    eligibility: "New and expanding MSMEs in manufacturing/service/trading in Kerala with Udyam registration.",
    maxAmount: "Interest concession support on loans up to INR 10 lakh",
    documents: "KYC, Udyam, loan details from participating banks, project/business plan.",
    benefit: "Government interest subvention to bring effective borrowing cost lower for eligible units.",
  },
  {
    id: "kerala-margin-money-nano",
    name: "Kerala Margin Money Grant to Nano Units",
    schemeType: "Kerala",
    categoryHint: "business",
    eligibility: "Nano units in manufacturing/job-work/service with project cost up to INR 10 lakh.",
    maxAmount: "Margin grant 30%-40% with maximum assistance up to INR 4 lakh",
    documents: "KYC, project report, bank sanction, proof of beneficiary contribution, Udyam details.",
    benefit: "Upfront project support for nano entrepreneurs, with enhanced support for special categories.",
  },
  {
    id: "kerala-interest-subvention-nano",
    name: "Kerala Interest Subvention for Nano Household Enterprises",
    schemeType: "Kerala",
    categoryHint: "business",
    eligibility: "Nano/household units (fixed capital up to INR 10 lakh) in manufacturing/services/job-work.",
    maxAmount: "Interest subvention 6% p.a. (8% for women and SC/ST) for up to 3 years",
    documents: "KYC, Udyam, term-loan details, repayment proof, fixed capital and connected-load details.",
    benefit: "Reduces interest burden for early-stage nano enterprises on reimbursement basis.",
  },
  {
    id: "kerala-asha",
    name: "Kerala ASHA (Assistance Scheme for Handicrafts Artisans)",
    schemeType: "Kerala",
    categoryHint: "business",
    eligibility: "Recognized handicraft artisans/micro enterprises in handicrafts with valid registration.",
    maxAmount: "General: up to INR 5 lakh combined support; special categories: up to INR 7.5 lakh combined support",
    documents: "Identity proof, artisan/sector proof, Udyam, project report, category certificates where applicable.",
    benefit: "Fixed-capital and working-capital grant support for handicraft enterprises.",
  },
  {
    id: "kerala-stressed-msme-revival",
    name: "Kerala Stressed MSMEs Revival & Rehabilitation",
    schemeType: "Kerala",
    categoryHint: "msme",
    eligibility: "Kerala MSMEs showing stress and taking approved revival/restructuring route.",
    maxAmount: "Combined assistance up to INR 5 lakh per unit (as per relief component caps)",
    documents: "Loan/restructuring records, revival project report, statutory dues and restart expense proofs.",
    benefit: "Margin grant, limited-period interest support and restart assistance to revive operations.",
  },
  {
    id: "kerala-iss-covid",
    name: "Kerala ISS (Interest Subvention on Term/Working Capital Loan)",
    schemeType: "Kerala",
    categoryHint: "msme",
    eligibility: "Manufacturing/job-work MSMEs in Kerala under notified ISS conditions.",
    maxAmount: "Up to INR 1.2 lakh combined assistance per unit (one-time)",
    documents: "KYC, Udyam, loan sanction details, operational and repayment evidence.",
    benefit: "Time-bound interest relief for eligible MSMEs affected by economic disruption.",
  },
  {
    id: "kerala-mission-1000",
    name: "Kerala MSME Scale Up Mission (Mission 1000)",
    schemeType: "Kerala",
    categoryHint: "msme",
    eligibility: "Kerala Udyam-registered MSMEs with operating history and scale-up potential under mission criteria.",
    maxAmount: "Capital subsidy up to 40% (max INR 2 crore) plus other mission-linked support caps",
    documents: "Udyam, audited financials, turnover/profit records, CIBIL and growth metrics.",
    benefit: "Scale-up package for selected MSMEs targeting high-growth and larger turnover.",
  },
  {
    id: "kerala-msme-insurance",
    name: "Kerala MSME Insurance Scheme",
    schemeType: "Kerala",
    categoryHint: "msme",
    eligibility: "Eligible MSMEs in Kerala insured through approved public-sector insurers.",
    maxAmount: "Reimbursement up to 50% of annual insurance premium (as per scheme norms)",
    documents: "Insurance policy and premium receipts, Udyam and business registration documents.",
    benefit: "Risk protection support against business shocks such as fire, theft and disasters.",
  },
  {
    id: "kerala-ofoe",
    name: "Kerala One Family One Enterprise (OFOE)",
    schemeType: "Kerala",
    categoryHint: "business",
    eligibility: "New MSMEs in manufacturing/service/trading that commenced operations on/after the notified date.",
    maxAmount: "Interest subvention linked to term/working capital loans up to INR 10 lakh",
    documents: "KYC, Udyam, loan documents from eligible financial institutions, activity proof.",
    benefit: "Promotes household entrepreneurship with loan-interest support.",
  },
  {
    id: "kerala-olop",
    name: "Kerala One Local Body One Product (OLOP)",
    schemeType: "Kerala",
    categoryHint: "business",
    eligibility: "Local enterprises and clusters aligned with LSGI-identified product opportunities.",
    maxAmount: "Support converges with relevant state/central funding windows",
    documents: "Project concept, local body alignment, enterprise and cluster documentation.",
    benefit: "Promotes value-added local products and market linkage through local-body convergence.",
  },
];

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

const createEmptyDocuments = () => ({
  aadhaar: [],
  pan: [],
  salarySlip: [],
  bankStatement: [],
  gstProof: [],
  collateralDocuments: [],
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const getYearlyBreakdown = (schedule = []) => {
  const yearlyMap = {};
  schedule.forEach((row) => {
    const year = Math.ceil(Number(row.month || 0) / 12);
    if (!yearlyMap[year]) {
      yearlyMap[year] = { year, interest: 0, principal: 0, prepayment: 0, total: 0 };
    }
    yearlyMap[year].interest += Number(row.interest || 0);
    yearlyMap[year].principal += Number(row.principal || 0);
    yearlyMap[year].prepayment += Number(row.prepayment || 0);
    yearlyMap[year].total += Number(row.emi || 0) + Number(row.prepayment || 0);
  });
  return Object.values(yearlyMap);
};

const pickInstitutions = (response) => response?.data?.institutions || response?.institutions || [];
const pickPayload = (response) => response?.data || response || null;

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
        value: GOVERNMENT_SCHEMES.length,
        helper: "Regional support options",
      },
      {
        id: "categories",
        label: "State Coverage",
        value: SOUTH_INDIA_STATES.length,
        helper: "Kerala, TN, KA, AP, TS",
      },
    ],
    [institutions]
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
      return;
    }

    try {
      const [adminResponse, commissionResponse, auditResponse] = await Promise.all([
        financeApi.getAdminDashboard(),
        financeApi.getCommissionDashboard(),
        financeApi.getAuditLogs(15),
      ]);
      setAdminDashboard(pickPayload(adminResponse));
      setCommissionDashboard(pickPayload(commissionResponse));
      setAuditLogs(auditResponse?.data?.logs || auditResponse?.logs || []);
    } catch (_error) {
      setWorkflowMessage("Some admin dashboard data could not be loaded.");
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

      if (isConsultant) {
        setWorkflowRole("consultant");
      } else if (isAdmin) {
        setWorkflowRole("admin");
      } else if (isInstitutionUser) {
        setWorkflowRole("institution");
      } else {
        setWorkflowRole("user");
      }

      await loadAdminAndCommissionDashboards(isAdmin);
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

      const response = await financeApi.createLead(formData);
      const createdLead = response?.data?.lead || response?.lead;

      setLeadState({
        loading: false,
        error: "",
        success: `${createdLead?.leadId || "Lead"} submitted successfully.`,
        consentAt: new Date().toLocaleString(),
        leadId: createdLead?.leadId || "",
        supportPhone: String(createdLead?.phone || leadForm.phone || "").replace(/\D/g, "").slice(-10),
      });
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
      consentPrivacy: true,
      consentKyc: true,
      consentDisclaimer: true,
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
    setWorkflowMessage("Quick assist data moved to full apply form. Review documents and submit.");
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

  return (
    <div className="finance-hub-page">
      <section className="finance-sticky-top">
        <div className="finance-hero">
          <div>
            <p className="finance-kicker">Nila Finance Hub</p>
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
          dataDeletionReason={dataDeletionReason}
          setDataDeletionReason={setDataDeletionReason}
          onDataDeletionRequest={handleDataDeletionRequest}
          workflowMessage={workflowMessage}
        />
      ) : null}

      {activeTab === "schemes" ? (
        <SchemesTab schemes={GOVERNMENT_SCHEMES} onApplyWithScheme={openApplyWithScheme} />
      ) : null}

      <button type="button" className="finance-floating-apply" onClick={() => setActiveTab("apply")}>Apply Now</button>
    </div>
  );
};

export default FinanceHub;
