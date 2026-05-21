import { financeHttpClient } from "./services/financeHttpClient";

const FINANCE_API_BASE = `/api/finance`;
const AUTH_API_BASE = `/api/auth`;

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `fin-${Date.now()}-${token}`;
  }
  return `fin-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};

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
    const response = await financeHttpClient.get(`${AUTH_API_BASE}/me`);
    return response.data;
  },

  getInstitutions: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institutions${buildQueryString(params)}`);
    return response.data;
  },

  saveEligibility: async (payload) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/eligibility`, payload);
    return response.data;
  },

  getEmiQuote: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/emi${buildQueryString(params)}`);
    return response.data;
  },

  createLead: async (formData, options = {}) => {
    const idempotencyKey = String(options.idempotencyKey || createIdempotencyKey()).trim();
    const sourceChannel = String(options.sourceChannel || "web").trim().toLowerCase() || "web";
    const device = options.device || {};
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/leads`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "x-idempotency-key": idempotencyKey,
        "x-source-channel": sourceChannel,
        "x-client-platform": String(device.platform || "web"),
        "x-app-version": String(device.appVersion || ""),
        "x-build-number": String(device.buildNumber || ""),
      },
    });
    return response.data;
  },

  getLeads: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/leads${buildQueryString(params)}`);
    return response.data;
  },

  assignConsultant: async (leadId, payload) => {
    const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/leads/${encodeURIComponent(leadId)}/assign`, payload);
    return response.data;
  },

  updateLeadStatus: async (leadId, payload) => {
    const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/leads/${encodeURIComponent(leadId)}/status`, payload);
    return response.data;
  },

  updateCommission: async (leadId, payload) => {
    const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/leads/${encodeURIComponent(leadId)}/commission`, payload);
    return response.data;
  },

  requestDataDeletion: async (payload) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/data-deletion`, payload);
    return response.data;
  },

  getDataDeletionRequests: async () => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/data-deletion/requests`);
    return response.data;
  },

  processDataDeletionRequest: async (leadId) => {
    const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/data-deletion/${encodeURIComponent(leadId)}/process`);
    return response.data;
  },

  getUserDashboard: async (phone) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/dashboard/user${buildQueryString({ phone })}`);
    return response.data;
  },

  getConsultantDashboard: async (consultantId) => {
    const response = await financeHttpClient.get(
      `${FINANCE_API_BASE}/dashboard/consultant${buildQueryString({ consultantId })}`
    );
    return response.data;
  },

  getInstitutionDashboard: async (institutionId) => {
    const response = await financeHttpClient.get(
      `${FINANCE_API_BASE}/dashboard/institution${buildQueryString({ institutionId })}`
    );
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/dashboard/admin`);
    return response.data;
  },

  getCommissionDashboard: async () => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/dashboard/commission`);
    return response.data;
  },

  getAuditLogs: async (limit = 20) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/admin/audit${buildQueryString({ limit })}`);
    return response.data;
  },

  getSlaDashboard: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/dashboard/sla${buildQueryString(params)}`);
    return response.data;
  },

  getFunnelAnalytics: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/analytics/funnel${buildQueryString(params)}`);
    return response.data;
  },

  getSourceChannelAnalytics: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/analytics/source-channels${buildQueryString(params)}`);
    return response.data;
  },

  getMobileBootstrap: async () => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/mobile/bootstrap`, {
      headers: {
        "x-source-channel": "expo",
        "x-client-platform": "expo",
      },
    });
    return response.data;
  },
};
