import React, { useMemo, useState } from "react";

const EMPTY_PROFILE = {
  name: "",
  relation: "Family",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  phone: "",
  notes: "",
  emergencyPhone: "",
  isEmergencyContact: false,
  inviteStatus: "accepted",
};

const FamilyProfiles = ({ profiles, loading, onCreateProfile, onUpdateProfile, onDeleteProfile }) => {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [editingId, setEditingId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedProfiles = useMemo(() => {
    return [...(profiles || [])].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [profiles]);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_PROFILE);
    setEditingId("");
  };

  const startEdit = (profile) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name || "",
      relation: profile.relation || "Family",
      gender: profile.gender || "",
      dateOfBirth: profile.dateOfBirth || "",
      bloodGroup: profile.bloodGroup || "",
      phone: profile.phone || "",
      notes: profile.notes || "",
      emergencyPhone: profile.emergencyPhone || "",
      isEmergencyContact: Boolean(profile.isEmergencyContact),
      inviteStatus: profile.inviteStatus || "accepted",
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!form.name) {
      setFeedbackMessage("Family member name is required.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await onUpdateProfile(editingId, form);
        setFeedbackMessage("Family profile updated.");
      } else {
        await onCreateProfile(form);
        setFeedbackMessage("Family profile added.");
      }

      resetForm();
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to save family profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Family Health Profiles</h2>
        <p>Create and manage family members for appointments, records, and emergency notifications.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-records-grid">
        <form className="healthcare-record-card" onSubmit={submitForm}>
          <h3>{editingId ? "Edit Family Member" : "Add Family Member"}</h3>

          <label className="healthcare-field">
            <span>Name</span>
            <input type="text" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>

          <label className="healthcare-field">
            <span>Relation</span>
            <input type="text" value={form.relation} onChange={(event) => updateField("relation", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Gender</span>
            <input type="text" value={form.gender} onChange={(event) => updateField("gender", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Date Of Birth</span>
            <input type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Blood Group</span>
            <input type="text" value={form.bloodGroup} onChange={(event) => updateField("bloodGroup", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Phone</span>
            <input type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>

          <label className="healthcare-field healthcare-field-full">
            <span>Notes</span>
            <input type="text" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Emergency Phone</span>
            <input type="tel" value={form.emergencyPhone} onChange={(event) => updateField("emergencyPhone", event.target.value)} />
          </label>

          <label className="healthcare-checkbox">
            <input
              type="checkbox"
              checked={form.isEmergencyContact}
              onChange={(event) => updateField("isEmergencyContact", event.target.checked)}
            />
            <span>Use as emergency contact</span>
          </label>

          <label className="healthcare-field">
            <span>Family Invite Status</span>
            <select value={form.inviteStatus} onChange={(event) => updateField("inviteStatus", event.target.value)}>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending invite</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <div className="healthcare-modal-actions">
            {editingId ? (
              <button type="button" className="healthcare-secondary-button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
            <button type="submit" className="healthcare-primary-button" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update Profile" : "Add Profile"}
            </button>
          </div>
        </form>

        <div className="healthcare-record-list-card">
          <h3>Saved Members</h3>
          {loading ? <p>Loading profiles...</p> : null}
          {!loading && sortedProfiles.length === 0 ? <p>No family profiles yet.</p> : null}

          {sortedProfiles.map((profile) => (
            <article key={profile.id} className="healthcare-record-item">
              <div className="healthcare-record-meta">
                <strong>{profile.name}</strong>
                <span>{profile.relation || "Family"}</span>
                <span>
                  {profile.gender || ""} {profile.bloodGroup ? `| ${profile.bloodGroup}` : ""}
                </span>
                {profile.phone ? <span>Phone: {profile.phone}</span> : null}
                {profile.isEmergencyContact ? <span className="healthcare-warning-text">Emergency contact</span> : null}
                <span>Invite: {profile.inviteStatus || "accepted"}</span>
              </div>

              <div className="healthcare-record-actions">
                <button type="button" className="healthcare-secondary-button" onClick={() => startEdit(profile)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="healthcare-danger-button"
                  onClick={() => {
                    const confirmed = window.confirm("Remove this family profile?");
                    if (confirmed) {
                      void onDeleteProfile(profile.id);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FamilyProfiles;
