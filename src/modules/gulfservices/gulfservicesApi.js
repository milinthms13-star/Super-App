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
  getDashboard: async () =>
    handleResponse(
      await axios.get(`${BASE}/user/dashboard`, {
        headers: buildAuthHeaders(),
      })
    ),
  reportEmergency: async (data) => handleResponse(await axios.post(`${BASE}/emergency/report`, data)),
  getVerifiedRecruiters: async () => handleResponse(await axios.get(`${BASE}/recruiters/verified`)),
  reportFraud: async (data) => handleResponse(await axios.post(`${BASE}/fraud/report`, data)),
};
