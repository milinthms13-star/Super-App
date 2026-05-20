const QUEUE_KEY = "nilahub_offline_sos_queue_v1";

export const callEmergencyNumber = (phone) => {
  if (!phone) return;
  window.location.href = `tel:${String(phone).replace(/[^0-9+]/g, "")}`;
};

export const buildWhatsAppSOSUrl = (phone, payload = {}) => {
  const safePhone = String(phone || "").replace(/\D/g, "");
  const locationText = payload.mapsUrl || payload.location?.mapsUrl || "Location unavailable";
  const profile = payload.emergencyProfile || {};
  const message = encodeURIComponent(
    `SOS ALERT from NilaHub\nReason: ${payload.reason || "Emergency"}\nLocation: ${locationText}\nBlood Group: ${profile.bloodGroup || "Not set"}\nMedical Notes: ${profile.medicalConditions || profile.emergencyNotes || "Not set"}\nPlease call or track immediately.`
  );
  return `https://wa.me/91${safePhone}?text=${message}`;
};

export const getOfflineSOSQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};

export const queueOfflineSOS = (payload) => {
  const queue = getOfflineSOSQueue();
  queue.push({ ...payload, queuedAt: new Date().toISOString(), queueId: `sos-${Date.now()}` });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-10)));
};

export const flushOfflineSOSQueue = async ({ apiBaseUrl = "/api/sos", authToken, setStatus } = {}) => {
  const queue = getOfflineSOSQueue();
  if (!queue.length || !navigator.onLine) return;
  const remaining = [];
  for (const item of queue) {
    try {
      const response = await fetch(`${apiBaseUrl}/send-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error("retry failed");
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  if (queue.length !== remaining.length) setStatus?.("Offline SOS queue synced successfully.");
};
