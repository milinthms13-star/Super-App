import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const endpoint = `${API_BASE_URL}/tourism`;

export const tourismService = {
  async getBootstrap(params = {}) {
    const response = await axios.get(`${endpoint}/bootstrap`, { params });
    return response.data?.data || {};
  },

  async getBookings(params = {}) {
    const response = await axios.get(`${endpoint}/bookings`, { params });
    return response.data?.data?.bookings || [];
  },

  async createBooking(payload) {
    const response = await axios.post(`${endpoint}/bookings`, payload);
    return response.data?.data?.booking;
  },

  async updateBookingStatus(bookingId, status) {
    const response = await axios.patch(`${endpoint}/bookings/${encodeURIComponent(bookingId)}/status`, { status });
    return response.data?.data?.booking;
  },

  async submitReview(payload) {
    const response = await axios.post(`${endpoint}/reviews`, payload);
    return response.data?.data?.review;
  },

  async getVendorPackages(vendorId) {
    const response = await axios.get(`${endpoint}/vendor/packages`, { params: { vendorId } });
    return response.data?.data?.packages || [];
  },

  async createVendorPackage(payload) {
    const response = await axios.post(`${endpoint}/vendor/packages`, payload);
    return response.data?.data?.package;
  },

  async updateVendorPackage(packageId, payload) {
    const response = await axios.patch(`${endpoint}/vendor/packages/${encodeURIComponent(packageId)}`, payload);
    return response.data?.data?.package;
  },

  async deleteVendorPackage(packageId, vendorId) {
    const response = await axios.delete(`${endpoint}/vendor/packages/${encodeURIComponent(packageId)}`, {
      params: { vendorId },
    });
    return response.data;
  },

  async getVendorLeads(vendorId) {
    const response = await axios.get(`${endpoint}/vendor/leads`, { params: { vendorId } });
    return response.data?.data?.leads || [];
  },

  async updateVendorLead(leadId, payload) {
    const response = await axios.patch(`${endpoint}/vendor/leads/${encodeURIComponent(leadId)}`, payload);
    return response.data?.data?.lead;
  },

  async getAdminQueues() {
    const response = await axios.get(`${endpoint}/admin/queues`);
    return response.data?.data || {};
  },

  async updateAdminVendor(vendorId, payload) {
    const response = await axios.patch(`${endpoint}/admin/vendors/${encodeURIComponent(vendorId)}`, payload);
    return response.data?.data?.vendor;
  },

  async updateAdminPackage(packageId, payload) {
    const response = await axios.patch(`${endpoint}/admin/packages/${encodeURIComponent(packageId)}`, payload);
    return response.data?.data?.package;
  },
};

