import { freelancerFetchClient } from "./services/freelancerFetchClient";

const BASE = `/api/freelancer`;

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export const freelancerApi = {
  getBootstrap: async () => {
    const response = await freelancerFetchClient.get(`${BASE}/bootstrap`, { cacheTtlMs: 30_000 });
    return response.data;
  },

  getCapabilities: async () => {
    const response = await freelancerFetchClient.get(`${BASE}/me/capabilities`, { cacheTtlMs: 10_000 });
    return response.data;
  },

  getProviders: async (filters = {}) => {
    const response = await freelancerFetchClient.get(`${BASE}/providers${buildQuery(filters)}`);
    return response.data;
  },

  getProviderById: async (providerId) => {
    const response = await freelancerFetchClient.get(`${BASE}/providers/${encodeURIComponent(providerId)}`);
    return response.data;
  },

  onboardProvider: async (formData) => {
    const response = await freelancerFetchClient.post(`${BASE}/providers/onboard`, formData);
    return response.data;
  },

  updateProviderKyc: async (providerId, status) => {
    const response = await freelancerFetchClient.patch(
      `${BASE}/providers/${encodeURIComponent(providerId)}/kyc`,
      JSON.stringify({ status }),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  addReview: async (providerId, payload) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/providers/${encodeURIComponent(providerId)}/reviews`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  enableSponsored: async (providerId, durationDays = 30) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/providers/${encodeURIComponent(providerId)}/sponsored`,
      JSON.stringify({ durationDays }),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  createJob: async (formData) => {
    const response = await freelancerFetchClient.post(`${BASE}/jobs`, formData);
    return response.data;
  },

  getJobs: async (params = {}) => {
    const response = await freelancerFetchClient.get(`${BASE}/jobs${buildQuery(params)}`);
    return response.data;
  },

  createBid: async (jobId, payload) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/jobs/${encodeURIComponent(jobId)}/bids`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  getBids: async (jobId) => {
    const response = await freelancerFetchClient.get(`${BASE}/jobs/${encodeURIComponent(jobId)}/bids`);
    return response.data;
  },

  purchaseLead: async (jobId, providerId) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/jobs/${encodeURIComponent(jobId)}/lead-purchase`,
      JSON.stringify({ providerId }),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  createBooking: async (payload) => {
    const response = await freelancerFetchClient.post(`${BASE}/bookings`, JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  },

  getBookings: async (params = {}) => {
    const response = await freelancerFetchClient.get(`${BASE}/bookings${buildQuery(params)}`);
    return response.data;
  },

  assignBooking: async (bookingCode, assignedBy = "consultant") => {
    const response = await freelancerFetchClient.patch(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/assign`,
      JSON.stringify({ assignedBy }),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  updateBookingStatus: async (bookingCode, payload) => {
    const response = await freelancerFetchClient.patch(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/status`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  sendBookingOtp: async (bookingCode) => {
    const response = await freelancerFetchClient.post(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/otp/send`);
    return response.data;
  },

  verifyBookingOtp: async (bookingCode, otp) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/otp/verify`,
      JSON.stringify({ otp }),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  initializeEscrow: async (bookingCode, payload) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/payments/initialize`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  releaseMilestone: async (bookingCode, index) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/payments/milestones/${index}/release`
    );
    return response.data;
  },

  requestRefund: async (bookingCode, reason) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/payments/refund-request`,
      JSON.stringify({ reason }),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  cancelBooking: async (bookingCode, payload) => {
    const response = await freelancerFetchClient.patch(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/cancel`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  createDispute: async (bookingCode, formData) => {
    const response = await freelancerFetchClient.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/disputes`,
      formData
    );
    return response.data;
  },

  getDisputes: async (status = "open") => {
    const response = await freelancerFetchClient.get(`${BASE}/disputes${buildQuery({ status })}`);
    return response.data;
  },

  resolveDispute: async (disputeCode, payload) => {
    const response = await freelancerFetchClient.patch(
      `${BASE}/disputes/${encodeURIComponent(disputeCode)}/resolve`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  generateQuote: async (payload) => {
    const response = await freelancerFetchClient.post(`${BASE}/ai/quote`, JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  },

  getPlans: async () => {
    const response = await freelancerFetchClient.get(`${BASE}/plans`, { cacheTtlMs: 60_000 });
    return response.data;
  },

  purchasePlan: async (payload) => {
    const response = await freelancerFetchClient.post(`${BASE}/plans/purchase`, JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  },

  activatePlanPurchase: async (purchaseCode) => {
    const response = await freelancerFetchClient.patch(
      `${BASE}/plans/purchases/${encodeURIComponent(purchaseCode)}/activate`
    );
    return response.data;
  },

  getPlanPurchases: async (providerId) => {
    const response = await freelancerFetchClient.get(`${BASE}/plans/purchases${buildQuery({ providerId })}`);
    return response.data;
  },

  createReport: async (payload) => {
    const response = await freelancerFetchClient.post(`${BASE}/reports`, JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  },

  getCommissionSettings: async () => {
    const response = await freelancerFetchClient.get(`${BASE}/admin/commission-settings`);
    return response.data;
  },

  updateCommissionSettings: async (payload) => {
    const response = await freelancerFetchClient.put(
      `${BASE}/admin/commission-settings`,
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await freelancerFetchClient.get(`${BASE}/admin/dashboard`);
    return response.data;
  },

  getOperationalMetrics: async () => {
    const response = await freelancerFetchClient.get(`${BASE}/admin/operational-metrics`);
    return response.data;
  },

  getPaymentEvents: async (params = {}) => {
    const response = await freelancerFetchClient.get(`${BASE}/admin/payment-events${buildQuery(params)}`);
    return response.data;
  },
};
