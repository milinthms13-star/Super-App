import { API_BASE_URL, buildApiUrl } from "../../utils/api";
import {
  assertPayloadSuccess,
  assertProjectShape,
  assertRenderResponse,
} from "./videoStudioContracts";

const DEFAULT_TIMEOUT_MS = 25000;
const RENDER_TIMEOUT_MS = 360000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientStatus = (status) => status === 429 || status >= 500;

const isAbortError = (error) => error?.name === "AbortError";
const isLikelyNetworkError = (error) => {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  const message = String(error?.message || "").toLowerCase();
  return /failed to fetch|networkerror|load failed|network request failed|cors/i.test(message);
};

const stripTrailingSlashes = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const normalizeApiBaseUrl = (value = "") => {
  const normalizedValue = stripTrailingSlashes(value);
  if (!normalizedValue) return "";
  return /\/api$/i.test(normalizedValue) ? normalizedValue : `${normalizedValue}/api`;
};

const toAbsoluteApiUrl = (baseUrl, path = "") => {
  const normalizedBase = normalizeApiBaseUrl(baseUrl);
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const dedupeUrls = (urls = []) => Array.from(new Set(urls.filter(Boolean)));

const buildVideoStudioRequestUrls = (path = "") => {
  const candidates = [buildApiUrl(path)];
  const runtimeOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  if (runtimeOrigin && /^https?:\/\//i.test(runtimeOrigin)) {
    candidates.push(toAbsoluteApiUrl(runtimeOrigin, path));
  }

  if (typeof process !== "undefined") {
    candidates.push(toAbsoluteApiUrl(process.env.REACT_APP_BACKEND_URL || "", path));
    candidates.push(toAbsoluteApiUrl(process.env.REACT_APP_API_URL || "", path));
  }

  if (/onrender\.com/i.test(API_BASE_URL) || /onrender\.com/i.test(runtimeOrigin)) {
    candidates.push(toAbsoluteApiUrl("https://super-app-api.onrender.com", path));
  }

  return dedupeUrls(candidates);
};

const toNetworkError = (error, requestUrl) => {
  const rawMessage = String(error?.message || "").trim();
  const details =
    rawMessage.length > 0 ? ` (${rawMessage})` : "";
  return new VideoStudioApiError(
    `Unable to reach video service at ${requestUrl}. Check API URL, backend uptime, or CORS configuration.${details}`,
    {
      status: 0,
      code: "NETWORK_ERROR",
    }
  );
};

export class VideoStudioApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "VideoStudioApiError";
    this.status = details.status || 0;
    this.code = details.code || "REQUEST_FAILED";
    this.safety = details.safety || null;
    this.payload = details.payload || null;
  }
}

const parseApiResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    throw new VideoStudioApiError(
      `Video service returned empty response (${response.status}). Please verify backend API availability.`,
      { status: response.status, code: "EMPTY_RESPONSE" }
    );
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_error) {
    throw new VideoStudioApiError("Server returned invalid JSON.", {
      status: response.status,
      code: "INVALID_JSON",
    });
  }

  if (!response.ok) {
    throw new VideoStudioApiError(
      payload?.error || payload?.message || `Request failed (${response.status}).`,
      {
        status: response.status,
        code: payload?.code || "REQUEST_FAILED",
        safety: payload?.safety || null,
        payload,
      }
    );
  }

  return payload;
};

export const requestVideoStudio = async (
  path,
  { method = "GET", body, signal, timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1 } = {}
) => {
  const requestUrls = buildVideoStudioRequestUrls(path);
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const abortHandler = () => controller.abort();
    if (signal?.addEventListener) {
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    try {
      for (let index = 0; index < requestUrls.length; index += 1) {
        const requestUrl = requestUrls[index];
        try {
          const response = await fetch(requestUrl, {
            method,
            headers: {
              "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          const payload = await parseApiResponse(response);
          return { payload, response };
        } catch (error) {
          if (isAbortError(error)) {
            if (signal?.aborted) {
              throw new VideoStudioApiError("Request was cancelled.", {
                status: 499,
                code: "REQUEST_ABORTED",
              });
            }

            if (timedOut) {
              throw new VideoStudioApiError(
                `Video service timed out after ${Math.ceil(timeoutMs / 1000)} seconds. Please retry or reduce scene complexity.`,
                {
                  status: 408,
                  code: "REQUEST_TIMEOUT",
                }
              );
            }

            throw new VideoStudioApiError("Request was aborted. Please try again.", {
              status: 499,
              code: "REQUEST_ABORTED",
            });
          }

          const normalizedError = isLikelyNetworkError(error)
            ? toNetworkError(error, requestUrl)
            : error;

          const status = Number(normalizedError?.status || 0);
          const hasNextCandidate = index < requestUrls.length - 1;
          const shouldTryNextCandidate =
            hasNextCandidate &&
            (isLikelyNetworkError(error) || status === 404 || status === 502 || status === 503 || status === 504);

          lastError = normalizedError;
          if (shouldTryNextCandidate) {
            continue;
          }

          throw normalizedError;
        }
      }
      const status = Number(lastError?.status || 0);
      const shouldRetry = !isAbortError(lastError) && attempt < retries && (status === 0 || isTransientStatus(status));
      if (!shouldRetry) {
        throw lastError;
      }
      await delay(350 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
      if (signal?.removeEventListener) {
        signal.removeEventListener("abort", abortHandler);
      }
      attempt += 1;
    }
  }

  throw lastError || new VideoStudioApiError("Request failed.");
};

export const createProject = (requestBody, options = {}) =>
  requestVideoStudio("/video-studio/create", { method: "POST", body: requestBody, retries: 1, ...options }).then(
    (result) => {
      assertPayloadSuccess(result.payload, "create response");
      assertProjectShape(result.payload.project, "create project");
      return result;
    }
  );

export const createAutopilotProject = (requestBody, options = {}) =>
  requestVideoStudio("/video-studio/autopilot/create", { method: "POST", body: requestBody, retries: 1, ...options }).then(
    (result) => {
      assertPayloadSuccess(result.payload, "autopilot response");
      assertProjectShape(result.payload.project, "autopilot project");
      return result;
    }
  );

export const patchProject = (projectId, requestBody, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}`, {
    method: "PATCH",
    body: requestBody,
    retries: 1,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "patch response");
    assertProjectShape(result.payload.project, "patched project");
    return result;
  });

export const regenerateStage = (projectId, stage, requestBody, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/regenerate/${stage}`, {
    method: "POST",
    body: requestBody,
    retries: 1,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "regenerate response");
    assertProjectShape(result.payload.project, "regenerated project");
    return result;
  });

export const renderProject = (requestBody, options = {}) =>
  requestVideoStudio("/video-studio/render", { method: "POST", body: requestBody, retries: 0, timeoutMs: RENDER_TIMEOUT_MS, ...options }).then(
    (result) => {
      assertRenderResponse(result.payload);
      return result;
    }
  );

export const getProjectDownloadLink = (projectId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/download`, { method: "GET", retries: 1, ...options }).then(
    (result) => {
      assertPayloadSuccess(result.payload, "download response");
      if (!result.payload?.downloadUrl && !result.payload?.videoUrl) {
        throw new Error("Invalid download response: missing downloadUrl.");
      }
      return result;
    }
  );
