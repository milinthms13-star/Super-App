import React, { useEffect, useMemo, useState } from "react";
import { freelancerApi } from "./freelancerApi";
import "./FreelancerMarketplace.css";

const TABS = [
  { id: "hire", label: "Hire Professionals" },
  { id: "post", label: "Post Job" },
  { id: "bookings", label: "My Bookings" },
  { id: "emergency", label: "Emergency" },
  { id: "plans", label: "Provider Plans" },
];

const INITIAL_FILTERS = {
  search: "",
  category: "all",
  location: "all",
  rating: "all",
  experience: "all",
  language: "all",
  budget: "all",
  availability: "all",
  serviceType: "all",
  verifiedOnly: false,
  responseSpeed: "all",
  sortBy: "rating",
};

const INITIAL_JOB_FORM = {
  title: "",
  category: "",
  location: "",
  serviceType: "digital",
  urgency: "medium",
  minBudget: "",
  maxBudget: "",
  requirements: "",
  deadline: "",
  customerName: "",
  customerPhone: "",
};

const INITIAL_BID_FORM = {
  jobId: "",
  providerId: "",
  amount: "",
  timelineDays: "",
  coverLetter: "",
};

const INITIAL_BOOKING_FORM = {
  providerId: "",
  customerName: "",
  customerPhone: "",
  serviceMode: "gig",
  bookingMode: "instant",
  schedule: "",
  notes: "",
  emergency: false,
  totalAmount: "",
};

const INITIAL_QUOTE_FORM = {
  category: "",
  scope: "",
  budget: "",
  urgency: "medium",
  location: "",
  skillLevel: "mid",
  serviceType: "digital",
};

const INITIAL_ONBOARD_FORM = {
  name: "",
  category: "",
  type: "digital",
  district: "",
  serviceAreas: [],
  language: "English",
  languages: ["English"],
  budget: "medium",
  availability: "schedule",
  experience: "",
  responseMinutes: "",
  hourlyRate: "",
  gigStartsFrom: "",
  about: "",
  contactPhone: "",
  contactEmail: "",
};

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const parseMilestones = (value = "") => {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .map((line) => {
      const [title, amountRaw] = line.split("|");
      return {
        title: (title || "").trim(),
        amount: Number((amountRaw || "").trim()),
      };
    })
    .filter((item) => item.title && Number.isFinite(item.amount) && item.amount >= 0);
};

const FreelancerMarketplace = () => {
  const [activeTab, setActiveTab] = useState("hire");
  const [bootstrap, setBootstrap] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState("");

  const [savedProviderIds, setSavedProviderIds] = useState([]);
  const [compareProviderIds, setCompareProviderIds] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobForm, setJobForm] = useState(INITIAL_JOB_FORM);
  const [jobAttachments, setJobAttachments] = useState([]);
  const [bidForm, setBidForm] = useState(INITIAL_BID_FORM);

  const [bookingForm, setBookingForm] = useState(INITIAL_BOOKING_FORM);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [trackPhone, setTrackPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpTargetBooking, setOtpTargetBooking] = useState("");
  const [escrowBookingCode, setEscrowBookingCode] = useState("");
  const [escrowTotalAmount, setEscrowTotalAmount] = useState("");
  const [escrowMilestonesText, setEscrowMilestonesText] = useState("Initial Deposit|5000\nFinal Delivery|5000");
  const [refundReason, setRefundReason] = useState("");
  const [refundBookingCode, setRefundBookingCode] = useState("");
  const [cancelBookingCode, setCancelBookingCode] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelByRole, setCancelByRole] = useState("customer");

  const [disputes, setDisputes] = useState([]);
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("open");
  const [disputeBookingCode, setDisputeBookingCode] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [disputeRole, setDisputeRole] = useState("customer");
  const [disputeAgainstRole, setDisputeAgainstRole] = useState("provider");
  const [disputeProofs, setDisputeProofs] = useState([]);
  const [disputeRaisedByName, setDisputeRaisedByName] = useState("");

  const [quoteForm, setQuoteForm] = useState(INITIAL_QUOTE_FORM);
  const [quoteResult, setQuoteResult] = useState(null);

  const [plans, setPlans] = useState([]);
  const [planPurchases, setPlanPurchases] = useState([]);
  const [selectedPlanProviderId, setSelectedPlanProviderId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("pro");

  const [onboardForm, setOnboardForm] = useState(INITIAL_ONBOARD_FORM);
  const [onboardKycFiles, setOnboardKycFiles] = useState([]);
  const [commissionConfig, setCommissionConfig] = useState(null);
  const [adminDashboard, setAdminDashboard] = useState(null);

  const [reportTargetType, setReportTargetType] = useState("provider");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const categoryOptions = useMemo(() => {
    const digital = bootstrap?.constants?.digitalCategories || [];
    const local = bootstrap?.constants?.localCategories || [];
    return [...digital, ...local];
  }, [bootstrap]);

  const districtOptions = bootstrap?.constants?.districts || [];
  const languageOptions = bootstrap?.constants?.languages || [];
  const emergencyServices = bootstrap?.constants?.emergencyServices || [];

  const loadProviders = async () => {
    setProvidersLoading(true);
    setProvidersError("");
    try {
      const response = await freelancerApi.getProviders({
        search: filters.search,
        category: filters.category,
        location: filters.location,
        rating: filters.rating,
        experience: filters.experience,
        language: filters.language,
        budget: filters.budget,
        availability: filters.availability,
        serviceType: filters.serviceType,
        verifiedOnly: filters.verifiedOnly,
        responseSpeed: filters.responseSpeed,
        sortBy: filters.sortBy,
      });
      setProviders(response?.data?.providers || []);
    } catch (error) {
      setProvidersError(error?.response?.data?.message || "Unable to load professionals.");
    } finally {
      setProvidersLoading(false);
    }
  };

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await freelancerApi.getJobs({ status: "open" });
      setJobs(response?.data?.jobs || []);
    } catch (_error) {
      setStatusMessage("Unable to fetch job posts.");
    } finally {
      setJobsLoading(false);
    }
  };

  const loadDisputes = async () => {
    try {
      const response = await freelancerApi.getDisputes(disputeStatusFilter);
      setDisputes(response?.data?.disputes || []);
    } catch (_error) {
      setStatusMessage("Unable to load disputes.");
    }
  };

  const loadAdminPayload = async () => {
    try {
      const [commissionResponse, adminResponse, plansResponse] = await Promise.all([
        freelancerApi.getCommissionSettings(),
        freelancerApi.getAdminDashboard(),
        freelancerApi.getPlans(),
      ]);
      setCommissionConfig(commissionResponse?.data?.config || null);
      setAdminDashboard(adminResponse?.data || null);
      setPlans(plansResponse?.data?.plans || []);
    } catch (_error) {
      setStatusMessage("Admin panel data could not be loaded.");
    }
  };

  const loadBootstrap = async () => {
    try {
      const response = await freelancerApi.getBootstrap();
      setBootstrap(response?.data || null);
      const allPlans = response?.data?.constants?.subscriptionPlans || [];
      setPlans(allPlans);
      if (allPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(allPlans[0].id);
      }
      const defaultCategory = response?.data?.constants?.digitalCategories?.[0] || "";
      const defaultDistrict = response?.data?.constants?.districts?.[0] || "";
      setJobForm((current) => ({
        ...current,
        category: current.category || defaultCategory,
        location: current.location || defaultDistrict,
      }));
      setQuoteForm((current) => ({
        ...current,
        category: current.category || defaultCategory,
        location: current.location || defaultDistrict,
      }));
      setOnboardForm((current) => ({
        ...current,
        category: current.category || defaultCategory,
        district: current.district || defaultDistrict,
        serviceAreas: current.serviceAreas.length ? current.serviceAreas : defaultDistrict ? [defaultDistrict] : [],
      }));
    } catch (_error) {
      setStatusMessage("Unable to load bootstrap data.");
    }
  };

  useEffect(() => {
    void loadBootstrap();
    void loadProviders();
    void loadJobs();
    void loadAdminPayload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    void loadDisputes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeStatusFilter]);

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const handleProviderProfile = async (providerId) => {
    setProfileLoading(true);
    try {
      const response = await freelancerApi.getProviderById(providerId);
      setSelectedProvider(response?.data?.provider || null);
    } catch (_error) {
      setStatusMessage("Unable to load provider profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleSaveProvider = (providerId) => {
    setSavedProviderIds((current) =>
      current.includes(providerId) ? current.filter((id) => id !== providerId) : [...current, providerId]
    );
  };

  const toggleCompareProvider = (providerId) => {
    setCompareProviderIds((current) => {
      if (current.includes(providerId)) {
        return current.filter((id) => id !== providerId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, providerId];
    });
  };

  const createJobPost = async (event) => {
    event.preventDefault();
    setStatusMessage("");

    if (!jobForm.title.trim()) {
      setStatusMessage("Job title is required.");
      return;
    }
    if (!jobForm.category) {
      setStatusMessage("Job category is required.");
      return;
    }
    if (!jobForm.location) {
      setStatusMessage("Job location is required.");
      return;
    }
    if (!jobForm.requirements.trim()) {
      setStatusMessage("Detailed requirements are required.");
      return;
    }
    const minBudget = Number(jobForm.minBudget || 0);
    const maxBudget = Number(jobForm.maxBudget || 0);
    if (minBudget <= 0 || maxBudget <= 0 || maxBudget < minBudget) {
      setStatusMessage("Budget should include valid min and max values.");
      return;
    }
    if (!/^\d{10}$/.test(jobForm.customerPhone)) {
      setStatusMessage("Customer phone should be 10 digits.");
      return;
    }
    if (!jobForm.deadline) {
      setStatusMessage("Deadline is required.");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(jobForm).forEach(([key, value]) => formData.append(key, value));
      Array.from(jobAttachments).forEach((file) => formData.append("attachments", file));
      await freelancerApi.createJob(formData);
      setStatusMessage("Job posted successfully. Contact is masked in job marketplace.");
      setJobForm((current) => ({
        ...INITIAL_JOB_FORM,
        category: current.category,
        location: current.location,
      }));
      setJobAttachments([]);
      await loadJobs();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Unable to create job post.");
    }
  };

  const submitBid = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    if (!bidForm.jobId || !bidForm.providerId) {
      setStatusMessage("Select both job and provider for bid.");
      return;
    }
    try {
      await freelancerApi.createBid(bidForm.jobId, {
        providerId: bidForm.providerId,
        amount: Number(bidForm.amount),
        timelineDays: Number(bidForm.timelineDays),
        coverLetter: bidForm.coverLetter,
      });
      setStatusMessage("Bid submitted successfully.");
      setBidForm(INITIAL_BID_FORM);
      await loadJobs();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Unable to submit bid.");
    }
  };

  const purchaseLead = async (jobId, providerId) => {
    setStatusMessage("");
    try {
      const response = await freelancerApi.purchaseLead(jobId, providerId);
      setStatusMessage(response?.message || "Lead purchased.");
      await loadProviders();
      await loadJobs();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Lead purchase failed.");
    }
  };

  const createBooking = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    if (!bookingForm.providerId) {
      setStatusMessage("Select a provider for booking.");
      return;
    }
    if (!bookingForm.customerName.trim()) {
      setStatusMessage("Customer name is required.");
      return;
    }
    if (!/^\d{10}$/.test(bookingForm.customerPhone)) {
      setStatusMessage("Customer phone must be 10 digits.");
      return;
    }
    try {
      const response = await freelancerApi.createBooking({
        ...bookingForm,
        totalAmount: Number(bookingForm.totalAmount || 0),
      });
      const bookingCode = response?.data?.booking?.bookingCode;
      setStatusMessage(`${bookingCode} booking created.`);
      setTrackPhone(bookingForm.customerPhone);
      setBookingForm((current) => ({
        ...INITIAL_BOOKING_FORM,
        providerId: current.providerId,
      }));
      await fetchMyBookings(bookingForm.customerPhone);
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Unable to create booking.");
    }
  };

  const fetchMyBookings = async (phoneFromArg = "") => {
    const phone = phoneFromArg || trackPhone;
    setBookingsLoading(true);
    setStatusMessage("");
    if (!/^\d{10}$/.test(phone)) {
      setBookings([]);
      setBookingsLoading(false);
      setStatusMessage("Enter a valid 10 digit phone to load bookings.");
      return;
    }
    try {
      const response = await freelancerApi.getBookings({ phone });
      setBookings(response?.data?.bookings || []);
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Unable to fetch bookings.");
    } finally {
      setBookingsLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!otpTargetBooking) {
      setStatusMessage("Select a booking code for OTP.");
      return;
    }
    try {
      const response = await freelancerApi.sendBookingOtp(otpTargetBooking);
      setStatusMessage(
        `${response?.message || "OTP sent."} Dev OTP: ${response?.data?.devOtp || "n/a"}`
      );
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "OTP generation failed.");
    }
  };

  const verifyOtp = async () => {
    if (!otpTargetBooking || !otpCode) {
      setStatusMessage("Enter booking code and OTP.");
      return;
    }
    try {
      await freelancerApi.verifyBookingOtp(otpTargetBooking, otpCode);
      setStatusMessage("OTP verified. Work can start now.");
      setOtpCode("");
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "OTP verification failed.");
    }
  };

  const initializeEscrow = async () => {
    if (!escrowBookingCode) {
      setStatusMessage("Select a booking code for escrow.");
      return;
    }
    const milestones = parseMilestones(escrowMilestonesText);
    if (!milestones.length) {
      setStatusMessage("Provide valid milestone lines like Title|Amount.");
      return;
    }
    try {
      await freelancerApi.initializeEscrow(escrowBookingCode, {
        totalAmount: Number(escrowTotalAmount || 0),
        milestones,
      });
      setStatusMessage("Escrow initialized and milestones created.");
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Escrow initialization failed.");
    }
  };

  const releaseMilestone = async (bookingCode, index) => {
    try {
      await freelancerApi.releaseMilestone(bookingCode, index);
      setStatusMessage(`Milestone ${index + 1} released.`);
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Milestone release failed.");
    }
  };

  const submitRefund = async () => {
    if (!refundBookingCode || !refundReason.trim()) {
      setStatusMessage("Select booking code and reason for refund request.");
      return;
    }
    try {
      await freelancerApi.requestRefund(refundBookingCode, refundReason.trim());
      setStatusMessage("Refund request submitted.");
      setRefundReason("");
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Refund request failed.");
    }
  };

  const submitCancellation = async () => {
    if (!cancelBookingCode || !cancelReason.trim()) {
      setStatusMessage("Booking code and cancellation reason are required.");
      return;
    }
    try {
      await freelancerApi.cancelBooking(cancelBookingCode, {
        requestedBy: cancelByRole,
        reason: cancelReason.trim(),
      });
      setStatusMessage("Cancellation request submitted with policy applied.");
      setCancelReason("");
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Cancellation failed.");
    }
  };

  const submitDispute = async () => {
    if (!disputeBookingCode || !disputeReason.trim() || !disputeRaisedByName.trim()) {
      setStatusMessage("Booking code, raised by name, and dispute reason are required.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("raisedByRole", disputeRole);
      formData.append("raisedByName", disputeRaisedByName.trim());
      formData.append("raisedAgainstRole", disputeAgainstRole);
      formData.append("reason", disputeReason.trim());
      formData.append("details", disputeDetails.trim());
      Array.from(disputeProofs).forEach((file) => formData.append("proofs", file));
      await freelancerApi.createDispute(disputeBookingCode, formData);
      setStatusMessage("Dispute created with proof upload.");
      setDisputeReason("");
      setDisputeDetails("");
      setDisputeProofs([]);
      await loadDisputes();
      await fetchMyBookings();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Dispute creation failed.");
    }
  };

  const submitQuote = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    if (!quoteForm.category || !quoteForm.location) {
      setStatusMessage("Category and location are required for AI quote.");
      return;
    }
    try {
      const response = await freelancerApi.generateQuote({
        ...quoteForm,
        budget: Number(quoteForm.budget || 0),
      });
      setQuoteResult(response?.data || null);
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "AI quote generation failed.");
    }
  };

  const purchasePlan = async () => {
    if (!selectedPlanProviderId) {
      setStatusMessage("Select provider for plan purchase.");
      return;
    }
    try {
      await freelancerApi.purchasePlan({
        providerId: selectedPlanProviderId,
        planId: selectedPlanId,
        paymentReference: `PLAN-${Date.now()}`,
      });
      setStatusMessage("Plan purchased and provider credits updated.");
      const purchasesResponse = await freelancerApi.getPlanPurchases(selectedPlanProviderId);
      setPlanPurchases(purchasesResponse?.data?.purchases || []);
      await loadProviders();
      await loadAdminPayload();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Plan purchase failed.");
    }
  };

  const onboardProvider = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    if (!onboardForm.name.trim() || !/^\d{10}$/.test(onboardForm.contactPhone)) {
      setStatusMessage("Provider onboarding requires valid name and 10 digit contact phone.");
      return;
    }
    if (!onboardForm.category || !onboardForm.district) {
      setStatusMessage("Provider onboarding requires category and district.");
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(onboardForm).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      });
      Array.from(onboardKycFiles).forEach((file) => formData.append("kycFiles", file));
      await freelancerApi.onboardProvider(formData);
      setStatusMessage("Provider onboarding submitted. KYC pending approval.");
      setOnboardForm((current) => ({
        ...INITIAL_ONBOARD_FORM,
        category: current.category,
        district: current.district,
        serviceAreas: current.serviceAreas,
      }));
      setOnboardKycFiles([]);
      await loadProviders();
      await loadAdminPayload();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Provider onboarding failed.");
    }
  };

  const submitReport = async () => {
    if (!reportTargetId || !reportReason.trim() || !/^\d{10}$/.test(reporterPhone)) {
      setStatusMessage("Report requires target, reason and valid reporter phone.");
      return;
    }
    try {
      await freelancerApi.createReport({
        targetType: reportTargetType,
        targetId: reportTargetId.trim(),
        reportedByName: reporterName.trim(),
        reportedByPhone: reporterPhone,
        reason: reportReason.trim(),
        details: reportDetails.trim(),
      });
      setStatusMessage("Safety report submitted to admin panel.");
      setReportTargetId("");
      setReportReason("");
      setReportDetails("");
      await loadAdminPayload();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Report submission failed.");
    }
  };

  const updateCommissionSettings = async () => {
    if (!commissionConfig) return;
    try {
      await freelancerApi.updateCommissionSettings(commissionConfig);
      setStatusMessage("Commission settings updated.");
      await loadAdminPayload();
    } catch (error) {
      setStatusMessage(error?.response?.data?.message || "Commission settings update failed.");
    }
  };

  const filteredCompareProviders = useMemo(
    () => providers.filter((provider) => compareProviderIds.includes(provider._id)),
    [compareProviderIds, providers]
  );

  const providerListState =
    providersLoading ? "loading" : providersError ? "error" : providers.length === 0 ? "empty" : "ready";

  return (
    <div className="freelancer-marketplace-page">
      <section className="freelancer-sticky-header">
        <div className="freelancer-hero">
          <div>
            <p className="freelancer-kicker">NilaWorks</p>
            <h1>Freelancer + Local Services Production Marketplace</h1>
            <p className="freelancer-subtitle">
              Backend-connected provider discovery, bookings, escrow, OTP start verification,
              bids, disputes, plans, and admin controls.
            </p>
          </div>
          <div className="freelancer-hero-tools">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search professionals..."
            />
            <div className="freelancer-inline-actions">
              <button type="button" onClick={() => setShowFilterDrawer((current) => !current)}>
                {showFilterDrawer ? "Hide Filters" : "Filters"}
              </button>
              <button type="button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="freelancer-tab-row">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {showFilterDrawer ? (
        <section className="freelancer-filter-panel">
          <div className="freelancer-filter-grid">
            <label>
              Category
              <select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              District
              <select
                value={filters.location}
                onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              >
                <option value="all">All districts</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rating
              <select
                value={filters.rating}
                onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))}
              >
                <option value="all">Any rating</option>
                <option value="4.5+">4.5 and above</option>
                <option value="4.8+">4.8 and above</option>
              </select>
            </label>
            <label>
              Experience
              <select
                value={filters.experience}
                onChange={(event) => setFilters((current) => ({ ...current, experience: event.target.value }))}
              >
                <option value="all">Any</option>
                <option value="1-3">1-3 years</option>
                <option value="4-7">4-7 years</option>
                <option value="8+">8+ years</option>
              </select>
            </label>
            <label>
              Language
              <select
                value={filters.language}
                onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}
              >
                <option value="all">All</option>
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Budget
              <select
                value={filters.budget}
                onChange={(event) => setFilters((current) => ({ ...current, budget: event.target.value }))}
              >
                <option value="all">All</option>
                <option value="budget">Budget</option>
                <option value="medium">Medium</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label>
              Availability
              <select
                value={filters.availability}
                onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))}
              >
                <option value="all">All</option>
                <option value="online-now">Online Now</option>
                <option value="instant">Instant</option>
                <option value="schedule">Schedule</option>
              </select>
            </label>
            <label>
              Service Type
              <select
                value={filters.serviceType}
                onChange={(event) => setFilters((current) => ({ ...current, serviceType: event.target.value }))}
              >
                <option value="all">All</option>
                <option value="digital">Digital</option>
                <option value="local">Local</option>
              </select>
            </label>
            <label>
              Response
              <select
                value={filters.responseSpeed}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, responseSpeed: event.target.value }))
                }
              >
                <option value="all">Any</option>
                <option value="under-15">Under 15 min</option>
                <option value="under-30">Under 30 min</option>
              </select>
            </label>
            <label>
              Sort by
              <select
                value={filters.sortBy}
                onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value }))}
              >
                <option value="rating">Rating</option>
                <option value="price-low">Price Low to High</option>
                <option value="price-high">Price High to Low</option>
                <option value="response">Response Time</option>
              </select>
            </label>
            <label className="freelancer-checkbox">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, verifiedOnly: event.target.checked }))
                }
              />
              Verified only
            </label>
          </div>
        </section>
      ) : null}

      {statusMessage ? <p className="freelancer-status">{statusMessage}</p> : null}

      {activeTab === "hire" ? (
        <section className="freelancer-section">
          <div className="freelancer-section-header">
            <h2>Hire Professionals</h2>
            <p>View profile, compare, save, chat/call, reviews, portfolio and service area.</p>
          </div>

          {providerListState === "loading" ? (
            <div className="freelancer-skeleton-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="freelancer-skeleton-card" key={`skeleton-${index}`} />
              ))}
            </div>
          ) : null}
          {providerListState === "error" ? <p className="freelancer-error">{providersError}</p> : null}
          {providerListState === "empty" ? (
            <p className="freelancer-note">No results found. Try relaxing filters.</p>
          ) : null}

          {providerListState === "ready" ? (
            <div className="freelancer-card-grid">
              {providers.map((provider) => (
                <article key={provider._id} className="freelancer-card">
                  <h3>{provider.name}</h3>
                  <p>
                    {provider.category} | {provider.type} | {provider.district}
                  </p>
                  <p>
                    Rating {provider.rating} ({provider.reviewCount} reviews) | Experience {provider.experience} years
                  </p>
                  <p>
                    {formatInr(provider.hourlyRate)} / hr | Starts from {formatInr(provider.gigStartsFrom)}
                  </p>
                  <p>
                    Response {provider.responseMinutes} min | Completion {provider.completionRate}% | Service area{" "}
                    {(provider.serviceAreas || []).join(", ")}
                  </p>
                  <div className="freelancer-tag-row">
                    {(provider.verificationBadges || []).map((badge) => (
                      <span key={`${provider._id}-${badge}`}>{badge}</span>
                    ))}
                  </div>
                  <div className="freelancer-inline-actions">
                    <button type="button" onClick={() => handleProviderProfile(provider._id)}>
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingForm((current) => ({ ...current, providerId: provider._id }));
                        setActiveTab("bookings");
                      }}
                    >
                      Book Now
                    </button>
                    <button type="button" onClick={() => toggleCompareProvider(provider._id)}>
                      Compare
                    </button>
                    <button type="button" onClick={() => toggleSaveProvider(provider._id)}>
                      {savedProviderIds.includes(provider._id) ? "Saved" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusMessage(`Call requested. Masked phone: ${provider.contactPhone ? `******${provider.contactPhone.slice(-4)}` : "hidden"}.`)}
                    >
                      Call
                    </button>
                    <button type="button" onClick={() => setStatusMessage("LinkUp chat initiated with masked contact.")}>
                      Chat
                    </button>
                    <button type="button" onClick={() => handleProviderProfile(provider._id)}>
                      Reviews
                    </button>
                    <button type="button" onClick={() => handleProviderProfile(provider._id)}>
                      Portfolio
                    </button>
                    <button type="button" onClick={() => setStatusMessage(`Service area: ${(provider.serviceAreas || []).join(", ")}`)}>
                      Service Area
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {compareProviderIds.length > 0 ? (
            <article className="freelancer-panel">
              <h3>Compare Providers ({compareProviderIds.length}/3)</h3>
              <div className="freelancer-list-grid">
                {filteredCompareProviders.map((provider) => (
                  <div key={`compare-${provider._id}`} className="freelancer-list-item">
                    <strong>{provider.name}</strong>
                    <p>Rating: {provider.rating}</p>
                    <p>Rate: {formatInr(provider.hourlyRate)}</p>
                    <p>Response: {provider.responseMinutes} min</p>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          <article className="freelancer-panel">
            <h3>AI Quote Generator</h3>
            <form className="freelancer-form" onSubmit={submitQuote}>
              <label>
                Category
                <select
                  value={quoteForm.category}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={`quote-cat-${category}`} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scope
                <textarea
                  rows={3}
                  value={quoteForm.scope}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, scope: event.target.value }))}
                  placeholder="Describe scope, deliverables, constraints and priority."
                />
              </label>
              <label>
                Budget
                <input
                  type="number"
                  value={quoteForm.budget}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, budget: event.target.value }))}
                />
              </label>
              <label>
                Urgency
                <select
                  value={quoteForm.urgency}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, urgency: event.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
              <label>
                District
                <select
                  value={quoteForm.location}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, location: event.target.value }))}
                >
                  <option value="">Select district</option>
                  {districtOptions.map((district) => (
                    <option key={`quote-location-${district}`} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Skill Level
                <select
                  value={quoteForm.skillLevel}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, skillLevel: event.target.value }))}
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
              <label>
                Service Type
                <select
                  value={quoteForm.serviceType}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, serviceType: event.target.value }))}
                >
                  <option value="digital">Digital</option>
                  <option value="local">Local</option>
                </select>
              </label>
              <button type="submit">Generate Quote</button>
            </form>
            {quoteResult ? (
              <div className="freelancer-result">
                <p>
                  Estimated price: {formatInr(quoteResult.priceRange?.min)} -{" "}
                  {formatInr(quoteResult.priceRange?.max)}
                </p>
                <p>
                  Timeline: {quoteResult.recommendedTimelineDays?.min} to{" "}
                  {quoteResult.recommendedTimelineDays?.max} days
                </p>
                <p>Skills: {(quoteResult.recommendedSkills || []).join(", ")}</p>
                <p>
                  Matches: {(quoteResult.matchedProviders || []).map((provider) => provider.name).join(", ") || "No direct matches"}
                </p>
              </div>
            ) : null}
          </article>

          <article className="freelancer-panel">
            <h3>Provider Profile</h3>
            {profileLoading ? <p className="freelancer-note">Loading profile...</p> : null}
            {!profileLoading && selectedProvider ? (
              <div className="freelancer-list-grid">
                <div className="freelancer-list-item">
                  <strong>{selectedProvider.name}</strong>
                  <p>{selectedProvider.about || "No profile summary provided."}</p>
                  <p>
                    Contact protected: {selectedProvider.maskedPhoneEnabled ? "Yes" : "No"} | KYC:{" "}
                    {selectedProvider.kycStatus}
                  </p>
                  <p>
                    Reviews: {selectedProvider.reviewCount} | Rating {selectedProvider.rating}
                  </p>
                  <p>
                    Portfolio items: {(selectedProvider.portfolio || []).length}
                  </p>
                </div>
              </div>
            ) : null}
            {!profileLoading && !selectedProvider ? (
              <p className="freelancer-note">Use View Profile on a provider card to see details.</p>
            ) : null}
          </article>
        </section>
      ) : null}

      {activeTab === "post" ? (
        <section className="freelancer-section">
          <div className="freelancer-section-header">
            <h2>Post Job and Bidding</h2>
            <p>Strong validation with protected contact, attachments and bidding workflow.</p>
          </div>

          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>Create Job Post</h3>
              <form className="freelancer-form" onSubmit={createJobPost}>
                <label>
                  Job Title
                  <input
                    type="text"
                    value={jobForm.title}
                    onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Need React developer for marketplace improvements"
                  />
                </label>
                <label>
                  Category
                  <select
                    value={jobForm.category}
                    onChange={(event) => setJobForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={`job-cat-${category}`} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  District
                  <select
                    value={jobForm.location}
                    onChange={(event) => setJobForm((current) => ({ ...current, location: event.target.value }))}
                  >
                    <option value="">Select district</option>
                    {districtOptions.map((district) => (
                      <option key={`job-district-${district}`} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Service Type
                  <select
                    value={jobForm.serviceType}
                    onChange={(event) => setJobForm((current) => ({ ...current, serviceType: event.target.value }))}
                  >
                    <option value="digital">Digital</option>
                    <option value="local">Local</option>
                  </select>
                </label>
                <label>
                  Urgency
                  <select
                    value={jobForm.urgency}
                    onChange={(event) => setJobForm((current) => ({ ...current, urgency: event.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </label>
                <label>
                  Min Budget
                  <input
                    type="number"
                    value={jobForm.minBudget}
                    onChange={(event) => setJobForm((current) => ({ ...current, minBudget: event.target.value }))}
                  />
                </label>
                <label>
                  Max Budget
                  <input
                    type="number"
                    value={jobForm.maxBudget}
                    onChange={(event) => setJobForm((current) => ({ ...current, maxBudget: event.target.value }))}
                  />
                </label>
                <label>
                  Deadline
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(event) => setJobForm((current) => ({ ...current, deadline: event.target.value }))}
                  />
                </label>
                <label>
                  Requirements
                  <textarea
                    rows={4}
                    value={jobForm.requirements}
                    onChange={(event) =>
                      setJobForm((current) => ({ ...current, requirements: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Contact Name
                  <input
                    type="text"
                    value={jobForm.customerName}
                    onChange={(event) =>
                      setJobForm((current) => ({ ...current, customerName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Contact Phone (masked in marketplace)
                  <input
                    type="tel"
                    value={jobForm.customerPhone}
                    onChange={(event) =>
                      setJobForm((current) => ({ ...current, customerPhone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Attachments
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4"
                    onChange={(event) => setJobAttachments(Array.from(event.target.files || []))}
                  />
                </label>
                <button type="submit">Post Job</button>
              </form>
            </article>

            <article className="freelancer-panel">
              <h3>Submit Bid</h3>
              <form className="freelancer-form" onSubmit={submitBid}>
                <label>
                  Job
                  <select
                    value={bidForm.jobId}
                    onChange={(event) => setBidForm((current) => ({ ...current, jobId: event.target.value }))}
                  >
                    <option value="">Select job</option>
                    {jobs.map((job) => (
                      <option key={job._id} value={job._id}>
                        {job.jobCode} - {job.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Provider
                  <select
                    value={bidForm.providerId}
                    onChange={(event) =>
                      setBidForm((current) => ({ ...current, providerId: event.target.value }))
                    }
                  >
                    <option value="">Select provider</option>
                    {providers.map((provider) => (
                      <option key={provider._id} value={provider._id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bid Amount
                  <input
                    type="number"
                    value={bidForm.amount}
                    onChange={(event) => setBidForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </label>
                <label>
                  Timeline Days
                  <input
                    type="number"
                    value={bidForm.timelineDays}
                    onChange={(event) =>
                      setBidForm((current) => ({ ...current, timelineDays: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Cover Letter
                  <textarea
                    rows={3}
                    value={bidForm.coverLetter}
                    onChange={(event) =>
                      setBidForm((current) => ({ ...current, coverLetter: event.target.value }))
                    }
                  />
                </label>
                <button type="submit">Submit Bid</button>
              </form>
            </article>
          </div>

          <article className="freelancer-panel">
            <h3>Open Jobs</h3>
            {jobsLoading ? <p className="freelancer-note">Loading jobs...</p> : null}
            {!jobsLoading && jobs.length === 0 ? <p className="freelancer-note">No jobs posted yet.</p> : null}
            <div className="freelancer-list-grid">
              {jobs.map((job) => (
                <div key={job._id} className="freelancer-list-item">
                  <strong>
                    {job.jobCode} - {job.title}
                  </strong>
                  <p>
                    {job.category} | {job.location} | {job.urgency}
                  </p>
                  <p>
                    Budget {formatInr(job.minBudget)} - {formatInr(job.maxBudget)} | Bids {job.bidCount}
                  </p>
                  <p>Deadline: {new Date(job.deadline).toLocaleDateString()}</p>
                  <p>Contact protected: {job.createdBy?.maskedPhone}</p>
                  <div className="freelancer-inline-actions">
                    <button
                      type="button"
                      onClick={() => {
                        const targetProvider = providers[0];
                        if (targetProvider) {
                          void purchaseLead(job._id, targetProvider._id);
                        } else {
                          setStatusMessage("No provider available for lead purchase.");
                        }
                      }}
                    >
                      Lead Purchase
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "bookings" ? (
        <section className="freelancer-section">
          <div className="freelancer-section-header">
            <h2>Booking + Payment + Safety Workflow</h2>
            <p>Real booking table, status flow, OTP start, escrow, milestones, refunds and disputes.</p>
          </div>

          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>Create Booking</h3>
              <form className="freelancer-form" onSubmit={createBooking}>
                <label>
                  Provider
                  <select
                    value={bookingForm.providerId}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, providerId: event.target.value }))
                    }
                  >
                    <option value="">Select provider</option>
                    {providers.map((provider) => (
                      <option key={`booking-provider-${provider._id}`} value={provider._id}>
                        {provider.name} ({provider.category})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Customer Name
                  <input
                    type="text"
                    value={bookingForm.customerName}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, customerName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Customer Phone
                  <input
                    type="tel"
                    value={bookingForm.customerPhone}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, customerPhone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Service Mode
                  <select
                    value={bookingForm.serviceMode}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, serviceMode: event.target.value }))
                    }
                  >
                    <option value="gig">Gig</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </label>
                <label>
                  Booking Mode
                  <select
                    value={bookingForm.bookingMode}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, bookingMode: event.target.value }))
                    }
                  >
                    <option value="instant">Instant</option>
                    <option value="schedule">Schedule</option>
                    <option value="quotation">Quotation</option>
                    <option value="bidding">Bidding</option>
                  </select>
                </label>
                <label>
                  Schedule
                  <input
                    type="text"
                    value={bookingForm.schedule}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, schedule: event.target.value }))
                    }
                    placeholder="Tomorrow 10:00 AM"
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={bookingForm.notes}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Amount
                  <input
                    type="number"
                    value={bookingForm.totalAmount}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, totalAmount: event.target.value }))
                    }
                  />
                </label>
                <label className="freelancer-checkbox">
                  <input
                    type="checkbox"
                    checked={bookingForm.emergency}
                    onChange={(event) =>
                      setBookingForm((current) => ({ ...current, emergency: event.target.checked }))
                    }
                  />
                  Emergency Booking
                </label>
                <button type="submit">Create Booking</button>
              </form>
            </article>

            <article className="freelancer-panel">
              <h3>My Booking Tracker</h3>
              <div className="freelancer-inline-actions">
                <input
                  type="tel"
                  value={trackPhone}
                  onChange={(event) => setTrackPhone(event.target.value)}
                  placeholder="Customer phone"
                />
                <button type="button" onClick={() => fetchMyBookings()}>
                  Load
                </button>
              </div>

              {bookingsLoading ? <p className="freelancer-note">Loading bookings...</p> : null}
              {!bookingsLoading && bookings.length === 0 ? (
                <p className="freelancer-note">No booking records. Create one to start the workflow.</p>
              ) : null}
              <ul className="freelancer-list">
                {bookings.map((booking) => (
                  <li key={booking._id}>
                    <strong>{booking.bookingCode}</strong> | {booking.providerName}
                    <br />
                    Status: {booking.status} | Payment: {booking.payment?.status}
                    <br />
                    Masked Phone: {booking.customer?.maskedPhone}
                    {Array.isArray(booking.payment?.milestones) && booking.payment.milestones.length > 0 ? (
                      <div className="freelancer-inline-actions">
                        {booking.payment.milestones.map((milestone, index) => (
                          <button
                            key={`${booking.bookingCode}-ms-${index}`}
                            type="button"
                            onClick={() => releaseMilestone(booking.bookingCode, index)}
                            disabled={milestone.status === "released"}
                          >
                            Release M{index + 1} ({milestone.status})
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>OTP Before Work Starts</h3>
              <label>
                Booking Code
                <input
                  type="text"
                  value={otpTargetBooking}
                  onChange={(event) => setOtpTargetBooking(event.target.value)}
                />
              </label>
              <div className="freelancer-inline-actions">
                <button type="button" onClick={sendOtp}>
                  Send OTP
                </button>
              </div>
              <label>
                OTP
                <input type="text" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
              </label>
              <button type="button" onClick={verifyOtp}>
                Verify OTP
              </button>
            </article>

            <article className="freelancer-panel">
              <h3>Escrow and Milestones</h3>
              <label>
                Booking Code
                <input
                  type="text"
                  value={escrowBookingCode}
                  onChange={(event) => setEscrowBookingCode(event.target.value)}
                />
              </label>
              <label>
                Total Amount
                <input
                  type="number"
                  value={escrowTotalAmount}
                  onChange={(event) => setEscrowTotalAmount(event.target.value)}
                />
              </label>
              <label>
                Milestones (one per line: Title|Amount)
                <textarea
                  rows={4}
                  value={escrowMilestonesText}
                  onChange={(event) => setEscrowMilestonesText(event.target.value)}
                />
              </label>
              <button type="button" onClick={initializeEscrow}>
                Initialize Escrow
              </button>
            </article>
          </div>

          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>Cancellation Policy Flow</h3>
              <label>
                Booking Code
                <input
                  type="text"
                  value={cancelBookingCode}
                  onChange={(event) => setCancelBookingCode(event.target.value)}
                />
              </label>
              <label>
                Requested By
                <select value={cancelByRole} onChange={(event) => setCancelByRole(event.target.value)}>
                  <option value="customer">Customer</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                Reason
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </label>
              <button type="button" onClick={submitCancellation}>
                Submit Cancellation
              </button>
            </article>

            <article className="freelancer-panel">
              <h3>Refund Request</h3>
              <label>
                Booking Code
                <input
                  type="text"
                  value={refundBookingCode}
                  onChange={(event) => setRefundBookingCode(event.target.value)}
                />
              </label>
              <label>
                Reason
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                />
              </label>
              <button type="button" onClick={submitRefund}>
                Request Refund
              </button>
            </article>
          </div>

          <article className="freelancer-panel">
            <h3>Dispute and Proof Upload</h3>
            <div className="freelancer-filter-grid">
              <label>
                Booking Code
                <input
                  type="text"
                  value={disputeBookingCode}
                  onChange={(event) => setDisputeBookingCode(event.target.value)}
                />
              </label>
              <label>
                Raised By Name
                <input
                  type="text"
                  value={disputeRaisedByName}
                  onChange={(event) => setDisputeRaisedByName(event.target.value)}
                />
              </label>
              <label>
                Raised By Role
                <select value={disputeRole} onChange={(event) => setDisputeRole(event.target.value)}>
                  <option value="customer">Customer</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                Against
                <select
                  value={disputeAgainstRole}
                  onChange={(event) => setDisputeAgainstRole(event.target.value)}
                >
                  <option value="provider">Provider</option>
                  <option value="customer">Customer</option>
                  <option value="platform">Platform</option>
                </select>
              </label>
            </div>
            <label>
              Reason
              <input type="text" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} />
            </label>
            <label>
              Details
              <textarea
                rows={3}
                value={disputeDetails}
                onChange={(event) => setDisputeDetails(event.target.value)}
              />
            </label>
            <label>
              Proof Upload
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4"
                onChange={(event) => setDisputeProofs(Array.from(event.target.files || []))}
              />
            </label>
            <button type="button" onClick={submitDispute}>
              Create Dispute
            </button>
            <h4>Admin Dispute Panel</h4>
            <label>
              Filter
              <select
                value={disputeStatusFilter}
                onChange={(event) => setDisputeStatusFilter(event.target.value)}
              >
                <option value="open">Open</option>
                <option value="under-review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
            </label>
            <ul className="freelancer-list">
              {disputes.map((dispute) => (
                <li key={dispute._id}>
                  <strong>{dispute.disputeCode}</strong> | {dispute.reason} | {dispute.status}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === "emergency" ? (
        <section className="freelancer-section">
          <div className="freelancer-section-header">
            <h2>Emergency and Safety</h2>
            <p>Emergency bookings, report provider/customer, fraud and trust workflows.</p>
          </div>
          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>Emergency Services</h3>
              <ul className="freelancer-list">
                {emergencyServices.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
              <p className="freelancer-note">
                Emergency mode prioritizes provider assignment and surfaces premium response providers first.
              </p>
            </article>
            <article className="freelancer-panel">
              <h3>Safety Report</h3>
              <div className="freelancer-form">
                <label>
                  Target Type
                  <select
                    value={reportTargetType}
                    onChange={(event) => setReportTargetType(event.target.value)}
                  >
                    <option value="provider">Provider</option>
                    <option value="customer">Customer</option>
                    <option value="job">Job</option>
                    <option value="booking">Booking</option>
                  </select>
                </label>
                <label>
                  Target ID
                  <input
                    type="text"
                    value={reportTargetId}
                    onChange={(event) => setReportTargetId(event.target.value)}
                  />
                </label>
                <label>
                  Reporter Name
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(event) => setReporterName(event.target.value)}
                  />
                </label>
                <label>
                  Reporter Phone
                  <input
                    type="tel"
                    value={reporterPhone}
                    onChange={(event) => setReporterPhone(event.target.value)}
                  />
                </label>
                <label>
                  Reason
                  <input
                    type="text"
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                  />
                </label>
                <label>
                  Details
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(event) => setReportDetails(event.target.value)}
                  />
                </label>
                <button type="button" onClick={submitReport}>
                  Submit Report
                </button>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "plans" ? (
        <section className="freelancer-section">
          <div className="freelancer-section-header">
            <h2>Provider Plans and Business Controls</h2>
            <p>KYC onboarding, subscriptions, sponsored listing, lead purchase and commission settings.</p>
          </div>
          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>Provider Onboarding / KYC</h3>
              <form className="freelancer-form" onSubmit={onboardProvider}>
                <label>
                  Provider Name
                  <input
                    type="text"
                    value={onboardForm.name}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    value={onboardForm.category}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, category: event.target.value }))
                    }
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={`onboard-cat-${category}`} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Type
                  <select
                    value={onboardForm.type}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, type: event.target.value }))
                    }
                  >
                    <option value="digital">Digital</option>
                    <option value="local">Local</option>
                  </select>
                </label>
                <label>
                  District
                  <select
                    value={onboardForm.district}
                    onChange={(event) =>
                      setOnboardForm((current) => ({
                        ...current,
                        district: event.target.value,
                        serviceAreas: [event.target.value],
                      }))
                    }
                  >
                    <option value="">Select district</option>
                    {districtOptions.map((district) => (
                      <option key={`onboard-district-${district}`} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Language
                  <select
                    value={onboardForm.language}
                    onChange={(event) =>
                      setOnboardForm((current) => ({
                        ...current,
                        language: event.target.value,
                        languages: [event.target.value],
                      }))
                    }
                  >
                    {languageOptions.map((language) => (
                      <option key={`onboard-lang-${language}`} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Budget Tier
                  <select
                    value={onboardForm.budget}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, budget: event.target.value }))
                    }
                  >
                    <option value="budget">Budget</option>
                    <option value="medium">Medium</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>
                <label>
                  Availability
                  <select
                    value={onboardForm.availability}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, availability: event.target.value }))
                    }
                  >
                    <option value="online-now">Online now</option>
                    <option value="instant">Instant</option>
                    <option value="schedule">Schedule</option>
                  </select>
                </label>
                <label>
                  Experience
                  <input
                    type="number"
                    value={onboardForm.experience}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, experience: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Response Minutes
                  <input
                    type="number"
                    value={onboardForm.responseMinutes}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, responseMinutes: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Hourly Rate
                  <input
                    type="number"
                    value={onboardForm.hourlyRate}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, hourlyRate: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Gig Starts From
                  <input
                    type="number"
                    value={onboardForm.gigStartsFrom}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, gigStartsFrom: event.target.value }))
                    }
                  />
                </label>
                <label>
                  About
                  <textarea
                    rows={3}
                    value={onboardForm.about}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, about: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Contact Phone
                  <input
                    type="tel"
                    value={onboardForm.contactPhone}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, contactPhone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Contact Email
                  <input
                    type="email"
                    value={onboardForm.contactEmail}
                    onChange={(event) =>
                      setOnboardForm((current) => ({ ...current, contactEmail: event.target.value }))
                    }
                  />
                </label>
                <label>
                  KYC Files
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(event) => setOnboardKycFiles(Array.from(event.target.files || []))}
                  />
                </label>
                <button type="submit">Submit Onboarding</button>
              </form>
            </article>

            <article className="freelancer-panel">
              <h3>Subscription Plan Purchase</h3>
              <label>
                Provider
                <select
                  value={selectedPlanProviderId}
                  onChange={(event) => setSelectedPlanProviderId(event.target.value)}
                >
                  <option value="">Select provider</option>
                  {providers.map((provider) => (
                    <option key={`plan-provider-${provider._id}`} value={provider._id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plan
                <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
                  {plans.map((plan) => (
                    <option key={`plan-${plan.id}`} value={plan.id}>
                      {plan.name} - {plan.price === 0 ? "Free" : `${formatInr(plan.price)}/month`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={purchasePlan}>
                Purchase Plan
              </button>

              <h4>Plan Purchases</h4>
              <div className="freelancer-inline-actions">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedPlanProviderId) {
                      setStatusMessage("Select provider to load plan purchases.");
                      return;
                    }
                    const response = await freelancerApi.getPlanPurchases(selectedPlanProviderId);
                    setPlanPurchases(response?.data?.purchases || []);
                  }}
                >
                  Load Purchases
                </button>
              </div>
              <ul className="freelancer-list">
                {planPurchases.map((purchase) => (
                  <li key={purchase._id}>
                    {purchase.planName} | {purchase.status} | {purchase.paymentStatus}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="freelancer-dual-grid">
            <article className="freelancer-panel">
              <h3>Commission Settings</h3>
              {commissionConfig ? (
                <div className="freelancer-form">
                  <label>
                    Commission Type
                    <select
                      value={commissionConfig.commissionType}
                      onChange={(event) =>
                        setCommissionConfig((current) =>
                          current ? { ...current, commissionType: event.target.value } : current
                        )
                      }
                    >
                      <option value="percentage">Percentage</option>
                      <option value="flat">Flat</option>
                    </select>
                  </label>
                  <label>
                    Commission Value
                    <input
                      type="number"
                      value={commissionConfig.commissionValue}
                      onChange={(event) =>
                        setCommissionConfig((current) =>
                          current ? { ...current, commissionValue: Number(event.target.value) } : current
                        )
                      }
                    />
                  </label>
                  <label>
                    Sponsored Listing Fee
                    <input
                      type="number"
                      value={commissionConfig.sponsoredListingFee}
                      onChange={(event) =>
                        setCommissionConfig((current) =>
                          current ? { ...current, sponsoredListingFee: Number(event.target.value) } : current
                        )
                      }
                    />
                  </label>
                  <label>
                    Lead Purchase Fee
                    <input
                      type="number"
                      value={commissionConfig.leadPurchaseFee}
                      onChange={(event) =>
                        setCommissionConfig((current) =>
                          current ? { ...current, leadPurchaseFee: Number(event.target.value) } : current
                        )
                      }
                    />
                  </label>
                  <label>
                    Cancellation Penalty %
                    <input
                      type="number"
                      value={commissionConfig.cancellationPenaltyPercent}
                      onChange={(event) =>
                        setCommissionConfig((current) =>
                          current
                            ? { ...current, cancellationPenaltyPercent: Number(event.target.value) }
                            : current
                        )
                      }
                    />
                  </label>
                  <label>
                    Refund Window Hours
                    <input
                      type="number"
                      value={commissionConfig.refundWindowHours}
                      onChange={(event) =>
                        setCommissionConfig((current) =>
                          current ? { ...current, refundWindowHours: Number(event.target.value) } : current
                        )
                      }
                    />
                  </label>
                  <button type="button" onClick={updateCommissionSettings}>
                    Save Commission Settings
                  </button>
                </div>
              ) : (
                <p className="freelancer-note">Loading commission settings...</p>
              )}
            </article>

            <article className="freelancer-panel">
              <h3>Admin Snapshot</h3>
              {adminDashboard ? (
                <ul className="freelancer-list">
                  <li>Providers: {adminDashboard.metrics?.providers || 0}</li>
                  <li>Jobs: {adminDashboard.metrics?.jobs || 0}</li>
                  <li>Bookings: {adminDashboard.metrics?.bookings || 0}</li>
                  <li>Open Disputes: {adminDashboard.metrics?.openDisputes || 0}</li>
                  <li>Open Reports: {adminDashboard.metrics?.openReports || 0}</li>
                  <li>Active Plan Purchases: {adminDashboard.metrics?.activePlanPurchases || 0}</li>
                </ul>
              ) : (
                <p className="freelancer-note">Admin metrics loading...</p>
              )}
            </article>
          </div>
        </section>
      ) : null}

      <nav className="freelancer-bottom-nav">
        {TABS.map((tab) => (
          <button
            key={`bottom-${tab.id}`}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default FreelancerMarketplace;

