import axios from "axios";
import { BACKEND_BASE_URL } from "../../../utils/api";
import { getStoredAuthToken } from "../../../utils/auth";

const BASE = `${BACKEND_BASE_URL}/api/jobportal`;

const authHeaders = () => {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrap = (response) => response.data;

export const jobPortalApi = {
  getJobs: async (params = {}) => unwrap(await axios.get(`${BASE}/jobs`, { params })),
  getJob: async (jobId) => unwrap(await axios.get(`${BASE}/jobs/${encodeURIComponent(jobId)}`)),
  applyJob: async (jobId, formData) =>
    unwrap(
      await axios.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/apply`, formData, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      })
    ),
  reportJob: async (jobId, payload) =>
    unwrap(await axios.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/report`, payload, { headers: authHeaders() })),
  getMyApplications: async () => unwrap(await axios.get(`${BASE}/my-applications`, { headers: authHeaders() })),
  getSavedJobs: async () => unwrap(await axios.get(`${BASE}/saved-jobs`, { headers: authHeaders() })),
  saveJob: async (jobId) =>
    unwrap(await axios.post(`${BASE}/saved-jobs/${encodeURIComponent(jobId)}`, {}, { headers: authHeaders() })),
  removeSavedJob: async (jobId) =>
    unwrap(await axios.delete(`${BASE}/saved-jobs/${encodeURIComponent(jobId)}`, { headers: authHeaders() })),
  getProfile: async () => unwrap(await axios.get(`${BASE}/profile`, { headers: authHeaders() })),
  updateProfile: async (formData) =>
    unwrap(
      await axios.put(`${BASE}/profile`, formData, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      })
    ),
  getEmployerProfile: async () => unwrap(await axios.get(`${BASE}/employer/profile`, { headers: authHeaders() })),
  updateEmployerProfile: async (formData) =>
    unwrap(
      await axios.put(`${BASE}/employer/profile`, formData, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      })
    ),
  createJob: async (payload) => unwrap(await axios.post(`${BASE}/jobs`, payload, { headers: authHeaders() })),
  updateJob: async (jobId, payload) =>
    unwrap(await axios.put(`${BASE}/jobs/${encodeURIComponent(jobId)}`, payload, { headers: authHeaders() })),
  getMyJobs: async () => unwrap(await axios.get(`${BASE}/my-jobs`, { headers: authHeaders() })),
  getEmployerDashboard: async () => unwrap(await axios.get(`${BASE}/employer/dashboard`, { headers: authHeaders() })),
  getJobApplications: async (jobId) =>
    unwrap(await axios.get(`${BASE}/jobs/${encodeURIComponent(jobId)}/applications`, { headers: authHeaders() })),
  updateApplicationStatus: async (applicationId, payload) =>
    unwrap(await axios.put(`${BASE}/applications/${encodeURIComponent(applicationId)}`, payload, { headers: authHeaders() })),
};
