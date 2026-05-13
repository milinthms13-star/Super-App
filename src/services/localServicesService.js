import axios from "axios";

const BASE = "/api/localservices";

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("authToken") || ""}`,
  },
});

const buildQuery = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ).toString();
  return query ? `?${query}` : "";
};

export const localServicesService = {
  getMeta: async () => {
    const response = await axios.get(`${BASE}/meta`);
    return response.data?.data || {};
  },

  getProviders: async (filters = {}) => {
    const response = await axios.get(`${BASE}/providers${buildQuery(filters)}`);
    return response.data?.data || [];
  },

  getProviderById: async (providerId) => {
    const response = await axios.get(`${BASE}/providers/${encodeURIComponent(providerId)}`);
    return response.data?.data || null;
  },

  createBooking: async (payload) => {
    const response = await axios.post(`${BASE}/bookings`, payload);
    return response.data?.data || null;
  },

  createQuoteRequest: async (payload) => {
    const response = await axios.post(`${BASE}/quotes`, payload);
    return response.data?.data || null;
  },

  createVendor: async (payload) => {
    const response = await axios.post(`${BASE}/vendors`, payload);
    return response.data?.data || null;
  },

  getTrackingByPhone: async (phone) => {
    const response = await axios.get(`${BASE}/tracking${buildQuery({ phone })}`);
    return response.data?.data || [];
  },

  getVendorDashboard: async (phone) => {
    const response = await axios.get(`${BASE}/vendor-dashboard${buildQuery({ phone })}`);
    return response.data?.data || null;
  },

  updateVendorModeration: async (vendorId, payload) => {
    const response = await axios.patch(
      `${BASE}/admin/vendors/${encodeURIComponent(vendorId)}`,
      payload,
      getAuthHeaders()
    );
    return response.data?.data || null;
  },
};

