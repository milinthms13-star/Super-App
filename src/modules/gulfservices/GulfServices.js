import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useI18n from '../../hooks/useI18n';
import { gulfservicesApi } from './gulfservicesApi';
import './GulfServices.css';

const COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait', 'Bahrain'];
const JOB_CATEGORIES = ['Hospitality', 'Construction', 'Healthcare', 'IT & Engineering', 'Logistics', 'Sales & Retail'];
const DEFAULT_SUPPORT_PHONE = '+919999999999';
const DEFAULT_SUPPORT_WHATSAPP = '919999999999';

const getCurrentUserEmail = () => {
  try {
    const possibleUserPayloads = [
      localStorage.getItem('user'),
      localStorage.getItem('authUser'),
      localStorage.getItem('profile'),
    ];

    for (const payload of possibleUserPayloads) {
      if (!payload) continue;
      const parsed = JSON.parse(payload);
      if (parsed?.email) return String(parsed.email).trim().toLowerCase();
    }
  } catch (error) {
    return '';
  }

  return '';
};

const SERVICE_CATEGORIES = [
  { id: 'visa', title: 'Visa Assistance', icon: '📋', desc: 'Visit, employment, family visas and renewals.' },
  { id: 'jobs', title: 'Gulf Jobs', icon: '💼', desc: 'Verified recruiters and fraud protection.' },
  { id: 'attestation', title: 'Document Attestation', icon: '📄', desc: 'MEA, embassy, HRD and delivery tracking.' },
  { id: 'travel', title: 'Travel Support', icon: '✈️', desc: 'Flight booking, accommodation and relocation.' },
  { id: 'medical', title: 'GAMCA Medical', icon: '⚕️', desc: 'Medical booking, pre-qualification and results.' },
  { id: 'pcc', title: 'PCC & Police Clearance', icon: '🛡️', desc: 'Police clearance, character certificate and tracking.' },
  { id: 'returnee', title: 'Returnee Help', icon: '🏠', desc: 'Returnee jobs, business setup and NRI assistance.' },
  { id: 'nri', title: 'NRI Services', icon: '🌍', desc: 'Investment, property and banking for NRIs.' },
  { id: 'emergency', title: 'Emergency Gulf Help', icon: '🚨', desc: 'Passport lost, visa expired, legal help and embassy contact.' },
];

const SAMPLE_JOBS = [
  {
    id: 'gulf-hospitality-uae',
    title: 'Hospitality Team Lead',
    company: 'Al Nahar Group',
    country: 'UAE',
    category: 'Hospitality',
    summary: 'Verified UAE hospitality role with visa support and onboarding assistance.',
    salary: { min: 2200, max: 2800 },
    description: 'Lead a hospitality team in a verified UAE employer network with employer-led visa processing.',
    recruiter: 'recruiter-1',
    verified: true,
    accommodation: true,
    food: true,
    urgentHiring: false,
    visaType: 'Employment',
    experience: 3,
  },
  {
    id: 'gulf-construction-qatar',
    title: 'Site Engineer',
    company: 'Gulf Connect',
    country: 'Qatar',
    category: 'Construction',
    summary: 'Qatar engineering role with document guidance and fraud protection.',
    salary: { min: 2600, max: 3200 },
    description: 'Construction site engineer position with certified recruiter support and pre-interview coaching.',
    recruiter: 'recruiter-2',
    verified: true,
    accommodation: true,
    food: true,
    urgentHiring: true,
    visaType: 'Employment',
    experience: 5,
  },
  {
    id: 'gulf-healthcare-saudi',
    title: 'Clinical Nurse',
    company: 'Skyline Careers',
    country: 'Saudi Arabia',
    category: 'Healthcare',
    summary: 'GAMCA-ready nurse role with employer verification and interview prep.',
    salary: { min: 3000, max: 3600 },
    description: 'Clinical nursing job offering full medical support and visa tracking for Gulf deployment.',
    recruiter: 'recruiter-3',
    verified: true,
    accommodation: true,
    food: true,
    urgentHiring: false,
    visaType: 'Employment',
    experience: 2,
  },
  {
    id: 'gulf-it-oman',
    title: 'IT Support Specialist',
    company: 'MetroWorks',
    country: 'Oman',
    category: 'IT & Engineering',
    summary: 'IT support role with visa-friendly package and onboarding support.',
    salary: { min: 2200, max: 3000 },
    description: 'IT role with a verified recruiter and Gulf-specific relocation assistance.',
    recruiter: 'recruiter-1',
    verified: true,
    accommodation: false,
    food: false,
    urgentHiring: true,
    visaType: 'Employment',
    experience: 1,
  },
];

const SAMPLE_RECRUITERS = [
  {
    id: 'recruiter-1',
    name: 'Al Nahar Employment Services',
    country: 'UAE',
    licenseNumber: 'UAE-12345',
    registrationNumber: 'KSA-67890',
    verified: true,
    status: 'active',
    successCases: 420,
    rating: 4.8,
    reviews: 152,
  },
  {
    id: 'recruiter-2',
    name: 'Gulf Verified Recruiters',
    country: 'Qatar',
    licenseNumber: 'QA-56432',
    registrationNumber: 'OM-01472',
    verified: true,
    status: 'active',
    successCases: 310,
    rating: 4.6,
    reviews: 98,
  },
  {
    id: 'recruiter-3',
    name: 'Skyline Gulf Careers',
    country: 'Saudi Arabia',
    licenseNumber: 'SA-99881',
    registrationNumber: 'BH-11324',
    verified: true,
    status: 'active',
    successCases: 275,
    rating: 4.7,
    reviews: 121,
  },
];

const DOCUMENT_CHECKLIST = [
  'Passport',
  'Photo',
  'Resume',
  'Education Certificate',
  'Experience Certificate',
  'Police Clearance Certificate',
  'Medical Test',
  'Visa Copy',
];

const VISA_WORKFLOW_STATUSES = [
  'Applied',
  'Offer Letter Pending',
  'Offer Letter Received',
  'Medical Pending',
  'Medical Completed',
  'Visa Processing',
  'Visa Approved',
  'Visa Stamped',
  'Travel Ready',
  'Rejected',
];

const GulfServices = () => {
  const { t } = useI18n();
  const [activePane, setActivePane] = useState('overview');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [bootstrapData, setBootstrapData] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [adminFilters, setAdminFilters] = useState({ visaStatus: '', country: '', search: '' });
  const [adminUpdateDrafts, setAdminUpdateDrafts] = useState({});
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [pendingRecruiterDrafts, setPendingRecruiterDrafts] = useState({});
  
  // New state for enhanced features
  const [activeModal, setActiveModal] = useState(null);
  const [jobFilters, setJobFilters] = useState({ 
    category: '', 
    salaryMin: '', 
    salaryMax: '',
    visaType: '',
    accommodation: null,
    food: null,
    urgentOnly: false,
  });
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Forms
  const [jobApplicationForm, setJobApplicationForm] = useState({ 
    fullName: '', 
    email: '', 
    phone: '', 
    passportNo: '',
    experience: '', 
    currentCompany: '', 
    expectedSalary: '', 
    availabilityDays: '', 
    cvFile: null 
  });
  const [visaForm, setVisaForm] = useState({ 
    fullName: '', 
    email: '', 
    phone: '', 
    country: selectedCountry, 
    visaType: 'Visit', 
    urgency: 'normal', 
    currentLocation: '', 
    message: '' 
  });
  const [attestationForm, setAttestationForm] = useState({ 
    fullName: '', 
    email: '', 
    phone: '', 
    documentType: 'degree', 
    documentName: '', 
    country: selectedCountry, 
    urgency: 'standard',
    documentFile: null,
  });
  const [leadForm, setLeadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    serviceType: 'visa',
    country: selectedCountry,
    message: '',
  });
  const [trackRequest, setTrackRequest] = useState({ type: 'visa', requestId: '', email: '' });
  const [trackResult, setTrackResult] = useState(null);
  const [fraudForm, setFraudForm] = useState({ recruiterId: '', issueDescription: '', phone: '' });
  const [recruiterForm, setRecruiterForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    licenseNumber: '',
    country: selectedCountry,
    experienceSummary: '',
    website: '',
    kycDocument: null,
  });
  const [paymentIntentInfo, setPaymentIntentInfo] = useState(null);
  const isAdminUser = useMemo(() => {
    try {
      const payload = localStorage.getItem('user');
      if (!payload) return false;
      const parsed = JSON.parse(payload);
      const normalizedEmail = String(parsed?.email || '').trim().toLowerCase();
      return Boolean(parsed?.isAdmin || parsed?.role === 'admin' || normalizedEmail === 'mgdhanyamohan@gmail.com');
    } catch (_error) {
      return false;
    }
  }, []);
  const documentReadinessScore = useMemo(
    () => Math.round((checkedDocs.length / DOCUMENT_CHECKLIST.length) * 100),
    [checkedDocs.length]
  );
  const sectionTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'visa', label: 'Visa' },
    { id: 'attestation', label: 'Attestation' },
    { id: 'tracking', label: 'Tracking' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'workflow', label: 'Workflow 10/10' },
    { id: 'emergency', label: 'Emergency' },
  ];

  const availableCountries = bootstrapData?.countries?.length ? bootstrapData.countries : COUNTRIES;
  const availableJobCategories = bootstrapData?.jobCategories?.length ? bootstrapData.jobCategories : JOB_CATEGORIES;

  useEffect(() => {
    const email = getCurrentUserEmail();
    setCurrentUserEmail(email);
    if (!email) return;

    setJobApplicationForm((prev) => ({ ...prev, email: prev.email || email }));
    setVisaForm((prev) => ({ ...prev, email: prev.email || email }));
    setAttestationForm((prev) => ({ ...prev, email: prev.email || email }));
    setLeadForm((prev) => ({ ...prev, email: prev.email || email }));
    setTrackRequest((prev) => ({ ...prev, email: prev.email || email }));
    setRecruiterForm((prev) => ({ ...prev, email: prev.email || email }));
  }, []);

  useEffect(() => {
    const fetchBootstrap = async () => {
      setLoading(true);
      try {
        const bootstrap = await gulfservicesApi.bootstrap();
        setBootstrapData(bootstrap.data.constants);
        const recruitersResponse = await gulfservicesApi.getVerifiedRecruiters();
        setRecruiters(recruitersResponse.data.recruiters || SAMPLE_RECRUITERS);
      } catch (error) {
        setRecruiters(SAMPLE_RECRUITERS);
      } finally {
        setLoading(false);
      }
    };

    fetchBootstrap();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const jobsResponse = await gulfservicesApi.getJobs({ country: selectedCountry });
        setJobs(jobsResponse.data.jobs || SAMPLE_JOBS);
      } catch (error) {
        setJobs(SAMPLE_JOBS);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [selectedCountry]);

  useEffect(() => {
    if (!availableCountries.includes(selectedCountry) && availableCountries.length) {
      setSelectedCountry(availableCountries[0]);
    }
  }, [availableCountries, selectedCountry]);

  useEffect(() => {
    setVisaForm((prev) => ({ ...prev, country: selectedCountry }));
    setAttestationForm((prev) => ({ ...prev, country: selectedCountry }));
    setLeadForm((prev) => ({ ...prev, country: selectedCountry }));
    setRecruiterForm((prev) => ({ ...prev, country: selectedCountry }));
  }, [selectedCountry]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesCountry = job.country === selectedCountry;
      const matchesCategory = jobFilters.category ? job.category === jobFilters.category : true;
      const matchesVisaType = jobFilters.visaType ? job.visaType === jobFilters.visaType : true;
      const minSalary = Number(jobFilters.salaryMin || 0);
      const maxSalary = Number(jobFilters.salaryMax || Infinity);
      const salaryValue = job.salary?.min || 0;
      const matchesAccommodation = jobFilters.accommodation !== null ? job.accommodation === jobFilters.accommodation : true;
      const matchesFood = jobFilters.food !== null ? job.food === jobFilters.food : true;
      const matchesUrgent = jobFilters.urgentOnly ? job.urgentHiring === true : true;
      return (
        matchesCountry &&
        matchesCategory &&
        matchesVisaType &&
        salaryValue >= minSalary &&
        salaryValue <= maxSalary &&
        matchesAccommodation &&
        matchesFood &&
        matchesUrgent
      );
    });
  }, [jobs, selectedCountry, jobFilters]);

  const handleInputChange = (setter) => (event) => {
    const { name, value } = event.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event, setter) => {
    const file = event.target.files?.[0] || null;
    setter((prev) => ({ ...prev, [event.target.name]: file }));
  };

  const handleServiceSelection = (serviceId) => {
    if (serviceId === 'emergency') {
      setActivePane('emergency');
      return;
    }

    if (serviceId === 'visa' || serviceId === 'jobs' || serviceId === 'attestation' || serviceId === 'fraud' || serviceId === 'lead') {
      setActiveModal(serviceId);
      return;
    }

    setLeadForm((prev) => ({ ...prev, serviceType: serviceId }));
    setActiveModal('lead');
  };

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 6000);
  };

  const toggleChecklistDoc = (doc) => {
    setCheckedDocs((prev) =>
      prev.includes(doc) ? prev.filter((item) => item !== doc) : [...prev, doc]
    );
  };

  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    if (!activeModal) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeModal]);

  const getRecruiterDetails = (recruiterId) => {
    return recruiters.find((r) => r.id === recruiterId) || SAMPLE_RECRUITERS.find((r) => r.id === recruiterId);
  };

  const loadMyApplications = useCallback(async () => {
    try {
      const response = await gulfservicesApi.getMyApplications();
      setMyApplications(Array.isArray(response?.data) ? response.data : []);
    } catch (_error) {
      setMyApplications([]);
    }
  }, []);

  const loadAdminApplications = useCallback(async () => {
    if (!isAdminUser) return;
    try {
      const response = await gulfservicesApi.getAdminApplications(adminFilters);
      setAdminApplications(Array.isArray(response?.data) ? response.data : []);
    } catch (_error) {
      setAdminApplications([]);
    }
  }, [adminFilters, isAdminUser]);

  const loadAdminAnalytics = useCallback(async () => {
    if (!isAdminUser) return;
    try {
      const response = await gulfservicesApi.getAdminAnalytics();
      setAdminAnalytics(response?.data || null);
    } catch (_error) {
      setAdminAnalytics(null);
    }
  }, [isAdminUser]);

  const loadPendingRecruiters = useCallback(async () => {
    if (!isAdminUser) return;
    try {
      const response = await gulfservicesApi.getPendingRecruiters();
      setPendingRecruiters(Array.isArray(response?.data) ? response.data : []);
    } catch (_error) {
      setPendingRecruiters([]);
    }
  }, [isAdminUser]);

  const handleRecruiterVerification = async (recruiterId, verified) => {
    const draft = pendingRecruiterDrafts[recruiterId] || {};
    setLoading(true);
    try {
      const response = await gulfservicesApi.verifyRecruiter(recruiterId, {
        verified,
        notes: draft.adminNote || '',
      });
      showMessage(response?.message || `Recruiter ${verified ? 'verified' : 'rejected'} successfully.`);
      setPendingRecruiterDrafts((prev) => {
        const next = { ...prev };
        delete next[recruiterId];
        return next;
      });
      await loadPendingRecruiters();
      await loadAdminAnalytics();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to update recruiter status.');
    } finally {
      setLoading(false);
    }
  };

  const submitVisa = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await gulfservicesApi.submitVisaEnquiry(visaForm);
      showMessage(response.message || 'Visa enquiry submitted successfully.');
      setVisaForm((prev) => ({ ...prev, message: '', phone: '', fullName: '', currentLocation: '' }));
      closeModal();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to submit visa enquiry.');
    } finally {
      setLoading(false);
    }
  };

  const submitAttestation = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(attestationForm).forEach(([key, value]) => {
        if (key === 'documentFile') return;
        formData.append(key, value);
      });
      if (attestationForm.documentFile) {
        formData.append('document', attestationForm.documentFile);
      }
      const response = await gulfservicesApi.submitAttestation(formData);
      showMessage(response.message || 'Attestation request submitted successfully.');
      setAttestationForm((prev) => ({ ...prev, phone: '', fullName: '', documentName: '' }));
      setPaymentIntentInfo(null);
      closeModal();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to submit attestation request.');
    } finally {
      setLoading(false);
    }
  };

  const requestAttestationPayment = async () => {
    if (!attestationForm.urgency || !attestationForm.email) {
      showMessage('Complete the attestation form before requesting payment.');
      return;
    }

    setLoading(true);
    try {
      const response = await gulfservicesApi.createPaymentIntent({
        amount: 49.99,
        currency: 'usd',
        description: `Attestation service fee for ${attestationForm.email}`,
        metadata: {
          service: 'attestation',
          urgency: attestationForm.urgency,
          email: attestationForm.email,
        },
      });
      const payload = response?.data || response;
      setPaymentIntentInfo(payload?.data || payload);
      showMessage('Payment intent created. Complete the checkout with your provider if required.');
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to create payment intent.');
    } finally {
      setLoading(false);
    }
  };

  const submitRecruiterApplication = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(recruiterForm).forEach(([key, value]) => {
        if (key === 'kycDocument') {
          if (value) {
            formData.append('kycDocument', value);
          }
          return;
        }
        formData.append(key, value);
      });
      const response = await gulfservicesApi.applyRecruiter(formData);
      showMessage(response.message || 'Recruiter application submitted successfully.');
      setRecruiterForm({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        licenseNumber: '',
        country: selectedCountry,
        experienceSummary: '',
        website: '',
        kycDocument: null,
      });
      closeModal();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to submit recruiter application.');
    } finally {
      setLoading(false);
    }
  };

  const submitJobApplication = async (event) => {
    event.preventDefault();
    if (!selectedJob) {
      showMessage('Select a job to apply for first.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(jobApplicationForm).forEach(([key, value]) => {
        if (key === 'cvFile' && value) {
          formData.append('cv', value);
          return;
        }
        formData.append(key, value);
      });
      formData.append('completedDocs', JSON.stringify(checkedDocs));
      formData.append('jobId', selectedJob.id);
      const response = await gulfservicesApi.applyJob(selectedJob.id, formData);
      showMessage(response.message || 'Application submitted successfully.');
      setJobApplicationForm((prev) => ({
        ...prev,
        fullName: '',
        phone: '',
        passportNo: '',
        experience: '',
        currentCompany: '',
        expectedSalary: '',
        availabilityDays: '',
        cvFile: null,
      }));
      setSelectedJob(null);
      loadMyApplications();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to submit application.');
    } finally {
      setLoading(false);
    }
  };

  const submitLead = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await gulfservicesApi.submitVisaEnquiry({
        fullName: leadForm.fullName,
        email: leadForm.email || currentUserEmail || jobApplicationForm.email || visaForm.email,
        phone: leadForm.phone,
        country: leadForm.country,
        visaType: 'Visit',
        urgency: leadForm.serviceType === 'emergency' ? 'emergency' : 'normal',
        currentLocation: 'India',
        message: `[${leadForm.serviceType}] ${leadForm.message || 'Callback requested.'}`,
      });
      showMessage(response.message || 'Lead submitted successfully. We will contact you shortly.');
      setLeadForm({ fullName: '', email: currentUserEmail, phone: '', serviceType: 'visa', country: selectedCountry, message: '' });
      closeModal();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to submit lead.');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await gulfservicesApi.getDashboard();
      setDashboard(response.data.dashboard);
      await loadMyApplications();
      if (isAdminUser) {
        await loadAdminAnalytics();
      }
      setActivePane('dashboard');
    } catch (error) {
      const fallbackMessage =
        error?.response?.status === 401
          ? 'Please sign in to view your dashboard.'
          : 'Unable to load dashboard.';
      showMessage(error?.response?.data?.message || fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  const submitTrackRequest = async (event) => {
    event.preventDefault();
    if (!trackRequest.requestId || !trackRequest.email) {
      showMessage('Enter request ID and email to track.');
      return;
    }
    setLoading(true);
    try {
      const response = await gulfservicesApi.trackRequest(
        trackRequest.type,
        trackRequest.requestId.trim(),
        trackRequest.email.trim().toLowerCase()
      );
      const payload = response.data || {};
      setTrackResult({
        status: payload.status || payload?.visaRequest?.status || payload?.attestation?.status || 'Unknown',
        timeline: payload.timeline || payload?.visaRequest?.timeline || payload?.attestation?.timeline || [],
      });
      setActivePane('tracking');
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to track request.');
    } finally {
      setLoading(false);
    }
  };

  const submitFraudReport = async (event) => {
    event.preventDefault();
    if (!fraudForm.issueDescription) {
      showMessage('Please describe the issue.');
      return;
    }
    setLoading(true);
    try {
      const response = await gulfservicesApi.reportFraud(fraudForm);
      showMessage(response.message || 'Fraud report submitted.');
      setFraudForm({ recruiterId: '', issueDescription: '', phone: '' });
      closeModal();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to submit fraud report.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminStatusUpdate = async (applicationId) => {
    const draft = adminUpdateDrafts[applicationId] || {};
    if (!draft.visaStatus) {
      showMessage('Select a visa status before updating.');
      return;
    }

    setLoading(true);
    try {
      const response = await gulfservicesApi.updateApplicationStatus(applicationId, {
        visaStatus: draft.visaStatus,
        agentName: draft.agentName || '',
        agentVerified: Boolean(draft.agentVerified),
        adminNote: draft.adminNote || '',
      });
      showMessage(response?.message || 'Application status updated.');
      loadAdminApplications();
      loadMyApplications();
    } catch (error) {
      showMessage(error?.response?.data?.message || 'Unable to update application status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((activePane === 'workflow' || activePane === 'dashboard') && currentUserEmail) {
      loadMyApplications();
    }
    if (activePane === 'workflow' && isAdminUser) {
      loadAdminApplications();
    }
    if (activePane === 'dashboard' && isAdminUser) {
      loadPendingRecruiters();
    }
  }, [activePane, currentUserEmail, isAdminUser, loadAdminApplications, loadMyApplications, loadPendingRecruiters]);

  // Modal content renderer
  const renderModal = () => {
    if (!activeModal) return null;

    const modalClasses = `gulf-services-modal gulf-services-modal-${activeModal}`;

    if (activeModal === 'visa') {
      return (
        <div className={modalClasses}>
          <div className="gulf-services-modal-content">
            <button type="button" className="gulf-services-modal-close" aria-label="Close visa support dialog" onClick={closeModal}>✕</button>
            <h2>Visa Enquiry & Support</h2>
            <form className="gulf-services-form" onSubmit={submitVisa}>
              <div className="gulf-services-form-grid">
                <label>
                  Full name
                  <input name="fullName" value={visaForm.fullName} onChange={handleInputChange(setVisaForm)} required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" value={visaForm.email} onChange={handleInputChange(setVisaForm)} required />
                </label>
                <label>
                  Phone
                  <input name="phone" value={visaForm.phone} onChange={handleInputChange(setVisaForm)} required />
                </label>
                <label>
                  Country
                  <select name="country" value={visaForm.country} onChange={handleInputChange(setVisaForm)}>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Visa type
                  <select name="visaType" value={visaForm.visaType} onChange={handleInputChange(setVisaForm)}>
                    <option value="Visit">Visit</option>
                    <option value="Employment">Employment</option>
                    <option value="Family">Family</option>
                    <option value="Student">Student</option>
                    <option value="Business">Business</option>
                  </select>
                </label>
                <label>
                  Urgency
                  <select name="urgency" value={visaForm.urgency} onChange={handleInputChange(setVisaForm)}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </label>
                <label>
                  Current location
                  <input name="currentLocation" value={visaForm.currentLocation} onChange={handleInputChange(setVisaForm)} required />
                </label>
                <label className="full-width">
                  Additional message
                  <textarea name="message" value={visaForm.message} onChange={handleInputChange(setVisaForm)} rows="3" />
                </label>
              </div>
              <div className="gulf-services-form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>Submit visa enquiry</button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-outline" onClick={() => window.open(`https://wa.me/${DEFAULT_SUPPORT_WHATSAPP}?text=I%20need%20visa%20support`, '_blank')}>
                  WhatsApp Support
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (activeModal === 'jobs') {
      return (
        <div className={modalClasses}>
          <div className="gulf-services-modal-content gulf-services-modal-large">
            <button type="button" className="gulf-services-modal-close" aria-label="Close jobs dialog" onClick={closeModal}>✕</button>
            <h2>Gulf Jobs & Verified Applications</h2>
            <div className="gulf-services-modal-grid">
              <div className="gulf-services-modal-filters">
                <h3>Filters</h3>
                <label>
                  Country
                  <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select name="category" value={jobFilters.category} onChange={handleInputChange(setJobFilters)}>
                    <option value="">All categories</option>
                    {availableJobCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Min salary (₹)
                  <input name="salaryMin" type="number" value={jobFilters.salaryMin} onChange={handleInputChange(setJobFilters)} />
                </label>
                <label>
                  Max salary (₹)
                  <input name="salaryMax" type="number" value={jobFilters.salaryMax} onChange={handleInputChange(setJobFilters)} />
                </label>
                <label>
                  Visa type
                  <select name="visaType" value={jobFilters.visaType} onChange={handleInputChange(setJobFilters)}>
                    <option value="">Any</option>
                    <option value="Employment">Employment</option>
                    <option value="Family">Family</option>
                  </select>
                </label>
                <label>
                  <input type="checkbox" checked={jobFilters.accommodation === true} onChange={(e) => setJobFilters((prev) => ({ ...prev, accommodation: e.target.checked ? true : null }))} />
                  Accommodation provided
                </label>
                <label>
                  <input type="checkbox" checked={jobFilters.food === true} onChange={(e) => setJobFilters((prev) => ({ ...prev, food: e.target.checked ? true : null }))} />
                  Food provided
                </label>
                <label>
                  <input type="checkbox" checked={jobFilters.urgentOnly} onChange={(e) => setJobFilters((prev) => ({ ...prev, urgentOnly: e.target.checked }))} />
                  Urgent hiring only
                </label>
              </div>
              <div className="gulf-services-modal-jobs">
                <div className="gulf-services-job-list">
                  {filteredJobs.length ? (
                    filteredJobs.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        className={`gulf-services-job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                        onClick={() => setSelectedJob(job)}
                      >
                        <div className="gulf-services-job-card-header">
                          <strong>{job.title}</strong>
                          {job.urgentHiring && <span className="gulf-services-tag-urgent">Urgent</span>}
                        </div>
                        <span>{job.company}</span>
                        <p>{job.summary}</p>
                        <div className="gulf-services-job-meta">
                          <span>₹{job.salary?.min}-{job.salary?.max}</span>
                          <span>{job.country}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="gulf-services-card">
                      <p>No jobs found for this filter.</p>
                    </div>
                  )}
                </div>
                {selectedJob && (
                  <div className="gulf-services-job-detail-modal">
                    <h3>{selectedJob.title}</h3>
                    <p className="gulf-services-company">{selectedJob.company}</p>
                    <div className="gulf-services-job-details">
                      <p><strong>Description:</strong> {selectedJob.description}</p>
                      <p><strong>Location:</strong> {selectedJob.country}</p>
                      <p><strong>Salary:</strong> ₹{selectedJob.salary?.min} - ₹{selectedJob.salary?.max}</p>
                      <p><strong>Experience:</strong> {selectedJob.experience} years</p>
                      {selectedJob.recruiter && getRecruiterDetails(selectedJob.recruiter) && (
                        <div className="gulf-services-recruiter-info">
                          <strong>Verified Recruiter:</strong>
                          <p>{getRecruiterDetails(selectedJob.recruiter).name}</p>
                          <p>License: {getRecruiterDetails(selectedJob.recruiter).licenseNumber}</p>
                        </div>
                      )}
                    </div>
                    <form className="gulf-services-form" onSubmit={submitJobApplication}>
                      <h4>Apply Now</h4>
                      <div className="gulf-services-form-grid">
                        <input name="fullName" placeholder="Full name" value={jobApplicationForm.fullName} onChange={handleInputChange(setJobApplicationForm)} required />
                        <input name="email" type="email" placeholder="Email" value={jobApplicationForm.email} onChange={handleInputChange(setJobApplicationForm)} required />
                        <input name="phone" placeholder="Phone" value={jobApplicationForm.phone} onChange={handleInputChange(setJobApplicationForm)} required />
                        <input name="passportNo" placeholder="Passport number" value={jobApplicationForm.passportNo} onChange={handleInputChange(setJobApplicationForm)} required />
                        <input name="experience" type="number" placeholder="Experience (years)" value={jobApplicationForm.experience} onChange={handleInputChange(setJobApplicationForm)} min="0" />
                        <input name="currentCompany" placeholder="Current company" value={jobApplicationForm.currentCompany} onChange={handleInputChange(setJobApplicationForm)} />
                        <input name="expectedSalary" type="number" placeholder="Expected salary" value={jobApplicationForm.expectedSalary} onChange={handleInputChange(setJobApplicationForm)} />
                        <input name="availabilityDays" type="number" placeholder="Availability (days)" value={jobApplicationForm.availabilityDays} onChange={handleInputChange(setJobApplicationForm)} min="15" />
                        <label className="full-width">
                          Upload CV
                          <input name="cvFile" type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange(e, setJobApplicationForm)} />
                        </label>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>Apply for this job</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeModal === 'attestation') {
      return (
        <div className={modalClasses}>
          <div className="gulf-services-modal-content">
            <button type="button" className="gulf-services-modal-close" aria-label="Close attestation dialog" onClick={closeModal}>✕</button>
            <h2>Document Attestation Request</h2>
            <form className="gulf-services-form" onSubmit={submitAttestation}>
              <div className="gulf-services-form-grid">
                <input name="fullName" placeholder="Full name" value={attestationForm.fullName} onChange={handleInputChange(setAttestationForm)} required />
                <input name="email" type="email" placeholder="Email" value={attestationForm.email} onChange={handleInputChange(setAttestationForm)} required />
                <input name="phone" placeholder="Phone" value={attestationForm.phone} onChange={handleInputChange(setAttestationForm)} required />
                <select name="documentType" value={attestationForm.documentType} onChange={handleInputChange(setAttestationForm)}>
                  <option value="degree">Degree</option>
                  <option value="marriage">Marriage Certificate</option>
                  <option value="birth">Birth Certificate</option>
                  <option value="police_clearance">PCC</option>
                  <option value="character">Character Certificate</option>
                </select>
                <input name="documentName" placeholder="Document name" value={attestationForm.documentName} onChange={handleInputChange(setAttestationForm)} required />
                <select name="country" value={attestationForm.country} onChange={handleInputChange(setAttestationForm)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <select name="urgency" value={attestationForm.urgency} onChange={handleInputChange(setAttestationForm)}>
                  <option value="standard">Standard</option>
                  <option value="expedited">Expedited</option>
                  <option value="emergency">Emergency</option>
                </select>
                <label className="full-width">
                  Upload document
                  <input name="documentFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => handleFileChange(e, setAttestationForm)} />
                </label>
              </div>
              {attestationForm.urgency !== 'standard' && (
                <div className="gulf-services-payment-card">
                  <p>Expedited processing incurs an additional fee.</p>
                  <button type="button" className="btn btn-secondary" onClick={requestAttestationPayment} disabled={loading}>
                    Create payment intent
                  </button>
                  {paymentIntentInfo && (
                    <div className="gulf-services-payment-info">
                      <strong>Payment intent created.</strong>
                      <pre>{JSON.stringify(paymentIntentInfo, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
              <div className="gulf-services-form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>Submit request</button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (activeModal === 'recruiter') {
      return (
        <div className={modalClasses}>
          <div className="gulf-services-modal-content">
            <button type="button" className="gulf-services-modal-close" aria-label="Close recruiter application" onClick={closeModal}>✕</button>
            <h2>Recruiter Onboarding Application</h2>
            <form className="gulf-services-form" onSubmit={submitRecruiterApplication}>
              <div className="gulf-services-form-grid">
                <input name="fullName" placeholder="Your full name" value={recruiterForm.fullName} onChange={handleInputChange(setRecruiterForm)} required />
                <input name="email" type="email" placeholder="Email" value={recruiterForm.email} onChange={handleInputChange(setRecruiterForm)} required />
                <input name="phone" placeholder="Phone" value={recruiterForm.phone} onChange={handleInputChange(setRecruiterForm)} required />
                <input name="companyName" placeholder="Agency / company name" value={recruiterForm.companyName} onChange={handleInputChange(setRecruiterForm)} required />
                <input name="licenseNumber" placeholder="Recruiter license number" value={recruiterForm.licenseNumber} onChange={handleInputChange(setRecruiterForm)} required />
                <select name="country" value={recruiterForm.country} onChange={handleInputChange(setRecruiterForm)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <input name="website" placeholder="Website or agency page" value={recruiterForm.website} onChange={handleInputChange(setRecruiterForm)} />
                <textarea name="experienceSummary" placeholder="Experience summary" value={recruiterForm.experienceSummary} onChange={handleInputChange(setRecruiterForm)} rows="3" />
                <label className="full-width">
                  Upload KYC document
                  <input name="kycDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => handleFileChange(e, setRecruiterForm)} />
                </label>
              </div>
              <div className="gulf-services-form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>Submit application</button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (activeModal === 'lead') {
      return (
        <div className={modalClasses}>
          <div className="gulf-services-modal-content">
            <button type="button" className="gulf-services-modal-close" aria-label="Close callback dialog" onClick={closeModal}>✕</button>
            <h2>Request Gulf Support Callback</h2>
            <form className="gulf-services-form" onSubmit={submitLead}>
              <div className="gulf-services-form-grid">
                <input name="fullName" placeholder="Full name" value={leadForm.fullName} onChange={handleInputChange(setLeadForm)} required />
                <input name="email" type="email" placeholder="Email" value={leadForm.email} onChange={handleInputChange(setLeadForm)} required />
                <input name="phone" placeholder="Phone" value={leadForm.phone} onChange={handleInputChange(setLeadForm)} required />
                <select name="serviceType" value={leadForm.serviceType} onChange={handleInputChange(setLeadForm)}>
                  <option value="visa">Visa Support</option>
                  <option value="jobs">Gulf Jobs</option>
                  <option value="attestation">Document Attestation</option>
                  <option value="travel">Travel Support</option>
                  <option value="medical">Medical/PCC</option>
                  <option value="emergency">Emergency Help</option>
                </select>
                <select name="country" value={leadForm.country} onChange={handleInputChange(setLeadForm)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <label className="full-width">
                  Tell us more
                  <textarea name="message" placeholder="Your inquiry" value={leadForm.message} onChange={handleInputChange(setLeadForm)} rows="4" />
                </label>
              </div>
              <div className="gulf-services-form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>Request callback</button>
                <button type="button" className="btn btn-outline" onClick={() => window.open(`https://wa.me/${DEFAULT_SUPPORT_WHATSAPP}`, '_blank')}>
                  Contact WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (activeModal === 'fraud') {
      return (
        <div className={modalClasses}>
          <div className="gulf-services-modal-content">
            <button type="button" className="gulf-services-modal-close" aria-label="Close fraud dialog" onClick={closeModal}>✕</button>
            <h2>Report Fraudulent Recruitment</h2>
            <div className="gulf-services-fraud-warning">
              ⚠️ <strong>No legitimate recruiter asks for advance fees.</strong> Report suspicious offers here.
            </div>
            <form className="gulf-services-form" onSubmit={submitFraudReport}>
              <div className="gulf-services-form-grid">
                <input name="phone" placeholder="Your phone" value={fraudForm.phone} onChange={handleInputChange(setFraudForm)} required />
                <input name="recruiterId" placeholder="Recruiter/Company name" value={fraudForm.recruiterId} onChange={handleInputChange(setFraudForm)} />
                <label className="full-width">
                  Describe the fraud issue
                  <textarea name="issueDescription" placeholder="What happened?" value={fraudForm.issueDescription} onChange={handleInputChange(setFraudForm)} rows="4" required />
                </label>
              </div>
              <div className="gulf-services-form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>Report fraud</button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPanel = () => {
    if (activePane === 'jobs') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-panel-left">
            <div className="gulf-services-card gulf-services-card-featured">
              <h2>Gulf Jobs & Application Center</h2>
              <p>Filter by country, category and salary, then choose a verified recruiter-backed opportunity to apply.</p>
            </div>
            <div className="gulf-services-job-filters">
              <label>
                Country
                <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select name="category" value={jobFilters.category} onChange={handleInputChange(setJobFilters)}>
                  <option value="">All categories</option>
                  {availableJobCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className="gulf-services-salary-range">
                <label>
                  Min salary
                  <input name="salaryMin" value={jobFilters.salaryMin} onChange={handleInputChange(setJobFilters)} placeholder="2000" />
                </label>
                <label>
                  Max salary
                  <input name="salaryMax" value={jobFilters.salaryMax} onChange={handleInputChange(setJobFilters)} placeholder="4000" />
                </label>
              </div>
            </div>
            <div className="gulf-services-job-list">
              {filteredJobs.length ? (
                filteredJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className={`gulf-services-job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <strong>{job.title}</strong>
                    <span>{job.company}</span>
                    <p>{job.summary}</p>
                  </button>
                ))
              ) : (
                <div className="gulf-services-card">
                  <p>No jobs found for this filter. Try changing the category or country.</p>
                </div>
              )}
            </div>
          </div>
          <div className="gulf-services-panel-right">
            {selectedJob ? (
              <article className="gulf-services-card gulf-services-job-detail">
                <h3>{selectedJob.title}</h3>
                <p>{selectedJob.description || selectedJob.summary}</p>
                <div className="gulf-services-job-meta">
                  <span>{selectedJob.company}</span>
                  <span>{selectedJob.country}</span>
                  <span>₹{selectedJob.salary?.min} - ₹{selectedJob.salary?.max}</span>
                </div>
                <form className="gulf-services-form" onSubmit={submitJobApplication}>
                  <h4>Apply for this job</h4>
                  <label>
                    Full name
                    <input name="fullName" value={jobApplicationForm.fullName} onChange={handleInputChange(setJobApplicationForm)} required />
                  </label>
                  <label>
                    Email
                    <input name="email" value={jobApplicationForm.email} onChange={handleInputChange(setJobApplicationForm)} type="email" required />
                  </label>
                  <label>
                    Phone
                    <input name="phone" value={jobApplicationForm.phone} onChange={handleInputChange(setJobApplicationForm)} required />
                  </label>
                  <label>
                    Passport number
                    <input name="passportNo" value={jobApplicationForm.passportNo} onChange={handleInputChange(setJobApplicationForm)} required />
                  </label>
                  <label>
                    Experience (years)
                    <input name="experience" value={jobApplicationForm.experience} onChange={handleInputChange(setJobApplicationForm)} type="number" min="0" />
                  </label>
                  <label>
                    Current company
                    <input name="currentCompany" value={jobApplicationForm.currentCompany} onChange={handleInputChange(setJobApplicationForm)} />
                  </label>
                  <label>
                    Expected salary
                    <input name="expectedSalary" value={jobApplicationForm.expectedSalary} onChange={handleInputChange(setJobApplicationForm)} type="number" />
                  </label>
                  <label>
                    Availability (days)
                    <input name="availabilityDays" value={jobApplicationForm.availabilityDays} onChange={handleInputChange(setJobApplicationForm)} type="number" min="15" />
                  </label>
                  <label>
                    Upload CV
                    <input name="cvFile" type="file" accept=".pdf,.doc,.docx" onChange={(event) => handleFileChange(event, setJobApplicationForm)} />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Submit Application</button>
                </form>
              </article>
            ) : (
              <div className="gulf-services-card">
                <h3>Select a job from the left to view details and apply.</h3>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activePane === 'visa') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-card">
            <h2>Visa Enquiry and Tracking</h2>
            <p>Submit your visa details, upload documents, and track the request from your Gulf Services dashboard.</p>
            <form className="gulf-services-form" onSubmit={submitVisa}>
              <label>
                Full name
                <input name="fullName" value={visaForm.fullName} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={visaForm.email} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Phone
                <input name="phone" value={visaForm.phone} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Country
                <select name="country" value={visaForm.country} onChange={handleInputChange(setVisaForm)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label>
                Visa type
                <select name="visaType" value={visaForm.visaType} onChange={handleInputChange(setVisaForm)}>
                  <option value="Visit">Visit</option>
                  <option value="Employment">Employment</option>
                  <option value="Family">Family</option>
                  <option value="Student">Student</option>
                  <option value="Business">Business</option>
                </select>
              </label>
              <label>
                Urgency
                <select name="urgency" value={visaForm.urgency} onChange={handleInputChange(setVisaForm)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
              <label>
                Current location
                <input name="currentLocation" value={visaForm.currentLocation} onChange={handleInputChange(setVisaForm)} required />
              </label>
              <label>
                Additional message
                <textarea name="message" value={visaForm.message} onChange={handleInputChange(setVisaForm)} rows="4" />
              </label>
              <button type="submit" className="btn btn-primary" disabled={loading}>Submit visa enquiry</button>
            </form>
          </div>
        </section>
      );
    }

    if (activePane === 'attestation') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-card">
            <h2>Document Attestation Request</h2>
            <p>Upload your document and receive full tracking for MEA, embassy and HRD verification.</p>
            <form className="gulf-services-form" onSubmit={submitAttestation}>
              <label>
                Full name
                <input name="fullName" value={attestationForm.fullName} onChange={handleInputChange(setAttestationForm)} required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={attestationForm.email} onChange={handleInputChange(setAttestationForm)} required />
              </label>
              <label>
                Phone
                <input name="phone" value={attestationForm.phone} onChange={handleInputChange(setAttestationForm)} required />
              </label>
              <label>
                Document type
                <select name="documentType" value={attestationForm.documentType} onChange={handleInputChange(setAttestationForm)}>
                  <option value="degree">Degree</option>
                  <option value="marriage">Marriage Certificate</option>
                  <option value="birth">Birth Certificate</option>
                  <option value="police_clearance">PCC</option>
                  <option value="character">Character Certificate</option>
                </select>
              </label>
              <label>
                Document name
                <input name="documentName" value={attestationForm.documentName} onChange={handleInputChange(setAttestationForm)} required />
              </label>
              <label>
                Country
                <select name="country" value={attestationForm.country} onChange={handleInputChange(setAttestationForm)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label>
                Urgency
                <select name="urgency" value={attestationForm.urgency} onChange={handleInputChange(setAttestationForm)}>
                  <option value="standard">Standard</option>
                  <option value="expedited">Expedited</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
              <label>
                Upload document
                <input name="documentFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => handleFileChange(e, setAttestationForm)} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={loading}>Submit request</button>
            </form>
          </div>
        </section>
      );
    }

    if (activePane === 'dashboard') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-card">
            <h2>My Gulf Services Dashboard</h2>
            <p>Track all open visa enquiries, applications, attestations, and service requests from one place.</p>
            {dashboard ? (
              <>
                <div className="gulf-services-dashboard-summary">
                  <div>
                    <strong>Pending actions</strong>
                    <p>{dashboard.pendingActions}</p>
                  </div>
                  <div>
                    <strong>Visa requests</strong>
                    <p>{dashboard.visaRequests.length}</p>
                  </div>
                  <div>
                    <strong>Job applications</strong>
                    <p>{dashboard.jobApplications.length}</p>
                  </div>
                  <div>
                    <strong>Attestations</strong>
                    <p>{dashboard.attestations.length}</p>
                  </div>
                </div>
                {isAdminUser && adminAnalytics ? (
                  <div className="gulf-services-dashboard-summary gulf-services-dashboard-analytics">
                    <div>
                      <strong>Pending recruiters</strong>
                      <p>{adminAnalytics.pendingRecruiterCount}</p>
                    </div>
                    <div>
                      <strong>Active recruiters</strong>
                      <p>{adminAnalytics.activeRecruiterCount}</p>
                    </div>
                    <div>
                      <strong>Open applications</strong>
                      <p>{adminAnalytics.applicationStatusCounts?.Applied || 0}</p>
                    </div>
                    <div>
                      <strong>Pending attestations</strong>
                      <p>{adminAnalytics.attestationStatusCounts?.document_received || 0}</p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div>
                <button type="button" className="btn btn-primary" onClick={loadDashboard} disabled={loading}>
                  Load dashboard
                </button>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activePane === 'tracking') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-card">
            <h2>Track Request</h2>
            <form className="gulf-services-form" onSubmit={submitTrackRequest}>
              <label>
                Type
                <select name="type" value={trackRequest.type} onChange={(event) => setTrackRequest((prev) => ({ ...prev, type: event.target.value }))}>
                  <option value="visa">Visa</option>
                  <option value="attestation">Attestation</option>
                </select>
              </label>
              <label>
                Request ID
                <input name="requestId" value={trackRequest.requestId} onChange={handleInputChange(setTrackRequest)} required />
              </label>
              <label>
                Email used for request
                <input name="email" type="email" value={trackRequest.email} onChange={handleInputChange(setTrackRequest)} required />
              </label>
              <button type="submit" className="btn btn-primary" disabled={loading}>Track request</button>
            </form>
            {trackResult && (
              <div className="gulf-services-tracking-result">
                <h3>Status: {trackResult.status || 'Unknown'}</h3>
                {trackResult.timeline && (
                  <div className="gulf-services-timeline">
                    {trackResult.timeline.map((entry, idx) => (
                      <div key={idx} className="gulf-services-timeline-entry">
                        <span className="gulf-services-timeline-status">{entry.status}</span>
                        <span className="gulf-services-timeline-date">{new Date(entry.date).toLocaleDateString()}</span>
                        <p>{entry.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activePane === 'workflow') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-card gulf-services-workflow">
            <h2>Gulf Workflow 10/10</h2>
            <p>Document checklist, visa stage pipeline, and application lifecycle from apply to travel ready.</p>
            <div className="gulf-services-workflow-grid">
              <article className="gulf-services-card">
                <h3>Document Checklist</h3>
                <p>Readiness score: <strong>{documentReadinessScore}%</strong></p>
                <div className="gulf-services-checklist">
                  {DOCUMENT_CHECKLIST.map((doc) => (
                    <label key={doc}>
                      <input
                        type="checkbox"
                        checked={checkedDocs.includes(doc)}
                        onChange={() => toggleChecklistDoc(doc)}
                      />
                      <span>{doc}</span>
                    </label>
                  ))}
                </div>
                <div className="gulf-services-fraud-warning">
                  Never pay money to unverified agents. Ask for license, offer letter, visa proof and receipt.
                </div>
              </article>

              <article className="gulf-services-card">
                <h3>Visa Tracker Stages</h3>
                <div className="gulf-services-status-track">
                  {VISA_WORKFLOW_STATUSES.map((status) => (
                    <span key={status}>{status}</span>
                  ))}
                </div>
              </article>
            </div>

            <article className="gulf-services-card" style={{ marginTop: '16px' }}>
              <h3>My Applications</h3>
              {myApplications.length === 0 ? (
                <p>No tracked applications yet. Apply to a job to start your pipeline.</p>
              ) : (
                <div className="gulf-services-app-list">
                  {myApplications.map((item) => (
                    <div key={item._id} className="gulf-services-app-item">
                      <div>
                        <strong>{item.jobTitle || 'Gulf Application'}</strong>
                        <p>{item.country} • {item.company || 'Company pending'}</p>
                        <small>Passport: {item.passportNo || 'N/A'}</small>
                      </div>
                      <div>
                        <span className="gulf-services-app-status">{item.visaStatus || 'Applied'}</span>
                        <small>{new Date(item.updatedAt || item.createdAt).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            {isAdminUser ? (
              <article className="gulf-services-card" style={{ marginTop: '16px' }}>
                <h3>Admin: Agent + Visa Status Updates</h3>
                <div className="gulf-services-form-grid">
                  <select
                    name="visaStatus"
                    value={adminFilters.visaStatus}
                    onChange={(event) => setAdminFilters((prev) => ({ ...prev, visaStatus: event.target.value }))}
                  >
                    <option value="">All statuses</option>
                    {VISA_WORKFLOW_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select
                    name="country"
                    value={adminFilters.country}
                    onChange={(event) => setAdminFilters((prev) => ({ ...prev, country: event.target.value }))}
                  >
                    <option value="">All countries</option>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Search name/phone/passport/job"
                    value={adminFilters.search}
                    onChange={(event) => setAdminFilters((prev) => ({ ...prev, search: event.target.value }))}
                  />
                  <button type="button" className="btn btn-secondary" onClick={loadAdminApplications}>Load</button>
                </div>
                <div className="gulf-services-app-list">
                  {adminApplications.map((item) => {
                    const draft = adminUpdateDrafts[item._id] || {};
                    return (
                      <div key={item._id} className="gulf-services-app-item gulf-services-app-item-admin">
                        <div>
                          <strong>{item.name}</strong>
                          <p>{item.jobTitle} • {item.country} • {item.phone}</p>
                          <small>Agent: {item.agentName || 'Unassigned'} {item.agentVerified ? '• Verified' : ''}</small>
                        </div>
                        <div className="gulf-services-admin-actions">
                          <select
                            value={draft.visaStatus || item.visaStatus || 'Applied'}
                            onChange={(event) =>
                              setAdminUpdateDrafts((prev) => ({
                                ...prev,
                                [item._id]: { ...draft, visaStatus: event.target.value },
                              }))
                            }
                          >
                            {VISA_WORKFLOW_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <input
                            placeholder="Agent name"
                            value={draft.agentName ?? item.agentName ?? ''}
                            onChange={(event) =>
                              setAdminUpdateDrafts((prev) => ({
                                ...prev,
                                [item._id]: { ...draft, agentName: event.target.value },
                              }))
                            }
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(draft.agentVerified ?? item.agentVerified)}
                              onChange={(event) =>
                                setAdminUpdateDrafts((prev) => ({
                                  ...prev,
                                  [item._id]: { ...draft, agentVerified: event.target.checked },
                                }))
                              }
                            />
                            Verified
                          </label>
                          <input
                            placeholder="Admin note"
                            value={draft.adminNote ?? item.adminNote ?? ''}
                            onChange={(event) =>
                              setAdminUpdateDrafts((prev) => ({
                                ...prev,
                                [item._id]: { ...draft, adminNote: event.target.value },
                              }))
                            }
                          />
                          <button type="button" className="btn btn-primary" onClick={() => handleAdminStatusUpdate(item._id)}>
                            Update
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!adminApplications.length ? <p>No admin application records found.</p> : null}
                </div>
                <hr />
                <div className="gulf-services-admin-recruiter-section">
                  <div className="gulf-services-admin-toolbar">
                    <button type="button" className="btn btn-secondary" onClick={loadPendingRecruiters} disabled={loading}>
                      Load pending recruiters
                    </button>
                  </div>
                  {pendingRecruiters.length ? (
                    pendingRecruiters.map((recruiter) => {
                      const draft = pendingRecruiterDrafts[recruiter._id] || {};
                      return (
                        <div key={recruiter._id} className="gulf-services-app-item gulf-services-app-item-admin">
                          <div>
                            <strong>{recruiter.name}</strong>
                            <p>{recruiter.companyName || 'Recruiter application'} • {recruiter.country}</p>
                            <small>License: {recruiter.licenseNumber || 'N/A'} • Status: {recruiter.status}</small>
                          </div>
                          <div className="gulf-services-admin-actions">
                            <input
                              placeholder="Review note"
                              value={draft.adminNote || ''}
                              onChange={(event) =>
                                setPendingRecruiterDrafts((prev) => ({
                                  ...prev,
                                  [recruiter._id]: { ...draft, adminNote: event.target.value },
                                }))
                              }
                            />
                            <button type="button" className="btn btn-primary" onClick={() => handleRecruiterVerification(recruiter._id, true)}>
                              Approve
                            </button>
                            <button type="button" className="btn btn-outline" onClick={() => handleRecruiterVerification(recruiter._id, false)}>
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>No pending recruiter applications found. Click load to refresh.</p>
                  )}
                </div>
              </article>
            ) : null}
          </div>
        </section>
      );
    }

    if (activePane === 'emergency') {
      return (
        <section className="gulf-services-panel gulf-services-action-panel">
          <div className="gulf-services-card gulf-services-card-emergency">
            <h2>🚨 Emergency Support</h2>
            <p>Passport lost, visa expired, or urgent Gulf crisis? Get immediate help.</p>
            <form className="gulf-services-form" onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              try {
                const response = await gulfservicesApi.reportEmergency({
                  issueType: 'Urgent Gulf Support',
                  description: 'Emergency support requested from frontend.',
                  phone: visaForm.phone || '',
                  country: selectedCountry,
                  message: 'Please contact me urgently for Gulf emergency support.',
                });
                showMessage(response.message || 'Emergency support requested. We will contact you shortly.');
              } catch (error) {
                showMessage(error?.response?.data?.message || 'Unable to submit emergency request.');
              } finally {
                setLoading(false);
              }
            }}>
              <label>
                Country
                <select name="country" value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label>
                Your phone
                <input value={visaForm.phone} onChange={(event) => setVisaForm((prev) => ({ ...prev, phone: event.target.value }))} required />
              </label>
              <button type="submit" className="btn btn-primary" disabled={loading}>Notify support team now</button>
              <button type="button" className="btn btn-outline" onClick={() => window.open(`tel:${DEFAULT_SUPPORT_PHONE}`)}>
                📞 Call 24/7 Emergency Line
              </button>
            </form>
          </div>
        </section>
      );
    }

    return (
      <section className="gulf-services-features">
        <div className="gulf-services-notice">
          <div>
            <strong>Trusted Gulf Support Platform</strong>
            <p>Your complete ecosystem for visa, jobs, attestation, travel and emergency support with verified Gulf partners.</p>
          </div>
          <div className="gulf-services-notice-actions">
            <button type="button" className="btn btn-primary" onClick={() => setActiveModal('visa')}>Start Visa Support</button>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('jobs')}>Explore Gulf Jobs</button>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('recruiter')}>Apply as Recruiter</button>
            <button type="button" className="btn btn-outline" onClick={() => setActivePane('workflow')}>Open 10/10 Workflow</button>
            <button type="button" className="btn btn-outline" onClick={() => setActiveModal('lead')}>Request Callback</button>
          </div>
        </div>

        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>All Gulf Services</h2>
        <div className="gulf-services-grid">
          {SERVICE_CATEGORIES.map((service) => (
            <button
              type="button"
              key={service.id}
              className="gulf-services-card gulf-services-action-card"
              onClick={() => handleServiceSelection(service.id)}
            >
              <span className="gulf-services-icon">{service.icon}</span>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </button>
          ))}
        </div>

        <div className="gulf-services-trust-section">
          <h2>Why Choose Our Platform?</h2>
          <div className="gulf-services-trust-grid">
            <div className="gulf-services-card">
              <strong>✓ Verified Agencies</strong>
              <p>Only govt-registered Gulf agencies with valid licenses and public reviews.</p>
            </div>
            <div className="gulf-services-card">
              <strong>✓ No Advance Fees</strong>
              <p>We warn against any recruiter demanding upfront payments.</p>
            </div>
            <div className="gulf-services-card">
              <strong>✓ Fraud Protection</strong>
              <p>Report fake jobs/recruiters and get verified opportunities only.</p>
            </div>
            <div className="gulf-services-card">
              <strong>✓ Document Safety</strong>
              <p>Your documents are encrypted and handled by certified partners.</p>
            </div>
            <div className="gulf-services-card">
              <strong>✓ Full Tracking</strong>
              <p>Real-time status updates for visa, attestation and applications.</p>
            </div>
            <div className="gulf-services-card">
              <strong>✓ 24/7 Support</strong>
              <p>Emergency helpline and WhatsApp support for urgent cases.</p>
            </div>
          </div>
        </div>

        <div className="gulf-services-fraud-banner">
          <h3>⚠️ Fraud Warning</h3>
          <p><strong>Do NOT send money to unknown accounts.</strong> No legitimate Gulf recruiter or agency asks for advance payment, registration fees, or deposits before employment.</p>
          <button type="button" className="btn btn-primary" onClick={() => setActiveModal('fraud')}>
            Report Fraud
          </button>
        </div>

        <div className="gulf-services-recruiter-panel">
          <div className="gulf-services-recruiter-panel-header">
            <h2>Verified Recruiters on Our Platform</h2>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('recruiter')}>Recruiter Onboarding</button>
          </div>
          <div className="gulf-services-job-list">
            {(recruiters.length ? recruiters : SAMPLE_RECRUITERS).map((recruiter) => (
              <article key={recruiter.id} className="gulf-services-card gulf-services-recruiter-card">
                <div className="gulf-services-recruiter-header">
                  <strong>{recruiter.name}</strong>
                  {recruiter.verified && <span className="gulf-services-badge-verified">✓ Verified</span>}
                </div>
                <span>{recruiter.country}</span>
                <p>License: {recruiter.licenseNumber}</p>
                <p>{recruiter.successCases} successful placements • {recruiter.rating}★ ({recruiter.reviews} reviews)</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="gulf-services-page">
      <header className="gulf-services-hero">
        <div>
          <span className="gulf-services-badge">Gulf Services</span>
          <h1>{t('gulfservices.title', 'Complete Gulf Support Hub')}</h1>
          <p>{t('gulfservices.subtitle', 'Visa, jobs, travel, attestation, NRI support and returnee services for Kerala families with Gulf connections.')}</p>
          <div className="gulf-services-hero-actions">
            <button className="btn btn-primary" type="button" onClick={() => setActiveModal('visa')}>Start Visa Support</button>
            <button className="btn btn-secondary" type="button" onClick={() => setActiveModal('jobs')}>Explore Gulf Jobs</button>
            <button className="btn btn-outline" type="button" onClick={() => setActiveModal('lead')}>Get Callback</button>
          </div>
        </div>
        <div className="gulf-services-hero-summary">
          <div>
            <strong>Visa Reminders</strong>
            <p>Expiry, renewal, and embassy appointment alerts.</p>
          </div>
          <div>
            <strong>Verified Recruiters</strong>
            <p>Only trusted Gulf employers and follow-ups.</p>
          </div>
          <div>
            <strong>Attestation Tracking</strong>
            <p>Monitor MEA, embassy and domestic verification status.</p>
          </div>
          <div>
            <strong>Document Readiness</strong>
            <p>{documentReadinessScore}% complete ({checkedDocs.length}/{DOCUMENT_CHECKLIST.length})</p>
          </div>
        </div>
      </header>
      <nav className="gulf-services-tabbar" aria-label="Gulf services sections">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`gulf-services-tab ${activePane === tab.id ? 'active' : ''}`}
            onClick={() => {
              closeModal();
              setActivePane(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {message && <div className="gulf-services-toast">{message}</div>}
      {activeModal && <div className="gulf-services-modal-overlay" onClick={closeModal} />}
      {renderModal()}
      {renderPanel()}
    </div>
  );
};

export default GulfServices;
