import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/SOSAlert.css";

const QUICK_REASONS = ["Medical", "Unsafe situation", "Travel check-in", "Vehicle breakdown"];
const DELIVERY_CHANNELS = ["SMS", "WhatsApp", "Call"];
const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 30000,
};

const formatTimestamp = (value) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const getReadinessScore = (contacts, settings) => {
  let score = 25;

  if (contacts.length >= 3) {
    score += 30;
  } else if (contacts.length === 2) {
    score += 20;
  } else if (contacts.length === 1) {
    score += 10;
  }

  if (contacts.some((contact) => contact.priority === "Primary")) {
    score += 15;
  }

  if (settings.shareLiveLocation) {
    score += 15;
  }

  if (settings.autoEscalation) {
    score += 15;
  }

  return Math.min(score, 100);
};

const buildAlertLog = (entry) => ({
  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  entry,
});

const getSosItemId = (item) => item?._id || item?.id || "";

const formatCoordinate = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(5) : "";
};

const buildMapsUrl = (latitude, longitude) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const buildLiveLocationPayload = (position) => {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const accuracy = Number(position?.coords?.accuracy);
  const coordinateText = `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
  const accuracyText = Number.isFinite(accuracy) ? `${Math.round(accuracy)}m accuracy` : "";
  const mapsUrl = buildMapsUrl(latitude, longitude);

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    coordinateText,
    mapsUrl,
    locationText: accuracyText ? `${coordinateText} (${accuracyText})` : coordinateText,
  };
};

const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const fetchReverseGeocode = async (latitude, longitude) => {
  // Ensure coordinates are valid numbers before fetching
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  try {
    const url = `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const response = await fetch(url);
    if (!response.ok) {
      // Throw an error to be caught by the calling function
      throw new Error(`Geocoding API request failed with status ${response.status}`);
    }
    const data = await response.json();
    // Return the most specific location name available
    return data.locality || data.city || data.principalSubdivision || null;
  } catch (error) {
    console.warn("Reverse geocoding failed:", error);
    // Return null on failure so the UI can fall back gracefully
    return null;
  }
};

const formatIncidentLocation = (location) => {
  if (typeof location === "string" && location.trim()) {
    return location;
  }

  if (Array.isArray(location?.coordinates) && location.coordinates.length === 2) {
    const [longitude, latitude] = location.coordinates;
    const latText = Number.isFinite(latitude) ? latitude.toFixed(4) : latitude;
    const longText = Number.isFinite(longitude) ? longitude.toFixed(4) : longitude;
    return `${latText}, ${longText}`;
  }

  return "Location shared";
};

const getIncidentOutcome = (incident) => {
  if (incident?.outcome) {
    return incident.outcome;
  }

  switch (incident?.status) {
    case "resolved":
      return "Resolved";
    case "acknowledged":
      return "Acknowledged";
    case "escalated":
      return "Escalated";
    case "active":
      return "In progress";
    default:
      return incident?.status || "In progress";
  }
};

const getLocationDisplayText = (position) => {
  const liveLocation = buildLiveLocationPayload(position);
  return liveLocation?.locationText || "";
};

const SOSAlert = () => {
  const { currentUser, apiCall } = useApp();
  const [contacts, setContacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ silentMode: false, autoEscalation: true, shareLiveLocation: true });
  const [apiError, setApiError] = useState(null);
  const [alertState, setAlertState] = useState({
    active: false,
    mode: "Standby",
    reason: QUICK_REASONS[0],
    startedAt: "",
    escalationLevel: 0,
    acknowledgedBy: "",
    channels: DELIVERY_CHANNELS,
    log: [],
    currentLocation: null,
    watchId: null,
  });
  const [contactForm, setContactForm] = useState({
    name: "",
    relation: "",
    phone: "",
    priority: "Backup",
    notifyBy: ["SMS", "Call"],
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [locationError, setLocationError] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationName, setLocationName] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        if (!apiCall) {
          throw new Error('API not available');
        }

        // Load SOS contacts
        const contactsRes = await apiCall('/sos/contacts').catch(err => {
          console.warn('Failed to load contacts:', err);
          return null;
        });
        if (isMounted && contactsRes?.data) {
          setContacts(contactsRes.data.map(c => ({ ...c, acknowledged: false })));
        }

        // Load history
        const historyRes = await apiCall('/sos/history?limit=10').catch(err => {
          console.warn('Failed to load history:', err);
          return null;
        });
        if (isMounted && historyRes?.data) {
          setHistory(historyRes.data);
        }

        if (isMounted) {
          setApiError(null);
        }
      } catch (error) {
        console.error('Failed to load SOS data:', error);
        if (isMounted) {
          setApiError(error.message || 'Failed to load SOS data');
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [apiCall]);

  // Geolocation watch
  useEffect(() => {
    if (!settings.shareLiveLocation) {
      setCurrentPosition(null);
      setLocationError(null);
      return undefined;
    }

    let watchId = null;
    let positionTimeout;

    const handleSuccess = async (position) => {
      setCurrentPosition(position);
      setLocationError(null);
      const liveLocation = buildLiveLocationPayload(position);
      setStatusMessage(
        liveLocation
          ? `Live location ready: ${liveLocation.locationText}`
          : `Live location ready: ${position.coords.accuracy?.toFixed(0)}m accuracy`
      );

      // Fetch the human-readable location name
      const locality = await fetchReverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      if (locality) {
        setLocationName(locality);
      }
    };

    const handleError = (error) => {
      console.warn('Geolocation error:', error);
      setLocationError(error.message);
      setCurrentPosition(null);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, LOCATION_OPTIONS);

    if (settings.shareLiveLocation) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, LOCATION_OPTIONS);
      positionTimeout = setTimeout(() => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
      }, 300000); // 5min timeout
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (positionTimeout) clearTimeout(positionTimeout);
    };
  }, [settings.shareLiveLocation]);

  // Remove fake location cycling - now real geo
  useEffect(() => {
    if (!alertState.active) return;

    const interval = setInterval(() => {
      const minutesActive = Math.round((Date.now() - new Date(alertState.startedAt).getTime()) / 60000);
      const shouldEscalate = settings.autoEscalation && minutesActive >= 2 && alertState.escalationLevel < 3;

      const nextLog = [...alertState.log];

      if (shouldEscalate) {
        nextLog.unshift(buildAlertLog(`Auto-escalation to level ${alertState.escalationLevel + 1}`));
      }

      if (currentPosition) {
        nextLog.unshift(buildAlertLog(`Live location updated (${currentPosition.coords.accuracy?.toFixed(0)}m)`));
      }

      setAlertState(prev => ({
        ...prev,
        escalationLevel: shouldEscalate ? prev.escalationLevel + 1 : prev.escalationLevel,
        mode: shouldEscalate ? 'Escalated' : prev.mode,
        log: nextLog.slice(0, 10),
      }));
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [alertState.active, alertState.escalationLevel, alertState.startedAt, alertState.log.length, settings.autoEscalation, currentPosition]);

  const readinessScore = useMemo(
    () => getReadinessScore(contacts, settings),
    [contacts, settings]
  );

  const activeContacts = contacts.filter((contact) => (contact.notifyBy || []).length > 0);
  const configuredChannelCount = useMemo(
    () => new Set(activeContacts.flatMap((contact) => contact.notifyBy || [])).size,
    [activeContacts]
  );
  const currentLiveLocation = settings.shareLiveLocation ? buildLiveLocationPayload(currentPosition) : null;
  const activeLocation =
    alertState.currentLocation ||
    (currentLiveLocation
      ? currentLiveLocation.locationText
      : !settings.shareLiveLocation
        ? "Location sharing off"
        : currentPosition
          ? getLocationDisplayText(currentPosition)
          : locationError
            ? "Location unavailable"
            : "Detecting location");
  const locationStatus = locationName
    ? locationName
    : currentLiveLocation
    ? currentLiveLocation.coordinateText
    : !settings.shareLiveLocation
      ? "Off"
      : locationError
        ? 'Error'
        : 'Loading...';

  const stats = [
    { label: "Trusted contacts", value: String(contacts.length) },
    { label: "Delivery channels", value: String(configuredChannelCount) },
    { label: "Location ready", value: locationStatus },
    { label: "Readiness", value: `${readinessScore}%` },
  ];

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (type === "checkbox" && name === "notifyBy") {
      setContactForm((current) => ({
        ...current,
        notifyBy: checked
          ? [...current.notifyBy, value]
          : current.notifyBy.filter((item) => item !== value),
      }));
      return;
    }

    setContactForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddContact = async (event) => {
    event.preventDefault();

    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      setStatusMessage("Add a name and phone number before saving a trusted contact.");
      return;
    }

    try {
      const response = await apiCall('/sos/contacts', 'POST', contactForm);
      if (response?.data) {
        setContacts(prev => [...prev, { ...response.data, acknowledged: false }]);
        setContactForm({
          name: "",
          relation: "",
          phone: "",
          priority: "Backup",
          notifyBy: ["SMS", "Call"],
        });
        setStatusMessage(`${contactForm.name} saved to your SOS safety circle.`);
        loadData(); // Refresh list
      }
    } catch (error) {
      setStatusMessage('Failed to save contact. Try again.');
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await apiCall(`/sos/contacts/${contactId}`, 'DELETE');
      setContacts((prev) => prev.filter((contact) => getSosItemId(contact) !== contactId));
      setStatusMessage("Trusted contact removed.");
    } catch (error) {
      setStatusMessage('Failed to remove contact.');
    }
  };

  const handleToggleSetting = (settingKey) => {
    setSettings((current) => ({
      ...current,
      [settingKey]: !current[settingKey],
    }));
  };

  const loadData = useCallback(async () => {
    try {
      const contactsRes = await apiCall('/sos/contacts');
      if (contactsRes?.data) setContacts(contactsRes.data.map(c => ({ ...c, acknowledged: false })));
      const historyRes = await apiCall('/sos/history?limit=10');
      if (historyRes?.data) setHistory(historyRes.data);
    } catch (error) {
      console.error('Failed to refresh SOS data:', error);
    }
  }, [apiCall]);

  const captureLiveLocation = useCallback(async () => {
    if (!settings.shareLiveLocation || !navigator.geolocation) {
      return null;
    }

    const fallbackLocation = buildLiveLocationPayload(currentPosition);

    try {
      const latestPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, LOCATION_OPTIONS);
      });

      setCurrentPosition(latestPosition);
      setLocationError(null);
      return buildLiveLocationPayload(latestPosition);
    } catch (error) {
      console.warn('Unable to capture live SOS location:', error);
      if (!fallbackLocation) {
        setLocationError(error.message || 'Unable to capture location');
      }
      return fallbackLocation;
    }
  }, [currentPosition, settings.shareLiveLocation]);

  const handleTriggerSOS = useCallback(async () => {
    if (!contacts.length) {
      setStatusMessage('Add at least one trusted contact first.');
      return;
    }

    const startedAt = new Date().toISOString();
    const reason = alertState.reason;
    const channels = settings.silentMode ? ["SMS", "WhatsApp"] : DELIVERY_CHANNELS;
    const geoLocation = await captureLiveLocation();

    const log = [
      buildAlertLog(`SOS triggered for ${reason.toLowerCase()}.`),
      buildAlertLog(
        geoLocation
          ? `Live location shared: ${geoLocation.locationText}`
          : settings.shareLiveLocation
            ? 'Live location unavailable'
            : 'Location sharing disabled'
      ),
      buildAlertLog(`Queued for ${contacts.length} trusted contact${contacts.length === 1 ? "" : "s"}.`),
    ];

    setContacts(prev => prev.map(c => ({ ...c, acknowledged: false })));
    setAlertState(prev => ({
      ...prev,
      active: true,
      mode: settings.silentMode ? "Silent" : "Active",
      startedAt,
      reason,
      channels,
      log,
      escalationLevel: 0,
      currentLocation: geoLocation?.locationText || activeLocation,
    }));

    try {
      const response = await apiCall("/sos/send-alert", "POST", {
        reason,
        longitude: geoLocation?.longitude,
        latitude: geoLocation?.latitude,
        accuracy: geoLocation?.accuracy,
        mapsUrl: geoLocation?.mapsUrl,
        location: geoLocation?.locationText || 'Location unavailable',
        channels,
        timestamp: startedAt,
      });

      const recipients = response?.data?.recipients || [];
      const recipientLabel = `${recipients.length} trusted contact${recipients.length === 1 ? "" : "s"}`;
      const videoRecipientCount =
        Number(response?.data?.videoRecipientCount || 0) ||
        recipients.filter((recipient) => recipient.videoCallStatus === "ringing").length;
      setAlertState(prev => ({
        ...prev,
        log: [
          ...(videoRecipientCount > 0
            ? [buildAlertLog(`Emergency video call started for ${videoRecipientCount} trusted contact${videoRecipientCount === 1 ? "" : "s"}.`)]
            : []),
          buildAlertLog(`Dispatched to ${recipientLabel}.`),
          ...prev.log,
        ].slice(0, 8),
      }));
      setStatusMessage(
        `SOS live. ${recipientLabel} notified.${videoRecipientCount > 0 ? ` Emergency video call sent to ${videoRecipientCount} contact${videoRecipientCount === 1 ? "" : "s"}.` : ""} Incident ID: ${response.data.incidentId || 'N/A'}`
      );
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Dispatch error";
      setAlertState(prev => ({
        ...prev,
        log: [buildAlertLog(`Dispatch failed: ${msg}`), ...prev.log].slice(0, 8),
      }));
      setStatusMessage(`Local alert active. Backend: ${msg}`);
    }
  }, [
    activeLocation,
    alertState.reason,
    apiCall,
    captureLiveLocation,
    contacts.length,
    settings.shareLiveLocation,
    settings.silentMode,
  ]);

  useEffect(() => {
    const handleExternalSOSRequest = () => {
      if (alertState.active) {
        setStatusMessage("SOS alert is already active. Use the controls below to escalate or mark safe.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      handleTriggerSOS();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("malabarbazaar:sos-requested", handleExternalSOSRequest);
    return () => {
      window.removeEventListener("malabarbazaar:sos-requested", handleExternalSOSRequest);
    };
  }, [alertState.active, handleTriggerSOS]);

  const handleAcknowledge = (contactId) => {
    const contact = contacts.find((item) => getSosItemId(item) === contactId);
    if (!contact || !alertState.active) {
      return;
    }

    setContacts((current) =>
      current.map((item) =>
        getSosItemId(item) === contactId ? { ...item, acknowledged: true } : item
      )
    );
    setAlertState((current) => ({
      ...current,
      mode: "Contact acknowledged",
      acknowledgedBy: contact.name,
      log: [buildAlertLog(`${contact.name} acknowledged the SOS alert.`), ...current.log].slice(0, 8),
    }));
    setStatusMessage(`${contact.name} acknowledged the alert and can follow your live location.`);
  };

  const handleEscalate = () => {
    if (!alertState.active) {
      return;
    }

    setAlertState((current) => ({
      ...current,
      mode: "Escalated",
      escalationLevel: current.escalationLevel + 1,
      log: [
        buildAlertLog(`Escalation level ${current.escalationLevel + 2} triggered manually.`),
        ...current.log,
      ].slice(0, 8),
    }));
    setStatusMessage("SOS alert escalated to the next response tier.");
  };

  const handleResolve = () => {
    if (!alertState.active) {
      return;
    }

    const resolvedAt = new Date().toISOString();
    setHistory((current) =>
      current.map((item, index) =>
        index === 0 && item.outcome === "In progress"
          ? {
              ...item,
              resolvedAt,
              location: alertState.currentLocation || activeLocation,
              outcome: alertState.acknowledgedBy
                ? `Resolved with ${alertState.acknowledgedBy}`
                : "Resolved manually",
            }
          : item
      )
    );
    setAlertState((current) => ({
      ...current,
      active: false,
      mode: "Resolved",
      log: [buildAlertLog("SOS alert resolved and live sharing stopped."), ...current.log].slice(0, 8),
    }));
    setStatusMessage("SOS resolved. Live sharing and escalation have been stopped.");
  };

  // Add safeguards for rendering
  if (!currentUser) {
    return (
      <div className="sos-page">
        <div className="sos-status-banner error">
          ⚠️ User not authenticated. Please log in to access SOS features.
        </div>
      </div>
    );
  }

  return (
    <div className="sos-page">
      <section className="sos-hero">
        <div className="sos-hero-copy">
          <p className="sos-eyebrow">Personal safety workspace</p>
          <h1>SOS Safety Center</h1>
          <p className="sos-intro">
            Trigger an SOS alert, share your live location, notify trusted contacts, and track the
            response from one working emergency screen.
          </p>
        </div>

        <div className="sos-hero-card">
          <span className="sos-hero-label">Ready now</span>
          <strong>
            {alertState.active
              ? `${alertState.mode} from ${activeLocation}`
              : "Standby mode with trusted contacts and alert preferences armed."}
          </strong>
          <p>
            {alertState.active
              ? `Started at ${formatTimestamp(alertState.startedAt)} with ${alertState.channels.join(", ")} delivery.`
              : "Use silent mode, live location sharing, and auto-escalation to match the situation."}
          </p>
        </div>
      </section>

      <section className="sos-stats-grid" aria-label="SOS status overview">
        {stats.map((stat) => (
          <article className="sos-stat-card" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </section>

{apiError ? (
  <div className="sos-status-banner error">
    ⚠️ {apiError} - Some features may be unavailable
  </div>
) : null}

{statusMessage ? (
  <div className={`sos-status-banner ${locationError ? 'error' : ''}`}>
    {locationError ? `Location: ${locationError}` : statusMessage}
  </div>
) : null}

      <section className="sos-layout">
        <div className="sos-main-column">
          <article className="sos-panel">
            <div className="sos-panel-heading">
              <h2>Emergency Controls</h2>
              <p>
                {alertState.active
                  ? "An alert is in progress. Use the controls below to manage the incident."
                  : "Select a reason and trigger an alert. Your trusted contacts will be notified."}
              </p>
            </div>

            {!alertState.active ? (
              <div className="sos-trigger-form">
                <div className="sos-form-group">
                  <label htmlFor="reason">Reason for alert</label>
                  <select
                    id="reason"
                    name="reason"
                    value={alertState.reason}
                    onChange={(e) => setAlertState(prev => ({ ...prev, reason: e.target.value }))}
                  >
                    {QUICK_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="sos-trigger-button"
                  onClick={handleTriggerSOS}
                  disabled={!contacts.length}
                >
                  Trigger SOS Alert
                </button>
              </div>
            ) : (
              <div className="sos-active-controls">
                <button className="sos-control-button" onClick={handleEscalate}>
                  Escalate Alert
                </button>
                <button className="sos-control-button resolve" onClick={handleResolve}>
                  Mark as Safe / Resolve
                </button>
              </div>
            )}
          </article>

          <article className="sos-panel">
            <div className="sos-panel-heading">
              <h2>Alert Log</h2>
              <p>
                {alertState.active
                  ? "Live activity feed from your active SOS alert."
                  : "Your alert history will appear here once an alert is triggered."}
              </p>
            </div>
            <ul className="sos-log-list">
              {alertState.log.map((item) => (
                <li key={item.id}>
                  <span className="sos-log-timestamp">{formatTimestamp(item.timestamp)}</span>
                  <p>{item.entry}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="sos-sidebar-column">
          <article className="sos-panel">
            <div className="sos-panel-heading">
              <h2>Trusted Contacts</h2>
              <p>Manage your safety circle. Add at least one primary contact.</p>
            </div>
            <ul className="sos-contact-list">
              {contacts.map((contact) => (
                <li key={getSosItemId(contact)}>
                  <div className="sos-contact-info">
                    <strong>{contact.name}</strong>
                    <span>
                      {contact.relation} - {contact.phone}
                    </span>
                  </div>
                  <div className="sos-contact-actions">
                    {alertState.active && !contact.acknowledged && (
                      <button
                        className="sos-acknowledge-button"
                        onClick={() => handleAcknowledge(getSosItemId(contact))}
                      >
                        Ack
                      </button>
                    )}
                    <button
                      className="sos-remove-button"
                      onClick={() => handleRemoveContact(getSosItemId(contact))}
                    >
                      &times;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <form className="sos-contact-form" onSubmit={handleAddContact}>
              <div className="sos-form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Contact Name"
                  value={contactForm.name}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone Number"
                  value={contactForm.phone}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="sos-form-group">
                <input
                  type="text"
                  name="relation"
                  placeholder="Relation (e.g., Friend)"
                  value={contactForm.relation}
                  onChange={handleFormChange}
                />
                <select
                  name="priority"
                  value={contactForm.priority}
                  onChange={handleFormChange}
                >
                  <option>Primary</option>
                  <option>Backup</option>
                </select>
              </div>
              <div className="sos-checkbox-group">
                <span>Notify by:</span>
                {DELIVERY_CHANNELS.map((channel) => (
                  <label key={channel}>
                    <input
                      type="checkbox"
                      name="notifyBy"
                      value={channel}
                      checked={contactForm.notifyBy.includes(channel)}
                      onChange={handleFormChange}
                    />
                    {channel}
                  </label>
                ))}
              </div>
              <button type="submit">Add Contact</button>
            </form>
          </article>

          <article className="sos-panel">
            <div className="sos-panel-heading">
              <h2>Alert History</h2>
              <p>Review your past 10 SOS incidents.</p>
            </div>
            <ul className="sos-history-list">
              {history.map((item) => (
                <li key={getSosItemId(item)}>
                  <div className="sos-history-info">
                    <strong>{item.reason}</strong>
                    <span>{formatDateTime(item.timestamp)}</span>
                  </div>
                  <div className="sos-history-outcome">
                    <span>{getIncidentOutcome(item)}</span>
                    <small>{formatIncidentLocation(item.location)}</small>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="sos-panel">
            <div className="sos-panel-heading">
              <h2>Preferences</h2>
              <p>Customize your alert settings.</p>
            </div>
            <div className="sos-settings-list">
              <div className="sos-setting-item">
                <label htmlFor="shareLiveLocation">Share live location</label>
                <input
                  type="checkbox"
                  id="shareLiveLocation"
                  checked={settings.shareLiveLocation}
                  onChange={() => handleToggleSetting("shareLiveLocation")}
                />
              </div>
              <div className="sos-setting-item">
                <label htmlFor="autoEscalation">Auto-escalate after 2 mins</label>
                <input
                  type="checkbox"
                  id="autoEscalation"
                  checked={settings.autoEscalation}
                  onChange={() => handleToggleSetting("autoEscalation")}
                />
              </div>
              <div className="sos-setting-item">
                <label htmlFor="silentMode">Silent mode (no calls)</label>
                <input
                  type="checkbox"
                  id="silentMode"
                  checked={settings.silentMode}
                  onChange={() => handleToggleSetting("silentMode")}
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

export default SOSAlert;