import { BACKEND_BASE_URL } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";

const BASE = `${BACKEND_BASE_URL}/api/hyperlocal`;
const DEFAULT_TIMEOUT_MS = 12000;
const RETRYABLE_METHODS = new Set(["GET"]);

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const authHeaders = () => {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeErrorMessage = (fallbackMessage, payload, status) => {
  if (payload && typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (status >= 500) return "Server unavailable. Please retry shortly.";
  return fallbackMessage;
};

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const apiRequest = async (path, options = {}) => {
  const {
    method = "GET",
    params = undefined,
    body = undefined,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retry = true,
    fallbackError = "Request failed.",
  } = options;

  const url = `${BASE}${path}${toQueryString(params)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const mergedHeaders = {
    ...authHeaders(),
    ...(isFormData ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };

  try {
    const response = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      const message = normalizeErrorMessage(fallbackError, payload, response.status);
      const error = new Error(message);
      error.response = { status: response.status, data: payload || { message } };
      throw error;
    }

    return payload;
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const shouldRetry =
      retry &&
      RETRYABLE_METHODS.has(String(method || "GET").toUpperCase()) &&
      !timedOut &&
      !offline &&
      !error?.response;

    if (shouldRetry) {
      return apiRequest(path, { ...options, retry: false });
    }

    if (!error?.response) {
      const message = timedOut ? "Request timed out. Please retry." : offline ? "You are offline. Please reconnect and retry." : fallbackError;
      const wrappedError = new Error(message);
      wrappedError.response = { status: 0, data: { message } };
      throw wrappedError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const hyperlocalApi = {
  bootstrap: async () => apiRequest("/bootstrap", { fallbackError: "Unable to load hyperlocal settings." }),
  getShops: async (params = {}) => apiRequest("/shops", { params, fallbackError: "Unable to fetch nearby shops." }),
  getQuote: async (payload) => apiRequest("/cart/quote", { method: "POST", body: payload, fallbackError: "Unable to calculate quote." }),
  placeOrder: async (formData, options = {}) =>
    apiRequest("/orders", {
      method: "POST",
      body: formData,
      headers: options.idempotencyKey ? { "x-idempotency-key": options.idempotencyKey } : {},
      fallbackError: "Unable to place order.",
    }),
  getOrders: async (params = {}) => apiRequest("/orders", { params, fallbackError: "Unable to fetch order history." }),
  trackOrder: async (orderId) => apiRequest(`/orders/${encodeURIComponent(orderId)}/track`, { fallbackError: "Unable to track this order." }),
  cancelOrder: async (orderId, reason) =>
    apiRequest(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST", body: { reason }, fallbackError: "Unable to cancel order." }),
  requestRefund: async (orderId, reason) =>
    apiRequest(`/orders/${encodeURIComponent(orderId)}/refund-request`, {
      method: "POST",
      body: { reason },
      fallbackError: "Unable to request refund.",
    }),
  createComplaint: async (orderId, issue) =>
    apiRequest(`/orders/${encodeURIComponent(orderId)}/complaint`, {
      method: "POST",
      body: { issue },
      fallbackError: "Unable to submit complaint.",
    }),
  saveAddress: async (payload) => apiRequest("/addresses", { method: "POST", body: payload, fallbackError: "Unable to save address." }),
  getAddresses: async () => apiRequest("/addresses", { fallbackError: "Unable to fetch saved addresses." }),

  applyVendorShop: async (payload) => apiRequest("/vendor/shops", { method: "POST", body: payload, fallbackError: "Unable to submit vendor shop." }),
  getVendorShops: async () => apiRequest("/vendor/shops", { fallbackError: "Unable to load vendor shops." }),
  addProduct: async (shopId, payload) =>
    apiRequest(`/vendor/shops/${encodeURIComponent(shopId)}/products`, { method: "POST", body: payload, fallbackError: "Unable to add product." }),
  updateProduct: async (shopId, productId, payload) =>
    apiRequest(`/vendor/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: payload,
      fallbackError: "Unable to update product.",
    }),
  updateShopOpenStatus: async (shopId, open) =>
    apiRequest(`/vendor/shops/${encodeURIComponent(shopId)}/open-status`, {
      method: "PATCH",
      body: { open },
      fallbackError: "Unable to update shop status.",
    }),
  updateOpeningHours: async (shopId, openingHours) =>
    apiRequest(`/vendor/shops/${encodeURIComponent(shopId)}/opening-hours`, {
      method: "PATCH",
      body: { openingHours },
      fallbackError: "Unable to update opening hours.",
    }),
  vendorOrders: async (params = {}) => apiRequest("/vendor/orders", { params, fallbackError: "Unable to load vendor orders." }),
  vendorSettle: async () => apiRequest("/vendor/settlements", { fallbackError: "Unable to load vendor settlement." }),
  vendorAnalytics: async () => apiRequest("/vendor/analytics", { fallbackError: "Unable to load vendor analytics." }),
  vendorOrderAction: async (orderId, action) =>
    apiRequest(`/vendor/orders/${encodeURIComponent(orderId)}/action`, {
      method: "PATCH",
      body: { action },
      fallbackError: "Unable to update vendor order.",
    }),

  applyPartner: async (formData) =>
    apiRequest("/partners/apply", { method: "POST", body: formData, fallbackError: "Unable to submit partner application." }),
  partnerProfile: async () => apiRequest("/partners/me", { fallbackError: "Unable to load partner profile." }),
  partnerJobs: async () => apiRequest("/partners/jobs", { fallbackError: "Unable to load partner jobs." }),
  partnerAvailability: async (partnerId, online) =>
    apiRequest(`/partners/${encodeURIComponent(partnerId)}/availability`, {
      method: "PATCH",
      body: { online },
      fallbackError: "Unable to update partner status.",
    }),
  partnerAcceptJob: async (orderId) =>
    apiRequest(`/partners/jobs/${encodeURIComponent(orderId)}/accept`, { method: "POST", body: {}, fallbackError: "Unable to accept job." }),
  partnerRejectJob: async (orderId, note = "") =>
    apiRequest(`/partners/jobs/${encodeURIComponent(orderId)}/reject`, {
      method: "POST",
      body: { note },
      fallbackError: "Unable to reject job.",
    }),
  partnerUpdateJob: async (orderId, status, note = "") =>
    apiRequest(`/partners/jobs/${encodeURIComponent(orderId)}/update`, {
      method: "POST",
      body: { status, note },
      fallbackError: "Unable to update delivery stage.",
    }),
  partnerWallet: async (partnerId) =>
    apiRequest(`/partners/${encodeURIComponent(partnerId)}/wallet`, { fallbackError: "Unable to load partner wallet." }),
  partnerPayout: async (partnerId, amount) =>
    apiRequest(`/partners/${encodeURIComponent(partnerId)}/payouts/request`, {
      method: "POST",
      body: { amount },
      fallbackError: "Unable to request payout.",
    }),

  adminPendingShops: async (params = {}) => apiRequest("/admin/pending-shops", { params, fallbackError: "Unable to load pending shops." }),
  adminPendingPartners: async (params = {}) =>
    apiRequest("/admin/pending-partners", { params, fallbackError: "Unable to load pending partners." }),
  adminShopApproval: async (shopId, status) =>
    apiRequest(`/admin/shops/${encodeURIComponent(shopId)}/approval`, {
      method: "PATCH",
      body: { status },
      fallbackError: "Unable to update shop approval.",
    }),
  adminPartnerApproval: async (partnerId, status) =>
    apiRequest(`/admin/partners/${encodeURIComponent(partnerId)}/approval`, {
      method: "PATCH",
      body: { status },
      fallbackError: "Unable to update partner approval.",
    }),
  adminConfig: async (payload) => apiRequest("/admin/config", { method: "PATCH", body: payload, fallbackError: "Unable to update admin config." }),
  adminAnalytics: async () => apiRequest("/admin/analytics", { fallbackError: "Unable to load admin analytics." }),
  adminRefunds: async (params = {}) => apiRequest("/admin/refunds", { params, fallbackError: "Unable to load refunds." }),
  adminComplaints: async (params = {}) => apiRequest("/admin/complaints", { params, fallbackError: "Unable to load complaints." }),
  adminAuditLogs: async (params = {}) => apiRequest("/admin/audit-logs", { params, fallbackError: "Unable to load audit logs." }),
  getOverview360: async () => apiRequest("/overview360", { fallbackError: "Unable to load Hyperlocal 360 data." }),
  resolveComplaint: async (complaintId, resolutionNote) =>
    apiRequest(`/admin/complaints/${encodeURIComponent(complaintId)}/resolve`, {
      method: "PATCH",
      body: { resolutionNote },
      fallbackError: "Unable to resolve complaint.",
    }),
  reviewRefund: async (refundId, status) =>
    apiRequest(`/admin/refunds/${encodeURIComponent(refundId)}/review`, {
      method: "PATCH",
      body: { status },
      fallbackError: "Unable to review refund.",
    }),
  adminSettlementReport: async () => apiRequest("/admin/settlement-reports", { fallbackError: "Unable to load settlement report." }),

  wallet: async () => apiRequest("/wallet/me", { fallbackError: "Unable to load wallet." }),
  walletTopup: async (payloadOrAmount) => {
    const payload =
      typeof payloadOrAmount === "object" && payloadOrAmount !== null
        ? payloadOrAmount
        : { amount: Number(payloadOrAmount || 0) };
    return apiRequest("/wallet/topup", { method: "POST", body: payload, fallbackError: "Unable to top up wallet." });
  },
  subscriptionPlans: async () => apiRequest("/subscriptions/plans", { fallbackError: "Unable to load plans." }),
  subscribe: async (payload) => apiRequest("/subscriptions/subscribe", { method: "POST", body: payload, fallbackError: "Unable to subscribe." }),
  subscriptions: async () => apiRequest("/subscriptions/me", { fallbackError: "Unable to load subscriptions." }),
  createAd: async (payload) => apiRequest("/ads", { method: "POST", body: payload, fallbackError: "Unable to create ad." }),
  ads: async (params = {}) => apiRequest("/ads", { params, fallbackError: "Unable to load ads." }),
};
