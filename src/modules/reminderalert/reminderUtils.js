export const toDateInputValue = (value) => {
  const toLocalDateValue = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toLocalDateValue(value);
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return "";
  }

  const dateMatch = stringValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return dateMatch[1];
  }

  const parsedDate = new Date(stringValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return toLocalDateValue(parsedDate);
};

export const formatReminderDueDate = (dueDate, dueTime) => {
  const dateValue = toDateInputValue(dueDate);
  if (!dateValue) {
    return "No due date";
  }

  const targetDate = new Date(`${dateValue}T00:00`);
  if (Number.isNaN(targetDate.getTime())) {
    return "No due date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const displayTime = String(dueTime || "09:00").trim() || "09:00";

  if (diffDays === 0) {
    return `Today, ${displayTime}`;
  }

  if (diffDays === 1) {
    return `Tomorrow, ${displayTime}`;
  }

  return `${targetDate.toLocaleDateString("en-IN")} ${displayTime}`.trim();
};

export const normalizeReminderRecord = (reminder = {}) => ({
  ...reminder,
  description: reminder.description || "",
  dueDate: toDateInputValue(reminder.dueDate),
  dueTime: String(reminder.dueTime || "").trim(),
  reminders: Array.isArray(reminder.reminders) ? reminder.reminders : [],
  recurring: reminder.recurring || "none",
  status: reminder.status || "Reminder scheduled",
  completed: Boolean(reminder.completed),
});
