import React, { useCallback, useEffect, useRef, useState } from "react";
import { queueOfflineSOS, flushOfflineSOSQueue, buildWhatsAppSOSUrl, callEmergencyNumber } from "./sosSafetyUtils";
import "../../styles/SOSUpgrade.css";

const HOLD_SECONDS = 3;
const CANCEL_SECONDS = 10;

const INDIA_EMERGENCY_NUMBERS = [
  { label: "112 Emergency", number: "112", icon: "🚨" },
  { label: "108 Ambulance", number: "108", icon: "🚑" },
  { label: "100 Police", number: "100", icon: "👮" },
  { label: "101 Fire", number: "101", icon: "🚒" },
  { label: "1091 Women", number: "1091", icon: "🛡️" },
  { label: "1098 Childline", number: "1098", icon: "👧" },
];

const getCurrentLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          mapsUrl: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });

const SOSQuickPanel = ({ contacts = [], emergencyProfile = {}, authToken, apiBaseUrl = "/api/sos", onIncidentCreated }) => {
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [cancelCountdown, setCancelCountdown] = useState(0);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [status, setStatus] = useState("");
  const holdTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const cancelTimerRef = useRef(null);

  useEffect(() => {
    const onOnline = () => flushOfflineSOSQueue({ apiBaseUrl, authToken, setStatus });
    window.addEventListener("online", onOnline);
    onOnline();
    return () => window.removeEventListener("online", onOnline);
  }, [apiBaseUrl, authToken]);

  const clearHoldTimers = () => {
    clearTimeout(holdTimerRef.current);
    clearInterval(progressTimerRef.current);
    holdTimerRef.current = null;
    progressTimerRef.current = null;
  };

  const buildPayload = useCallback(async (mode = "normal") => {
    const location = await getCurrentLocation();
    return {
      reason: mode === "silent" ? "Silent SOS" : "Emergency SOS",
      mode,
      location,
      emergencyProfile,
      contacts: contacts.map((c) => ({ name: c.name, phone: c.phone, priority: c.priority })),
      createdAt: new Date().toISOString(),
      source: "nilaHub-sos",
    };
  }, [contacts, emergencyProfile]);

  const startCancelWindow = async (mode) => {
    const payload = await buildPayload(mode);
    setPendingPayload(payload);
    setCancelCountdown(CANCEL_SECONDS);
    clearInterval(cancelTimerRef.current);
    cancelTimerRef.current = setInterval(() => {
      setCancelCountdown((value) => {
        if (value <= 1) {
          clearInterval(cancelTimerRef.current);
          sendSOS(payload);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const sendSOS = async (payload = pendingPayload) => {
    if (!payload) return;
    setPendingPayload(null);
    setStatus("Sending SOS alert...");

    const requestPayload = {
      reason: payload.reason,
      latitude: payload.location?.latitude,
      longitude: payload.location?.longitude,
      accuracy: payload.location?.accuracy,
      mapsUrl: payload.location?.mapsUrl,
      channels: ["SMS", "WhatsApp", "Call", "LinkUp"],
      emergencyProfile: payload.emergencyProfile,
      silentMode: payload.mode === "silent",
    };

    try {
      if (!navigator.onLine) throw new Error("offline");
      const response = await fetch(`${apiBaseUrl}/send-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(requestPayload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "SOS failed");
      setStatus("SOS alert sent. Live tracking started.");
      onIncidentCreated?.(data.incident || data.data);
    } catch (error) {
      queueOfflineSOS(requestPayload);
      setStatus("Network/API unavailable. SOS saved locally and will retry when online.");
      const primary = contacts.find((c) => c.phone);
      if (primary?.phone) {
        window.open(buildWhatsAppSOSUrl(primary.phone, requestPayload), "_blank");
      }
    }
  };

  const cancelSOS = () => {
    clearInterval(cancelTimerRef.current);
    setPendingPayload(null);
    setCancelCountdown(0);
    setStatus("SOS cancelled as false alarm.");
  };

  const startHold = (mode = "normal") => {
    setHolding(true);
    setHoldProgress(0);
    const startedAt = Date.now();
    progressTimerRef.current = setInterval(() => {
      const progress = Math.min(((Date.now() - startedAt) / (HOLD_SECONDS * 1000)) * 100, 100);
      setHoldProgress(progress);
    }, 80);
    holdTimerRef.current = setTimeout(() => {
      clearHoldTimers();
      setHolding(false);
      setHoldProgress(100);
      startCancelWindow(mode);
    }, HOLD_SECONDS * 1000);
  };

  const stopHold = () => {
    setHolding(false);
    setHoldProgress(0);
    clearHoldTimers();
  };

  return (
    <section className="sos-upgrade-panel">
      <div className="sos-upgrade-main">
        <p className="sos-upgrade-eyebrow">Emergency quick actions</p>
        <button
          className={`sos-hold-button ${holding ? "holding" : ""}`}
          onMouseDown={() => startHold("normal")}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => startHold("normal")}
          onTouchEnd={stopHold}
          type="button"
        >
          <span>Hold 3 seconds</span>
          <strong>Send SOS</strong>
          <i style={{ width: `${holdProgress}%` }} />
        </button>

        <div className="sos-upgrade-actions">
          <button type="button" onClick={() => startHold("silent")}>🤫 Silent SOS</button>
          <button type="button" onClick={async () => setStatus((await getCurrentLocation())?.mapsUrl || "Location unavailable")}>📍 Share live location</button>
          <button type="button" onClick={() => callEmergencyNumber(contacts[0]?.phone || "112")}>📞 Call emergency contact</button>
        </div>
      </div>

      <div className="sos-india-calls">
        {INDIA_EMERGENCY_NUMBERS.map((item) => (
          <button key={item.number} type="button" onClick={() => callEmergencyNumber(item.number)}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>

      {cancelCountdown > 0 && (
        <div className="sos-cancel-window">
          <strong>SOS will be sent in {cancelCountdown}s</strong>
          <p>Cancel only if this is a false alarm.</p>
          <button type="button" onClick={cancelSOS}>Cancel SOS</button>
          <button type="button" onClick={() => sendSOS()}>Send now</button>
        </div>
      )}

      {status && <div className="sos-upgrade-status">{status}</div>}
    </section>
  );
};

export default SOSQuickPanel;
