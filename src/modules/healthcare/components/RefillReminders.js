import React, { useState } from "react";

const INITIAL_REMINDER = {
  familyMember: "Self",
  medicineName: "",
  dosage: "",
  frequency: "",
  nextRefillDate: "",
  reminderDaysBefore: 5,
  active: true,
};

const RefillReminders = ({ reminders, loading, familyMembers, onCreateReminder, onUpdateReminder, onDeleteReminder }) => {
  const [form, setForm] = useState(INITIAL_REMINDER);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submitReminder = async (event) => {
    event.preventDefault();

    if (!form.medicineName || !form.nextRefillDate) {
      setFeedbackMessage("Medicine name and refill date are required.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreateReminder({
        ...form,
        reminderDaysBefore: Number(form.reminderDaysBefore || 5),
      });

      setFeedbackMessage("Refill reminder added.");
      setForm(INITIAL_REMINDER);
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to create reminder.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (reminder) => {
    await onUpdateReminder(reminder.id, {
      active: !reminder.active,
    });
  };

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Medicine Refill Reminders</h2>
        <p>Configure refill notifications and elderly care medication continuity alerts.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-records-grid">
        <form className="healthcare-record-card" onSubmit={submitReminder}>
          <h3>Set Reminder</h3>

          <label className="healthcare-field">
            <span>Family Member</span>
            <select value={form.familyMember} onChange={(event) => updateField("familyMember", event.target.value)}>
              {(familyMembers || ["Self"]).map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </label>

          <label className="healthcare-field">
            <span>Medicine Name</span>
            <input
              type="text"
              value={form.medicineName}
              onChange={(event) => updateField("medicineName", event.target.value)}
              required
            />
          </label>

          <label className="healthcare-field">
            <span>Dosage</span>
            <input type="text" value={form.dosage} onChange={(event) => updateField("dosage", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Frequency</span>
            <input type="text" value={form.frequency} onChange={(event) => updateField("frequency", event.target.value)} />
          </label>

          <label className="healthcare-field">
            <span>Next Refill Date</span>
            <input
              type="date"
              value={form.nextRefillDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(event) => updateField("nextRefillDate", event.target.value)}
              required
            />
          </label>

          <label className="healthcare-field">
            <span>Remind Before (days)</span>
            <input
              type="number"
              min="1"
              max="30"
              value={form.reminderDaysBefore}
              onChange={(event) => updateField("reminderDaysBefore", event.target.value)}
            />
          </label>

          <button type="submit" className="healthcare-primary-button" disabled={submitting}>
            {submitting ? "Saving..." : "Add Reminder"}
          </button>
        </form>

        <div className="healthcare-record-list-card">
          <h3>Configured Reminders</h3>
          {loading ? <p>Loading reminders...</p> : null}
          {!loading && (reminders || []).length === 0 ? <p>No reminders yet.</p> : null}

          {(reminders || []).map((reminder) => (
            <article key={reminder.id} className="healthcare-record-item">
              <div className="healthcare-record-meta">
                <strong>{reminder.medicineName}</strong>
                <span>
                  {reminder.familyMember || "Self"} | {reminder.nextRefillDate}
                </span>
                <span>
                  {reminder.dosage || "No dosage"} | {reminder.frequency || "No frequency"}
                </span>
                <span>
                  Alert before {reminder.reminderDaysBefore || 5} day(s)
                </span>
                <span className={reminder.active ? "healthcare-success-text" : "healthcare-warning-text"}>
                  {reminder.active ? "Active" : "Paused"}
                </span>
              </div>

              <div className="healthcare-record-actions">
                <button type="button" className="healthcare-secondary-button" onClick={() => toggleActive(reminder)}>
                  {reminder.active ? "Pause" : "Resume"}
                </button>
                <button type="button" className="healthcare-danger-button" onClick={() => onDeleteReminder(reminder.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RefillReminders;
