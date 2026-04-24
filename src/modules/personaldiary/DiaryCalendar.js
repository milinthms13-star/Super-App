import React, { useMemo, useState } from "react";

const padNumber = (value) => String(value).padStart(2, "0");

const buildDateKey = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("-");
};

const formatDateHeading = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatMonthHeading = (value) =>
  value.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const formatReminderInputValue = (value) => {
  const baseDate = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  return [
    buildDateKey(baseDate),
    `${padNumber(baseDate.getHours())}:${padNumber(baseDate.getMinutes())}`,
  ].join("T");
};

const createInitialFormState = (selectedDate) => {
  const reminderDate = new Date(selectedDate);
  reminderDate.setHours(9, 0, 0, 0);

  return {
    type: "note",
    title: "",
    note: "",
    reminderAt: formatReminderInputValue(reminderDate),
    isCompleted: false,
  };
};

const DiaryCalendar = ({
  entries = [],
  calendarItems = [],
  onCreateCalendarItem,
  onUpdateCalendarItem,
  onDeleteCalendarItem,
  submitting = false,
}) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formState, setFormState] = useState(() => createInitialFormState(new Date()));
  const [editingItemId, setEditingItemId] = useState("");
  const [formError, setFormError] = useState("");

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const selectedDateKey = buildDateKey(selectedDate);
  const todayKey = buildDateKey(today);

  const calendarDays = useMemo(() => {
    const values = [];

    for (let index = 0; index < firstDayOfMonth; index += 1) {
      values.push(null);
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      values.push(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber)
      );
    }

    return values;
  }, [currentDate, daysInMonth, firstDayOfMonth]);

  const getEntriesForDate = (dateValue) => {
    const dateKey = buildDateKey(dateValue);
    return entries.filter(
      (entry) => buildDateKey(entry.entryDate || entry.createdAt) === dateKey
    );
  };

  const getCalendarItemsForDate = (dateValue) => {
    const dateKey = buildDateKey(dateValue);
    return calendarItems.filter((item) => buildDateKey(item.date) === dateKey);
  };

  const selectedDateEntries = getEntriesForDate(selectedDate);
  const selectedDateItems = getCalendarItemsForDate(selectedDate);

  const resetForm = (dateValue = selectedDate) => {
    setEditingItemId("");
    setFormError("");
    setFormState(createInitialFormState(dateValue));
  };

  const handleSelectDate = (dateValue) => {
    setSelectedDate(dateValue);
    resetForm(dateValue);
  };

  const handleChangeMonth = (monthOffset) => {
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + monthOffset,
      1
    );
    const nextSelectedDate = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      1
    );

    setCurrentDate(nextMonth);
    setSelectedDate(nextSelectedDate);
    resetForm(nextSelectedDate);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildPayload = () => ({
    date: selectedDateKey,
    type: formState.type,
    title: formState.title.trim(),
    note: formState.note.trim(),
    reminderAt: formState.type === "reminder" ? formState.reminderAt : null,
    isCompleted: Boolean(formState.isCompleted),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.title) {
      setFormError("Title is required.");
      return;
    }

    if (payload.type === "reminder" && !payload.reminderAt) {
      setFormError("Reminder time is required.");
      return;
    }

    try {
      if (editingItemId) {
        await onUpdateCalendarItem(editingItemId, payload);
      } else {
        await onCreateCalendarItem(payload);
      }

      resetForm(selectedDate);
    } catch (error) {
      setFormError(error.message || "Unable to save calendar item.");
    }
  };

  const handleEditItem = (item) => {
    const itemDate = new Date(item.date);
    setSelectedDate(itemDate);
    setEditingItemId(item._id);
    setFormError("");
    setFormState({
      type: item.type || "note",
      title: item.title || "",
      note: item.note || "",
      reminderAt: item.reminderAt ? formatReminderInputValue(item.reminderAt) : "",
      isCompleted: Boolean(item.isCompleted),
    });
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Delete this note or reminder?")) {
      return;
    }

    try {
      await onDeleteCalendarItem(itemId);
      if (editingItemId === itemId) {
        resetForm(selectedDate);
      }
    } catch (error) {
      setFormError(error.message || "Unable to delete calendar item.");
    }
  };

  const handleToggleComplete = async (item) => {
    try {
      await onUpdateCalendarItem(item._id, {
        date: buildDateKey(item.date),
        type: item.type,
        title: item.title,
        note: item.note || "",
        reminderAt: item.reminderAt ? formatReminderInputValue(item.reminderAt) : "",
        isCompleted: !item.isCompleted,
      });
    } catch (error) {
      setFormError(error.message || "Unable to update reminder.");
    }
  };

  return (
    <div className="diary-calendar-section">
      <div className="diary-calendar-header">
        <button type="button" onClick={() => handleChangeMonth(-1)}>
          Prev
        </button>
        <h3>{formatMonthHeading(currentDate)}</h3>
        <button type="button" onClick={() => handleChangeMonth(1)}>
          Next
        </button>
      </div>

      <div className="diary-calendar-grid">
        <div className="diary-cal-weekday">Sun</div>
        <div className="diary-cal-weekday">Mon</div>
        <div className="diary-cal-weekday">Tue</div>
        <div className="diary-cal-weekday">Wed</div>
        <div className="diary-cal-weekday">Thu</div>
        <div className="diary-cal-weekday">Fri</div>
        <div className="diary-cal-weekday">Sat</div>

        {calendarDays.map((dayDate, index) => {
          const dayEntries = dayDate ? getEntriesForDate(dayDate) : [];
          const dayItems = dayDate ? getCalendarItemsForDate(dayDate) : [];
          const noteCount = dayItems.filter((item) => item.type !== "reminder").length;
          const reminderCount = dayItems.filter((item) => item.type === "reminder").length;
          const dayKey = buildDateKey(dayDate);

          return (
            <button
              key={dayDate ? dayKey : `empty-${index}`}
              type="button"
              className={`diary-cal-day ${!dayDate ? "empty" : ""} ${
                dayEntries.length > 0 ? "has-entries" : ""
              } ${dayItems.length > 0 ? "has-items" : ""} ${
                dayKey && dayKey === selectedDateKey ? "is-selected" : ""
              } ${dayKey && dayKey === todayKey ? "is-today" : ""}`}
              onClick={() => dayDate && handleSelectDate(dayDate)}
              disabled={!dayDate}
            >
              {dayDate && (
                <>
                  <span className="diary-cal-day-num">{dayDate.getDate()}</span>
                  <div className="diary-cal-dots">
                    {dayEntries.length > 0 && (
                      <span className="diary-cal-dot diary-cal-dot-entry" />
                    )}
                    {noteCount > 0 && (
                      <span className="diary-cal-dot diary-cal-dot-note" />
                    )}
                    {reminderCount > 0 && (
                      <span className="diary-cal-dot diary-cal-dot-reminder" />
                    )}
                  </div>
                  <div className="diary-cal-badges">
                    {dayEntries.length > 0 && (
                      <span className="diary-cal-badge diary-cal-badge-entry">
                        {dayEntries.length} entry
                      </span>
                    )}
                    {noteCount > 0 && (
                      <span className="diary-cal-badge diary-cal-badge-note">
                        {noteCount} note
                      </span>
                    )}
                    {reminderCount > 0 && (
                      <span className="diary-cal-badge diary-cal-badge-reminder">
                        {reminderCount} reminder
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="diary-calendar-planner">
        <section className="diary-calendar-compose">
          <div className="diary-calendar-panel-header">
            <div>
              <p className="diary-calendar-panel-eyebrow">Selected day</p>
              <h4>{formatDateHeading(selectedDate)}</h4>
            </div>
            <button
              type="button"
              className="diary-calendar-reset-btn"
              onClick={() => resetForm(selectedDate)}
              disabled={submitting}
            >
              Clear form
            </button>
          </div>

          {formError && <div className="diary-calendar-error">{formError}</div>}

          <form className="diary-calendar-form" onSubmit={handleSubmit}>
            <div className="diary-calendar-form-row">
              <label className="diary-calendar-field">
                <span>Type</span>
                <select
                  name="type"
                  value={formState.type}
                  onChange={handleFormChange}
                  disabled={submitting}
                >
                  <option value="note">Note</option>
                  <option value="reminder">Reminder</option>
                </select>
              </label>

              <label className="diary-calendar-field diary-calendar-field-grow">
                <span>Title</span>
                <input
                  type="text"
                  name="title"
                  value={formState.title}
                  onChange={handleFormChange}
                  placeholder="What do you want to remember?"
                  disabled={submitting}
                  maxLength="120"
                />
              </label>
            </div>

            <label className="diary-calendar-field">
              <span>Notes</span>
              <textarea
                name="note"
                value={formState.note}
                onChange={handleFormChange}
                placeholder="Add a short note for this date"
                disabled={submitting}
                rows="4"
                maxLength="1500"
              />
            </label>

            {formState.type === "reminder" && (
              <label className="diary-calendar-field">
                <span>Reminder time</span>
                <input
                  type="datetime-local"
                  name="reminderAt"
                  value={formState.reminderAt}
                  onChange={handleFormChange}
                  disabled={submitting}
                />
              </label>
            )}

            {editingItemId && (
              <label className="diary-calendar-checkbox">
                <input
                  type="checkbox"
                  name="isCompleted"
                  checked={formState.isCompleted}
                  onChange={handleFormChange}
                  disabled={submitting}
                />
                <span>Mark this reminder as completed</span>
              </label>
            )}

            <div className="diary-calendar-form-actions">
              <button type="submit" className="diary-primary-btn" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingItemId
                  ? "Update item"
                  : "Save item"}
              </button>
              {editingItemId && (
                <button
                  type="button"
                  className="diary-calendar-secondary-btn"
                  onClick={() => resetForm(selectedDate)}
                  disabled={submitting}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <div className="diary-calendar-day-panels">
          <section className="diary-calendar-day-card">
            <div className="diary-calendar-panel-header">
              <div>
                <p className="diary-calendar-panel-eyebrow">Planner</p>
                <h5>Notes and reminders</h5>
              </div>
              <span className="diary-calendar-panel-count">
                {selectedDateItems.length}
              </span>
            </div>

            {selectedDateItems.length > 0 ? (
              <div className="diary-calendar-item-list">
                {selectedDateItems.map((item) => (
                  <article
                    key={item._id}
                    className={`diary-calendar-item-card ${
                      item.isCompleted ? "completed" : ""
                    }`}
                  >
                    <div className="diary-calendar-item-topline">
                      <span
                        className={`diary-calendar-item-type diary-calendar-item-type-${item.type}`}
                      >
                        {item.type === "reminder" ? "Reminder" : "Note"}
                      </span>
                      {item.reminderAt && (
                        <span className="diary-calendar-item-time">
                          {new Date(item.reminderAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <h6>{item.title}</h6>
                    {item.note && <p>{item.note}</p>}

                    <div className="diary-calendar-item-actions">
                      {item.type === "reminder" && (
                        <button
                          type="button"
                          className="diary-calendar-inline-btn"
                          onClick={() => handleToggleComplete(item)}
                          disabled={submitting}
                        >
                          {item.isCompleted ? "Mark pending" : "Mark done"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="diary-calendar-inline-btn"
                        onClick={() => handleEditItem(item)}
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="diary-calendar-inline-btn danger"
                        onClick={() => handleDeleteItem(item._id)}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="diary-calendar-empty-state">
                No notes or reminders for this day yet.
              </div>
            )}
          </section>

          <section className="diary-calendar-day-card">
            <div className="diary-calendar-panel-header">
              <div>
                <p className="diary-calendar-panel-eyebrow">Diary</p>
                <h5>Entries on this date</h5>
              </div>
              <span className="diary-calendar-panel-count">
                {selectedDateEntries.length}
              </span>
            </div>

            {selectedDateEntries.length > 0 ? (
              <div className="diary-calendar-entry-list">
                {selectedDateEntries.map((entry) => (
                  <article key={entry._id} className="diary-calendar-entry-card">
                    <div className="diary-calendar-entry-meta">
                      <span className="diary-calendar-entry-category">
                        {entry.category}
                      </span>
                      <span className="diary-calendar-entry-date">
                        {new Date(entry.entryDate || entry.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </span>
                    </div>
                    <h6>{entry.title}</h6>
                  </article>
                ))}
              </div>
            ) : (
              <div className="diary-calendar-empty-state">
                No diary entries saved for this date.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DiaryCalendar;
