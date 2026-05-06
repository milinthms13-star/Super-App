/**
 * Matrimonial API - KYC, Blue Tick, Horoscope, Subscription, Payment
 * Frontend wiring for all matrimonial backend endpoints
 */

import axios from 'axios';
import { API_BASE_URL } from './constants';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

// ===== KYC ENDPOINTS =====

export const uploadKYCDocument = async (documentFile, documentType) => {
  const formData = new FormData();
  formData.append('document', documentFile);
  formData.append('documentType', documentType);

  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/kyc/upload`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const uploadKYCSelfie = async (selfieImageBase64) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/kyc/selfie`,
    { selfieImage: selfieImageBase64 },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getKYCStatus = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/api/matrimonial/kyc/status`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const approveKYC = async (kycId, adminNotes = '') => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/matrimonial/kyc/${kycId}/approve`,
    { adminNotes },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const rejectKYC = async (kycId, reason) => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/matrimonial/kyc/${kycId}/reject`,
    { reason },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ===== BLUE TICK ENDPOINTS =====

export const getBlueTickStatus = async (profileId) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/matrimonial/blue-tick/status`,
    {
      params: { profileId },
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

export const requestBlueTickManualReview = async (profileId) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/blue-tick/request`,
    { profileId },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const issueBlueTickManually = async (profileId, adminNotes = '') => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/blue-tick/issue-manual`,
    { profileId, adminNotes },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const revokeBlueTickBadge = async (profileId, reason) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/blue-tick/revoke`,
    { profileId, reason },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ===== HOROSCOPE MATCHING ENDPOINTS =====

export const calculateHoroscopeMatching = async (profile1Id, profile2Id) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/horoscope/match`,
    { profile1Id, profile2Id },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const uploadHoroscope = async (horoscopeFile, horoscopeData) => {
  const formData = new FormData();
  if (horoscopeFile) {
    formData.append('horoscope', horoscopeFile);
  }
  formData.append('data', JSON.stringify(horoscopeData));

  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/horoscope/upload`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const getHoroscopeDetails = async (profileId) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/matrimonial/horoscope/${profileId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ===== SUBSCRIPTION ENDPOINTS =====

export const getCurrentSubscription = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/api/matrimonial/subscription/current`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const createSubscription = async (tier, billingCycle = 'monthly') => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/create`,
    { tier, billingCycle },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const cancelSubscription = async (subscriptionId, reason = '') => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/matrimonial/subscription/${subscriptionId}/cancel`,
    { reason },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const requestSubscriptionRefund = async (subscriptionId, reason = '') => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/matrimonial/subscription/${subscriptionId}/refund`,
    { reason },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const checkSubscriptionEntitlement = async (entitlement) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/check-entitlement`,
    { entitlement },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const consumeSubscriptionEntitlement = async (entitlement, amount = 1) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/consume`,
    { entitlement, amount },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ===== PAYMENT ENDPOINTS =====

export const createRazorpayOrder = async (subscriptionTier, amount) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/payments/razorpay/create`,
    { subscriptionTier, amount },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const verifyRazorpayPayment = async (paymentId, orderId, signature, subscriptionTier) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/payments/razorpay/verify`,
    {
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature,
      subscriptionTier,
    },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const createStripePaymentSession = async (subscriptionTier, amount) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/payments/stripe/create`,
    { subscriptionTier, amount },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const verifyStripePayment = async (sessionId) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/payments/stripe/verify`,
    { sessionId },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const createUPIPaymentSession = async (subscriptionTier, amount) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/matrimonial/subscription/payments/upi/create`,
    { subscriptionTier, amount },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const checkUPIPaymentStatus = async (transactionId) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/matrimonial/subscription/payments/upi/status`,
    {
      params: { transactionId },
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

// ===== HELPER FUNCTIONS =====

export const isFeatureAvailable = async (featureName) => {
  try {
    const result = await checkSubscriptionEntitlement(featureName);
    return result.hasAccess;
  } catch (error) {
    return false;
  }
};

export const canViewProfile = async () => {
  return isFeatureAvailable('profileViews');
};

export const canSendInterest = async () => {
  return isFeatureAvailable('interestRequests');
};

export const canDirectMessage = async () => {
  return isFeatureAvailable('directMessages');
};

export const canUseHoroscopeMatching = async () => {
  return isFeatureAvailable('horoscopeMatching');
};

export const canVideoCall = async () => {
  return isFeatureAvailable('videoCalls');
};

export const consumeProfileView = async () => {
  return consumeSubscriptionEntitlement('profileViews', 1);
};

export const consumeInterestRequest = async () => {
  return consumeSubscriptionEntitlement('interestRequests', 1);
};

export const consumeMessage = async () => {
  return consumeSubscriptionEntitlement('directMessages', 1);
};
