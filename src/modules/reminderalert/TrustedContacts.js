import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSentTrustedContactInvites,
  getReceivedTrustedContactInvites,
  getAcceptedTrustedContacts,
  acceptTrustedContactInvite,
  rejectTrustedContactInvite,
  removeTrustedContact,
  sendTrustedContactInvite,
} from "../../services/remindersService";

const TrustedContacts = ({ onContactsUpdate }) => {
  const [activeTab, setActiveTab] = useState("accepted");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sentInvites, setSentInvites] = useState([]);
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [acceptedContacts, setAcceptedContacts] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    recipientId: "",
    relationship: "other",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadTrustedContactsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [sent, received, accepted] = await Promise.all([
        getSentTrustedContactInvites(),
        getReceivedTrustedContactInvites(),
        getAcceptedTrustedContacts(),
      ]);

      const nextSent = sent.data || [];
      const nextReceived = received.data || [];
      const nextAccepted = accepted.data || [];

      setSentInvites(nextSent);
      setReceivedInvites(nextReceived);
      setAcceptedContacts(nextAccepted);

      if (onContactsUpdate) {
        onContactsUpdate(nextAccepted);
      }
    } catch (err) {
      console.error("Failed to load trusted contacts:", err);
      setError(err.message || "Failed to load trusted contacts");
    } finally {
      setLoading(false);
    }
  }, [onContactsUpdate]);

  useEffect(() => {
    loadTrustedContactsData();
  }, [loadTrustedContactsData]);

  const summary = useMemo(
    () => ({
      accepted: acceptedContacts.length,
      sent: sentInvites.length,
      received: receivedInvites.length,
    }),
    [acceptedContacts.length, receivedInvites.length, sentInvites.length]
  );

  const handleInviteFormChange = (event) => {
    const { name, value } = event.target;
    setInviteForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSendInvite = async (event) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!inviteForm.recipientId.trim()) {
      setSubmitError("Please enter an email, username, or user ID.");
      return;
    }

    try {
      setSubmitting(true);
      await sendTrustedContactInvite(
        inviteForm.recipientId,
        inviteForm.message,
        inviteForm.relationship
      );
      setSuccessMessage("Invite sent successfully.");
      setInviteForm({
        recipientId: "",
        relationship: "other",
        message: "",
      });
      setShowInviteForm(false);
      await loadTrustedContactsData();
    } catch (err) {
      setSubmitError(err.message || "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      await acceptTrustedContactInvite(inviteId);
      setSuccessMessage("Invite accepted.");
      await loadTrustedContactsData();
    } catch (err) {
      setError(err.message || "Failed to accept invite");
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await rejectTrustedContactInvite(inviteId);
      setSuccessMessage("Invite rejected.");
      await loadTrustedContactsData();
    } catch (err) {
      setError(err.message || "Failed to reject invite");
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm("Remove this trusted contact?")) {
      return;
    }

    try {
      await removeTrustedContact(contactId);
      setSuccessMessage("Trusted contact removed.");
      await loadTrustedContactsData();
    } catch (err) {
      setError(err.message || "Failed to remove trusted contact");
    }
  };

  const renderUserName = (user) =>
    user?.name || user?.username || user?.email || "Unknown user";

  const renderUserSecondary = (user) =>
    user?.email || user?.username || "No additional details";

  const renderEmptyState = (title, body) => (
    <div className="trusted-contacts-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );

  return (
    <div className="trusted-contacts-container">
      <div className="trusted-contacts-panel">
        <div className="trusted-contacts-header">
          <div className="reminderalert-panel-heading">
            <p>Trusted contacts</p>
            <h2>People who can back up your reminders</h2>
          </div>
          {activeTab === "accepted" && (
            <button
              type="button"
              className="reminderalert-add-btn"
              onClick={() => {
                setShowInviteForm((current) => !current);
                setSubmitError(null);
              }}
            >
              {showInviteForm ? "Close invite form" : "Invite contact"}
            </button>
          )}
        </div>

        <div className="trusted-contacts-stats">
          <article className="trusted-contact-stat">
            <strong>{summary.accepted}</strong>
            <span>Accepted</span>
          </article>
          <article className="trusted-contact-stat">
            <strong>{summary.sent}</strong>
            <span>Sent invites</span>
          </article>
          <article className="trusted-contact-stat">
            <strong>{summary.received}</strong>
            <span>Received invites</span>
          </article>
        </div>

        {error && <div className="trusted-contacts-message error">{error}</div>}
        {successMessage && (
          <div className="trusted-contacts-message success">{successMessage}</div>
        )}

        <div className="trusted-contacts-tabs">
          <button
            type="button"
            className={`tab-button ${activeTab === "accepted" ? "active" : ""}`}
            onClick={() => setActiveTab("accepted")}
          >
            Accepted ({summary.accepted})
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            Sent ({summary.sent})
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === "received" ? "active" : ""}`}
            onClick={() => setActiveTab("received")}
          >
            Received ({summary.received})
          </button>
        </div>

        {activeTab === "accepted" && (
          <div className="trusted-contacts-tab-content">
            {showInviteForm && (
              <form className="trusted-contacts-form" onSubmit={handleSendInvite}>
                <div className="trusted-contacts-form-grid">
                  <label className="trusted-contacts-field trusted-contacts-field-wide">
                    <span>Email, username, or user ID</span>
                    <input
                      type="text"
                      name="recipientId"
                      value={inviteForm.recipientId}
                      onChange={handleInviteFormChange}
                      placeholder="Enter an email, username, or user ID"
                      disabled={submitting}
                    />
                  </label>

                  <label className="trusted-contacts-field">
                    <span>Relationship</span>
                    <select
                      name="relationship"
                      value={inviteForm.relationship}
                      onChange={handleInviteFormChange}
                      disabled={submitting}
                    >
                      <option value="family">Family</option>
                      <option value="friend">Friend</option>
                      <option value="caregiver">Caregiver</option>
                      <option value="colleague">Colleague</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="trusted-contacts-field trusted-contacts-field-wide">
                    <span>Message</span>
                    <textarea
                      name="message"
                      value={inviteForm.message}
                      onChange={handleInviteFormChange}
                      placeholder="Add a short note so they know why you are inviting them."
                      rows="4"
                      disabled={submitting}
                    />
                  </label>
                </div>

                {submitError && (
                  <div className="trusted-contacts-message error">{submitError}</div>
                )}

                <div className="trusted-contacts-form-actions">
                  <button
                    type="submit"
                    className="reminderalert-add-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Send invite"}
                  </button>
                  <button
                    type="button"
                    className="reminderalert-filter-chip"
                    onClick={() => setShowInviteForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="reminderalert-callout">
                <strong>Loading trusted contacts...</strong>
                <p>Please wait while we fetch the latest connection list.</p>
              </div>
            ) : acceptedContacts.length > 0 ? (
              <div className="trusted-contacts-list">
                {acceptedContacts.map((contact) => (
                  <article key={contact._id} className="trusted-contact-card">
                    <div className="contact-info">
                      <h4>{renderUserName(contact.recipientId)}</h4>
                      <p>{renderUserSecondary(contact.recipientId)}</p>
                      <div className="trusted-contact-meta">
                        <span className="contact-chip">
                          {contact.relationship
                            ? `${contact.relationship.charAt(0).toUpperCase()}${contact.relationship.slice(1)}`
                            : "Connected"}
                        </span>
                        {contact.acceptedAt && (
                          <span className="contact-chip muted">
                            Accepted on {new Date(contact.acceptedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="contact-actions">
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => handleRemoveContact(contact._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              renderEmptyState(
                "No accepted trusted contacts yet",
                "Invite someone you trust so important reminders can be shared with them."
              )
            )}
          </div>
        )}

        {activeTab === "sent" && (
          <div className="trusted-contacts-tab-content">
            {loading ? (
              <div className="reminderalert-callout">
                <strong>Loading sent invites...</strong>
              </div>
            ) : sentInvites.length > 0 ? (
              <div className="trusted-contacts-list">
                {sentInvites.map((invite) => (
                  <article key={invite._id} className="trusted-contact-card">
                    <div className="contact-info">
                      <h4>{renderUserName(invite.recipientId)}</h4>
                      <p>{renderUserSecondary(invite.recipientId)}</p>
                      <div className="trusted-contact-meta">
                        <span className="contact-chip">
                          {invite.relationship
                            ? `${invite.relationship.charAt(0).toUpperCase()}${invite.relationship.slice(1)}`
                            : "Invite"}
                        </span>
                        <span className="contact-chip muted">
                          {invite.status ? invite.status.toUpperCase() : "PENDING"}
                        </span>
                      </div>
                      {invite.message && <p className="invite-message">"{invite.message}"</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              renderEmptyState(
                "No sent invites",
                "When you invite someone, the request will appear here until they respond."
              )
            )}
          </div>
        )}

        {activeTab === "received" && (
          <div className="trusted-contacts-tab-content">
            {loading ? (
              <div className="reminderalert-callout">
                <strong>Loading received invites...</strong>
              </div>
            ) : receivedInvites.length > 0 ? (
              <div className="trusted-contacts-list">
                {receivedInvites.map((invite) => (
                  <article key={invite._id} className="trusted-contact-card">
                    <div className="contact-info">
                      <h4>{renderUserName(invite.senderId)}</h4>
                      <p>{renderUserSecondary(invite.senderId)}</p>
                      <div className="trusted-contact-meta">
                        <span className="contact-chip">
                          Wants to add you as{" "}
                          {invite.relationship
                            ? `${invite.relationship.charAt(0).toUpperCase()}${invite.relationship.slice(1)}`
                            : "a trusted contact"}
                        </span>
                      </div>
                      {invite.message && <p className="invite-message">"{invite.message}"</p>}
                    </div>
                    <div className="contact-actions">
                      <button
                        type="button"
                        className="reminderalert-filter-chip active"
                        onClick={() => handleAcceptInvite(invite._id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="reminderalert-filter-chip"
                        onClick={() => handleRejectInvite(invite._id)}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              renderEmptyState(
                "No pending invites",
                "Incoming trusted contact requests will appear here when someone adds you."
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustedContacts;
