import axios from "axios";

import { API_BASE_URL } from "./constants.js";

const MATRIMONIAL_API_BASE_URL = `${API_BASE_URL}/matrimonial`;
const REQUEST_TIMEOUT_MS = 15000;

const getStoredAuthToken = () =>
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("token") ||
  "";

const createApiClient = () => {
  if (typeof axios.create === "function") {
    const client = axios.create({
      baseURL: MATRIMONIAL_API_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS,
    });
    return client || axios;
  }

  return axios;
};

const matrimonialApi = createApiClient();

if (matrimonialApi?.interceptors?.request?.use) {
  matrimonialApi.interceptors.request.use((config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  });
}

if (matrimonialApi?.interceptors?.response?.use) {
  matrimonialApi.interceptors.response.use(
    (response) => response,
    (error) => {
      const normalizedError = new Error(
        error?.response?.data?.message || error?.message || "Matrimonial API request failed"
      );

      normalizedError.response = error?.response;
      normalizedError.code = error?.code;
      throw normalizedError;
    }
  );
}

const buildSearchParams = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === "" || value === "Any") {
      return;
    }

    params.set(key, String(value));
  });

  return params;
};

export const getMatrimonialProfile = async () => {
  const response = await matrimonialApi.get("/profile");
  return response.data?.data || null;
};

export const saveMatrimonialProfile = async ({ profile, preferences, photoFile }) => {
  const formData = new FormData();

  Object.entries(profile || {}).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      formData.append(key, value.join(", "));
      return;
    }

    formData.append(key, String(value));
  });

  formData.append("preferences", JSON.stringify(preferences || {}));

  if (photoFile) {
    formData.append("photo", photoFile);
  }

  const response = await matrimonialApi.put("/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const searchMatrimonialProfiles = async (filters = {}) => {
  const params = buildSearchParams({
    ...filters,
    limit: filters.limit || 100,
  });

  const response = await matrimonialApi.get(`/search?${params.toString()}`);
  return response.data?.data || [];
};

export const getMatrimonialInterests = async () => {
  const response = await matrimonialApi.get("/interests");
  return response.data?.data || { incoming: [], outgoing: [] };
};

export const sendMatrimonialInterest = async (toProfileId, message = "") => {
  const response = await matrimonialApi.post("/interests", { toProfileId, message });
  return response.data;
};

export const respondToMatrimonialInterest = async (interestId, action) => {
  const response = await matrimonialApi.patch(`/interests/${interestId}`, { action });
  return response.data;
};

export const getMatrimonialMessages = async () => {
  const response = await matrimonialApi.get("/messages");
  return response.data?.data || [];
};

export const sendMatrimonialMessage = async (toProfileId, content) => {
  const response = await matrimonialApi.post("/messages", { toProfileId, content });
  return response.data;
};

export const blockMatrimonialProfile = async (profileId) => {
  const response = await matrimonialApi.post(`/profiles/${profileId}/block`, {});
  return response.data;
};

export const reportMatrimonialProfile = async (profileId, reason) => {
  const response = await matrimonialApi.post(`/profiles/${profileId}/report`, { reason });
  return response.data;
};

export const getMatrimonialAdminQueue = async () => {
  const response = await matrimonialApi.get("/admin/review-queue");
  return response.data?.data || { summary: null, profiles: [] };
};

export const moderateMatrimonialProfile = async (profileId, action) => {
  const response = await matrimonialApi.patch(`/admin/profiles/${profileId}/moderation`, {
    action,
  });
  return response.data;
};

export const uploadKYCDocument = async (documentFile, documentType, profileId = "") => {
  const formData = new FormData();
  formData.append("document", documentFile);
  formData.append("documentType", documentType);
  if (profileId) {
    formData.append("profileId", profileId);
  }

  const response = await matrimonialApi.post("/kyc/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const uploadKYCSelfie = async (selfieImageBase64, profileId = "") => {
  const response = await matrimonialApi.post("/kyc/selfie", {
    selfieImage: selfieImageBase64,
    profileId,
  });
  return response.data;
};

export const getKYCStatus = async (profileId = "") => {
  const response = await matrimonialApi.get("/kyc/status", {
    params: profileId ? { profileId } : {},
  });
  return response.data;
};

export const approveKYC = async (kycId, adminNotes = "") => {
  const response = await matrimonialApi.patch(`/kyc/${kycId}/approve`, { adminNotes });
  return response.data;
};

export const rejectKYC = async (kycId, reason) => {
  const response = await matrimonialApi.patch(`/kyc/${kycId}/reject`, { reason });
  return response.data;
};

export const getBlueTickStatus = async (profileId) => {
  const response = await matrimonialApi.get("/blue-tick/status", {
    params: { profileId },
  });
  return response.data;
};

export const requestBlueTickManualReview = async (profileId) => {
  const response = await matrimonialApi.post("/blue-tick/request", { profileId });
  return response.data;
};

export const issueBlueTickManually = async (profileId, adminNotes = "") => {
  const response = await matrimonialApi.post("/blue-tick/issue-manual", {
    profileId,
    adminNotes,
  });
  return response.data;
};

export const revokeBlueTickBadge = async (profileId, reason) => {
  const response = await matrimonialApi.post("/blue-tick/revoke", { profileId, reason });
  return response.data;
};

export const calculateHoroscopeMatching = async (profile1Id, profile2Id) => {
  const response = await matrimonialApi.post("/horoscope/match", { profile1Id, profile2Id });
  return response.data;
};

export const uploadHoroscope = async (horoscopeFile, horoscopeData) => {
  const formData = new FormData();
  if (horoscopeFile) {
    formData.append("horoscope", horoscopeFile);
  }
  formData.append("data", JSON.stringify(horoscopeData));

  const response = await matrimonialApi.post("/horoscope/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getHoroscopeDetails = async (profileId) => {
  const response = await matrimonialApi.get(`/horoscope/${profileId}`);
  return response.data;
};

export const getCurrentSubscription = async () => {
  const response = await matrimonialApi.get("/subscription/current");
  return response.data;
};

export const createSubscription = async (tier, billingCycle = "monthly", profileId = "") => {
  const response = await matrimonialApi.post("/subscription/create", {
    tier,
    billingCycle,
    profileId,
  });
  return response.data;
};

export const cancelSubscription = async (subscriptionId, reason = "") => {
  const response = await matrimonialApi.patch(`/subscription/${subscriptionId}/cancel`, {
    reason,
  });
  return response.data;
};

export const requestSubscriptionRefund = async (subscriptionId, reason = "") => {
  const response = await matrimonialApi.patch(`/subscription/${subscriptionId}/refund`, {
    reason,
  });
  return response.data;
};

export const checkSubscriptionEntitlement = async (entitlement) => {
  const response = await matrimonialApi.post("/subscription/check-entitlement", {
    entitlement,
  });
  return response.data;
};

export const consumeSubscriptionEntitlement = async (entitlement, amount = 1) => {
  const response = await matrimonialApi.post("/subscription/consume", { entitlement, amount });
  return response.data;
};

export const createRazorpayOrder = async (subscriptionTier, amount, profileId = "") => {
  const response = await matrimonialApi.post("/subscription/payments/razorpay/create", {
    subscriptionTier,
    amount,
    profileId,
  });
  return response.data;
};

export const verifyRazorpayPayment = async (paymentId, orderId, signature, subscriptionTier) => {
  const response = await matrimonialApi.post("/subscription/payments/razorpay/verify", {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature,
    subscriptionTier,
  });
  return response.data;
};

export const createUPIPaymentSession = async (subscriptionTier, amount, profileId = "") => {
  const response = await matrimonialApi.post("/subscription/payments/upi/create", {
    subscriptionTier,
    amount,
    profileId,
  });
  return response.data;
};

export const checkUPIPaymentStatus = async (transactionId) => {
  const response = await matrimonialApi.get("/subscription/payments/upi/status", {
    params: { transactionId },
  });
  return response.data;
};

export const getPaymentHistory = async () => {
  const response = await matrimonialApi.get("/subscription/payments/history");
  return response.data;
};

export const retryFailedPayment = async (subscriptionId) => {
  const response = await matrimonialApi.post("/subscription/payments/retry", {
    subscriptionId,
  });
  return response.data;
};

export const getPaymentInvoice = async (paymentId) => {
  const response = await matrimonialApi.get(`/subscription/payments/${paymentId}/invoice`);
  return response.data;
};

export const getRefundStatus = async (subscriptionId = "", paymentId = "") => {
  const response = await matrimonialApi.get("/subscription/payments/refund-status", {
    params: {
      ...(subscriptionId ? { subscriptionId } : {}),
      ...(paymentId ? { paymentId } : {}),
    },
  });
  return response.data;
};

export const isFeatureAvailable = async (featureName) => {
  try {
    const result = await checkSubscriptionEntitlement(featureName);
    return Boolean(result?.hasAccess);
  } catch (_error) {
    return false;
  }
};

export const canViewProfile = async () => isFeatureAvailable("profileViews");
export const canSendInterest = async () => isFeatureAvailable("interestRequests");
export const canDirectMessage = async () => isFeatureAvailable("directMessages");
export const canUseHoroscopeMatching = async () => isFeatureAvailable("horoscopeMatching");
export const canVideoCall = async () => isFeatureAvailable("videoCalls");

export const consumeProfileView = async () => consumeSubscriptionEntitlement("profileViews", 1);
export const consumeInterestRequest = async () =>
  consumeSubscriptionEntitlement("interestRequests", 1);
export const consumeMessage = async () => consumeSubscriptionEntitlement("directMessages", 1);
