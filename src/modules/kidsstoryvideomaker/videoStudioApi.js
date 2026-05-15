import { buildApiUrl } from "../../utils/api";

const DEFAULT_TIMEOUT_MS = 25000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientStatus = (status) => status === 429 || status >= 500;

const isAbortError = (error) => error?.name === "AbortError";

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
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const abortHandler = () => controller.abort();
    if (signal?.addEventListener) {
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    try {
      const response = await fetch(buildApiUrl(path), {
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
      lastError = error;
      if (isAbortError(error) && signal?.aborted) {
        throw error;
      }

      const status = Number(error?.status || 0);
      const shouldRetry = !isAbortError(error) && attempt < retries && (status === 0 || isTransientStatus(status));
      if (!shouldRetry) {
        throw error;
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
  requestVideoStudio("/video-studio/create", { method: "POST", body: requestBody, retries: 1, ...options });

export const createAutopilotProject = (requestBody, options = {}) =>
  requestVideoStudio("/video-studio/autopilot/create", { method: "POST", body: requestBody, retries: 1, ...options });

export const patchProject = (projectId, requestBody, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}`, {
    method: "PATCH",
    body: requestBody,
    retries: 1,
    ...options,
  });

export const regenerateStage = (projectId, stage, requestBody, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/regenerate/${stage}`, {
    method: "POST",
    body: requestBody,
    retries: 1,
    ...options,
  });

export const renderProject = (requestBody, options = {}) =>
  requestVideoStudio("/video-studio/render", { method: "POST", body: requestBody, retries: 0, timeoutMs: 120000, ...options });

export const getProjectDownloadLink = (projectId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/download`, { method: "GET", retries: 1, ...options });
