import axios from "axios";
import { buildApiUrl } from "../../../utils/api";
import { getStoredAuthToken } from "../../../utils/auth";
import { enqueueOfflineAction } from "./offlineActionQueue";

/**
 * BeautyAI API Service
 * Centralized API calls for the BeautyAI module with offline support
 */

const createAuthenticatedRequest = () => {
  const token = getStoredAuthToken();
  return axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// ==================== Tips API ====================

export const fetchDailyTips = async (params = {}) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/tips/today"), {
      params: {
        language: params.language || "en",
        category: params.category || undefined,
        timezone: params.timezone || undefined,
      },
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch beauty tips",
    };
  }
};

export const createTip = async (tipData) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl("/beauty-ai/admin/tips"), tipData);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to create tip",
    };
  }
};

// ==================== Usage & Quota API ====================

export const fetchUsageStatus = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/me/usage"));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch usage status",
    };
  }
};

// ==================== Consent API ====================

export const fetchConsentStatus = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/consent/status"));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch consent status",
    };
  }
};

export const grantConsent = async (consentType) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl("/beauty-ai/consent/grant"), {
      consentType,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to grant consent",
    };
  }
};

export const revokeConsent = async (consentType) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl("/beauty-ai/consent/revoke"), {
      consentType,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to revoke consent",
    };
  }
};

// ==================== Selfie API ====================

export const analyzeSelfie = async (formData) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(
      buildApiUrl("/beauty-ai/analyze-selfie"),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to analyze selfie",
    };
  }
};

export const fetchMySelfies = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/selfies/mine"));
    return {
      success: true,
      data: response.data?.data || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch selfies",
      data: [],
    };
  }
};

export const deleteSelfie = async (selfieId) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.delete(buildApiUrl(`/beauty-ai/selfies/${selfieId}`));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (navigator.onLine === false) {
      enqueueOfflineAction({
        type: "DELETE_SELFIE",
        endpoint: `/beauty-ai/selfies/${selfieId}`,
        method: "DELETE",
        selfieId,
      });
      return {
        success: true,
        offline: true,
        message: "Delete queued for when you're back online",
      };
    }
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to delete selfie",
    };
  }
};

// ==================== Plan API ====================

export const generatePlan = async (planData) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl("/beauty-ai/plan"), planData);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to generate plan",
    };
  }
};

export const fetchMyPlans = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/plans/my"));
    return {
      success: true,
      data: response.data?.data || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch plans",
      data: [],
    };
  }
};

export const fetchPlanById = async (planId) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl(`/beauty-ai/plans/${planId}`));
    return {
      success: true,
      data: response.data?.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch plan",
    };
  }
};

export const updatePlan = async (planId, updates) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.put(buildApiUrl(`/beauty-ai/plans/${planId}`), updates);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (navigator.onLine === false) {
      enqueueOfflineAction({
        type: "UPDATE_PLAN",
        endpoint: `/beauty-ai/plans/${planId}`,
        method: "PUT",
        planId,
        payload: updates,
      });
      return {
        success: true,
        offline: true,
        message: "Update queued for when you're back online",
      };
    }
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to update plan",
    };
  }
};

export const deletePlan = async (planId) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.delete(buildApiUrl(`/beauty-ai/plans/${planId}`));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (navigator.onLine === false) {
      enqueueOfflineAction({
        type: "DELETE_PLAN",
        endpoint: `/beauty-ai/plans/${planId}`,
        method: "DELETE",
        planId,
      });
      return {
        success: true,
        offline: true,
        message: "Delete queued for when you're back online",
      };
    }
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to delete plan",
    };
  }
};

export const duplicatePlan = async (planId) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl(`/beauty-ai/plans/${planId}/duplicate`));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to duplicate plan",
    };
  }
};

export const updatePlanPhoto = async (planId, formData) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.put(
      buildApiUrl(`/beauty-ai/plans/${planId}/photo`),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to update plan photo",
    };
  }
};

// ==================== Progress Log API ====================

export const fetchProgressLogs = async (planId = "") => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/progress-log/mine"), {
      params: planId ? { planId } : {},
    });
    return {
      success: true,
      data: response.data?.logs || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch progress logs",
      data: [],
    };
  }
};

export const saveProgressLog = async (logData) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl("/beauty-ai/progress-log"), logData);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (navigator.onLine === false) {
      enqueueOfflineAction({
        type: "SAVE_PROGRESS",
        endpoint: "/beauty-ai/progress-log",
        method: "POST",
        payload: logData,
      });
      return {
        success: true,
        offline: true,
        message: "Progress saved locally and will sync when online",
      };
    }
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to save progress log",
    };
  }
};

// ==================== Admin API ====================

export const fetchSubscriptionRules = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/admin/subscription-rules"));
    return {
      success: true,
      data: response.data?.subscriptionRules,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch subscription rules",
    };
  }
};

export const updateSubscriptionRules = async (rules) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.put(
      buildApiUrl("/beauty-ai/admin/subscription-rules"),
      rules
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to update subscription rules",
    };
  }
};

export const fetchAdminAlerts = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/admin/alerts"));
    return {
      success: true,
      data: response.data?.alerts || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch alerts",
      data: [],
    };
  }
};

export const fetchAdminStats = async () => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.get(buildApiUrl("/beauty-ai/admin/stats"));
    return {
      success: true,
      data: response.data?.stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.response?.data?.message || "Failed to fetch admin stats",
    };
  }
};

// ==================== Helper Functions ====================

export const isOnline = () => {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
};

export const waitForOnline = () => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }
    const handler = () => {
      window.removeEventListener("online", handler);
      resolve(true);
    };
    window.addEventListener("online", handler);
  });
};
