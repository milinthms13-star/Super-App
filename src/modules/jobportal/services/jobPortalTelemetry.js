const MARKS = {};

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export const jobPortalTelemetry = {
  mark: (name) => {
    MARKS[String(name || "").trim()] = now();
  },
  measure: (fromMark, toMark = null) => {
    const from = MARKS[String(fromMark || "").trim()];
    if (!Number.isFinite(from)) return null;
    const to = toMark ? MARKS[String(toMark || "").trim()] : now();
    if (!Number.isFinite(to) || to < from) return null;
    return Math.round(to - from);
  },
  sendEvent: async (apiClient, eventType, metadata = {}, source = "web") => {
    if (!apiClient?.trackClientEvent) return;
    try {
      await apiClient.trackClientEvent({ eventType, metadata, source });
    } catch (_error) {
      // Telemetry should never block product actions.
    }
  },
};

export default jobPortalTelemetry;
