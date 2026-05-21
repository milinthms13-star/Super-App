import { BACKEND_BASE_URL } from "../../../utils/api";
import { getFreelancerAuthToken } from "./freelancerAuth";

const MAX_RETRIES = 2;
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const MEMORY_GET_CACHE = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `frl-ui-${Date.now()}-${token}`;
  }
  return `frl-ui-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};

const safeJsonParse = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const shouldRetry = (method, status, attempt) => {
  if (attempt >= MAX_RETRIES) return false;
  if (!RETRYABLE_METHODS.has(method)) return false;
  if (!status) return true;
  return RETRY_STATUS.has(status);
};

const isAbsoluteUrl = (value = "") => /^https?:\/\//i.test(String(value));

const buildUrl = (path = "") => {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  const base = String(BACKEND_BASE_URL || "").replace(/\/+$/, "");
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const getBaseHeaders = () => {
  const headers = {
    "x-request-id": createRequestId(),
  };

  const token = getFreelancerAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const request = async (path, options = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  const timeoutMs = Number(options.timeout || 12000);
  const retries = Number(options.retries || 0);
  const cacheTtlMs = Number(options.cacheTtlMs || 0);
  const cacheKey = method === "GET" && cacheTtlMs > 0 ? `${buildUrl(path)}::${JSON.stringify(options.headers || {})}` : "";

  if (cacheKey) {
    const existing = MEMORY_GET_CACHE.get(cacheKey);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.value;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      ...getBaseHeaders(),
      ...(options.headers || {}),
    };

    const finalOptions = {
      method,
      headers,
      signal: controller.signal,
      credentials: "include",
    };

    if (options.body !== undefined) {
      finalOptions.body = options.body;
    }

    const response = await fetch(buildUrl(path), finalOptions);
    const parsed = await safeJsonParse(response);

    if (!response.ok) {
      const error = new Error(parsed?.message || `Request failed with status ${response.status}`);
      error.response = { status: response.status, data: parsed };
      error.status = response.status;
      throw error;
    }

    const result = {
      status: response.status,
      data: parsed,
      headers: response.headers,
    };
    if (cacheKey) {
      MEMORY_GET_CACHE.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + cacheTtlMs,
      });
    }
    return result;
  } catch (error) {
    const status = Number(error?.response?.status || error?.status || 0);
    if (shouldRetry(method, status, retries)) {
      await sleep(300 * (retries + 1));
      return request(path, { ...options, retries: retries + 1 });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const freelancerFetchClient = {
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
};
