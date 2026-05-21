import axios from "axios";
import { BACKEND_BASE_URL } from "../../../utils/api";

const MAX_RETRIES = 2;
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `fin-ui-${Date.now()}-${token}`;
  }
  return `fin-ui-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};

export const financeHttpClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 12000,
  withCredentials: true,
});

financeHttpClient.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers || {};
  if (!nextConfig.headers["x-request-id"]) {
    nextConfig.headers["x-request-id"] = createRequestId();
  }
  return nextConfig;
});

financeHttpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config || {};
    const method = String(config.method || "get").toLowerCase();
    const status = Number(error?.response?.status || 0);
    const retryCount = Number(config.__retryCount || 0);
    const shouldRetry =
      RETRYABLE_METHODS.has(method) &&
      retryCount < MAX_RETRIES &&
      (!status || RETRY_STATUS.has(status));

    if (shouldRetry) {
      config.__retryCount = retryCount + 1;
      await sleep(300 * config.__retryCount);
      return financeHttpClient(config);
    }

    return Promise.reject(error);
  }
);
