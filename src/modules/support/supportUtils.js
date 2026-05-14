export const getStatusColor = (status) => {
  const colors = {
    open: 'status-open',
    in_progress: 'status-in-progress',
    awaiting_user: 'status-awaiting',
    resolved: 'status-resolved',
    closed: 'status-closed',
    escalated: 'status-escalated',
  };
  return colors[status] || 'status-open';
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    urgent: 'priority-urgent',
  };
  return colors[priority] || 'priority-medium';
};

export const getStatusLabel = (status) => {
  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    awaiting_user: 'Awaiting Your Response',
    resolved: 'Resolved',
    closed: 'Closed',
    escalated: 'Escalated',
  };
  return labels[status] || status;
};

export const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const validateWhatsAppNumber = (value) => {
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  return /^[0-9]{10}$/.test(cleaned);
};

export const getSuggestedPriority = (module, category) => {
  const urgentCategories = ['payment', 'refund', 'delivery', 'cancellation'];
  if (urgentCategories.includes(category) || urgentCategories.includes(module)) {
    return 'urgent';
  }
  if (category === 'technical' || module === 'ecommerce' || module === 'finance') {
    return 'high';
  }
  return 'medium';
};

export const getTicketTimeline = (ticket) => {
  const timeline = [];

  if (ticket.createdAt) {
    timeline.push({
      timestamp: ticket.createdAt,
      title: 'Ticket created',
      details: `Created with ${ticket.priority.toUpperCase()} priority`,
    });
  }

  if (ticket.assignedAgent) {
    timeline.push({
      timestamp: ticket.assignedAt || ticket.createdAt,
      title: 'Assigned to agent',
      details: `Assigned to ${ticket.assignedAgent.name || ticket.assignedAgent}`,
    });
  }

  if (ticket.statusHistory?.length) {
    ticket.statusHistory.forEach((statusEntry) => {
      timeline.push({
        timestamp: statusEntry.updatedAt,
        title: `Status updated to ${statusEntry.status.replace('_', ' ')}`,
        details: statusEntry.note || '',
      });
    });
  }

  if (ticket.messages?.length) {
    ticket.messages.forEach((msg) => {
      timeline.push({
        timestamp: msg.createdAt,
        title: msg.senderType === 'support_agent' ? 'Agent replied' : 'Customer responded',
        details: msg.content,
      });
    });
  }

  return timeline
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};
