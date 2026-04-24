import React, { useEffect, useState, useCallback } from "react";
import { fetchTodaysSummary } from "../../services/diaryService";
import "./styles/TodaysSummary.css";

const stripHtml = (content = "") =>
  String(content)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildPreview = (content = "", maxLength = 140) => {
  const plainText = stripHtml(content);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trim()}...`;
};

const formatReminderTime = (value) => {
  const reminderDate = new Date(value);

  if (Number.isNaN(reminderDate.getTime())) {
    return "";
  }

  return reminderDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TodaysSummary = () => {
  const [todaysItems, setTodaysItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTodaysSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchTodaysSummary();
      setTodaysItems(response.data);
    } catch (err) {
      console.error("Failed to load today's summary:", err);
      setError(err.message || "Failed to load today's summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodaysSummary();
    const interval = setInterval(loadTodaysSummary, 60000);
    return () => clearInterval(interval);
  }, [loadTodaysSummary]);

  if (loading) {
    return (
      <div className="todays-summary todays-summary-loading">
        <div className="todays-summary-spinner"></div>
        <p>Loading today's items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="todays-summary todays-summary-error">
        <p>{error}</p>
        <button
          onClick={loadTodaysSummary}
          className="todays-summary-retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!todaysItems) {
    return null;
  }

  const {
    entries = [],
    notes = [],
    reminders = [],
    pendingReminders = [],
    summary = {},
  } = todaysItems;
  const hasItems =
    (summary.totalEntries || 0) > 0 ||
    (summary.totalNotes || 0) > 0 ||
    (summary.totalReminders || 0) > 0;

  return (
    <div className="todays-summary">
      <div className="todays-summary-header">
        <h3>Today's Summary</h3>
        <button
          className="todays-summary-refresh-btn"
          onClick={loadTodaysSummary}
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {!hasItems ? (
        <div className="todays-summary-empty">
          <p>No diary entries, notes, or reminders for today yet.</p>
        </div>
      ) : (
        <div className="todays-summary-content">
          {entries.length > 0 && (
            <div className="todays-summary-section">
              <h4 className="todays-summary-section-title">
                Entries ({entries.length})
              </h4>
              <div className="todays-summary-items">
                {entries.map((entry) => (
                  <div key={entry._id} className="todays-summary-item note">
                    <div className="todays-summary-item-header">
                      <span className="todays-summary-item-title">
                        {entry.title}
                      </span>
                      {entry.category && (
                        <span className="todays-summary-item-time">
                          {entry.category}
                        </span>
                      )}
                    </div>
                    {entry.content && (
                      <p className="todays-summary-item-content">
                        {buildPreview(entry.content)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {notes.length > 0 && (
            <div className="todays-summary-section">
              <h4 className="todays-summary-section-title">
                Notes ({notes.length})
              </h4>
              <div className="todays-summary-items">
                {notes.map((note) => (
                  <div key={note._id} className="todays-summary-item note">
                    <div className="todays-summary-item-header">
                      <span className="todays-summary-item-title">
                        {note.title}
                      </span>
                    </div>
                    {note.note && (
                      <p className="todays-summary-item-content">
                        {note.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reminders.length > 0 && (
            <div className="todays-summary-section">
              <h4 className="todays-summary-section-title">
                Reminders ({reminders.length})
              </h4>
              <div className="todays-summary-items">
                {reminders.map((reminder) => (
                  <div
                    key={reminder._id}
                    className={`todays-summary-item reminder ${
                      reminder.isCompleted ? "completed" : "pending"
                    }`}
                  >
                    <div className="todays-summary-item-header">
                      <span className="todays-summary-item-time">
                        {formatReminderTime(reminder.reminderAt)}
                      </span>
                      <span
                        className={`todays-summary-item-status ${
                          reminder.isCompleted ? "done" : "pending"
                        }`}
                      >
                        {reminder.isCompleted ? "Done" : "Pending"}
                      </span>
                    </div>
                    <span className="todays-summary-item-title">
                      {reminder.title}
                    </span>
                    {reminder.note && (
                      <p className="todays-summary-item-content">
                        {reminder.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {pendingReminders.length > 0 && (
                <div className="todays-summary-alert">
                  <span className="todays-summary-alert-icon">!</span>
                  <span>
                    {pendingReminders.length} pending reminder
                    {pendingReminders.length !== 1 ? "s" : ""} today
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasItems && (
        <div className="todays-summary-stats">
          <div className="todays-summary-stat">
            <span className="todays-summary-stat-value">
              {summary.totalEntries || 0}
            </span>
            <span className="todays-summary-stat-label">Entries</span>
          </div>
          <div className="todays-summary-stat">
            <span className="todays-summary-stat-value">
              {summary.totalNotes || 0}
            </span>
            <span className="todays-summary-stat-label">Notes</span>
          </div>
          <div className="todays-summary-stat">
            <span className="todays-summary-stat-value">
              {summary.pendingRemindersCount || 0}
            </span>
            <span className="todays-summary-stat-label">Pending</span>
          </div>
          <div className="todays-summary-stat">
            <span className="todays-summary-stat-value">
              {summary.totalReminders || 0}
            </span>
            <span className="todays-summary-stat-label">Reminders</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodaysSummary;
