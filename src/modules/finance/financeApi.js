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

  // ===== LANGUAGE SUPPORT =====
  getSupportedLocales: async () => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/locales`);
    return response.data;
  },

  // ===== CREDIT BUREAU =====
  checkCreditBureau: async (payload) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/credit-bureau/check`, payload);
    return response.data;
  },

  // ===== DOCUMENT VERIFICATION =====
  verifyDocument: async (formData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/documents/verify`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ===== FRAUD DETECTION =====
  checkFraud: async (payload) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/fraud/check`, payload);
    return response.data;
  },

  // ===== REPORTING =====
  generateLeadPDF: async (leadId) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/reports/lead/${leadId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportLeadsExcel: async (filters) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/reports/leads/excel`, filters, {
      responseType: 'blob',
    });
    return response.data;
  },

  getAnalyticsReport: async (startDate, endDate, format = 'json') => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/reports/analytics`, {
      params: { startDate, endDate, format },
      responseType: format === 'pdf' ? 'blob' : 'json',
    });
    return response.data;
  },

  // ===== WORKFLOW =====
  assignLead: async (leadId, strategy = 'load-balanced') => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/workflow/assign-lead`, {
      leadId,
      strategy,
    });
    return response.data;
  },

  bulkAssignLeads: async (limit = 50) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/workflow/bulk-assign`, { limit });
    return response.data;
  },

  // ===== CRM =====
  logCall: async (leadId, callData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/calls`, {
      leadId,
      ...callData,
    });
    return response.data;
  },

  addNote: async (leadId, noteData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/notes`, {
      leadId,
      ...noteData,
    });
    return response.data;
  },

  createTask: async (leadId, taskData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/tasks`, {
      leadId,
      ...taskData,
    });
    return response.data;
  },

  completeTask: async (taskId) => {
    const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/crm/tasks/${taskId}/complete`);
    return response.data;
  },

  getPendingTasks: async (filters = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/crm/tasks/pending`, {
      params: filters,
    });
    return response.data;
  },

  getLeadTimeline: async (leadId, filters = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/crm/timeline/${leadId}`, {
      params: filters,
    });
    return response.data;
  },

  getActivitySummary: async (days = 30) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/crm/activity-summary`, {
      params: { days },
    });
    return response.data;
  },

  scheduleMeeting: async (leadId, meetingData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/meetings`, {
      leadId,
      ...meetingData,
    });
    return response.data;
  },

  // ===== INSTITUTION PORTAL =====
  institution: {
    getProfile: async () => {
      const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institution/profile`);
      return response.data;
    },

    updateProfile: async (updates) => {
      const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/institution/profile`, updates);
      return response.data;
    },

    getLeads: async (params = {}) => {
      const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institution/leads`, { params });
      return response.data;
    },

    getLeadDetails: async (leadId) => {
      const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institution/leads/${leadId}`);
      return response.data;
    },

    reviewLead: async (leadId, decision, data) => {
      const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/institution/leads/${leadId}/review`, {
        decision,
        ...data,
      });
      return response.data;
    },

    getDashboard: async (params = {}) => {
      const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institution/dashboard`, { params });
      return response.data;
    },

    getOffers: async () => {
      const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institution/offers`);
      return response.data;
    },

    addOffer: async (offerData) => {
      const response = await financeHttpClient.post(`${FINANCE_API_BASE}/institution/offers`, offerData);
      return response.data;
    },

    getAnalytics: async (params = {}) => {
      const response = await financeHttpClient.get(`${FINANCE_API_BASE}/institution/analytics`, { params });
      return response.data;
    },
  },

  // ===== ENHANCED CRM APIS =====
  getCRMActivities: async (leadId, filters = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/crm/activities/${leadId}`, {
      params: filters,
    });
    return response.data;
  },

  createCRMCall: async (leadId, callData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/calls`, {
      leadId,
      ...callData,
    });
    return response.data;
  },

  createCRMNote: async (leadId, noteData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/notes`, {
      leadId,
      ...noteData,
    });
    return response.data;
  },

  createCRMTask: async (leadId, taskData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/tasks`, {
      leadId,
      ...taskData,
    });
    return response.data;
  },

  getCRMTasks: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/crm/tasks`, {
      params,
    });
    return response.data;
  },

  updateCRMTask: async (taskId, updates) => {
    const response = await financeHttpClient.patch(`${FINANCE_API_BASE}/crm/tasks/${taskId}`, updates);
    return response.data;
  },

  createCRMMeeting: async (leadId, meetingData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/crm/meetings`, {
      leadId,
      ...meetingData,
    });
    return response.data;
  },

  // ===== NOTIFICATIONS =====
  sendNotification: async (leadId, notificationData) => {
    const response = await financeHttpClient.post(`${FINANCE_API_BASE}/notifications/send`, {
      leadId,
      ...notificationData,
    });
    return response.data;
  },

  getNotificationHistory: async (leadId) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/notifications/history/${leadId}`);
    return response.data;
  },

  // ===== ENHANCED REPORTS =====
  downloadLeadReport: async (leadId, format = 'pdf', params = {}) => {
    const response = await financeHttpClient.get(
      `${FINANCE_API_BASE}/reports/lead/${leadId}/${format}`,
      {
        params,
        responseType: 'blob',
      }
    );
    return response.data;
  },

  getAnalytics: async (params = {}) => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/analytics`, {
      params,
    });
    return response.data;
  },

  // ===== WORKFLOW STATS =====
  getWorkflowStats: async () => {
    const response = await financeHttpClient.get(`${FINANCE_API_BASE}/workflow/stats`);
    return response.data;
  },

  // ===== PARTNER INSTITUTION PORTAL =====
  getPartnerInstitutions: async (params = {}) => {
    const response = await financeHttpClient.get(`/api/institution-portal/institutions`, {
      params,
    });
    return response.data;
  },

  registerPartnerInstitution: async (data) => {
    const response = await financeHttpClient.post(`/api/institution-portal/register`, data);
    return response.data;
  },

  updatePartnerInstitution: async (institutionId, updates) => {
    const response = await financeHttpClient.patch(
      `/api/institution-portal/institutions/${institutionId}`,
      updates
    );
    return response.data;
  },

  getPartnerLeads: async (institutionId, params = {}) => {
    const response = await financeHttpClient.get(
      `/api/institution-portal/institutions/${institutionId}/leads`,
      { params }
    );
    return response.data;
  },

  getPartnerStats: async (institutionId, params = {}) => {
    const response = await financeHttpClient.get(
      `/api/institution-portal/institutions/${institutionId}/stats`,
      { params }
    );
    return response.data;
  },

  submitPartnerReview: async (institutionId, leadId, reviewData) => {
    const response = await financeHttpClient.post(
      `/api/institution-portal/institutions/${institutionId}/leads/${leadId}/review`,
      reviewData
    );
    return response.data;
  },

  getPartnerOffers: async (institutionId, params = {}) => {
    const response = await financeHttpClient.get(
      `/api/institution-portal/institutions/${institutionId}/offers`,
      { params }
    );
    return response.data;
  },

  createPartnerOffer: async (institutionId, offerData) => {
    const response = await financeHttpClient.post(
      `/api/institution-portal/institutions/${institutionId}/offers`,
      offerData
    );
    return response.data;
  },

  getPartnerAnalytics: async (institutionId, params = {}) => {
    const response = await financeHttpClient.get(
      `/api/institution-portal/institutions/${institutionId}/analytics`,
      { params }
    );
    return response.data;
  },
};
