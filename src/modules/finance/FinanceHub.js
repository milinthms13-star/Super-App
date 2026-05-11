import React, { useMemo, useState } from "react";
import "./FinanceHub.css";

const SOUTH_KERALA_DISTRICTS = [
  "Kollam",
  "Trivandrum",
  "Alappuzha",
  "Kottayam",
  "Pathanamthitta",
];

const LOAN_CATEGORIES = [
  {
    id: "business",
    title: "Business Loans",
    summary: "PM Mudra, MSME, startup, working capital, expansion, machinery finance.",
    examples: ["PM Mudra", "Working Capital", "Machinery Finance"],
  },
  {
    id: "personal",
    title: "Personal Loans",
    summary: "Salaried, self-employed, emergency and medical-focused support.",
    examples: ["Salaried", "Emergency", "Medical"],
  },
  {
    id: "gold",
    title: "Gold Loans",
    summary: "Compare institutions, rates, renewal reminders and auction safety alerts.",
    examples: ["Rate Compare", "Renewal Reminder", "Auction Alert"],
  },
  {
    id: "home",
    title: "Home Loans",
    summary: "New home purchase, construction, renovation and balance transfer.",
    examples: ["New Home", "Construction", "Balance Transfer"],
  },
  {
    id: "vehicle",
    title: "Vehicle Loans",
    summary: "Car, bike and commercial vehicle finance with repayment planning.",
    examples: ["Car Loan", "Bike Loan", "Commercial Vehicle"],
  },
  {
    id: "education",
    title: "Education Loans",
    summary: "India and abroad study financing with documentation guidance.",
    examples: ["India Study", "Abroad Study", "Moratorium Support"],
  },
  {
    id: "agriculture",
    title: "Agriculture Loans",
    summary: "Farming, equipment, dairy and poultry growth assistance.",
    examples: ["Equipment", "Dairy", "Poultry"],
  },
  {
    id: "women",
    title: "Women Entrepreneur Loans",
    summary: "Government and subsidy-linked schemes for women-led ventures.",
    examples: ["Subsidy Scheme", "Women Startup", "Micro Enterprise"],
  },
];

const INSTITUTIONS = [
  {
    id: "inst-kerala-bank",
    name: "Kerala Community Bank",
    type: "bank",
    districts: ["Kollam", "Trivandrum", "Alappuzha", "Kottayam"],
    loanCategories: ["business", "personal", "home", "vehicle"],
    interestRange: "8.90% - 13.75%",
    turnaround: "3-7 working days",
    highlights: ["MSME desk", "Women entrepreneur cell", "Doorstep document pickup"],
  },
  {
    id: "inst-microcapital",
    name: "MicroCapital South",
    type: "microfinance",
    districts: ["Kollam", "Pathanamthitta", "Kottayam"],
    loanCategories: ["women", "agriculture", "business", "personal"],
    interestRange: "12.50% - 20.00%",
    turnaround: "2-5 working days",
    highlights: ["Small-ticket loans", "Group support model", "Rural operations team"],
  },
  {
    id: "inst-trivandrum-nbfc",
    name: "Trivandrum NBFC Network",
    type: "nbfc",
    districts: ["Trivandrum", "Kollam", "Alappuzha"],
    loanCategories: ["gold", "vehicle", "personal", "education"],
    interestRange: "9.75% - 18.50%",
    turnaround: "24-72 hours",
    highlights: ["Fast processing", "Gold renewal reminders", "Digital application support"],
  },
  {
    id: "inst-coop-credit",
    name: "Co-op Credit Union Kerala",
    type: "co-operative",
    districts: ["Alappuzha", "Kottayam", "Pathanamthitta"],
    loanCategories: ["agriculture", "home", "education", "business"],
    interestRange: "8.50% - 12.95%",
    turnaround: "4-8 working days",
    highlights: ["Local branch network", "District promotion offers", "Farmer support desk"],
  },
];

const GOVERNMENT_SCHEMES = [
  "PM Mudra Yojana",
  "Stand-Up India",
  "PMEGP",
  "Credit Guarantee Fund Trust for Micro and Small Enterprises",
  "Kerala State Women Development backed schemes",
];

const SUCCESS_STORIES = [
  {
    id: "story-1",
    title: "Bakery expansion in Kottayam",
    summary: "Working-capital support enabled a second outlet in 4 months.",
  },
  {
    id: "story-2",
    title: "Nursing student education support",
    summary: "A blended education loan helped cover tuition and hostel costs.",
  },
  {
    id: "story-3",
    title: "Commercial auto finance in Kollam",
    summary: "Vehicle loan assistance helped transition from rental to ownership.",
  },
];

const INITIAL_ELIGIBILITY_FORM = {
  income: "",
  employment: "salaried",
  businessType: "",
  district: "Trivandrum",
  requiredAmount: "",
  cibilRange: "700-749",
};

const INITIAL_EMI_FORM = {
  principal: "",
  annualInterest: "",
  tenureMonths: "36",
};

const INITIAL_LEAD_FORM = {
  fullName: "",
  phone: "",
  district: "Trivandrum",
  loanCategory: "business",
  amount: "",
  institutionId: "",
  documentNotes: "",
  callbackWindow: "today-evening",
  consentPrivacy: false,
  consentKyc: false,
  consentDisclaimer: false,
};

const CALLBACK_WINDOWS = [
  { id: "today-evening", label: "Today evening" },
  { id: "tomorrow-morning", label: "Tomorrow morning" },
  { id: "tomorrow-evening", label: "Tomorrow evening" },
];

const getApprovalChanceLabel = (score) => {
  if (score >= 80) {
    return "High";
  }
  if (score >= 60) {
    return "Medium";
  }
  return "Needs improvement";
};

const calculateMonthlyEmi = (principal, annualRate, tenureMonths) => {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    return principal / tenureMonths;
  }
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
  const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
  return denominator ? numerator / denominator : 0;
};

const buildAssistantReply = (query = "") => {
  const normalized = String(query).toLowerCase();

  if (normalized.includes("5 lakh") || normalized.includes("500000")) {
    return "For Rs 5 lakh, focus on business, personal, or gold-backed options. Keep income proof, KYC, bank statement, and repayment plan ready.";
  }
  if (normalized.includes("docs") || normalized.includes("document")) {
    return "Typical docs: ID proof, address proof, income proof, bank statement, and purpose-specific docs. Some institutions ask for collateral or guarantor details.";
  }
  if (normalized.includes("best loan")) {
    return "Best loan depends on purpose + repayment comfort. Compare interest, processing fee, tenure flexibility, and pre-closure terms before applying.";
  }
  if (normalized.includes("cibil")) {
    return "For stronger approvals, target CIBIL above 700, keep utilization lower, avoid missed EMIs, and maintain a clean repayment track.";
  }

  return "I can help with loan type selection, required documents, approval readiness, and South Kerala institution matching.";
};

const FinanceHub = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [eligibilityForm, setEligibilityForm] = useState(INITIAL_ELIGIBILITY_FORM);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [emiForm, setEmiForm] = useState(INITIAL_EMI_FORM);
  const [emiResult, setEmiResult] = useState(null);
  const [leadForm, setLeadForm] = useState(INITIAL_LEAD_FORM);
  const [leadStatus, setLeadStatus] = useState("");
  const [leadHistory, setLeadHistory] = useState([]);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantReply, setAssistantReply] = useState(
    "Ask me: Which loan is best for me? Can I get Rs 5 lakh? What documents are needed?"
  );

  const filteredCategories = useMemo(
    () =>
      LOAN_CATEGORIES.filter((category) =>
        `${category.title} ${category.summary}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm]
  );

  const filteredInstitutions = useMemo(() => {
    return INSTITUTIONS.filter((institution) => {
      const matchesDistrict =
        districtFilter === "all" || institution.districts.includes(districtFilter);
      const matchesType =
        institutionTypeFilter === "all" || institution.type === institutionTypeFilter;
      const matchesCategory =
        selectedCategory === "all" || institution.loanCategories.includes(selectedCategory);
      const matchesSearch =
        `${institution.name} ${institution.highlights.join(" ")} ${institution.loanCategories.join(" ")}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesDistrict && matchesType && matchesCategory && matchesSearch;
    });
  }, [districtFilter, institutionTypeFilter, searchTerm, selectedCategory]);

  const handleEligibilitySubmit = (event) => {
    event.preventDefault();
    const monthlyIncome = Number(eligibilityForm.income || 0);
    const requiredAmount = Number(eligibilityForm.requiredAmount || 0);

    if (!monthlyIncome || !requiredAmount) {
      setEligibilityResult({
        error: "Enter valid monthly income and required loan amount.",
      });
      return;
    }

    const cibilBand = eligibilityForm.cibilRange;
    const cibilScoreMap = {
      "750+": 35,
      "700-749": 25,
      "650-699": 15,
      "below-650": 5,
    };
    const employmentScore =
      eligibilityForm.employment === "salaried"
        ? 22
        : eligibilityForm.employment === "self-employed"
          ? 18
          : 14;
    const affordabilityScore = Math.max(5, Math.min(35, (monthlyIncome / requiredAmount) * 250));
    const totalScore = Math.round(
      cibilScoreMap[cibilBand] + employmentScore + affordabilityScore
    );

    const suggestedLoanTypes = [];
    if (eligibilityForm.employment === "salaried") {
      suggestedLoanTypes.push("Personal Loans", "Home Loans", "Vehicle Loans");
    }
    if (eligibilityForm.employment === "self-employed") {
      suggestedLoanTypes.push("Business Loans", "Working Capital", "Gold Loans");
    }
    if (eligibilityForm.businessType) {
      suggestedLoanTypes.push("MSME Loans", "Women Entrepreneur Loans");
    }
    if (requiredAmount <= 500000) {
      suggestedLoanTypes.push("PM Mudra");
    } else {
      suggestedLoanTypes.push("Structured Institutional Loans");
    }

    const matchingInstitutions = INSTITUTIONS.filter((institution) =>
      institution.districts.includes(eligibilityForm.district)
    ).map((institution) => institution.name);

    setEligibilityResult({
      score: totalScore,
      approvalChance: getApprovalChanceLabel(totalScore),
      suggestedLoanTypes: Array.from(new Set(suggestedLoanTypes)),
      matchingInstitutions,
    });
  };

  const handleEmiCalculate = (event) => {
    event.preventDefault();
    const principal = Number(emiForm.principal || 0);
    const annualInterest = Number(emiForm.annualInterest || 0);
    const tenureMonths = Number(emiForm.tenureMonths || 0);

    if (!principal || !annualInterest || !tenureMonths) {
      setEmiResult({ error: "Provide principal, annual interest, and tenure." });
      return;
    }

    const monthlyEmi = calculateMonthlyEmi(principal, annualInterest, tenureMonths);
    const totalPayable = monthlyEmi * tenureMonths;
    const totalInterest = totalPayable - principal;

    setEmiResult({
      monthlyEmi,
      totalPayable,
      totalInterest,
    });
  };

  const handleLeadSubmit = (event) => {
    event.preventDefault();

    if (!leadForm.consentPrivacy || !leadForm.consentKyc || !leadForm.consentDisclaimer) {
      setLeadStatus("Please accept privacy, KYC consent, and loan disclaimer before submitting.");
      return;
    }

    if (!leadForm.fullName.trim() || !leadForm.phone.trim() || !leadForm.amount) {
      setLeadStatus("Enter full name, phone number, and required amount.");
      return;
    }

    const selectedInstitution = INSTITUTIONS.find(
      (institution) => institution.id === leadForm.institutionId
    );
    const requestId = `FIN-${Date.now().toString().slice(-6)}`;
    const statusEntry = {
      requestId,
      applicant: leadForm.fullName.trim(),
      district: leadForm.district,
      category: LOAN_CATEGORIES.find((item) => item.id === leadForm.loanCategory)?.title || "Loan",
      institution: selectedInstitution?.name || "To be matched",
      stage: "Lead received",
    };

    setLeadHistory((current) => [statusEntry, ...current].slice(0, 6));
    setLeadStatus(
      `${requestId} created. Consultant follow-up is scheduled for ${leadForm.callbackWindow}.`
    );
    setLeadForm(INITIAL_LEAD_FORM);
  };

  const handleAssistantAsk = (event) => {
    event.preventDefault();
    const reply = buildAssistantReply(assistantQuestion);
    setAssistantReply(reply);
  };

  return (
    <div className="finance-hub-page">
      <section className="finance-hero">
        <div>
          <p className="finance-kicker">Nila Finance Hub</p>
          <h1>Loan guidance, financial support and institution connectivity</h1>
          <p className="finance-subtitle">
            Personal, business, MSME, gold, vehicle, education, home, and women-focused financing
            in one South Kerala-ready marketplace.
          </p>
        </div>
        <div className="finance-hero-tools">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search loan type, institution, or scheme..."
          />
          <div className="finance-chip-row">
            <button type="button" onClick={() => setSelectedCategory("all")}>
              All categories
            </button>
            <button type="button" onClick={() => setSelectedCategory("business")}>
              Business focus
            </button>
            <button type="button" onClick={() => setSelectedCategory("personal")}>
              Personal focus
            </button>
          </div>
        </div>
      </section>

      <section className="finance-compliance-banner">
        <strong>Compliance note:</strong> Loan approval depends on institution policies and
        underwriting checks. Nila Finance Hub operates as a loan assistance and financial service
        platform, not as a licensed bank.
      </section>

      <section className="finance-section">
        <div className="finance-section-header">
          <h2>Loan Categories</h2>
          <p>Card-based guidance for major financial service demand in South Kerala.</p>
        </div>
        <div className="finance-card-grid">
          {filteredCategories.map((category) => (
            <article key={category.id} className="finance-card">
              <h3>{category.title}</h3>
              <p>{category.summary}</p>
              <div className="finance-tag-row">
                {category.examples.map((example) => (
                  <span key={`${category.id}-${example}`}>{example}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="finance-dual-grid">
        <article className="finance-panel">
          <h2>Loan Eligibility Checker</h2>
          <form className="finance-form" onSubmit={handleEligibilitySubmit}>
            <label>
              Monthly income (INR)
              <input
                type="number"
                value={eligibilityForm.income}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, income: event.target.value }))
                }
              />
            </label>
            <label>
              Employment profile
              <select
                value={eligibilityForm.employment}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, employment: event.target.value }))
                }
              >
                <option value="salaried">Salaried</option>
                <option value="self-employed">Self-employed</option>
                <option value="business-owner">Business owner</option>
              </select>
            </label>
            <label>
              Business type (optional)
              <input
                type="text"
                value={eligibilityForm.businessType}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, businessType: event.target.value }))
                }
                placeholder="Retail, services, manufacturing..."
              />
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
              Required amount (INR)
              <input
                type="number"
                value={eligibilityForm.requiredAmount}
                onChange={(event) =>
                  setEligibilityForm((current) => ({
                    ...current,
                    requiredAmount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              CIBIL range
              <select
                value={eligibilityForm.cibilRange}
                onChange={(event) =>
                  setEligibilityForm((current) => ({ ...current, cibilRange: event.target.value }))
                }
              >
                <option value="750+">750+</option>
                <option value="700-749">700-749</option>
                <option value="650-699">650-699</option>
                <option value="below-650">Below 650</option>
              </select>
            </label>
            <button type="submit">Check eligibility</button>
          </form>

          {eligibilityResult ? (
            <div className="finance-result">
              {eligibilityResult.error ? (
                <p className="finance-error">{eligibilityResult.error}</p>
              ) : (
                <>
                  <p>
                    Estimated approval readiness:{" "}
                    <strong>{eligibilityResult.approvalChance}</strong> ({eligibilityResult.score}/100)
                  </p>
                  <p>Suggested loans: {eligibilityResult.suggestedLoanTypes.join(", ")}</p>
                  <p>Matching institutions: {eligibilityResult.matchingInstitutions.join(", ")}</p>
                </>
              )}
            </div>
          ) : null}
        </article>

        <article className="finance-panel">
          <h2>Loan EMI Calculator</h2>
          <form className="finance-form" onSubmit={handleEmiCalculate}>
            <label>
              Principal amount (INR)
              <input
                type="number"
                value={emiForm.principal}
                onChange={(event) =>
                  setEmiForm((current) => ({ ...current, principal: event.target.value }))
                }
              />
            </label>
            <label>
              Annual interest rate (%)
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
            <button type="submit">Calculate EMI</button>
          </form>

          {emiResult ? (
            <div className="finance-result">
              {emiResult.error ? (
                <p className="finance-error">{emiResult.error}</p>
              ) : (
                <>
                  <p>
                    Monthly EMI: <strong>Rs {emiResult.monthlyEmi.toFixed(2)}</strong>
                  </p>
                  <p>Total payable: Rs {emiResult.totalPayable.toFixed(2)}</p>
                  <p>Total interest: Rs {emiResult.totalInterest.toFixed(2)}</p>
                </>
              )}
            </div>
          ) : null}
        </article>
      </section>

      <section className="finance-section">
        <div className="finance-section-header">
          <h2>Institution Marketplace</h2>
          <p>Compare banks, NBFCs, co-operatives and microfinance options by district.</p>
        </div>
        <div className="finance-filter-row">
          <label>
            District
            <select
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            >
              <option value="all">All districts</option>
              {SOUTH_KERALA_DISTRICTS.map((district) => (
                <option key={`district-${district}`} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label>
            Institution type
            <select
              value={institutionTypeFilter}
              onChange={(event) => setInstitutionTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="bank">Banks</option>
              <option value="nbfc">NBFCs</option>
              <option value="co-operative">Co-operative banks</option>
              <option value="microfinance">Microfinance institutions</option>
            </select>
          </label>
        </div>
        <div className="finance-card-grid">
          {filteredInstitutions.map((institution) => (
            <article className="finance-card" key={institution.id}>
              <h3>{institution.name}</h3>
              <p>
                <strong>Type:</strong> {institution.type}
              </p>
              <p>
                <strong>Interest:</strong> {institution.interestRange}
              </p>
              <p>
                <strong>Turnaround:</strong> {institution.turnaround}
              </p>
              <p>
                <strong>Districts:</strong> {institution.districts.join(", ")}
              </p>
              <div className="finance-tag-row">
                {institution.highlights.map((point) => (
                  <span key={`${institution.id}-${point}`}>{point}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="finance-dual-grid">
        <article className="finance-panel">
          <h2>Apply for Assistance</h2>
          <form className="finance-form" onSubmit={handleLeadSubmit}>
            <label>
              Full name
              <input
                type="text"
                value={leadForm.fullName}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                value={leadForm.phone}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>
            <label>
              Loan category
              <select
                value={leadForm.loanCategory}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, loanCategory: event.target.value }))
                }
              >
                {LOAN_CATEGORIES.map((category) => (
                  <option key={`lead-${category.id}`} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Required amount (INR)
              <input
                type="number"
                value={leadForm.amount}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <label>
              District
              <select
                value={leadForm.district}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, district: event.target.value }))
                }
              >
                {SOUTH_KERALA_DISTRICTS.map((district) => (
                  <option key={`lead-district-${district}`} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred institution
              <select
                value={leadForm.institutionId}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, institutionId: event.target.value }))
                }
              >
                <option value="">Auto-match institution</option>
                {filteredInstitutions.map((institution) => (
                  <option key={`lead-inst-${institution.id}`} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Document notes
              <textarea
                value={leadForm.documentNotes}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, documentNotes: event.target.value }))
                }
                placeholder="PAN, Aadhaar, bank statement, salary slip, GST, collateral details..."
                rows={3}
              />
            </label>
            <label>
              Preferred callback slot
              <select
                value={leadForm.callbackWindow}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, callbackWindow: event.target.value }))
                }
              >
                {CALLBACK_WINDOWS.map((windowOption) => (
                  <option key={windowOption.id} value={windowOption.id}>
                    {windowOption.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.consentPrivacy}
                onChange={(event) =>
                  setLeadForm((current) => ({
                    ...current,
                    consentPrivacy: event.target.checked,
                  }))
                }
              />
              I consent to data processing and privacy policy for loan assistance.
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.consentKyc}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, consentKyc: event.target.checked }))
                }
              />
              I agree to KYC/document verification by assigned consultant/institution.
            </label>
            <label className="finance-consent">
              <input
                type="checkbox"
                checked={leadForm.consentDisclaimer}
                onChange={(event) =>
                  setLeadForm((current) => ({
                    ...current,
                    consentDisclaimer: event.target.checked,
                  }))
                }
              />
              I understand loan approval depends on institution policy and underwriting.
            </label>
            <button type="submit">Request assistance</button>
          </form>
          {leadStatus ? <p className="finance-status">{leadStatus}</p> : null}
        </article>

        <article className="finance-panel">
          <h2>Lead Tracking</h2>
          {leadHistory.length === 0 ? (
            <p className="finance-muted">
              No requests yet. Submit one to see consultant assignment and status updates.
            </p>
          ) : (
            <ul className="finance-list">
              {leadHistory.map((entry) => (
                <li key={entry.requestId}>
                  <strong>{entry.requestId}</strong> - {entry.applicant} - {entry.category}
                  <br />
                  <span>
                    {entry.district} | {entry.institution} | Stage: {entry.stage}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h3>Service Flow</h3>
          <div className="finance-flow-grid">
            <div>
              <h4>User Side</h4>
              <ul>
                <li>Select loan type and amount</li>
                <li>Upload document details</li>
                <li>Choose institution and request support</li>
                <li>Track consultant updates</li>
              </ul>
            </div>
            <div>
              <h4>Consultant Side</h4>
              <ul>
                <li>Verify docs and call customer</li>
                <li>Recommend suitable institutions</li>
                <li>Upload application status</li>
                <li>Schedule branch visit if needed</li>
              </ul>
            </div>
            <div>
              <h4>Admin Side</h4>
              <ul>
                <li>Manage requests and assignments</li>
                <li>Institution onboarding and lead governance</li>
                <li>Commission tracking and analytics</li>
                <li>Premium listing controls</li>
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section className="finance-dual-grid">
        <article className="finance-panel">
          <h2>AI Loan Assistant</h2>
          <form className="finance-form" onSubmit={handleAssistantAsk}>
            <label>
              Ask your question
              <input
                type="text"
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="Which loan is best for me?"
              />
            </label>
            <button type="submit">Ask assistant</button>
          </form>
          <p className="finance-assistant-reply">{assistantReply}</p>
          <div className="finance-tag-row">
            <button type="button" onClick={() => setAssistantQuestion("Can I get Rs 5 lakh?")}>
              Can I get Rs 5 lakh?
            </button>
            <button type="button" onClick={() => setAssistantQuestion("What documents are needed?")}>
              What docs are needed?
            </button>
            <button type="button" onClick={() => setAssistantQuestion("How to improve CIBIL score?")}>
              Improve CIBIL score
            </button>
          </div>
        </article>

        <article className="finance-panel">
          <h2>Govt Schemes, Coverage and Revenue Paths</h2>
          <h3>Government schemes</h3>
          <ul className="finance-list">
            {GOVERNMENT_SCHEMES.map((scheme) => (
              <li key={scheme}>{scheme}</li>
            ))}
          </ul>
          <h3>South Kerala coverage</h3>
          <div className="finance-tag-row">
            {SOUTH_KERALA_DISTRICTS.map((district) => (
              <span key={`coverage-${district}`}>{district}</span>
            ))}
          </div>
          <h3>Monetization model</h3>
          <ul className="finance-list">
            <li>Direct: documentation charges, consultation fee, priority processing</li>
            <li>Partner: referral commission, lead generation fee, institution subscriptions</li>
            <li>Premium listing: top visibility, featured offers, district promotions</li>
          </ul>
        </article>
      </section>

      <section className="finance-section">
        <div className="finance-section-header">
          <h2>Integration Advantage Across Super App</h2>
          <p>Finance workflows connect naturally with your existing ecosystem modules.</p>
        </div>
        <div className="finance-card-grid">
          <article className="finance-card">
            <h3>GlobeMart Sellers</h3>
            <p>Working capital and stock expansion loans mapped to seller performance patterns.</p>
          </article>
          <article className="finance-card">
            <h3>SwiftRide Drivers</h3>
            <p>Vehicle finance and refinancing pathways for commercial mobility operators.</p>
          </article>
          <article className="finance-card">
            <h3>HomeSphere Users</h3>
            <p>Home purchase, construction, renovation, and balance transfer assistance.</p>
          </article>
          <article className="finance-card">
            <h3>TradePost Vendors</h3>
            <p>Business setup and growth loans for marketplace merchants and local businesses.</p>
          </article>
        </div>
      </section>

      <section className="finance-section">
        <div className="finance-section-header">
          <h2>Recently Approved Stories</h2>
          <p>Social proof blocks for trust-building and conversion.</p>
        </div>
        <div className="finance-card-grid">
          {SUCCESS_STORIES.map((story) => (
            <article key={story.id} className="finance-card">
              <h3>{story.title}</h3>
              <p>{story.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FinanceHub;
