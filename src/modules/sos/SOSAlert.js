import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/SOSAlert.css";

const STORAGE_KEY = "malabarbazaar-sos-state";
const QUICK_REASONS = ["Medical", "Unsafe situation", "Travel check-in", "Vehicle breakdown"];
const DELIVERY_CHANNELS = ["Push", "SMS", "Call"];
const LOCATION_POINTS = [
  "Marine Drive, Kochi",
  "MG Road signal, Kochi",
  "North Railway Station, Kochi",
  "Kaloor Junction, Kochi",
];

const buildSeedContacts = (currentUser) => [
  {
    id: "contact-1",
    name: "Akhila Nair",
    relation: "Sister",
    phone: "+91 98765 11111",
    priority: "Primary",
    notifyBy: ["Push", "SMS", "Call"],
    acknowledged: false,
  },
  {
    id: "contact-2",
    name: currentUser?.name ? `${currentUser.name}'s Friend` : "Niyas Rahman",
    relation: "Friend",
    phone: "+91 98765 22222",
    priority: "Backup",
    notifyBy: ["Push", "SMS"],
    acknowledged: false,
  },
  {
    id: "contact-3",
    name: "Home Security Desk",
    relation: "Support",
    phone: "+91 98765 33333",
    priority: "Escalation",
    notifyBy: ["Call", "SMS"],
    acknowledged: false,
  },
];

const createInitialState = (currentUser) => ({
  contacts: buildSeedContacts(currentUser),
  history: [],
  settings: {
    silentMode: false,
    autoEscalation: true,
    shareLiveLocation: true,
  },
});

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

const SOSAlert = () => {
const { currentUser, apiCall } = useApp();
  const [contacts, setContacts] = useState([]);
  const [registeredContacts, setRegisteredContacts] = useState([]);
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
    notifyBy: ["Push", "SMS"],
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [locationError, setLocationError] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
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

        // Load messaging contacts
        const messagingRes = await apiCall("/messaging/contacts", "GET", { limit: 100 }).catch(err => {
          console.warn('Failed to load messaging contacts:', err);
          return null;
        });
        if (isMounted) {
          setRegisteredContacts(Array.isArray(messagingRes?.contacts) ? messagingRes.contacts : []);
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

    loadData();

    return () => {
      isMounted = false;
    };
  }, [apiCall]);

  // Removed localStorage load - now using backend persistence

  // localStorage persistence removed - using backend

  // Geolocation watch
  useEffect(() => {
    if (!settings.shareLiveLocation) return;

    let watchId = null;
    let positionTimeout;

    const handleSuccess = (position) => {
      setCurrentPosition(position);
      setLocationError(null);
      // Mock reverse geocode for display
      setStatusMessage(`Live location ready: ${position.coords.accuracy?.toFixed(0)}m accuracy`);
    };

    const handleError = (error) => {
      console.warn('Geolocation error:', error);
      setLocationError(error.message);
      setCurrentPosition(null);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    if (settings.shareLiveLocation) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
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

  const activeContacts = contacts.filter((contact) => contact.notifyBy.length > 0);
  const activeLocation =
    alertState.currentLocation ||
    (currentPosition
      ? `${currentPosition.coords.accuracy?.toFixed(0)}m accuracy`
      : locationError
        ? "Location unavailable"
        : "Detecting location");
  const locationStatus = currentPosition ? `${currentPosition.coords.accuracy?.toFixed(0)}m` : locationError ? 'Error' : 'Loading...';

  const stats = [
    { label: "Trusted contacts", value: String(contacts.length) },
    { label: "App contacts", value: String(registeredContacts.length) },
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
          notifyBy: ["Push", "SMS"],
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
      setContacts(prev => prev.filter(c => c._id !== contactId));
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

  const handleTriggerSOS = useCallback(async () => {
    if (!contacts.length) {
      setStatusMessage('Add at least one trusted contact first.');
      return;
    }

    const startedAt = new Date().toISOString();
    const reason = alertState.reason;
    const channels = settings.silentMode ? ["Push", "SMS"] : DELIVERY_CHANNELS;
    const geoLocation = currentPosition ? {
      longitude: currentPosition.coords.longitude,
      latitude: currentPosition.coords.latitude,
      location: `${currentPosition.coords.accuracy?.toFixed(0)}m accuracy`
    } : null;

    const log = [
      buildAlertLog(`SOS triggered for ${reason.toLowerCase()}.`),
      buildAlertLog(geoLocation ? `Live location: ${geoLocation.location}` : 'Location unavailable'),
      buildAlertLog(`Queued for ${contacts.length} trusted + app contacts.`),
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
      currentLocation: geoLocation?.location || activeLocation,
    }));

    try {
      const response = await apiCall("/sos/send-alert", "POST", {
        reason,
        longitude: geoLocation?.longitude,
        latitude: geoLocation?.latitude,
        location: geoLocation?.location || 'Location unavailable',
        channels,
        timestamp: startedAt,
      });

      const recipients = response?.data?.recipients || [];
      setAlertState(prev => ({
        ...prev,
        log: [
          buildAlertLog(`Dispatched to ${recipients.length} contacts (${response.data.onlineRecipientCount || 0} online).`),
          ...prev.log,
        ].slice(0, 8),
      }));
      setStatusMessage(`SOS live. Incident ID: ${response.data.incidentId || 'N/A'}`);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Dispatch error";
      setAlertState(prev => ({
        ...prev,
        log: [buildAlertLog(`Dispatch failed: ${msg}`), ...prev.log].slice(0, 8),
      }));
      setStatusMessage(`Local alert active. Backend: ${msg}`);
    }
  }, [contacts.length, alertState.reason, apiCall, settings.silentMode, currentPosition, activeLocation]);

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
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact || !alertState.active) {
      return;
    }

    setContacts((current) =>
      current.map((item) =>
        item.id === contactId ? { ...item, acknowledged: true } : item
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
              <p>Emergency controls</p>
              <h2>Trigger and manage an alert</h2>
            </div>

            <div className="sos-controls-grid">
              <label className="sos-field">
                <span>Alert reason</span>
                <select
                  value={alertState.reason}
                  onChange={(event) =>
                    setAlertState((current) => ({ ...current, reason: event.target.value }))
                  }
                >
                  {QUICK_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sos-toggle-stack">
                <button
                  type="button"
                  className={`sos-toggle ${settings.silentMode ? "active" : ""}`}
                  onClick={() => handleToggleSetting("silentMode")}
                >
                  Silent mode {settings.silentMode ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  className={`sos-toggle ${settings.shareLiveLocation ? "active" : ""}`}
                  onClick={() => handleToggleSetting("shareLiveLocation")}
                >
                  Live location {settings.shareLiveLocation ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  className={`sos-toggle ${settings.autoEscalation ? "active" : ""}`}
                  onClick={() => handleToggleSetting("autoEscalation")}
                >
                  Auto-escalation {settings.autoEscalation ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div className="sos-action-row">
              <button
                type="button"
                className="sos-primary-action"
                onClick={handleTriggerSOS}
                disabled={!contacts.length || alertState.active}
              >
                {alertState.active ? "SOS is active" : "Send SOS alert"}
              </button>
              <button
                type="button"
                className="sos-secondary-action"
                onClick={handleEscalate}
                disabled={!alertState.active}
              >
                Escalate now
              </button>
              <button
                type="button"
                className="sos-secondary-action"
                onClick={handleResolve}
                disabled={!alertState.active}
              >
                Mark safe
              </button>
            </div>

            <div className="sos-incident-card">
              <div className="sos-incident-topline">
                <div>
                  <h3>Current incident</h3>
                  <p>{alertState.active ? alertState.reason : "No active SOS alert"}</p>
                </div>
                <span className={`sos-alert-status ${alertState.active ? "live" : "idle"}`}>
                  {alertState.active ? alertState.mode : "Standby"}
                </span>
              </div>
              <div className="sos-summary-grid">
                <div>
                  <span>Location</span>
<strong>{currentPosition ? `${currentPosition.coords.accuracy?.toFixed(0)}m` : locationError ? 'N/A' : 'Loading...'}</strong>
                </div>
                <div>
                  <span>Escalation</span>
                  <strong>Level {alertState.escalationLevel + 1}</strong>
                </div>
                <div>
                  <span>Response</span>
                  <strong>{alertState.acknowledgedBy || "Awaiting acknowledgement"}</strong>
                </div>
              </div>

              <div className="sos-channel-row">
                {alertState.channels.map((channel) => (
                  <span key={channel}>{channel}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="sos-panel">
            <div className="sos-panel-heading">
              <p>Trusted contacts</p>
              <h2>Manage who gets notified</h2>
            </div>

            <div className="sos-status-banner">
              {registeredContacts.length > 0
                ? `${registeredContacts.length} registered app contact${registeredContacts.length === 1 ? "" : "s"} in LinkUp can receive automatic in-app SOS call alerts.`
                : "No registered LinkUp contacts found yet. Add contacts there to ring them automatically during SOS."}
            </div>

            <form className="sos-contact-form" onSubmit={handleAddContact}>
              <div className="sos-form-grid">
                <label className="sos-field">
                  <span>Name</span>
                  <input
                    name="name"
                    type="text"
                    value={contactForm.name}
                    onChange={handleFormChange}
                    placeholder="Contact name"
                  />
                </label>
                <label className="sos-field">
                  <span>Relation</span>
                  <input
                    name="relation"
                    type="text"
                    value={contactForm.relation}
                    onChange={handleFormChange}
                    placeholder="Sister, friend, parent"
                  />
                </label>
                <label className="sos-field">
                  <span>Phone</span>
                  <input
                    name="phone"
                    type="text"
                    value={contactForm.phone}
                    onChange={handleFormChange}
                    placeholder="+91 98765 00000"
                  />
                </label>
                <label className="sos-field">
                  <span>Priority</span>
                  <select name="priority" value={contactForm.priority} onChange={handleFormChange}>
                    {["Primary", "Backup", "Escalation"].map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="sos-checkbox-group">
                {DELIVERY_CHANNELS.map((channel) => (
                  <label key={channel} className="sos-checkbox">
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

              <button type="submit" className="sos-secondary-action compact">
                Add trusted contact
              </button>
            </form>

            <div className="sos-contact-list">
              {contacts.map((contact) => (
                <article className="sos-contact-card" key={contact.id}>
                  <div>
                    <h3>{contact.name}</h3>
                    <p>
                      {contact.relation} - {contact.phone}
                    </p>
                    <div className="sos-channel-row">
                      {contact.notifyBy.map((channel) => (
                        <span key={channel}>{channel}</span>
                      ))}
                    </div>
                  </div>
                  <div className="sos-contact-actions">
                    <span className="sos-priority-badge">{contact.priority}</span>
                    <button
                      type="button"
                      className="sos-text-action"
                      onClick={() => handleAcknowledge(contact.id)}
                      disabled={!alertState.active}
                    >
                      {contact.acknowledged ? "Acknowledged" : "Mark responded"}
                    </button>
                    <button
                      type="button"
                      className="sos-text-action danger"
                      onClick={() => handleRemoveContact(contact.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <aside className="sos-side-column">
          <article className="sos-panel">
            <div className="sos-panel-heading">
              <p>Alert log</p>
              <h2>Live activity feed</h2>
            </div>
            <div className="sos-log-list">
              {alertState.log.length ? (
                alertState.log.map((item) => (
                  <div className="sos-log-item" key={item.id}>
                    <strong>{formatTimestamp(item.timestamp)}</strong>
                    <p>{item.entry}</p>
                  </div>
                ))
              ) : (
                <div className="sos-empty-state">No active alert yet. Your next SOS event will appear here.</div>
              )}
            </div>
          </article>

          <article className="sos-panel">
            <div className="sos-panel-heading">
              <p>Recent incidents</p>
              <h2>Alert history</h2>
            </div>
            <div className="sos-history-list">
              {history.length ? (
                history.map((item) => (
                  <article className="sos-history-card" key={item.id}>
                    <div>
                      <h3>{item.reason}</h3>
                      <p>{item.mode}</p>
                    </div>
                    <p>{item.location}</p>
                    <p>{formatDateTime(item.startedAt)}</p>
                    <span className="sos-history-outcome">{item.outcome}</span>
                  </article>
                ))
              ) : (
                <div className="sos-empty-state">No previous incidents. Test the module to verify your safety flow.</div>
              )}
            </div>
          </article>

          <article className="sos-panel">
            <div className="sos-panel-heading">
              <p>Safety checklist</p>
              <h2>Readiness signals</h2>
            </div>
            <ul className="sos-list">
              <li>{currentUser?.name || "User"} profile is ready for emergency notification.</li>
              <li>{contacts.length} trusted contacts are configured for response routing.</li>
              <li>{settings.shareLiveLocation ? "Live location is enabled." : "Live location is currently disabled."}</li>
              <li>{settings.autoEscalation ? "Auto-escalation is armed." : "Manual escalation only."}</li>
            </ul>
            <div className="sos-callout">
              <strong>Recommendation</strong>
              <p>
                Keep at least one primary contact and one backup contact so the module can escalate
                if the first responder is unavailable.
              </p>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
};

export default SOSAlert;
