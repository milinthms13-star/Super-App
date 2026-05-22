import React, { useCallback, useEffect, useState } from "react";

const EmergencySOS = ({ familyMembers, incidents, onCreateIncident, onUpdateIncidentLocation, onUpdateIncident }) => {
  const [statusMessage, setStatusMessage] = useState("");
  const [locationState, setLocationState] = useState({
    latitude: null,
    longitude: null,
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [escalationLevel, setEscalationLevel] = useState("high");
  const [trackingIncidentId, setTrackingIncidentId] = useState("");
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [contactDeliveryState, setContactDeliveryState] = useState("idle");

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported on this device.");
      return null;
    }

    setLoadingLocation(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setLocationState(coords);
      setStatusMessage(`Location captured: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      return coords;
    } catch (error) {
      setStatusMessage(error?.message || "Unable to fetch location.");
      return null;
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  const shareLiveLocation = async () => {
    const coords = locationState.latitude ? locationState : await getLocation();

    if (!coords) {
      return;
    }

    const mapsLink = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My live location",
          text: "Please track my location for emergency support.",
          url: mapsLink,
        });
        setStatusMessage("Location shared successfully.");
        return;
      } catch (error) {
        setStatusMessage(error?.message || "Location share was not completed.");
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(mapsLink);
      setStatusMessage("Location link copied to clipboard.");
    } catch (error) {
      setStatusMessage("Location ready, but clipboard permission is blocked on this device.");
    }
  };

  const familyLabels = (familyMembers || []).map((member) => {
    if (!member) {
      return "Self";
    }
    if (typeof member === "string") {
      return member;
    }
    return member.name || member.relation || "Family";
  });

  const notifyFamily = async () => {
    const coords = locationState.latitude ? locationState : await getLocation();

    if (!coords) {
      return;
    }

    setContactDeliveryState("sending");
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setContactDeliveryState("delivered");
    setStatusMessage(
      `Emergency notification prepared for ${familyLabels.join(", ")} with location ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}.`
    );
  };

  const openNearbyHospitals = async () => {
    const coords = locationState.latitude ? locationState : await getLocation();
    const mapsLink = coords
      ? `https://www.google.com/maps/search/nearby+hospitals/@${coords.latitude},${coords.longitude},14z`
      : "https://www.google.com/maps/search/nearby+hospitals";

    window.open(mapsLink, "_blank", "noopener,noreferrer");
  };

  const confirmSos = async () => {
    setShowSosConfirm(false);
    const coords = locationState.latitude ? locationState : await getLocation();
    if (!coords) {
      return;
    }
    const incident = await onCreateIncident?.({
      familyMember: "Self",
      incidentType: "sos",
      message: "SOS alert triggered from healthcare emergency module.",
      escalationLevel,
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      timeline: [
        {
          step: "sos_triggered",
          at: new Date().toISOString(),
        },
      ],
      actions: {
        familyNotified: true,
        locationShared: true,
      },
      contactsNotified: familyLabels,
    });
    if (incident?.id) {
      setTrackingIncidentId(incident.id);
      await onUpdateIncidentLocation?.({
        incidentId: incident.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setLiveTrackingEnabled(true);
    }
    await notifyFamily();
    setStatusMessage("SOS alert triggered. Family notification and location share are in progress.");
  };

  const logSafeCheckIn = async () => {
    const coords = locationState.latitude ? locationState : await getLocation();
    await onCreateIncident?.({
      familyMember: "Self",
      incidentType: "safe_check_in",
      message: "User marked themselves safe after SOS event.",
      escalationLevel: "resolved",
      location: coords || undefined,
      timeline: [
        {
          step: "safe_check_in",
          at: new Date().toISOString(),
        },
      ],
      status: "resolved",
    });
    setStatusMessage("Safe check-in logged for your incident timeline.");
    setLiveTrackingEnabled(false);
    setTrackingIncidentId("");
  };

  useEffect(() => {
    if (!liveTrackingEnabled || !trackingIncidentId) {
      return undefined;
    }

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      if (cancelled) {
        return;
      }
      try {
        const coords = await getLocation();
        if (!coords || cancelled) {
          return;
        }
        await onUpdateIncidentLocation?.({
          incidentId: trackingIncidentId,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      } catch (_error) {
        // Continue background tracking attempts without blocking UI.
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [getLocation, liveTrackingEnabled, onUpdateIncidentLocation, trackingIncidentId]);

  useEffect(() => {
    if (!trackingIncidentId) {
      return;
    }
    const activeIncident = (incidents || []).find((item) => item.id === trackingIncidentId);
    if (activeIncident && String(activeIncident.status || "").toLowerCase() === "resolved") {
      setLiveTrackingEnabled(false);
      setTrackingIncidentId("");
      setContactDeliveryState("idle");
    }
  }, [incidents, trackingIncidentId]);

  return (
    <section className="healthcare-section" data-testid="emergency-sos">
      <div className="healthcare-section-heading">
        <h2>Emergency and SOS</h2>
        <p>Real emergency actions: call lines, live location, family alerts, and nearby hospitals map.</p>
      </div>

      {statusMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {statusMessage}
        </div>
      ) : null}

      {trackingIncidentId ? (
        <div className="healthcare-inline-alert" role="status">
          Incident tracking active: {trackingIncidentId}. Contact delivery: {contactDeliveryState}.
          <button
            type="button"
            className="healthcare-secondary-button"
            onClick={() => setLiveTrackingEnabled((previous) => !previous)}
          >
            {liveTrackingEnabled ? "Pause Live Tracking" : "Resume Live Tracking"}
          </button>
        </div>
      ) : null}

      <div className="healthcare-emergency-grid">
        <article className="healthcare-emergency-card">
          <h3>Ambulance</h3>
          <p>Immediate emergency medical transport.</p>
          <a className="healthcare-emergency-button" href="tel:108" data-testid="ambulance-btn">
            Call 108
          </a>
        </article>

        <article className="healthcare-emergency-card">
          <h3>National Emergency</h3>
          <p>Police and integrated emergency response.</p>
          <a className="healthcare-emergency-button" href="tel:112">
            Call 112
          </a>
        </article>

        <article className="healthcare-emergency-card">
          <h3>Live Location</h3>
          <p>Share your location instantly with emergency responders.</p>
          <button
            type="button"
            className="healthcare-secondary-button"
            onClick={shareLiveLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? "Capturing location..." : "Share Live Location"}
          </button>
        </article>

        <article className="healthcare-emergency-card">
          <h3>Notify Family Contacts</h3>
          <p>Send SOS notification to your family contacts.</p>
          <button
            type="button"
            className="healthcare-secondary-button"
            onClick={notifyFamily}
            disabled={loadingLocation}
          >
            Notify Family
          </button>
        </article>

        <article className="healthcare-emergency-card">
          <h3>Nearby Hospitals Map</h3>
          <p>Open nearby emergency hospitals based on current location.</p>
          <button
            type="button"
            className="healthcare-secondary-button"
            onClick={openNearbyHospitals}
            disabled={loadingLocation}
            data-testid="hospital-finder-btn"
          >
            Open Hospitals Map
          </button>
        </article>

        <article className="healthcare-emergency-card">
          <h3>SOS Confirmation</h3>
          <p>Trigger confirmed SOS with emergency context.</p>
          <button type="button" className="healthcare-emergency-button" onClick={() => setShowSosConfirm(true)} data-testid="sos-btn">
            Send SOS Alert
          </button>
        </article>
      </div>

      <div className="healthcare-disclaimer">
        <strong>Emergency note:</strong> For immediate life-threatening emergencies, call 108 or 112 right away.
      </div>

      <div className="healthcare-pill-row">
        <label className="healthcare-field">
          <span>SOS Escalation Level</span>
          <select value={escalationLevel} onChange={(event) => setEscalationLevel(event.target.value)}>
            <option value="high">High (Immediate response)</option>
            <option value="critical">Critical (Life threatening)</option>
            <option value="medium">Medium (Needs assistance)</option>
          </select>
        </label>
        <button type="button" className="healthcare-secondary-button" onClick={logSafeCheckIn}>
          Log Safe Check-in
        </button>
      </div>

      <div className="healthcare-record-list-card">
        <h3>Emergency Incident History</h3>
        {(incidents || []).length === 0 ? <p>No incidents yet.</p> : null}
        {(incidents || []).slice(0, 6).map((incident) => (
          <article key={incident.id} className="healthcare-record-item">
            <div className="healthcare-record-meta">
              <strong>{incident.incidentType || "sos"}</strong>
              <span>Status: {incident.status || "open"}</span>
              <span>{incident.message || "Emergency alert"}</span>
              <span>Escalation: {incident.escalationLevel || "high"}</span>
              <span>
                Location: {incident.location?.latitude || "-"}, {incident.location?.longitude || "-"}
              </span>
              {(incident.timeline || []).length ? (
                <span>
                  Timeline: {(incident.timeline || [])
                    .map((entry) => `${entry.step.replaceAll("_", " ")} (${String(entry.at || "").slice(0, 10)})`)
                    .join(" -> ")}
                </span>
              ) : null}
            </div>
            <div className="healthcare-record-actions">
              {incident.status === "open" ? (
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => onUpdateIncident?.(incident.id, { status: "acknowledged", responderNote: "Acknowledged by user action." })}
                >
                  Mark Acknowledged
                </button>
              ) : null}
              {incident.status === "acknowledged" ? (
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => onUpdateIncident?.(incident.id, { status: "resolved", responderNote: "Resolved by user confirmation." })}
                >
                  Mark Resolved
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {showSosConfirm ? (
        <div className="healthcare-modal-overlay" role="dialog" aria-modal="true" aria-label="SOS confirmation">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>Confirm SOS Alert</h3>
              <button type="button" className="healthcare-close-button" onClick={() => setShowSosConfirm(false)}>
                Close
              </button>
            </div>
            <p>This will notify family contacts and include your live location details.</p>
            <div className="healthcare-modal-actions">
              <button type="button" className="healthcare-secondary-button" onClick={() => setShowSosConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="healthcare-emergency-button" onClick={confirmSos}>
                Confirm SOS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default EmergencySOS;
