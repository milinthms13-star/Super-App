import React, { useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("accepted"); // accepted, sent, received
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

  // Load all trusted contacts data
  useEffect(() => {
    loadTrustedContactsData();
  }, []);

  const loadTrustedContactsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sent, received, accepted] = await Promise.all([
        getSentTrustedContactInvites(),
        getReceivedTrustedContactInvites(),
        getAcceptedTrustedContacts(),
      ]);
      setSentInvites(sent.data || []);
      setReceivedInvites(received.data || []);
      setAcceptedContacts(accepted.data || []);
      if (onContactsUpdate) {
        onContactsUpdate(accepted.data || []);
      }
    } catch (err) {
      console.error("Failed to load trusted contacts:", err);
      setError(err.message || "Failed to load trusted contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFormChange = (e) => {
    const { name, value } = e.target;
    setInviteForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!inviteForm.recipientId.trim()) {
      setSubmitError("Please enter a contact ID or username");
      return;
    }

    try {
      setSubmitting(true);
      await sendTrustedContactInvite(
        inviteForm.recipientId,
        inviteForm.message,
        inviteForm.relationship
      );
      setSuccessMessage("Invite sent successfully!");
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
      setSuccessMessage("Invite accepted!");
      await loadTrustedContactsData();
    } catch (err) {
      setError(err.message || "Failed to accept invite");
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await rejectTrustedContactInvite(inviteId);
      setSuccessMessage("Invite rejected");
      await loadTrustedContactsData();
    } catch (err) {
      setError(err.message || "Failed to reject invite");
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm("Are you sure you want to remove this trusted contact?")) {
      return;
    }

    try {
      await removeTrustedContact(contactId);
      setSuccessMessage("Trusted contact removed");
      await loadTrustedContactsData();
    } catch (err) {
      setError(err.message || "Failed to remove trusted contact");
    }
  };

  const renderUserInfo = (user) => {
    if (!user) return "Unknown user";
    return `${user.name || user.username || "User"} (${user.email || "No email"})`;
  };

  return (
    <div className="trusted-contacts-container">
      <div className="trusted-contacts-panel">
        <div className="reminderalert-panel-heading">
          <p>Trusted Contacts Management</p>
          <h2>Manage your trusted reminder contacts</h2>
        </div>

        {error && (
          <div style={{ color: "#d32f2f", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ color: "#28a745", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {successMessage}
          </div>
        )}

        <div className="trusted-contacts-tabs">
          <button
            className={`tab-button ${activeTab === "accepted" ? "active" : ""}`}
            onClick={() => setActiveTab("accepted")}
          >
            Accepted ({acceptedContacts.length})
          </button>
          <button
            className={`tab-button ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            Sent Invites ({sentInvites.length})
          </button>
          <button
            className={`tab-button ${activeTab === "received" ? "active" : ""}`}
            onClick={() => setActiveTab("received")}
          >
            Received Invites ({receivedInvites.length})
          </button>
        </div>

        {activeTab === "accepted" && (
          <div className="trusted-contacts-tab-content">
            <div className="trusted-contacts-actions">
              <button
                className="reminderalert-filter-chip active"
                onClick={() => setShowInviteForm(!showInviteForm)}
              >
                {showInviteForm ? "Cancel" : "Add New Contact"}
              </button>
            </div>

            {showInviteForm && (
              <form className="trusted-contacts-form" onSubmit={handleSendInvite}>
                <div className="reminderalert-step-item">
                  <label>
                    <span>Contact ID or Username</span>
                    <input
                      type="text"
                      name="recipientId"
                      value={inviteForm.recipientId}
                      onChange={handleInviteFormChange}
                      placeholder="Enter contact ID or username"
                    />
                  </label>
                </div>

                <div className="reminderalert-requirement-card">
                  <h4>Relationship</h4>
                  <select
                    name="relationship"
                    value={inviteForm.relationship}
                    onChange={handleInviteFormChange}
                  >
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="colleague">Colleague</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="reminderalert-step-item">
                  <label>
                    <span>Message (Optional)</span>
                    <textarea
                      name="message"
                      value={inviteForm.message}
                      onChange={handleInviteFormChange}
                      placeholder="Add a message to your invite"
                      rows="3"
                    />
                  </label>
                </div>

                {submitError && (
                  <div style={{ color: "#d32f2f", marginBottom: "1rem", fontSize: "0.9rem" }}>
                    {submitError}
                  </div>
                )}

                <div className="reminderalert-filter-row">
                  <button
                    type="submit"
                    className="reminderalert-filter-chip active"
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="reminderalert-callout">
                <strong>Loading...</strong>
              </div>
            ) : acceptedContacts.length > 0 ? (
              <div className="trusted-contacts-list">
                {acceptedContacts.map((contact) => (
                  <div key={contact._id} className="trusted-contact-card">
                    <div className="contact-info">
                      <h4>{renderUserInfo(contact.recipientId)}</h4>
                      <p>
                        {contact.relationship.charAt(0).toUpperCase() +
                          contact.relationship.slice(1)}{" "}
                        • Accepted on{" "}
                        {new Date(contact.acceptedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="reminderalert-filter-chip"
                      onClick={() => handleRemoveContact(contact._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="reminderalert-callout">
                <strong>No accepted trusted contacts</strong>
                <p>Add a new contact to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "sent" && (
          <div className="trusted-contacts-tab-content">
            {loading ? (
              <div className="reminderalert-callout">
                <strong>Loading...</strong>
              </div>
            ) : sentInvites.length > 0 ? (
              <div className="trusted-contacts-list">
                {sentInvites.map((invite) => (
                  <div key={invite._id} className="trusted-contact-card">
                    <div className="contact-info">
                      <h4>{renderUserInfo(invite.recipientId)}</h4>
                      <p>
                        Status:{" "}
                        <strong style={{ color: invite.status === "accepted" ? "#28a745" : "#ff9800" }}>
                          {invite.status.toUpperCase()}
                        </strong>
                      </p>
                      {invite.message && <p className="invite-message">"{invite.message}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="reminderalert-callout">
                <strong>No sent invites</strong>
                <p>Add a new contact to send an invite</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "received" && (
          <div className="trusted-contacts-tab-content">
            {loading ? (
              <div className="reminderalert-callout">
                <strong>Loading...</strong>
              </div>
            ) : receivedInvites.length > 0 ? (
              <div className="trusted-contacts-list">
                {receivedInvites.map((invite) => (
                  <div key={invite._id} className="trusted-contact-card">
                    <div className="contact-info">
                      <h4>{renderUserInfo(invite.senderId)}</h4>
                      <p>Wants to add you as a {invite.relationship}</p>
                      {invite.message && <p className="invite-message">"{invite.message}"</p>}
                    </div>
                    <div className="contact-actions">
                      <button
                        className="reminderalert-filter-chip active"
                        onClick={() => handleAcceptInvite(invite._id)}
                      >
                        Accept
                      </button>
                      <button
                        className="reminderalert-filter-chip"
                        onClick={() => handleRejectInvite(invite._id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="reminderalert-callout">
                <strong>No pending invites</strong>
                <p>You'll see invitations here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustedContacts;
