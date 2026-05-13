import axios from "axios";
import { BACKEND_BASE_URL } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";

const BASE = `${BACKEND_BASE_URL}/api/hyperlocal`;

const authHeaders = () => {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrap = (response) => response.data;

export const hyperlocalApi = {
  bootstrap: async () => unwrap(await axios.get(`${BASE}/bootstrap`)),
  getShops: async (params = {}) => unwrap(await axios.get(`${BASE}/shops`, { params })),
  getQuote: async (payload) => unwrap(await axios.post(`${BASE}/cart/quote`, payload, { headers: authHeaders() })),
  placeOrder: async (formData) =>
    unwrap(
      await axios.post(`${BASE}/orders`, formData, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      })
    ),
  getOrders: async () => unwrap(await axios.get(`${BASE}/orders`, { headers: authHeaders() })),
  trackOrder: async (orderId) =>
    unwrap(await axios.get(`${BASE}/orders/${encodeURIComponent(orderId)}/track`, { headers: authHeaders() })),
  cancelOrder: async (orderId, reason) =>
    unwrap(await axios.post(`${BASE}/orders/${encodeURIComponent(orderId)}/cancel`, { reason }, { headers: authHeaders() })),
  requestRefund: async (orderId, reason) =>
    unwrap(await axios.post(`${BASE}/orders/${encodeURIComponent(orderId)}/refund-request`, { reason }, { headers: authHeaders() })),
  createComplaint: async (orderId, issue) =>
    unwrap(await axios.post(`${BASE}/orders/${encodeURIComponent(orderId)}/complaint`, { issue }, { headers: authHeaders() })),
  saveAddress: async (payload) => unwrap(await axios.post(`${BASE}/addresses`, payload, { headers: authHeaders() })),
  getAddresses: async () => unwrap(await axios.get(`${BASE}/addresses`, { headers: authHeaders() })),
  applyVendorShop: async (payload) => unwrap(await axios.post(`${BASE}/vendor/shops`, payload, { headers: authHeaders() })),
  getVendorShops: async () => unwrap(await axios.get(`${BASE}/vendor/shops`, { headers: authHeaders() })),
  addProduct: async (shopId, payload) =>
    unwrap(await axios.post(`${BASE}/vendor/shops/${encodeURIComponent(shopId)}/products`, payload, { headers: authHeaders() })),
  updateProduct: async (shopId, productId, payload) =>
    unwrap(
      await axios.patch(`${BASE}/vendor/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}`, payload, {
        headers: authHeaders(),
      })
    ),
  updateShopOpenStatus: async (shopId, open) =>
    unwrap(await axios.patch(`${BASE}/vendor/shops/${encodeURIComponent(shopId)}/open-status`, { open }, { headers: authHeaders() })),
  updateOpeningHours: async (shopId, openingHours) =>
    unwrap(await axios.patch(`${BASE}/vendor/shops/${encodeURIComponent(shopId)}/opening-hours`, { openingHours }, { headers: authHeaders() })),
  vendorOrders: async () => unwrap(await axios.get(`${BASE}/vendor/orders`, { headers: authHeaders() })),
  vendorSettle: async () =>
    unwrap(await axios.get(`${BASE}/vendor/settlements`, { headers: authHeaders() })),
  vendorAnalytics: async () =>
    unwrap(await axios.get(`${BASE}/vendor/analytics`, { headers: authHeaders() })),
  vendorOrderAction: async (orderId, action) =>
    unwrap(await axios.patch(`${BASE}/vendor/orders/${encodeURIComponent(orderId)}/action`, { action }, { headers: authHeaders() })),
  applyPartner: async (formData) =>
    unwrap(
      await axios.post(`${BASE}/partners/apply`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      })
    ),
  partnerProfile: async () => unwrap(await axios.get(`${BASE}/partners/me`, { headers: authHeaders() })),
  partnerJobs: async () => unwrap(await axios.get(`${BASE}/partners/jobs`, { headers: authHeaders() })),
  partnerAvailability: async (partnerId, online) =>
    unwrap(await axios.patch(`${BASE}/partners/${encodeURIComponent(partnerId)}/availability`, { online }, { headers: authHeaders() })),
  partnerAcceptJob: async (orderId) =>
    unwrap(await axios.post(`${BASE}/partners/jobs/${encodeURIComponent(orderId)}/accept`, {}, { headers: authHeaders() })),
  partnerRejectJob: async (orderId, note = "") =>
    unwrap(await axios.post(`${BASE}/partners/jobs/${encodeURIComponent(orderId)}/reject`, { note }, { headers: authHeaders() })),
  partnerUpdateJob: async (orderId, status, note = "") =>
    unwrap(await axios.post(`${BASE}/partners/jobs/${encodeURIComponent(orderId)}/update`, { status, note }, { headers: authHeaders() })),
  partnerWallet: async (partnerId) => unwrap(await axios.get(`${BASE}/partners/${encodeURIComponent(partnerId)}/wallet`, { headers: authHeaders() })),
  partnerPayout: async (partnerId, amount) =>
    unwrap(await axios.post(`${BASE}/partners/${encodeURIComponent(partnerId)}/payouts/request`, { amount }, { headers: authHeaders() })),
  adminPendingShops: async () => unwrap(await axios.get(`${BASE}/admin/pending-shops`, { headers: authHeaders() })),
  adminPendingPartners: async () => unwrap(await axios.get(`${BASE}/admin/pending-partners`, { headers: authHeaders() })),
  adminShopApproval: async (shopId, status) =>
    unwrap(await axios.patch(`${BASE}/admin/shops/${encodeURIComponent(shopId)}/approval`, { status }, { headers: authHeaders() })),
  adminPartnerApproval: async (partnerId, status) =>
    unwrap(await axios.patch(`${BASE}/admin/partners/${encodeURIComponent(partnerId)}/approval`, { status }, { headers: authHeaders() })),
  adminConfig: async (payload) => unwrap(await axios.patch(`${BASE}/admin/config`, payload, { headers: authHeaders() })),
  adminAnalytics: async () => unwrap(await axios.get(`${BASE}/admin/analytics`, { headers: authHeaders() })),
  adminRefunds: async () => unwrap(await axios.get(`${BASE}/admin/refunds`, { headers: authHeaders() })),
  adminComplaints: async () => unwrap(await axios.get(`${BASE}/admin/complaints`, { headers: authHeaders() })),
  resolveComplaint: async (complaintId, resolutionNote) =>
    unwrap(await axios.patch(`${BASE}/admin/complaints/${encodeURIComponent(complaintId)}/resolve`, { resolutionNote }, { headers: authHeaders() })),
  reviewRefund: async (refundId, status) =>
    unwrap(await axios.patch(`${BASE}/admin/refunds/${encodeURIComponent(refundId)}/review`, { status }, { headers: authHeaders() })),
  adminSettlementReport: async () => unwrap(await axios.get(`${BASE}/admin/settlement-reports`, { headers: authHeaders() })),
  wallet: async () => unwrap(await axios.get(`${BASE}/wallet/me`, { headers: authHeaders() })),
  walletTopup: async (amount) =>
    unwrap(await axios.post(`${BASE}/wallet/topup`, { amount }, { headers: authHeaders() })),
  subscriptionPlans: async () => unwrap(await axios.get(`${BASE}/subscriptions/plans`, { headers: authHeaders() })),
  subscribe: async (payload) => unwrap(await axios.post(`${BASE}/subscriptions/subscribe`, payload, { headers: authHeaders() })),
  subscriptions: async () => unwrap(await axios.get(`${BASE}/subscriptions/me`, { headers: authHeaders() })),
  createAd: async (payload) => unwrap(await axios.post(`${BASE}/ads`, payload, { headers: authHeaders() })),
  ads: async (shopId = "") => unwrap(await axios.get(`${BASE}/ads`, { params: { shopId }, headers: authHeaders() })),
};
