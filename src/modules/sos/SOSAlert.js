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
  const [contacts, setContacts] = useState(() => createInitialState(currentUser).contacts);
  const [registeredContacts, setRegisteredContacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(() => createInitialState(currentUser).settings);
  const [alertState, setAlertState] = useState({
    active: false,
    mode: "Standby",
    reason: QUICK_REASONS[0],
    startedAt: "",
    locationIndex: 0,
    escalationLevel: 0,
    acknowledgedBy: "",
    channels: DELIVERY_CHANNELS,
    log: [],
  });
  const [contactForm, setContactForm] = useState({
    name: "",
    relation: "",
    phone: "",
    priority: "Backup",
    notifyBy: ["Push", "SMS"],
  });
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadRegisteredContacts = async () => {
      try {
        const response = await apiCall("/messaging/contacts", "GET", { limit: 100 });
        if (!isMounted) {
          return;
        }

        setRegisteredContacts(Array.isArray(response?.contacts) ? response.contacts : []);
      } catch (error) {
        if (isMounted) {
          setRegisteredContacts([]);
        }
      }
    };

    loadRegisteredContacts();

    return () => {
      isMounted = false;
    };
  }, [apiCall]);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (!savedState) {
        return;
      }

      const parsed = JSON.parse(savedState);
      if (Array.isArray(parsed.contacts)) {
        setContacts(parsed.contacts);
      }
      if (Array.isArray(parsed.history)) {
        setHistory(parsed.history);
      }
      if (parsed.settings) {
        setSettings((current) => ({
          ...current,
          ...parsed.settings,
        }));
      }
      if (parsed.alertState) {
        setAlertState((current) => ({
          ...current,
          ...parsed.alertState,
        }));
      }
    } catch (error) {
      // Ignore corrupt local storage and continue with defaults.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        contacts,
        history,
        settings,
        alertState,
      })
    );
  }, [alertState, contacts, history, settings]);

  useEffect(() => {
    if (!alertState.active) {
      return undefined;
    }

    const interval = setInterval(() => {
      setAlertState((current) => {
        if (!current.active) {
          return current;
        }

        const nextLocationIndex = Math.min(
          current.locationIndex + 1,
          LOCATION_POINTS.length - 1
        );
        const minutesActive = Math.round((Date.now() - new Date(current.startedAt).getTime()) / 60000);
        const shouldEscalate = settings.autoEscalation && minutesActive >= 1 && current.escalationLevel < 2;

        const nextLog = [...current.log];

        if (nextLocationIndex !== current.locationIndex) {
          nextLog.unshift(
            buildAlertLog(`Live location updated to ${LOCATION_POINTS[nextLocationIndex]}.`)
          );
        }

        if (shouldEscalate) {
          nextLog.unshift(
            buildAlertLog(`Escalation level ${current.escalationLevel + 2} started automatically.`)
          );
        }

        return {
          ...current,
          locationIndex: nextLocationIndex,
          escalationLevel: shouldEscalate ? current.escalationLevel + 1 : current.escalationLevel,
          mode: shouldEscalate ? "Escalated" : current.mode,
          log: nextLog.slice(0, 8),
        };
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [alertState.active, settings.autoEscalation]);

  const readinessScore = useMemo(
    () => getReadinessScore(contacts, settings),
    [contacts, settings]
  );

  const activeLocation = LOCATION_POINTS[alertState.locationIndex] || LOCATION_POINTS[0];
  const activeContacts = contacts.filter((contact) => contact.notifyBy.length > 0);

  const stats = [
    { label: "Trusted contacts", value: String(contacts.length) },
    { label: "Registered app contacts", value: String(registeredContacts.length) },
    { label: "Readiness score", value: `${readinessScore}%` },
    { label: "Alert state", value: alertState.active ? alertState.mode : "Standby" },
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

  const handleAddContact = (event) => {
    event.preventDefault();

    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      setStatusMessage("Add a name and phone number before saving a trusted contact.");
      return;
    }

    const newContact = {
      id: `contact-${Date.now()}`,
      name: contactForm.name.trim(),
      relation: contactForm.relation.trim() || "Trusted contact",
      phone: contactForm.phone.trim(),
      priority: contactForm.priority,
      notifyBy: contactForm.notifyBy.length ? contactForm.notifyBy : ["Push"],
      acknowledged: false,
    };

    setContacts((current) => [...current, newContact]);
    setContactForm({
      name: "",
      relation: "",
      phone: "",
      priority: "Backup",
      notifyBy: ["Push", "SMS"],
    });
    setStatusMessage(`${newContact.name} is now part of your SOS safety circle.`);
  };

  const handleRemoveContact = (contactId) => {
    setContacts((current) => current.filter((contact) => contact.id !== contactId));
    setStatusMessage("Trusted contact removed.");
  };

  const handleToggleSetting = (settingKey) => {
    setSettings((current) => ({
      ...current,
      [settingKey]: !current[settingKey],
    }));
  };

  const handleTriggerSOS = useCallback(async () => {
    const startedAt = new Date().toISOString();
    const reason = alertState.reason;
    const channels = settings.silentMode ? ["Push", "SMS"] : DELIVERY_CHANNELS;
    const nextHistoryItem = {
      id: `alert-${Date.now()}`,
      reason,
      startedAt,
      location: LOCATION_POINTS[0],
      mode: settings.silentMode ? "Silent alert" : "Active alert",
      outcome: "In progress",
    };
    const log = [
      buildAlertLog(`SOS alert sent for ${reason.toLowerCase()}.`),
      buildAlertLog(`Location shared from ${LOCATION_POINTS[0]}.`),
      buildAlertLog(`Notifications queued for ${activeContacts.length} trusted contacts.`),
    ];
    const baseAlertState = {
      active: true,
      mode: settings.silentMode ? "Silent alert" : "Active alert",
      reason,
      startedAt,
      locationIndex: 0,
      escalationLevel: 0,
      acknowledgedBy: "",
      channels,
      log,
    };

    setContacts((current) => current.map((contact) => ({ ...contact, acknowledged: false })));
    setAlertState(baseAlertState);
    setHistory((current) => [nextHistoryItem, ...current]);

    try {
      const response = await apiCall("/sos/send-alert", "POST", {
        reason,
        location: LOCATION_POINTS[0],
        channels,
        timestamp: startedAt,
      });

      const recipients = Array.isArray(response?.data?.recipients) ? response.data.recipients : [];
      const onlineRecipientCount = Number(response?.data?.onlineRecipientCount || 0);
      setAlertState((current) => ({
        ...current,
        log: [
          buildAlertLog(
            `Emergency call request sent to ${recipients.length} registered contact${recipients.length === 1 ? "" : "s"}, ${onlineRecipientCount} online right now.`
          ),
          ...current.log,
        ].slice(0, 8),
      }));
      setStatusMessage(
        recipients.length > 0
          ? `SOS alert is live. ${recipients.length} registered contact${recipients.length === 1 ? "" : "s"} received the emergency alert.`
          : "SOS alert is live. Add registered contacts in LinkUp to trigger in-app emergency calls."
      );
    } catch (error) {
      setAlertState((current) => ({
        ...current,
        log: [
          buildAlertLog(
            `Registered contact dispatch failed: ${error.response?.data?.message || error.message || "Unknown error"}.`
          ),
          ...current.log,
        ].slice(0, 8),
      }));
      setStatusMessage(
        error.response?.data?.message ||
          "SOS alert is active locally, but registered app contacts could not be reached."
      );
    }
  }, [activeContacts.length, alertState.reason, apiCall, settings.silentMode]);

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
              location: activeLocation,
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

      {statusMessage ? <div className="sos-status-banner">{statusMessage}</div> : null}

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
                  <strong>{settings.shareLiveLocation || alertState.active ? activeLocation : "Hidden"}</strong>
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
