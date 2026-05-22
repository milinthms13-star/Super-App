const isBrowserNotificationSupported = () =>
  typeof window !== "undefined" && typeof window.Notification !== "undefined";

const requestPermission = async () => {
  if (!isBrowserNotificationSupported()) return "unsupported";
  if (window.Notification.permission === "granted") return "granted";
  if (window.Notification.permission === "denied") return "denied";
  return window.Notification.requestPermission();
};

const showNotification = ({ title, body } = {}) => {
  if (!isBrowserNotificationSupported()) return null;
  if (window.Notification.permission !== "granted") return null;
  try {
    return new window.Notification(String(title || "NilaJobs Update"), {
      body: String(body || "").trim(),
    });
  } catch (_error) {
    return null;
  }
};

const buildDeviceToken = () => {
  const source = `${navigator.userAgent || "web"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const encoded =
    typeof btoa === "function"
      ? btoa(source)
      : source
          .split("")
          .map((char) => char.charCodeAt(0).toString(16))
          .join("");
  return `web-${encoded.replace(/=/g, "")}`;
};

const ensureDeviceId = () => {
  const key = "jobportal_device_id_v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem(key, created);
  return created;
};

export const jobPortalNotifications = {
  requestPermission,
  showNotification,
  registerDevice: async (apiClient) => {
    if (!apiClient?.registerDevice) return { success: false, reason: "missing_api" };
    const permission = await requestPermission();
    if (permission !== "granted" && permission !== "default") {
      return { success: false, reason: permission };
    }
    const token = buildDeviceToken();
    const deviceId = ensureDeviceId();
    await apiClient.registerDevice({
      token,
      platform: "web",
      deviceId,
      appVersion: "web-1.0.0",
      pushEnabled: permission === "granted",
    });
    return { success: true, permission };
  },
};

export default jobPortalNotifications;
