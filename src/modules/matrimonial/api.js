import axios from "axios";

import { API_BASE_URL } from "./constants.js";

const MATRIMONIAL_API_BASE_URL = `${API_BASE_URL}/matrimonial`;
const REQUEST_TIMEOUT_MS = 10000;

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
  const response = await axios.get(`${MATRIMONIAL_API_BASE_URL}/profile`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

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

  const response = await axios.put(`${MATRIMONIAL_API_BASE_URL}/profile`, formData, {
    timeout: REQUEST_TIMEOUT_MS,
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

  const response = await axios.get(`${MATRIMONIAL_API_BASE_URL}/search?${params.toString()}`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  return response.data?.data || [];
};

export const getMatrimonialInterests = async () => {
  const response = await axios.get(`${MATRIMONIAL_API_BASE_URL}/interests`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  return response.data?.data || { incoming: [], outgoing: [] };
};

export const sendMatrimonialInterest = async (toProfileId, message = "") => {
  const response = await axios.post(
    `${MATRIMONIAL_API_BASE_URL}/interests`,
    { toProfileId, message },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return response.data;
};

export const respondToMatrimonialInterest = async (interestId, action) => {
  const response = await axios.patch(
    `${MATRIMONIAL_API_BASE_URL}/interests/${interestId}`,
    { action },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return response.data;
};

export const getMatrimonialMessages = async () => {
  const response = await axios.get(`${MATRIMONIAL_API_BASE_URL}/messages`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  return response.data?.data || [];
};

export const sendMatrimonialMessage = async (toProfileId, content) => {
  const response = await axios.post(
    `${MATRIMONIAL_API_BASE_URL}/messages`,
    { toProfileId, content },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return response.data;
};

export const blockMatrimonialProfile = async (profileId) => {
  const response = await axios.post(
    `${MATRIMONIAL_API_BASE_URL}/profiles/${profileId}/block`,
    {},
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return response.data;
};

export const reportMatrimonialProfile = async (profileId, reason) => {
  const response = await axios.post(
    `${MATRIMONIAL_API_BASE_URL}/profiles/${profileId}/report`,
    { reason },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return response.data;
};

export const getMatrimonialAdminQueue = async () => {
  const response = await axios.get(`${MATRIMONIAL_API_BASE_URL}/admin/review-queue`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  return response.data?.data || { summary: null, profiles: [] };
};

export const moderateMatrimonialProfile = async (profileId, action) => {
  const response = await axios.patch(
    `${MATRIMONIAL_API_BASE_URL}/admin/profiles/${profileId}/moderation`,
    { action },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return response.data;
};
