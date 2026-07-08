import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const endpoint = `${API_BASE_URL}/tourism`;

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const tourismService = {
  async getBootstrap(params = {}) {
    const response = await axios.get(`${endpoint}/bootstrap`, { params });
    return response.data?.data || {};
  },

  async getPackages(params = {}) {
    const response = await axios.get(`${endpoint}/packages`, { params });
    return response.data?.data || { packages: [], pagination: {} };
  },

  async getPackageById(packageId) {
    const response = await axios.get(`${endpoint}/packages/${encodeURIComponent(packageId)}`);
    return response.data?.data || {};
  },

  async getBookings(params = {}) {
    const response = await axios.get(`${endpoint}/bookings`, { params });
    return response.data?.data?.bookings || [];
  },

  async getMyBookings() {
    const response = await axios.get(`${endpoint}/bookings/my`);
    return response.data?.data || [];
  },

  async createBooking(payload) {
    const response = await axios.post(`${endpoint}/bookings`, payload);
    return response.data?.data?.booking;
  },

  async createCustomRequest(payload) {
    const response = await axios.post(`${endpoint}/custom-requests`, payload);
    return response.data?.data?.lead;
  },

  async generateItinerary(payload) {
    const response = await axios.post(`${endpoint}/planner/itinerary`, payload);
    return response.data?.data;
  },

  // Payment methods with Razorpay integration
  async createPaymentIntent(payload) {
    const response = await axios.post(`${endpoint}/payments/intent`, payload);
    return response.data?.data;
  },

  async initiateRazorpayPayment(booking, paymentOrder, onSuccess, onFailure) {
    const scriptLoaded = await loadRazorpayScript();
    
    if (!scriptLoaded) {
      throw new Error('Failed to load Razorpay SDK');
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID || '',
      amount: paymentOrder.amount,
      currency: paymentOrder.currency || 'INR',
      name: 'NilaTravel Tourism',
      description: booking.packageTitle,
      order_id: paymentOrder.orderId,
      prefill: {
        name: booking.customerName,
        email: booking.customerEmail,
        contact: booking.customerPhone,
      },
      theme: {
        color: '#667eea',
      },
      handler: async (response) => {
        try {
          await tourismService.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (onSuccess) onSuccess(response);
        } catch (error) {
          if (onFailure) onFailure(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (onFailure) onFailure(new Error('Payment cancelled by user'));
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  },

  async verifyPayment(payload) {
    const response = await axios.post(`${endpoint}/payments/verify`, payload);
    return response.data?.data;
  },

  async reportPackageIssue(packageId, payload) {
    const response = await axios.post(
      `${endpoint}/packages/${encodeURIComponent(packageId)}/report`,
      payload
    );
    return response.data?.data?.complaint;
  },

  async updateBookingStatus(bookingId, status) {
    const response = await axios.patch(
      `${endpoint}/bookings/${encodeURIComponent(bookingId)}/status`, 
      { status }
    );
    return response.data?.data?.booking;
  },

  async submitReview(payload) {
    const response = await axios.post(`${endpoint}/reviews`, payload);
    return response.data?.data?.review;
  },

  async uploadReviewImages(reviewId, images) {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    const response = await axios.post(
      `${endpoint}/reviews/${encodeURIComponent(reviewId)}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data?.data?.review;
  },

  // Vendor methods
  async getVendorPackages() {
    const response = await axios.get(`${endpoint}/vendor/packages`);
    return response.data?.data?.packages || [];
  },

  async createVendorPackage(payload) {
    const response = await axios.post(`${endpoint}/vendor/packages`, payload);
    return response.data?.data?.package;
  },

  async updateVendorPackage(packageId, payload) {
    const response = await axios.patch(
      `${endpoint}/vendor/packages/${encodeURIComponent(packageId)}`, 
      payload
    );
    return response.data?.data?.package;
  },

  async deleteVendorPackage(packageId) {
    const response = await axios.delete(
      `${endpoint}/vendor/packages/${encodeURIComponent(packageId)}`
    );
    return response.data;
  },

  async uploadPackageImages(packageId, images) {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    const response = await axios.post(
      `${endpoint}/vendor/packages/${encodeURIComponent(packageId)}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data?.data?.package;
  },

  async getVendorLeads(params = {}) {
    const response = await axios.get(`${endpoint}/vendor/leads`, { params });
    return response.data?.data?.leads || [];
  },

  async updateVendorLead(leadId, payload) {
    const response = await axios.patch(
      `${endpoint}/vendor/leads/${encodeURIComponent(leadId)}`, 
      payload
    );
    return response.data?.data?.lead;
  },

  // Admin methods
  async getAdminQueues() {
    const response = await axios.get(`${endpoint}/admin/queues`);
    return response.data?.data || {};
  },

  async getAdminBookings(params = {}) {
    const response = await axios.get(`${endpoint}/admin/bookings`, { params });
    return response.data?.data || [];
  },

  async updateAdminBookingStatus(bookingId, payload) {
    const response = await axios.put(
      `${endpoint}/admin/bookings/${encodeURIComponent(bookingId)}/status`,
      payload
    );
    return response.data?.data;
  },

  async updateAdminVendor(vendorId, payload) {
    const response = await axios.patch(
      `${endpoint}/admin/vendors/${encodeURIComponent(vendorId)}`, 
      payload
    );
    return response.data?.data?.vendor;
  },

  async updateAdminPackage(packageId, payload) {
    const response = await axios.patch(
      `${endpoint}/admin/packages/${encodeURIComponent(packageId)}`, 
      payload
    );
    return response.data?.data?.package;
  },

  // Analytics methods
  async getDashboardAnalytics(params = {}) {
    const response = await axios.get(`${endpoint}/analytics/dashboard`, { params });
    return response.data?.data || {};
  },

  async getVendorAnalytics(vendorId, params = {}) {
    const response = await axios.get(
      `${endpoint}/analytics/vendor/${encodeURIComponent(vendorId)}`,
      { params }
    );
    return response.data?.data || {};
  },

  async getBookingAnalytics(params = {}) {
    const response = await axios.get(`${endpoint}/analytics/bookings`, { params });
    return response.data?.data || {};
  },

  async getRevenueAnalytics(params = {}) {
    const response = await axios.get(`${endpoint}/analytics/revenue`, { params });
    return response.data?.data || {};
  },

  async getPopularPackages(params = {}) {
    const response = await axios.get(`${endpoint}/analytics/popular-packages`, { params });
    return response.data?.data || [];
  },

  // Audit log methods
  async getBookingAudit(bookingId) {
    const response = await axios.get(
      `${endpoint}/audit/bookings/${encodeURIComponent(bookingId)}`
    );
    return response.data?.data || {};
  },

  async getLeadAudit(leadId) {
    const response = await axios.get(
      `${endpoint}/audit/leads/${encodeURIComponent(leadId)}`
    );
    return response.data?.data || {};
  },

  async getComplaintAudit(complaintId) {
    const response = await axios.get(
      `${endpoint}/audit/complaints/${encodeURIComponent(complaintId)}`
    );
    return response.data?.data || {};
  },

  async getAdminActionLogs(params = {}) {
    const response = await axios.get(`${endpoint}/audit/admin-actions`, { params });
    return response.data?.data || {};
  },
};
