import { API_BASE_URL, buildApiUrl } from "../../utils/api";
import {
  assertPayloadSuccess,
  assertProjectShape,
  assertRenderResponse,
} from "./videoStudioContracts";

const DEFAULT_TIMEOUT_MS = 25000;
const parseNumericEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const RENDER_TIMEOUT_MS = parseNumericEnv(process.env.REACT_APP_VIDEO_RENDER_TIMEOUT_MS, 900000);
const DEFAULT_RENDER_POLL_ATTEMPTS = parseNumericEnv(process.env.REACT_APP_VIDEO_RENDER_POLL_ATTEMPTS, 48);
const DEFAULT_RENDER_POLL_INTERVAL_MS = parseNumericEnv(process.env.REACT_APP_VIDEO_RENDER_POLL_INTERVAL_MS, 5000);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientStatus = (status) => status === 429 || status >= 500;

const isAbortError = (error) => error?.name === "AbortError";
const isRecoverableParseError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  return code === "EMPTY_RESPONSE" || code === "INVALID_JSON";
};
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

const normalizeComparableVideoUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, "https://video.local");
    parsed.hash = "";
    return `${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return raw;
  }
};

const buildVideoStudioRequestUrls = (path = "") => {
  const candidates = [buildApiUrl(path)];
  const runtimeOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const explicitBackendUrl =
    typeof process !== "undefined" ? stripTrailingSlashes(process.env.REACT_APP_BACKEND_URL || "") : "";
  const explicitApiUrl =
    typeof process !== "undefined" ? stripTrailingSlashes(process.env.REACT_APP_API_URL || "") : "";
  const hasExplicitApiTargets = Boolean(explicitBackendUrl || explicitApiUrl);

  if (runtimeOrigin && /^https?:\/\//i.test(runtimeOrigin)) {
    candidates.push(toAbsoluteApiUrl(runtimeOrigin, path));
  }

  if (typeof process !== "undefined") {
    candidates.push(toAbsoluteApiUrl(process.env.REACT_APP_BACKEND_URL || "", path));
    candidates.push(toAbsoluteApiUrl(process.env.REACT_APP_API_URL || "", path));
  }

  // Do not force any hardcoded host fallback.
  // Requests should use only configured env targets + same-origin candidate.

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
          const hasBody = typeof body !== "undefined";
          const requestHeaders = hasBody ? { "Content-Type": "application/json" } : undefined;
          const response = await fetch(requestUrl, {
            method,
            headers: requestHeaders,
            body: hasBody ? JSON.stringify(body) : undefined,
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
          const code = String(normalizedError?.code || "").toUpperCase();
          const hasNextCandidate = index < requestUrls.length - 1;
          const shouldTryNextCandidate =
            hasNextCandidate &&
            (
              isLikelyNetworkError(error) ||
              isRecoverableParseError(normalizedError) ||
              status === 404 ||
              status === 502 ||
              status === 503 ||
              status === 504
            );

          lastError = normalizedError;
          if (shouldTryNextCandidate) {
            continue;
          }

          throw normalizedError;
        }
      }
      const status = Number(lastError?.status || 0);
      const code = String(lastError?.code || "").toUpperCase();
      const shouldRetry =
        !isAbortError(lastError) &&
        attempt < retries &&
        (status === 0 || isTransientStatus(status) || code === "EMPTY_RESPONSE" || code === "INVALID_JSON");
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

export const renderProject = async (requestBody, options = {}) => {
  try {
    const cartoonResult = await requestVideoStudio("/video-studio/render-cartoon", {
      method: "POST",
      body: requestBody,
      retries: 0,
      timeoutMs: RENDER_TIMEOUT_MS,
      ...options,
    });
    assertRenderResponse(cartoonResult.payload);
    return cartoonResult;
  } catch (error) {
    const status = Number(error?.status || 0);
    const shouldFallback = status === 404 || status === 405;
    if (!shouldFallback) {
      throw error;
    }

    const legacyResult = await requestVideoStudio("/video-studio/render", {
      method: "POST",
      body: requestBody,
      retries: 0,
      timeoutMs: RENDER_TIMEOUT_MS,
      ...options,
    });
    assertRenderResponse(legacyResult.payload);
    return legacyResult;
  }
};

export const renderPromptVideoHf = (requestBody, options = {}) =>
  requestVideoStudio('/kids-video-hf/generate', {
    method: 'POST',
    body: {
      ...(requestBody || {}),
      engine: requestBody?.engine || requestBody?.renderEngine || 'diffusers_t2v',
      renderEngine: requestBody?.renderEngine || requestBody?.engine || 'diffusers_t2v',
    },
    retries: 1,
    timeoutMs: RENDER_TIMEOUT_MS,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, 'kids-video-hf generate response');
    if (!result.payload?.videoUrl) {
      throw new VideoStudioApiError('HF generator response is missing videoUrl.', {
        status: 500,
        code: 'INVALID_RESPONSE',
        payload: result.payload,
      });
    }
    return result;
  });

export const getProjectDownloadLink = async (projectId, options = {}) => {
  try {
    const result = await requestVideoStudio(`/video-studio/projects/${projectId}/download`, {
      method: "GET",
      retries: 1,
      ...options,
    });

    assertPayloadSuccess(result.payload, "download response");
    if (!result.payload?.downloadUrl && !result.payload?.videoUrl) {
      throw new Error("Invalid download response: missing downloadUrl.");
    }
    return result;
  } catch (error) {
    const status = Number(error?.status || 0);
    const code = String(error?.code || "");
    const shouldFallback = status === 404 || code === "INVALID_JSON" || code === "EMPTY_RESPONSE";

    if (!shouldFallback) {
      throw error;
    }

    const projectResult = await requestVideoStudio(`/video-studio/projects/${projectId}`, {
      method: "GET",
      retries: 1,
      ...options,
    });

    assertPayloadSuccess(projectResult.payload, "project response");
    const downloadUrl = projectResult.payload.project?.videoUrl || projectResult.payload.project?.downloadUrl;
    if (!downloadUrl) {
      throw new Error("Project has no downloadable video URL.");
    }

    return {
      ...projectResult,
      payload: {
        ...projectResult.payload,
        success: true,
        downloadUrl,
        videoUrl: downloadUrl,
      },
    };
  }
};

export const getProjectRenderStatus = (projectId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/status`, {
    method: "GET",
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "render-status response");
    return result;
  });

export const waitForRenderedVideo = async (
  projectId,
  {
    signal,
    maxAttempts = DEFAULT_RENDER_POLL_ATTEMPTS,
    intervalMs = DEFAULT_RENDER_POLL_INTERVAL_MS,
    timeoutMs = 20000,
    previousVideoUrl = "",
  } = {}
) => {
  let lastError = null;
  const previousComparableUrl = normalizeComparableVideoUrl(previousVideoUrl);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw new VideoStudioApiError("Render status check cancelled.", {
        status: 499,
        code: "REQUEST_ABORTED",
      });
    }

    try {
      const statusResult = await getProjectRenderStatus(projectId, {
        signal,
        retries: 0,
        timeoutMs,
      });
      const status = String(statusResult?.payload?.status || "").toLowerCase();
      if (status === "ready" && (statusResult.payload?.downloadUrl || statusResult.payload?.videoUrl)) {
        const candidateVideoUrl = statusResult.payload.videoUrl || statusResult.payload.downloadUrl;
        const candidateComparableUrl = normalizeComparableVideoUrl(candidateVideoUrl);
        if (previousComparableUrl && candidateComparableUrl === previousComparableUrl) {
          await delay(intervalMs);
          continue;
        }
        return {
          ...statusResult,
          payload: {
            ...statusResult.payload,
            success: true,
            downloadUrl: statusResult.payload.downloadUrl || statusResult.payload.videoUrl,
            videoUrl: statusResult.payload.videoUrl || statusResult.payload.downloadUrl,
          },
        };
      }

      const downloadResult = await getProjectDownloadLink(projectId, {
        signal,
        retries: 0,
        timeoutMs,
      });
      const candidateVideoUrl = downloadResult?.payload?.videoUrl || downloadResult?.payload?.downloadUrl || "";
      const candidateComparableUrl = normalizeComparableVideoUrl(candidateVideoUrl);
      if (previousComparableUrl && candidateComparableUrl === previousComparableUrl) {
        await delay(intervalMs);
        continue;
      }

      return downloadResult;
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      const code = String(error?.code || "");
      const retryable = status === 404 || status === 408 || status === 409 || status === 425 || status >= 500 || code === "EMPTY_RESPONSE";

      if (!retryable || attempt === maxAttempts - 1) {
        throw error;
      }

      await delay(intervalMs);
    }
  }

  throw (
    lastError ||
    new VideoStudioApiError("Rendered video is not available yet. Please retry in a moment.", {
      status: 408,
      code: "REQUEST_TIMEOUT",
    })
  );
};

export const generateCharacterSheet = (projectId, requestBody = {}, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/generate-character-sheet`, {
    method: "POST",
    body: requestBody,
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "character-sheet response");
    return result;
  });

export const generateSceneImage = (projectId, sceneId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/generate-image`, {
    method: "POST",
    body: {},
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "scene-image response");
    return result;
  });

export const regenerateScene = (projectId, sceneId, requestBody = {}, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/regenerate`, {
    method: "POST",
    body: requestBody,
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "regenerate-scene response");
    assertProjectShape(result.payload.project, "regenerated-scene project");
    return result;
  });

export const regenerateSceneDialogue = (projectId, sceneId, requestBody = {}, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/regenerate-dialogue`, {
    method: "POST",
    body: requestBody,
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "regenerate-scene-dialogue response");
    assertProjectShape(result.payload.project, "regenerated-scene-dialogue project");
    return result;
  });

export const animateScene = (projectId, sceneId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/animate`, {
    method: "POST",
    body: {},
    retries: 0,
    timeoutMs: RENDER_TIMEOUT_MS,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "animate-scene response");
    return result;
  });

export const generateSceneVoice = (projectId, sceneId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/generate-voice`, {
    method: "POST",
    body: {},
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "scene-voice response");
    return result;
  });

export const generateSceneSfx = (projectId, sceneId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/generate-sfx`, {
    method: "POST",
    body: {},
    retries: 0,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "scene-sfx response");
    return result;
  });

export const lipSyncScene = (projectId, sceneId, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/scenes/${sceneId}/lip-sync`, {
    method: "POST",
    body: {},
    retries: 0,
    timeoutMs: RENDER_TIMEOUT_MS,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "lip-sync response");
    return result;
  });

export const composeFinalVideo = (projectId, requestBody = {}, options = {}) =>
  requestVideoStudio(`/video-studio/projects/${projectId}/compose-final-video`, {
    method: "POST",
    body: requestBody,
    retries: 0,
    timeoutMs: RENDER_TIMEOUT_MS,
    ...options,
  }).then((result) => {
    assertPayloadSuccess(result.payload, "compose-final-video response");
    return result;
  });
