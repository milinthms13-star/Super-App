import axios from 'axios';
import { BACKEND_BASE_URL } from '../../utils/api';
import { getStoredAuthToken } from '../../utils/auth';

const BASE = `${BACKEND_BASE_URL}/api/gulfservices`;
const handleResponse = (response) => response.data;
const buildAuthHeaders = () => {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const gulfservicesApi = {
  getCurrentUser: async () =>
    handleResponse(
      await axios.get(`${BACKEND_BASE_URL}/api/auth/me`, {
        headers: buildAuthHeaders(),
      })
    ),
  bootstrap: async () => handleResponse(await axios.get(`${BASE}/bootstrap`)),
  getJobs: async (filters = {}) => handleResponse(await axios.get(`${BASE}/jobs`, { params: filters })),
  getJobDetails: async (jobId) => handleResponse(await axios.get(`${BASE}/jobs/${encodeURIComponent(jobId)}`)),
  applyJob: async (jobId, formData) =>
    handleResponse(await axios.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/apply`, formData)),
  submitVisaEnquiry: async (data) => handleResponse(await axios.post(`${BASE}/visa/enquire`, data)),
  submitAttestation: async (formData) => handleResponse(await axios.post(`${BASE}/attestation/request`, formData)),
  trackRequest: async (type, requestId, email) =>
    handleResponse(
      await axios.get(`${BASE}/${type}/track/${encodeURIComponent(requestId)}`, {
        params: { email },
      })
    ),
  trackServiceRequest: async (serviceType, requestId, email) =>
    handleResponse(
      await axios.get(`${BASE}/services/track/${encodeURIComponent(serviceType)}/${encodeURIComponent(requestId)}`, {
        params: { email },
        headers: buildAuthHeaders(),
      })
    ),
  getDashboard: async () =>
    handleResponse(
      await axios.get(`${BASE}/user/dashboard`, {
        headers: buildAuthHeaders(),
      })
    ),
  reportEmergency: async (data) => handleResponse(await axios.post(`${BASE}/emergency/report`, data)),
  submitTravelSupport: async (data) => handleResponse(await axios.post(`${BASE}/travel/request`, data)),
  submitMedicalSupport: async (data) => handleResponse(await axios.post(`${BASE}/medical/request`, data)),
  submitReturneeSupport: async (data) => handleResponse(await axios.post(`${BASE}/returnee/request`, data)),
  submitNriSupport: async (data) => handleResponse(await axios.post(`${BASE}/nri/request`, data)),
  getVerifiedRecruiters: async () => handleResponse(await axios.get(`${BASE}/recruiters/verified`)),
  reportFraud: async (data) => handleResponse(await axios.post(`${BASE}/fraud/report`, data)),
  createApplication: async (data) =>
    handleResponse(
      await axios.post(`${BASE}/applications`, data, {
        headers: buildAuthHeaders(),
      })
    ),
  createPaymentIntent: async (data, options = {}) =>
    handleResponse(
      await axios.post(`${BASE}/payments/create`, data, {
        headers: {
          ...buildAuthHeaders(),
          ...(options.idempotencyKey ? { 'x-idempotency-key': options.idempotencyKey } : {}),
        },
      })
    ),
  getAdminAnalytics: async () =>
    handleResponse(
      await axios.get(`${BASE}/admin/analytics`, {
        headers: buildAuthHeaders(),
      })
    ),
  applyRecruiter: async (formData) =>
    handleResponse(
      await axios.post(`${BASE}/recruiters/apply`, formData, {
        headers: buildAuthHeaders(),
      })
    ),
  getPendingRecruiters: async (params = {}) =>
    handleResponse(
      await axios.get(`${BASE}/admin/recruiters/pending`, {
        params,
        headers: buildAuthHeaders(),
      })
    ),
  verifyRecruiter: async (id, data) =>
    handleResponse(
      await axios.put(`${BASE}/admin/recruiters/${encodeURIComponent(id)}/verify`, data, {
        headers: buildAuthHeaders(),
      })
    ),
  getMyApplications: async () =>
    handleResponse(
      await axios.get(`${BASE}/applications/my`, {
        headers: buildAuthHeaders(),
      })
    ),
  getAdminApplications: async (filters = {}) =>
    handleResponse(
      await axios.get(`${BASE}/admin/applications`, {
        params: filters,
        headers: buildAuthHeaders(),
      })
    ),
  updateApplicationStatus: async (id, data) =>
    handleResponse(
      await axios.put(`${BASE}/admin/applications/${encodeURIComponent(id)}/status`, data, {
        headers: buildAuthHeaders(),
      })
    ),
  getAdminFraudReports: async (status = '', options = {}) =>
    handleResponse(
      await axios.get(`${BASE}/admin/fraud-reports`, {
        params: {
          ...(status ? { status } : {}),
          ...(options.page ? { page: options.page } : {}),
          ...(options.limit ? { limit: options.limit } : {}),
        },
        headers: buildAuthHeaders(),
      })
    ),
  updateAdminFraudStatus: async (reportId, data) =>
    handleResponse(
      await axios.put(`${BASE}/admin/fraud-reports/${encodeURIComponent(reportId)}/status`, data, {
        headers: buildAuthHeaders(),
      })
    ),
};
