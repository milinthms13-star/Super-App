import axios from "axios";
import { BACKEND_BASE_URL } from "../../utils/api";

const FINANCE_API_BASE = `${BACKEND_BASE_URL}/api/finance`;
const AUTH_API_BASE = `${BACKEND_BASE_URL}/api/auth`;

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.append(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export const financeApi = {
  getAuthProfile: async () => {
    const response = await axios.get(`${AUTH_API_BASE}/me`);
    return response.data;
  },

  getInstitutions: async (params = {}) => {
    const response = await axios.get(`${FINANCE_API_BASE}/institutions${buildQueryString(params)}`);
    return response.data;
  },

  saveEligibility: async (payload) => {
    const response = await axios.post(`${FINANCE_API_BASE}/eligibility`, payload);
    return response.data;
  },

  createLead: async (formData) => {
    const response = await axios.post(`${FINANCE_API_BASE}/leads`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getLeads: async (params = {}) => {
    const response = await axios.get(`${FINANCE_API_BASE}/leads${buildQueryString(params)}`);
    return response.data;
  },

  assignConsultant: async (leadId, payload) => {
    const response = await axios.patch(`${FINANCE_API_BASE}/leads/${encodeURIComponent(leadId)}/assign`, payload);
    return response.data;
  },

  updateLeadStatus: async (leadId, payload) => {
    const response = await axios.patch(`${FINANCE_API_BASE}/leads/${encodeURIComponent(leadId)}/status`, payload);
    return response.data;
  },

  updateCommission: async (leadId, payload) => {
    const response = await axios.patch(`${FINANCE_API_BASE}/leads/${encodeURIComponent(leadId)}/commission`, payload);
    return response.data;
  },

  requestDataDeletion: async (payload) => {
    const response = await axios.post(`${FINANCE_API_BASE}/data-deletion`, payload);
    return response.data;
  },

  getUserDashboard: async (phone) => {
    const response = await axios.get(`${FINANCE_API_BASE}/dashboard/user${buildQueryString({ phone })}`);
    return response.data;
  },

  getConsultantDashboard: async (consultantId) => {
    const response = await axios.get(
      `${FINANCE_API_BASE}/dashboard/consultant${buildQueryString({ consultantId })}`
    );
    return response.data;
  },

  getInstitutionDashboard: async (institutionId) => {
    const response = await axios.get(
      `${FINANCE_API_BASE}/dashboard/institution${buildQueryString({ institutionId })}`
    );
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await axios.get(`${FINANCE_API_BASE}/dashboard/admin`);
    return response.data;
  },

  getCommissionDashboard: async () => {
    const response = await axios.get(`${FINANCE_API_BASE}/dashboard/commission`);
    return response.data;
  },

  getAuditLogs: async (limit = 20) => {
    const response = await axios.get(`${FINANCE_API_BASE}/admin/audit${buildQueryString({ limit })}`);
    return response.data;
  },
};
