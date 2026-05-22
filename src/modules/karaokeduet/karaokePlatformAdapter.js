const getGlobal = () => {
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
};

export const getRuntimeInfo = () => {
  const g = getGlobal();
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const isBrowser = typeof window !== "undefined";
  const isLikelyExpo =
    Boolean(g?.expo) ||
    Boolean(g?.Expo) ||
    /expo/i.test(String(nav?.userAgent || ""));

  return {
    isBrowser,
    isLikelyExpo,
    hasMediaDevices: Boolean(nav?.mediaDevices?.getUserMedia),
    hasMediaRecorder: typeof g.MediaRecorder !== "undefined",
    hasWebRTC:
      typeof g.RTCPeerConnection !== "undefined" &&
      typeof g.RTCSessionDescription !== "undefined" &&
      typeof g.RTCIceCandidate !== "undefined",
    hasClipboard: Boolean(nav?.clipboard?.writeText),
    hasAtob: typeof g.atob === "function",
  };
};

export const decodeJwtPayloadSegment = (payloadSegment = "") => {
  const g = getGlobal();
  const normalized = String(payloadSegment || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    if (typeof g.atob === "function") {
      return JSON.parse(g.atob(padded));
    }
  } catch (_error) {
    // continue to Buffer fallback
  }

  try {
    if (typeof g.Buffer !== "undefined") {
      return JSON.parse(g.Buffer.from(padded, "base64").toString("utf8"));
    }
  } catch (_error) {
    // no-op
  }

  return null;
};

export const requestAudioStream = async (constraints = { audio: true, video: false }) => {
  if (typeof navigator === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
    throw new Error(
      "Microphone capture is unavailable on this runtime. For Expo native, wire this flow to expo-av/expo-audio."
    );
  }
  return navigator.mediaDevices.getUserMedia(constraints);
};

export const createPlatformRecorder = (stream, options = {}) => {
  const g = getGlobal();
  if (typeof g.MediaRecorder === "undefined") {
    throw new Error(
      "MediaRecorder is unavailable on this runtime. For Expo native, use expo-av/expo-audio recording APIs."
    );
  }

  const preferredMime = String(options?.mimeType || "");
  const canUsePreferred =
    preferredMime &&
    typeof g.MediaRecorder.isTypeSupported === "function" &&
    g.MediaRecorder.isTypeSupported(preferredMime);

  if (canUsePreferred) {
    return new g.MediaRecorder(stream, options);
  }

  return new g.MediaRecorder(stream);
};

export const createPlatformPeerConnection = (config) => {
  const g = getGlobal();
  if (typeof g.RTCPeerConnection === "undefined") {
    throw new Error(
      "WebRTC peer connection is unavailable on this runtime. For Expo native, use react-native-webrtc integration."
    );
  }
  return new g.RTCPeerConnection(config);
};

export const createSessionDescription = (payload) => {
  const g = getGlobal();
  if (typeof g.RTCSessionDescription === "undefined") return payload;
  return new g.RTCSessionDescription(payload);
};

export const createIceCandidate = (payload) => {
  const g = getGlobal();
  if (typeof g.RTCIceCandidate === "undefined") return payload;
  return new g.RTCIceCandidate(payload);
};

export const setRepeatingTask = (fn, ms) => {
  const g = getGlobal();
  return g.setInterval(fn, ms);
};

export const clearRepeatingTask = (taskId) => {
  const g = getGlobal();
  if (taskId) g.clearInterval(taskId);
};

export const openExternalAsset = (url = "") => {
  const target = String(url || "").trim();
  if (!target) return false;

  const globalWindow = typeof window !== "undefined" ? window : null;
  if (globalWindow && typeof globalWindow.open === "function") {
    globalWindow.open(target, "_blank", "noopener,noreferrer");
    return true;
  }

  const locationObject = globalWindow?.['location'];
  if (locationObject) {
    locationObject.href = target;
    return true;
  }

  return false;
};

export const copyToClipboardSafe = async (value = "") => {
  const text = String(value || "").trim();
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document !== "undefined") {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copied;
  }

  return false;
};

export const getNetworkSnapshot = () => {
  const connection =
    (typeof navigator !== "undefined" && (navigator.connection || navigator.mozConnection || navigator.webkitConnection)) ||
    null;

  if (!connection) {
    return {
      qualityLabel: "unknown",
      effectiveType: "",
      downlink: 0,
      rtt: 0,
    };
  }

  const effectiveType = String(connection.effectiveType || "").toLowerCase();
  const downlink = Number(connection.downlink || 0);
  const rtt = Number(connection.rtt || 0);

  let qualityLabel = "fair";
  if (effectiveType === "4g" && downlink >= 2) qualityLabel = "great";
  else if (effectiveType === "3g" || downlink < 1) qualityLabel = "weak";

  return {
    qualityLabel,
    effectiveType,
    downlink,
    rtt,
  };
};

export const subscribeNetworkChanges = (onChange) => {
  const connection =
    (typeof navigator !== "undefined" && (navigator.connection || navigator.mozConnection || navigator.webkitConnection)) ||
    null;
  if (!connection || typeof connection.addEventListener !== "function") {
    return () => {};
  }

  connection.addEventListener("change", onChange);
  return () => {
    if (typeof connection.removeEventListener === "function") {
      connection.removeEventListener("change", onChange);
    }
  };
};
