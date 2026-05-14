const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS = {
  lead_received: "Lead received",
  documents_pending: "Documents pending",
  consultant_assigned: "Consultant assigned",
  in_review: "In review",
  submitted_to_institution: "Submitted to institution",
  approved: "Approved",
  rejected: "Rejected",
  disbursed: "Disbursed",
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (from, to = new Date()) => {
  if (!from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
};

const getCallbackReminder = (callbackWindow, createdAt) => {
  const created = toDate(createdAt) || new Date();
  const reminderMap = {
    "today-evening": {
      reminderDate: created,
      message: "Follow up today evening",
    },
    "tomorrow-morning": {
      reminderDate: new Date(created.getTime() + DAY_MS),
      message: "Follow up tomorrow morning",
    },
    "tomorrow-evening": {
      reminderDate: new Date(created.getTime() + DAY_MS),
      message: "Follow up tomorrow evening",
    },
  };

  return reminderMap[String(callbackWindow || "").trim()] || null;
};

export const getStatusLabel = (status) => STATUS_LABELS[status] || String(status || "Unknown");

export const buildLeadTimeline = (lead = {}) => {
  const timeline = Array.isArray(lead.statusTimeline) ? [...lead.statusTimeline] : [];
  if (timeline.length === 0) {
    timeline.push({
      status: lead.status || "lead_received",
      note: "Lead created",
      changedByRole: "system",
      changedByName: "System",
      changedAt: lead.createdAt || new Date().toISOString(),
    });
  }

  return timeline
    .map((item, index) => ({
      key: `${lead.leadId || lead._id || "lead"}-${index}`,
      status: item.status,
      statusLabel: getStatusLabel(item.status),
      note: item.note || "",
      changedByRole: item.changedByRole || "system",
      changedByName: item.changedByName || "System",
      changedAt: item.changedAt,
      changedAtLabel: toDate(item.changedAt)?.toLocaleString() || "-",
    }))
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
};

export const deriveRepaymentInsights = (lead = {}) => {
  if (lead.status !== "disbursed") {
    return null;
  }

  const disbursedEvent = buildLeadTimeline(lead)
    .slice()
    .reverse()
    .find((item) => item.status === "disbursed");

  const disbursedAt = toDate(disbursedEvent?.changedAt || lead.updatedAt || lead.createdAt) || new Date();
  const nextDueDate = new Date(disbursedAt.getTime() + 30 * DAY_MS);

  return {
    disbursedAtLabel: disbursedAt.toLocaleDateString(),
    nextDueDateLabel: nextDueDate.toLocaleDateString(),
    checklist: [
      "Confirm disbursement amount in account",
      "Review sanction letter and repayment schedule",
      "Set EMI reminder before due date",
      "Keep payment proof and statements ready",
    ],
  };
};

export const buildLeadAlerts = (leads = []) => {
  const alerts = [];

  leads.forEach((lead) => {
    const leadCode = lead.leadId || lead._id || "Lead";
    const createdAt = toDate(lead.createdAt);
    const ageDays = daysBetween(createdAt);

    if (lead.status === "documents_pending" && ageDays >= 2) {
      alerts.push({
        id: `${leadCode}-docs-pending`,
        severity: "warning",
        title: `${leadCode}: documents pending`,
        message: `Lead has been waiting for document completion for ${ageDays} day(s).`,
      });
    }

    const callbackReminder = getCallbackReminder(lead.callbackWindow, lead.createdAt);
    if (callbackReminder) {
      const dueInDays = daysBetween(new Date(), callbackReminder.reminderDate) * -1;
      if (dueInDays <= 1) {
        alerts.push({
          id: `${leadCode}-callback`,
          severity: dueInDays <= 0 ? "critical" : "info",
          title: `${leadCode}: callback reminder`,
          message: callbackReminder.message,
        });
      }
    }

    if (lead.status === "approved") {
      alerts.push({
        id: `${leadCode}-approved`,
        severity: "info",
        title: `${leadCode}: approved`,
        message: "Coordinate final institution processing and disbursement timeline.",
      });
    }
  });

  return alerts;
};
