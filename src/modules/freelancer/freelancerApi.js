import axios from "axios";
import { BACKEND_BASE_URL } from "../../utils/api";

const BASE = `${BACKEND_BASE_URL}/api/freelancer`;

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
    const response = await axios.get(`${BASE}/bootstrap`);
    return response.data;
  },

  getProviders: async (filters = {}) => {
    const response = await axios.get(`${BASE}/providers${buildQuery(filters)}`);
    return response.data;
  },

  getProviderById: async (providerId) => {
    const response = await axios.get(`${BASE}/providers/${encodeURIComponent(providerId)}`);
    return response.data;
  },

  onboardProvider: async (formData) => {
    const response = await axios.post(`${BASE}/providers/onboard`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  updateProviderKyc: async (providerId, status) => {
    const response = await axios.patch(`${BASE}/providers/${encodeURIComponent(providerId)}/kyc`, { status });
    return response.data;
  },

  addReview: async (providerId, payload) => {
    const response = await axios.post(`${BASE}/providers/${encodeURIComponent(providerId)}/reviews`, payload);
    return response.data;
  },

  enableSponsored: async (providerId, durationDays = 30) => {
    const response = await axios.post(`${BASE}/providers/${encodeURIComponent(providerId)}/sponsored`, { durationDays });
    return response.data;
  },

  createJob: async (formData) => {
    const response = await axios.post(`${BASE}/jobs`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getJobs: async (params = {}) => {
    const response = await axios.get(`${BASE}/jobs${buildQuery(params)}`);
    return response.data;
  },

  createBid: async (jobId, payload) => {
    const response = await axios.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/bids`, payload);
    return response.data;
  },

  getBids: async (jobId) => {
    const response = await axios.get(`${BASE}/jobs/${encodeURIComponent(jobId)}/bids`);
    return response.data;
  },

  purchaseLead: async (jobId, providerId) => {
    const response = await axios.post(`${BASE}/jobs/${encodeURIComponent(jobId)}/lead-purchase`, { providerId });
    return response.data;
  },

  createBooking: async (payload) => {
    const response = await axios.post(`${BASE}/bookings`, payload);
    return response.data;
  },

  getBookings: async (params = {}) => {
    const response = await axios.get(`${BASE}/bookings${buildQuery(params)}`);
    return response.data;
  },

  assignBooking: async (bookingCode, assignedBy = "consultant") => {
    const response = await axios.patch(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/assign`, { assignedBy });
    return response.data;
  },

  updateBookingStatus: async (bookingCode, payload) => {
    const response = await axios.patch(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/status`, payload);
    return response.data;
  },

  sendBookingOtp: async (bookingCode) => {
    const response = await axios.post(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/otp/send`);
    return response.data;
  },

  verifyBookingOtp: async (bookingCode, otp) => {
    const response = await axios.post(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/otp/verify`, { otp });
    return response.data;
  },

  initializeEscrow: async (bookingCode, payload) => {
    const response = await axios.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/payments/initialize`,
      payload
    );
    return response.data;
  },

  releaseMilestone: async (bookingCode, index) => {
    const response = await axios.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/payments/milestones/${index}/release`
    );
    return response.data;
  },

  requestRefund: async (bookingCode, reason) => {
    const response = await axios.post(
      `${BASE}/bookings/${encodeURIComponent(bookingCode)}/payments/refund-request`,
      { reason }
    );
    return response.data;
  },

  cancelBooking: async (bookingCode, payload) => {
    const response = await axios.patch(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/cancel`, payload);
    return response.data;
  },

  createDispute: async (bookingCode, formData) => {
    const response = await axios.post(`${BASE}/bookings/${encodeURIComponent(bookingCode)}/disputes`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getDisputes: async (status = "open") => {
    const response = await axios.get(`${BASE}/disputes${buildQuery({ status })}`);
    return response.data;
  },

  resolveDispute: async (disputeCode, payload) => {
    const response = await axios.patch(`${BASE}/disputes/${encodeURIComponent(disputeCode)}/resolve`, payload);
    return response.data;
  },

  generateQuote: async (payload) => {
    const response = await axios.post(`${BASE}/ai/quote`, payload);
    return response.data;
  },

  getPlans: async () => {
    const response = await axios.get(`${BASE}/plans`);
    return response.data;
  },

  purchasePlan: async (payload) => {
    const response = await axios.post(`${BASE}/plans/purchase`, payload);
    return response.data;
  },

  getPlanPurchases: async (providerId) => {
    const response = await axios.get(`${BASE}/plans/purchases${buildQuery({ providerId })}`);
    return response.data;
  },

  createReport: async (payload) => {
    const response = await axios.post(`${BASE}/reports`, payload);
    return response.data;
  },

  getCommissionSettings: async () => {
    const response = await axios.get(`${BASE}/admin/commission-settings`);
    return response.data;
  },

  updateCommissionSettings: async (payload) => {
    const response = await axios.put(`${BASE}/admin/commission-settings`, payload);
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await axios.get(`${BASE}/admin/dashboard`);
    return response.data;
  },
};

