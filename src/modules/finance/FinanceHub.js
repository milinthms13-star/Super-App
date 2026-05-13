import React, { useEffect, useMemo, useState } from "react";
import { financeApi } from "./financeApi";
import "./FinanceHub.css";

const SOUTH_KERALA_DISTRICTS = [
  "Kollam",
  "Trivandrum",
  "Alappuzha",
  "Kottayam",
  "Pathanamthitta",
];

const LOAN_CATEGORIES = [
  { id: "business", title: "Business Loans", summary: "Working capital, machinery, MSME expansion." },
  { id: "personal", title: "Personal Loans", summary: "Salaried and self-employed personal finance." },
  { id: "gold", title: "Gold Loans", summary: "Fast secured loans with collateral-backed pricing." },
  { id: "home", title: "Home Loans", summary: "Purchase, construction and renovation assistance." },
  { id: "vehicle", title: "Vehicle Loans", summary: "Personal and commercial vehicle finance." },
  { id: "education", title: "Education Loans", summary: "India and abroad education support." },
  { id: "agriculture", title: "Agriculture Loans", summary: "Farm, dairy, poultry and equipment support." },
  { id: "women", title: "Women Entrepreneur Loans", summary: "Women-led enterprise and subsidy-linked support." },
  { id: "msme", title: "MSME Loans", summary: "Term loans, OD and CGTMSE-backed products." },
];

const TABS = [
  { id: "loans", label: "Loans" },
  { id: "eligibility", label: "Eligibility" },
  { id: "emi", label: "EMI" },
  { id: "apply", label: "Apply" },
  { id: "track", label: "Track" },
  { id: "schemes", label: "Schemes" },
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
    id: "pm-mudra",
    name: "PM Mudra Yojana",
    categoryHint: "business",
    eligibility: "Micro and small businesses with viable proposal.",
    maxAmount: "INR 10 lakh",
    documents: "KYC, business proof, bank statement, quotation for use of funds.",
    benefit: "Collateral-free loan via Shishu/Kishor/Tarun categories.",
  },
  {
    id: "pmegp",
    name: "PMEGP",
    categoryHint: "msme",
    eligibility: "New micro-enterprises in manufacturing/services.",
    maxAmount: "INR 50 lakh (manufacturing), INR 20 lakh (service)",
    documents: "Project report, KYC, education proof (if applicable), category proof.",
    benefit: "Subsidy margin money with rural/urban differentiation.",
  },
  {
    id: "standup-india",
    name: "Stand-Up India",
    categoryHint: "women",
    eligibility: "Women and SC/ST entrepreneurs for greenfield project.",
    maxAmount: "INR 1 crore",
    documents: "KYC, project report, category certificate, business registration.",
    benefit: "Bank loans with handholding support and working capital options.",
  },
  {
    id: "msme-loans",
    name: "MSME Institutional Loans",
    categoryHint: "msme",
    eligibility: "Registered MSMEs with business cashflow visibility.",
    maxAmount: "Varies by institution",
    documents: "Udyam, GST, ITR, bank statement, balance sheet.",
    benefit: "Structured term and OD limits with collateral and non-collateral options.",
  },
  {
    id: "women-entrepreneur",
    name: "Women Entrepreneur Schemes",
    categoryHint: "women",
    eligibility: "Women-led startups and small enterprises.",
    maxAmount: "Varies by lender and scheme",
    documents: "KYC, ownership proof, project report, bank statement.",
    benefit: "Interest rebates and lower margin in select programs.",
  },
  {
    id: "scst-schemes",
    name: "SC/ST Finance Schemes",
    categoryHint: "business",
    eligibility: "Eligible SC/ST applicants with approved business proposal.",
    maxAmount: "Varies by state and institution",
    documents: "Category proof, KYC, project report, local approvals.",
    benefit: "Priority lending and subsidy-linked opportunities.",
  },
  {
    id: "minority-finance",
    name: "Minority Finance Schemes",
    categoryHint: "personal",
    eligibility: "Eligible minority applicants as per scheme rules.",
    maxAmount: "Varies by institution",
    documents: "Identity, income proof, category certificate, bank records.",
    benefit: "Concessional rates and livelihood-focused support.",
  },
  {
    id: "kerala-subsidy",
    name: "Kerala Subsidy Schemes",
    categoryHint: "agriculture",
    eligibility: "State-defined segments including women, MSME and agriculture.",
    maxAmount: "Scheme specific",
    documents: "Local body approvals, KYC, business/agri records, quotations.",
    benefit: "State subsidy and district support facilitation.",
  },
];

const INITIAL_ELIGIBILITY_FORM = {
  fullName: "",
  phone: "",
  district: "Trivandrum",
  loanCategory: "business",
  age: "30",
  monthlyIncome: "",
  requiredAmount: "",
  existingEmi: "0",
  monthlyExpenses: "",
  employmentType: "salaried",
  employmentStabilityMonths: "12",
  cibilScore: "720",
  collateralAvailable: false,
  businessVintageMonths: "0",
  hasGstItr: false,
};

const INITIAL_EMI_FORM = {
  principal: "",
  annualInterest: "",
  tenureMonths: "36",
  processingFeeType: "percentage",
  processingFeeValue: "1.2",
  prepaymentAmount: "0",
  prepaymentMonth: "0",
};

const INITIAL_OFFER_COMPARE = [
  { lender: "Offer A", interest: "10.5", processingFee: "1.2" },
  { lender: "Offer B", interest: "11.8", processingFee: "0.8" },
  { lender: "Offer C", interest: "12.4", processingFee: "0.5" },
];

const INITIAL_LEAD_FORM = {
  fullName: "",
  phone: "",
  district: "Trivandrum",
  loanCategory: "business",
  amount: "",
  institutionId: "",
  callbackWindow: "today-evening",
  documentNotes: "",
  preferredInterestRate: "12",
  preferredTenureMonths: "36",
  whatsappOptIn: true,
  consentPrivacy: false,
  consentKyc: false,
  consentDisclaimer: false,
};

const INITIAL_ASSIGNMENT_FORM = {
  leadId: "",
  consultantId: "",
  consultantName: "Primary Consultant",
  consultantPhone: "",
};

const INITIAL_STATUS_FORM = {
  leadId: "",
  status: "in_review",
  note: "",
};

const INITIAL_COMMISSION_FORM = {
  leadId: "",
  actualAmount: "",
  status: "eligible",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const normalizeRoleTokens = (user = {}) => {
  const roleSet = new Set();
  [user.role, user.registrationType, ...(Array.isArray(user.roles) ? user.roles : [])].forEach((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) roleSet.add(normalized);
  });
  return roleSet;
};

const hasAnyRole = (roleTokens, roles = []) =>
  roles.some((role) => roleTokens.has(String(role || "").trim().toLowerCase()));

const calculateMonthlyEmi = (principal, annualInterest, tenureMonths) => {
  const p = Number(principal || 0);
  const n = Number(tenureMonths || 0);
  const r = Number(annualInterest || 0) / 12 / 100;

  if (!p || !n) {
    return 0;
  }

  if (r === 0) {
    return p / n;
  }

  const numerator = p * r * Math.pow(1 + r, n);
  const denominator = Math.pow(1 + r, n) - 1;
  return denominator ? numerator / denominator : 0;
};

const buildEmiSchedule = ({
  principal,
  annualInterest,
  tenureMonths,
  prepaymentAmount = 0,
  prepaymentMonth = 0,
}) => {
  const monthlyEmi = calculateMonthlyEmi(principal, annualInterest, tenureMonths);
  const monthlyRate = Number(annualInterest || 0) / 12 / 100;
  const prepayValue = Number(prepaymentAmount || 0);
  const prepayMonthIndex = Number(prepaymentMonth || 0);

  let outstanding = Number(principal || 0);
  let totalInterest = 0;
  const schedule = [];

  for (let month = 1; month <= Number(tenureMonths || 0); month += 1) {
    if (outstanding <= 0) {
      break;
    }

    const interestPart = monthlyRate === 0 ? 0 : outstanding * monthlyRate;
    let principalPart = monthlyEmi - interestPart;
    if (principalPart > outstanding) {
      principalPart = outstanding;
    }

    let prepaymentThisMonth = 0;
    if (prepayMonthIndex > 0 && prepayMonthIndex === month && prepayValue > 0) {
      prepaymentThisMonth = Math.min(prepayValue, outstanding - principalPart);
    }

    const totalPrincipalPart = principalPart + prepaymentThisMonth;
    const closingBalance = Math.max(0, outstanding - totalPrincipalPart);

    totalInterest += interestPart;
    schedule.push({
      month,
      emi: monthlyEmi,
      interest: interestPart,
      principal: principalPart,
      prepayment: prepaymentThisMonth,
      closingBalance,
    });

    outstanding = closingBalance;
  }

  return {
    monthlyEmi,
    totalInterest,
    totalPayable: schedule.reduce((sum, row) => sum + row.emi + row.prepayment, 0),
    schedule,
  };
};

const getYearlyBreakdown = (schedule = []) => {
  const yearlyMap = {};
  schedule.forEach((row) => {
    const year = Math.ceil(row.month / 12);
    if (!yearlyMap[year]) {
      yearlyMap[year] = { year, interest: 0, principal: 0, prepayment: 0, total: 0 };
    }
    yearlyMap[year].interest += row.interest;
    yearlyMap[year].principal += row.principal;
    yearlyMap[year].prepayment += row.prepayment;
    yearlyMap[year].total += row.emi + row.prepayment;
  });
  return Object.values(yearlyMap);
};

const downloadScheduleCsv = (schedule = [], leadName = "loan") => {
  const headers = ["Month", "EMI", "Interest", "Principal", "Prepayment", "Closing Balance"];
  const rows = schedule.map((item) => [
    item.month,
    item.emi.toFixed(2),
    item.interest.toFixed(2),
    item.principal.toFixed(2),
    item.prepayment.toFixed(2),
    item.closingBalance.toFixed(2),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${leadName}-emi-schedule.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getLeadFormErrors = (form) => {
  const issues = [];
  if (!/^[A-Za-z ]+$/.test(String(form.fullName || "").trim())) {
    issues.push("Name should contain letters and spaces only.");
  }
  if (!/^\d{10}$/.test(String(form.phone || "").trim())) {
    issues.push("Phone must be exactly 10 digits.");
  }
  if (Number(form.amount || 0) <= 0) {
    issues.push("Loan amount must be greater than zero.");
  }
  if (Number(form.preferredTenureMonths || 0) <= 0) {
    issues.push("Tenure must be a positive number of months.");
  }
  const interest = Number(form.preferredInterestRate || 0);
  if (interest < 6 || interest > 36) {
    issues.push("Preferred interest rate must be between 6% and 36%.");
  }
  if (!form.consentPrivacy || !form.consentKyc || !form.consentDisclaimer) {
    issues.push("All consent checkboxes must be accepted.");
  }
  return issues;
};

const FinanceHub = () => {
  const [activeTab, setActiveTab] = useState("loans");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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
  const [documentsByCategory, setDocumentsByCategory] = useState({
    aadhaar: [],
    pan: [],
    salarySlip: [],
    bankStatement: [],
    gstProof: [],
    collateralDocuments: [],
  });
  const [leadState, setLeadState] = useState({ loading: false, error: "", success: "", consentAt: "" });

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

  const summaryCards = useMemo(
    () => [
      {
        id: "verified",
        label: "Verified Partners",
        value: institutions.filter((item) => item.verifiedPartner).length,
      },
      {
        id: "districts",
        label: "District Coverage",
        value: SOUTH_KERALA_DISTRICTS.length,
      },
      {
        id: "categories",
        label: "Loan Categories",
        value: LOAN_CATEGORIES.length,
      },
      {
        id: "schemes",
        label: "Govt Schemes",
        value: GOVERNMENT_SCHEMES.length,
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

  const filteredInstitutions = useMemo(
    () =>
      institutions.filter((institution) => {
        const byCategory = selectedCategory === "all" || institution.loanCategories?.includes(selectedCategory);
        const bySearch = `${institution.name} ${institution.branchAddress} ${institution.contactPerson?.name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return byCategory && bySearch;
      }),
    [institutions, searchTerm, selectedCategory]
  );

  const loadViewerProfile = async () => {
    try {
      const response = await financeApi.getAuthProfile();
      const user = response?.user || null;
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
    } catch (_error) {
      setRoleCapabilities((current) => ({ ...current, loaded: true }));
    }
  };

  const loadInstitutions = async () => {
    setInstitutionLoadState({ loading: true, error: "" });
    try {
      const response = await financeApi.getInstitutions({
        district: districtFilter === "all" ? "" : districtFilter,
        type: institutionTypeFilter === "all" ? "" : institutionTypeFilter,
        category: selectedCategory === "all" ? "" : selectedCategory,
      });
      setInstitutions(response?.data?.institutions || []);
      setInstitutionLoadState({ loading: false, error: "" });
    } catch (error) {
      setInstitutionLoadState({
        loading: false,
        error: error?.response?.data?.message || "Unable to load institution marketplace.",
      });
    }
  };

  const loadAdminAndCommissionDashboards = async () => {
    if (!roleCapabilities.isAdmin) {
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
      setAdminDashboard(adminResponse?.data || null);
      setCommissionDashboard(commissionResponse?.data || null);
      setAuditLogs(auditResponse?.data?.logs || []);
    } catch (_error) {
      setWorkflowMessage("Some admin dashboard data could not be loaded.");
    }
  };

  useEffect(() => {
    void loadViewerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtFilter, institutionTypeFilter, selectedCategory]);

  useEffect(() => {
    if (roleCapabilities.loaded && roleCapabilities.isAdmin) {
      void loadAdminAndCommissionDashboards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleCapabilities.loaded, roleCapabilities.isAdmin]);

  const handleEligibilitySubmit = async (event) => {
    event.preventDefault();
    setEligibilityState({ loading: true, error: "", result: null });

    if (Number(eligibilityForm.monthlyIncome || 0) <= 0) {
      setEligibilityState({ loading: false, error: "Monthly income must be greater than zero.", result: null });
      return;
    }
    if (Number(eligibilityForm.requiredAmount || 0) <= 0) {
      setEligibilityState({ loading: false, error: "Requested loan amount must be greater than zero.", result: null });
      return;
    }
    if (Number(eligibilityForm.age || 0) < 18) {
      setEligibilityState({ loading: false, error: "Age must be 18 or above.", result: null });
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
      setEligibilityState({
        loading: false,
        error: "",
        result: response?.data || null,
      });
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
    const processingFeeAmount =
      processingFeeType === "flat"
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
      const offerEmi = calculateMonthlyEmi(principal, offerRate, tenureMonths);
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
    setLeadState({ loading: true, error: "", success: "", consentAt: "" });

    const validationErrors = getLeadFormErrors(leadForm);
    if (validationErrors.length > 0) {
      setLeadState({
        loading: false,
        error: validationErrors.join(" "),
        success: "",
        consentAt: "",
      });
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
      const createdLead = response?.data?.lead;

      setLeadState({
        loading: false,
        error: "",
        success: `${createdLead?.leadId || "Lead"} submitted successfully.`,
        consentAt: new Date().toLocaleString(),
      });
      setLeadForm(INITIAL_LEAD_FORM);
      setDocumentsByCategory({
        aadhaar: [],
        pan: [],
        salarySlip: [],
        bankStatement: [],
        gstProof: [],
        collateralDocuments: [],
      });
      setTrackPhone(String(createdLead?.phone || trackPhone || ""));
      if (createdLead?.phone) {
        const userSummary = await financeApi.getUserDashboard(createdLead.phone);
        setUserDashboard(userSummary?.data || null);
        setLeadHistory(userSummary?.data?.leads || []);
      }
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards();
      }
    } catch (error) {
      setLeadState({
        loading: false,
        error: error?.response?.data?.message || "Lead submission failed.",
        success: "",
        consentAt: "",
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
      setUserDashboard(response?.data || null);
      setLeadHistory(response?.data?.leads || []);
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
        setConsultantDashboard(consultantData?.data || null);
      }
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards();
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
        setConsultantDashboard(consultantData?.data || null);
      }
      if (trackPhone) {
        await handleTrackFetch();
      }
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards();
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
        await loadAdminAndCommissionDashboards();
      }
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Commission update failed.");
    }
  };

  const loadConsultantDashboard = async () => {
    setWorkflowMessage("");
    try {
      const response = await financeApi.getConsultantDashboard(consultantId);
      setConsultantDashboard(response?.data || null);
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
      setInstitutionDashboard(response?.data || null);
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
      setWorkflowMessage(response?.message || "Data deletion request submitted.");
      setDataDeletionReason("");
      if (roleCapabilities.isAdmin) {
        await loadAdminAndCommissionDashboards();
      }
    } catch (error) {
      setWorkflowMessage(error?.response?.data?.message || "Data deletion request failed.");
    }
  };

  const openApplyWithScheme = (categoryHint) => {
    setLeadForm((current) => ({ ...current, loanCategory: categoryHint || "business" }));
    setActiveTab("apply");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canUseConsultantWorkflow = roleCapabilities.isConsultant;
  const canUseAdminWorkflow = roleCapabilities.isAdmin;
  const canUseInstitutionWorkflow =
    roleCapabilities.isAdmin || roleCapabilities.isConsultant || roleCapabilities.isInstitutionUser;
  const canUseCommissionWorkflow = roleCapabilities.canViewCommission;

  return (
    <div className="finance-hub-page">
      <section className="finance-sticky-top">
        <div className="finance-hero">
          <div>
            <p className="finance-kicker">Nila Finance Hub</p>
            <h1>Production-ready loan marketplace and assistance workflow</h1>
            <p className="finance-subtitle">
              Backend-connected enquiries, document uploads, consultant assignment, lead tracking,
              scheme discovery and commission dashboards.
            </p>
          </div>
          <div className="finance-hero-tools">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search institutions, categories, or schemes..."
            />
            <div className="finance-filter-row">
              <label>
                District
                <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
                  <option value="all">All</option>
                  {SOUTH_KERALA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Institution
                <select
                  value={institutionTypeFilter}
                  onChange={(event) => setInstitutionTypeFilter(event.target.value)}
                >
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

      {activeTab === "loans" ? (
        <section className="finance-section">
          <div className="finance-section-header">
            <h2>Loan & Institution Marketplace</h2>
            <p>Collapsible summary cards first, detailed info on demand.</p>
          </div>

          <div className="finance-chip-row">
            <button type="button" onClick={() => setSelectedCategory("all")}>
              All
            </button>
            {LOAN_CATEGORIES.map((category) => (
              <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)}>
                {category.title}
              </button>
            ))}
          </div>

          <div className="finance-card-grid">
            {filteredLoanCategories.map((category) => (
              <details key={category.id} className="finance-card">
                <summary>
                  <strong>{category.title}</strong>
                </summary>
                <p>{category.summary}</p>
              </details>
            ))}
          </div>

          <div className="finance-section-header">
            <h3>Institution Listings</h3>
            <p>Real onboarding fields with verified badges, fees, turnaround and ratings.</p>
          </div>

          {institutionLoadState.loading ? <p>Loading institutions...</p> : null}
          {institutionLoadState.error ? <p className="finance-error">{institutionLoadState.error}</p> : null}

          <div className="finance-card-grid">
            {filteredInstitutions.map((institution) => (
              <details key={institution._id} className="finance-card">
                <summary className="finance-card-summary">
                  <span>{institution.name}</span>
                  {institution.verifiedPartner ? <span className="finance-verified">Verified Partner</span> : null}
                </summary>
                <p>
                  <strong>Type:</strong> {institution.type}
                </p>
                <p>
                  <strong>Branch:</strong> {institution.branchAddress}
                </p>
                <p>
                  <strong>Contact:</strong> {institution.contactPerson?.name} ({institution.contactPerson?.phone})
                </p>
                <p>
                  <strong>Service Districts:</strong> {(institution.serviceDistricts || []).join(", ")}
                </p>
                <p>
                  <strong>Approval Time:</strong> {institution.approvalTime?.minDays}-{institution.approvalTime?.maxDays} days
                </p>
                <p>
                  <strong>Processing Fee:</strong> {institution.processingFee?.value}
                  {institution.processingFee?.type === "percentage" ? "%" : " INR"}
                </p>
                <p>
                  <strong>Commission Model:</strong> {institution.commissionModel?.type} {institution.commissionModel?.value}
                </p>
                <p>
                  <strong>Rating:</strong> {institution.ratings?.average} ({institution.ratings?.totalReviews} reviews)
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "eligibility" ? (
        <section className="finance-section">
          <div className="finance-section-header">
            <h2>Enhanced Eligibility Checker</h2>
            <p>Age, EMI burden, expenses, CIBIL, stability, collateral and GST/ITR aware scoring.</p>
          </div>

          <form className="finance-form" onSubmit={handleEligibilitySubmit}>
            <label>
              Name
              <input
                type="text"
                value={eligibilityForm.fullName}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                value={eligibilityForm.phone}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>
            <label>
              Loan Category
              <select
                value={eligibilityForm.loanCategory}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, loanCategory: event.target.value }))
                }
              >
                {LOAN_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              District
              <select
                value={eligibilityForm.district}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, district: event.target.value }))
                }
              >
                {SOUTH_KERALA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Age
              <input
                type="number"
                value={eligibilityForm.age}
                onChange={(event) => setEligibilityForm((current) => ({ ...current, age: event.target.value }))}
              />
            </label>
            <label>
              Monthly Income (INR)
              <input
                type="number"
                value={eligibilityForm.monthlyIncome}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, monthlyIncome: event.target.value }))
                }
              />
            </label>
            <label>
              Required Amount (INR)
              <input
                type="number"
                value={eligibilityForm.requiredAmount}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, requiredAmount: event.target.value }))
                }
              />
            </label>
            <label>
              Existing EMI (INR)
              <input
                type="number"
                value={eligibilityForm.existingEmi}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, existingEmi: event.target.value }))
                }
              />
            </label>
            <label>
              Monthly Expenses (INR)
              <input
                type="number"
                value={eligibilityForm.monthlyExpenses}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, monthlyExpenses: event.target.value }))
                }
              />
            </label>
            <label>
              Employment Type
              <select
                value={eligibilityForm.employmentType}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, employmentType: event.target.value }))
                }
              >
                <option value="salaried">Salaried</option>
                <option value="self-employed">Self-employed</option>
                <option value="business-owner">Business Owner</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </label>
            <label>
              Employment Stability (months)
              <input
                type="number"
                value={eligibilityForm.employmentStabilityMonths}
                onChange={(event) =>
                  setEligibilityForm((current) => ({
                    ...current,
                    employmentStabilityMonths: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              CIBIL Score
              <input
                type="number"
                value={eligibilityForm.cibilScore}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, cibilScore: event.target.value }))
                }
              />
            </label>
            <label>
              Business Vintage (months)
              <input
                type="number"
                value={eligibilityForm.businessVintageMonths}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, businessVintageMonths: event.target.value }))
                }
              />
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={eligibilityForm.collateralAvailable}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, collateralAvailable: event.target.checked }))
                }
              />
              Collateral Available
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={eligibilityForm.hasGstItr}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, hasGstItr: event.target.checked }))
                }
              />
              GST / ITR Available
            </label>
            <button type="submit" disabled={eligibilityState.loading}>
              {eligibilityState.loading ? "Checking..." : "Check Eligibility"}
            </button>
          </form>

          {eligibilityState.error ? <p className="finance-error">{eligibilityState.error}</p> : null}
          {eligibilityState.result?.result ? (
            <div className="finance-result">
              <p>
                <strong>Approval Probability:</strong> {eligibilityState.result.result.approvalProbability}% (
                {eligibilityState.result.result.probabilityLabel})
              </p>
              <p>
                <strong>Score:</strong> {eligibilityState.result.result.score}/100
              </p>
              <p>
                <strong>FOIR:</strong> {eligibilityState.result.result.foir}%
              </p>
              <p>
                <strong>Estimated New EMI:</strong> {formatCurrency(eligibilityState.result.result.estimatedNewEmi)}
              </p>
              <p>
                <strong>Best Matching Products:</strong>{" "}
                {(eligibilityState.result.result.bestMatchingLoanProducts || []).join(", ")}
              </p>
              <p>
                <strong>Improvement Guide:</strong>{" "}
                {(eligibilityState.result.result.improvementTips || []).join(" | ")}
              </p>
              <p>
                <strong>Potential Rejection Reasons:</strong>{" "}
                {(eligibilityState.result.result.rejectionReasons || []).join(" | ") || "None"}
              </p>
              <p>
                <strong>Matching Institutions:</strong>{" "}
                {(eligibilityState.result.matchingInstitutions || []).map((item) => item.name).join(", ")}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "emi" ? (
        <section className="finance-section">
          <div className="finance-section-header">
            <h2>Advanced EMI Calculator</h2>
            <p>Monthly + yearly breakdown, processing fee, prepayment, compare offers and CSV export.</p>
          </div>

          <form className="finance-form" onSubmit={handleEmiCalculation}>
            <label>
              Principal (INR)
              <input
                type="number"
                value={emiForm.principal}
                onChange={(event) => setEmiForm((current) => ({ ...current, principal: event.target.value }))}
              />
            </label>
            <label>
              Annual Interest (%)
              <input
                type="number"
                step="0.01"
                value={emiForm.annualInterest}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, annualInterest: event.target.value }))
                }
              />
            </label>
            <label>
              Tenure (months)
              <input
                type="number"
                value={emiForm.tenureMonths}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, tenureMonths: event.target.value }))
                }
              />
            </label>
            <label>
              Processing Fee Type
              <select
                value={emiForm.processingFeeType}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, processingFeeType: event.target.value }))
                }
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (INR)</option>
              </select>
            </label>
            <label>
              Processing Fee Value
              <input
                type="number"
                step="0.01"
                value={emiForm.processingFeeValue}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, processingFeeValue: event.target.value }))
                }
              />
            </label>
            <label>
              Prepayment Amount (INR)
              <input
                type="number"
                value={emiForm.prepaymentAmount}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, prepaymentAmount: event.target.value }))
                }
              />
            </label>
            <label>
              Prepayment Month
              <input
                type="number"
                value={emiForm.prepaymentMonth}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, prepaymentMonth: event.target.value }))
                }
              />
            </label>
            <button type="submit">Calculate EMI</button>
          </form>

          <div className="finance-section-header">
            <h3>Compare 3 Loan Offers</h3>
          </div>
          <div className="finance-card-grid">
            {offerCompare.map((offer, index) => (
              <article key={`offer-${index}`} className="finance-card">
                <label>
                  Lender
                  <input
                    type="text"
                    value={offer.lender}
                    onChange={(event) =>
                      setOfferCompare((current) =>
                        current.map((item, offerIndex) =>
                          offerIndex === index ? { ...item, lender: event.target.value } : item
                        )
                      )
                    }
                  />
                </label>
                <label>
                  Interest %
                  <input
                    type="number"
                    step="0.01"
                    value={offer.interest}
                    onChange={(event) =>
                      setOfferCompare((current) =>
                        current.map((item, offerIndex) =>
                          offerIndex === index ? { ...item, interest: event.target.value } : item
                        )
                      )
                    }
                  />
                </label>
                <label>
                  Processing Fee %
                  <input
                    type="number"
                    step="0.01"
                    value={offer.processingFee}
                    onChange={(event) =>
                      setOfferCompare((current) =>
                        current.map((item, offerIndex) =>
                          offerIndex === index ? { ...item, processingFee: event.target.value } : item
                        )
                      )
                    }
                  />
                </label>
              </article>
            ))}
          </div>

          {emiState.error ? <p className="finance-error">{emiState.error}</p> : null}
          {emiState.result ? (
            <div className="finance-result">
              <p>
                <strong>Monthly EMI:</strong> {formatCurrency(emiState.result.monthlyEmi)}
              </p>
              <p>
                <strong>Total Interest:</strong> {formatCurrency(emiState.result.totalInterest)}
              </p>
              <p>
                <strong>Processing Fee:</strong> {formatCurrency(emiState.result.processingFeeAmount)}
              </p>
              <p>
                <strong>Total Payable:</strong> {formatCurrency(emiState.result.grandTotal)}
              </p>
              <button
                type="button"
                onClick={() => downloadScheduleCsv(emiState.result.schedule, leadForm.fullName || "finance")}
              >
                Download EMI Schedule
              </button>

              <h4>Yearly Breakdown</h4>
              <ul className="finance-list">
                {emiState.yearly.map((year) => (
                  <li key={`year-${year.year}`}>
                    Year {year.year}: Interest {formatCurrency(year.interest)} | Principal{" "}
                    {formatCurrency(year.principal)} | Prepayment {formatCurrency(year.prepayment)}
                  </li>
                ))}
              </ul>

              <h4>Offer Comparison</h4>
              <ul className="finance-list">
                {emiState.offers
                  .sort((a, b) => a.totalPayable - b.totalPayable)
                  .map((offer) => (
                    <li key={offer.lender}>
                      {offer.lender}: EMI {formatCurrency(offer.monthlyEmi)} | Total {formatCurrency(offer.totalPayable)}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "apply" ? (
        <section className="finance-section">
          <div className="finance-section-header">
            <h2>Apply for Assistance</h2>
            <p>Real document upload + consent capture + backend lead creation.</p>
          </div>

          <form className="finance-form" onSubmit={handleLeadSubmit}>
            <label>
              Full Name
              <input
                type="text"
                value={leadForm.fullName}
                onChange={(event) => setLeadForm((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>
            <label>
              Phone (10 digits)
              <input
                type="tel"
                value={leadForm.phone}
                onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label>
              Loan Category
              <select
                value={leadForm.loanCategory}
                onChange={(event) => setLeadForm((current) => ({ ...current, loanCategory: event.target.value }))}
              >
                {LOAN_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Required Amount (INR)
              <input
                type="number"
                value={leadForm.amount}
                onChange={(event) => setLeadForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>
            <label>
              Preferred Interest (%)
              <input
                type="number"
                step="0.01"
                value={leadForm.preferredInterestRate}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, preferredInterestRate: event.target.value }))
                }
              />
            </label>
            <label>
              Preferred Tenure (months)
              <input
                type="number"
                value={leadForm.preferredTenureMonths}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, preferredTenureMonths: event.target.value }))
                }
              />
            </label>
            <label>
              District
              <select
                value={leadForm.district}
                onChange={(event) => setLeadForm((current) => ({ ...current, district: event.target.value }))}
              >
                {SOUTH_KERALA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred Institution
              <select
                value={leadForm.institutionId}
                onChange={(event) => {
                  setLeadForm((current) => ({ ...current, institutionId: event.target.value }));
                  setInstitutionDashboardId(event.target.value);
                }}
              >
                <option value="">Auto-match institution</option>
                {institutions.map((institution) => (
                  <option key={institution._id} value={institution._id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred Callback
              <select
                value={leadForm.callbackWindow}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, callbackWindow: event.target.value }))
                }
              >
                <option value="today-evening">Today evening</option>
                <option value="tomorrow-morning">Tomorrow morning</option>
                <option value="tomorrow-evening">Tomorrow evening</option>
              </select>
            </label>
            <label>
              Document Notes
              <textarea
                rows={3}
                value={leadForm.documentNotes}
                onChange={(event) => setLeadForm((current) => ({ ...current, documentNotes: event.target.value }))}
                placeholder="Add context for documents or missing files."
              />
            </label>

            {DOCUMENT_FIELDS.map((docField) => (
              <label key={docField.key}>
                {docField.label}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) =>
                    setDocumentsByCategory((current) => ({
                      ...current,
                      [docField.key]: Array.from(event.target.files || []),
                    }))
                  }
                />
              </label>
            ))}

            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.whatsappOptIn}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, whatsappOptIn: event.target.checked }))
                }
              />
              Enable WhatsApp callback integration
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.consentPrivacy}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, consentPrivacy: event.target.checked }))
                }
              />
              I consent to data processing as per privacy policy.
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.consentKyc}
                onChange={(event) => setLeadForm((current) => ({ ...current, consentKyc: event.target.checked }))}
              />
              I consent to secure KYC document storage and verification workflow.
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.consentDisclaimer}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, consentDisclaimer: event.target.checked }))
                }
              />
              I understand that approval is not guaranteed and is decided by lender underwriting.
            </label>

            <button type="submit" disabled={leadState.loading}>
              {leadState.loading ? "Submitting..." : "Submit Loan Enquiry"}
            </button>
          </form>

          {leadState.error ? <p className="finance-error">{leadState.error}</p> : null}
          {leadState.success ? (
            <p className="finance-status">
              {leadState.success} {leadState.consentAt ? `Consent timestamp: ${leadState.consentAt}` : ""}
            </p>
          ) : null}

          <div className="finance-compliance-banner">
            <strong>Compliance and Trust:</strong> We operate as an assistance and facilitation platform.
            Loan approval is solely lender-dependent. <a href="/PRIVACY_POLICY.html">Privacy Policy</a> |
            RBI/NBFC/bank disclaimer applies.
          </div>
        </section>
      ) : null}

      {activeTab === "track" ? (
        <section className="finance-section">
          <div className="finance-section-header">
            <h2>Tracking & Workflow Dashboards</h2>
            <p>User, consultant, admin, institution and commission workflows in one place.</p>
          </div>

          <div className="finance-filter-row">
            <label>
              Track by Phone
              <input
                type="tel"
                value={trackPhone}
                onChange={(event) => setTrackPhone(event.target.value)}
                placeholder="10 digit phone"
              />
            </label>
            <button type="button" onClick={handleTrackFetch}>
              Load User Dashboard
            </button>
          </div>
          {trackLoadError ? <p className="finance-error">{trackLoadError}</p> : null}

          {userDashboard ? (
            <article className="finance-panel">
              <h3>User Loan Dashboard</h3>
              <p>Total Leads: {userDashboard.totalLeads}</p>
              <div className="finance-tag-row">
                {Object.entries(userDashboard.statusCounts || {}).map(([status, count]) => (
                  <span key={status}>
                    {status}: {count}
                  </span>
                ))}
              </div>
              <ul className="finance-list">
                {(leadHistory || []).map((lead) => (
                  <li key={lead.leadId}>
                    <strong>{lead.leadId}</strong> | {lead.loanCategory} | {formatCurrency(lead.amount)} |{" "}
                    {lead.status}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          <div className="finance-chip-row">
            <button type="button" onClick={() => setWorkflowRole("user")}>
              User
            </button>
            {canUseConsultantWorkflow ? (
              <button type="button" onClick={() => setWorkflowRole("consultant")}>
                Consultant
              </button>
            ) : null}
            {canUseAdminWorkflow ? (
              <button type="button" onClick={() => setWorkflowRole("admin")}>
                Admin
              </button>
            ) : null}
            {canUseInstitutionWorkflow ? (
              <button type="button" onClick={() => setWorkflowRole("institution")}>
                Institution
              </button>
            ) : null}
            {canUseCommissionWorkflow ? (
              <button type="button" onClick={() => setWorkflowRole("commission")}>
                Commission
              </button>
            ) : null}
          </div>

          {workflowRole === "consultant" && canUseConsultantWorkflow ? (
            <article className="finance-panel">
              <h3>Consultant Dashboard</h3>
              <div className="finance-filter-row">
                <label>
                  Consultant ID
                  <input
                    type="text"
                    value={consultantId}
                    onChange={(event) => {
                      setConsultantId(event.target.value);
                      setAssignmentForm((current) => ({ ...current, consultantId: event.target.value }));
                    }}
                  />
                </label>
                <button type="button" onClick={loadConsultantDashboard}>
                  Load Consultant Dashboard
                </button>
              </div>

              <form className="finance-form" onSubmit={handleAssignmentSubmit}>
                <h4>Assign Consultant to Lead</h4>
                <label>
                  Lead ID
                  <input
                    type="text"
                    value={assignmentForm.leadId}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({ ...current, leadId: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Consultant Name
                  <input
                    type="text"
                    value={assignmentForm.consultantName}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({ ...current, consultantName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Consultant Phone
                  <input
                    type="tel"
                    value={assignmentForm.consultantPhone}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({ ...current, consultantPhone: event.target.value }))
                    }
                  />
                </label>
                <button type="submit">Assign</button>
              </form>

              <form className="finance-form" onSubmit={handleStatusSubmit}>
                <h4>Update Lead Status</h4>
                <label>
                  Lead ID
                  <input
                    type="text"
                    value={statusForm.leadId}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, leadId: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={statusForm.status}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="documents_pending">Documents Pending</option>
                    <option value="consultant_assigned">Consultant Assigned</option>
                    <option value="in_review">In Review</option>
                    <option value="submitted_to_institution">Submitted to Institution</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="disbursed">Disbursed</option>
                  </select>
                </label>
                <label>
                  Note
                  <input
                    type="text"
                    value={statusForm.note}
                    onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>
                <button type="submit">Update Status</button>
              </form>

              {consultantDashboard ? (
                <div className="finance-result">
                  <p>Assigned Leads: {consultantDashboard.assignedLeads}</p>
                  <div className="finance-tag-row">
                    {Object.entries(consultantDashboard.statusCounts || {}).map(([status, count]) => (
                      <span key={status}>
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ) : null}

          {workflowRole === "admin" && canUseAdminWorkflow ? (
            <article className="finance-panel">
              <h3>Admin Lead Management</h3>
              <div className="finance-tag-row">
                <span>Total Leads: {adminDashboard?.metrics?.totalLeads || 0}</span>
                <span>Open Leads: {adminDashboard?.metrics?.openLeads || 0}</span>
                <span>Disbursed: {adminDashboard?.metrics?.disbursedLeads || 0}</span>
                <span>Deletion Requests: {adminDashboard?.metrics?.pendingDeletionRequests || 0}</span>
              </div>
              <form className="finance-form" onSubmit={handleCommissionSubmit}>
                <h4>Update Commission</h4>
                <label>
                  Lead ID
                  <input
                    type="text"
                    value={commissionForm.leadId}
                    onChange={(event) =>
                      setCommissionForm((current) => ({ ...current, leadId: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Actual Amount
                  <input
                    type="number"
                    value={commissionForm.actualAmount}
                    onChange={(event) =>
                      setCommissionForm((current) => ({ ...current, actualAmount: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={commissionForm.status}
                    onChange={(event) =>
                      setCommissionForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="eligible">Eligible</option>
                    <option value="paid">Paid</option>
                  </select>
                </label>
                <button type="submit">Save Commission</button>
              </form>

              <h4>Admin Audit Log</h4>
              <ul className="finance-list">
                {auditLogs.map((log) => (
                  <li key={log._id}>
                    {new Date(log.timestamp || log.createdAt).toLocaleString()} | {log.actionType} |{" "}
                    {log.leadId || "-"}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          {workflowRole === "institution" && canUseInstitutionWorkflow ? (
            <article className="finance-panel">
              <h3>Institution Dashboard</h3>
              <div className="finance-filter-row">
                <label>
                  Institution
                  <select
                    value={institutionDashboardId}
                    onChange={(event) => setInstitutionDashboardId(event.target.value)}
                  >
                    <option value="">Select institution</option>
                    {institutions.map((institution) => (
                      <option key={institution._id} value={institution._id}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={loadInstitutionDashboard}>
                  Load Institution Dashboard
                </button>
              </div>
              {institutionDashboard ? (
                <div className="finance-result">
                  <p>Total Leads: {institutionDashboard.totalLeads}</p>
                  <p>Approved: {institutionDashboard.approvedCount}</p>
                  <p>Conversion Rate: {institutionDashboard.conversionRate}%</p>
                </div>
              ) : null}
            </article>
          ) : null}

          {workflowRole === "commission" && canUseCommissionWorkflow ? (
            <article className="finance-panel">
              <h3>Commission Dashboard</h3>
              <p>
                Expected: {formatCurrency(commissionDashboard?.totals?.expected || 0)} | Actual:{" "}
                {formatCurrency(commissionDashboard?.totals?.actual || 0)} | Paid:{" "}
                {formatCurrency(commissionDashboard?.totals?.paid || 0)}
              </p>
              <ul className="finance-list">
                {(commissionDashboard?.byInstitution || []).map((row) => (
                  <li key={row.institutionName}>
                    {row.institutionName}: Leads {row.leadCount}, Expected {formatCurrency(row.expected)}, Paid{" "}
                    {formatCurrency(row.paid)}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          <article className="finance-panel">
            <h3>Data Deletion Request</h3>
            <p className="finance-muted">For compliance and privacy rights under data protection norms.</p>
            <label>
              Reason
              <textarea
                rows={2}
                value={dataDeletionReason}
                onChange={(event) => setDataDeletionReason(event.target.value)}
              />
            </label>
            <button type="button" onClick={handleDataDeletionRequest}>
              Submit Data Deletion Request
            </button>
          </article>

          {workflowMessage ? <p className="finance-status">{workflowMessage}</p> : null}
        </section>
      ) : null}

      {activeTab === "schemes" ? (
        <section className="finance-section">
          <div className="finance-section-header">
            <h2>Government Scheme Hub</h2>
            <p>Detailed scheme cards with eligibility, amount, docs, benefit and support action.</p>
          </div>
          <div className="finance-card-grid">
            {GOVERNMENT_SCHEMES.map((scheme) => (
              <article key={scheme.id} className="finance-card">
                <h3>{scheme.name}</h3>
                <p>
                  <strong>Eligibility:</strong> {scheme.eligibility}
                </p>
                <p>
                  <strong>Max Amount:</strong> {scheme.maxAmount}
                </p>
                <p>
                  <strong>Documents:</strong> {scheme.documents}
                </p>
                <p>
                  <strong>Benefit:</strong> {scheme.benefit}
                </p>
                <button type="button" onClick={() => openApplyWithScheme(scheme.categoryHint)}>
                  Apply Support
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <button type="button" className="finance-floating-apply" onClick={() => setActiveTab("apply")}>
        Apply Now
      </button>
    </div>
  );
};

export default FinanceHub;
