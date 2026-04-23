import React from 'react';
import useI18n from '../../hooks/useI18n';
import './TicketList.css';

const TicketList = ({ tickets, loading, onSelectTicket }) => {
  const { t } = useI18n();

  const getStatusColor = (status) => {
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

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent',
    };
    return colors[priority] || 'priority-medium';
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: t('support.status.open', 'Open'),
      in_progress: t('support.status.inProgress', 'In Progress'),
      awaiting_user: t('support.status.awaitingUser', 'Awaiting Your Response'),
      resolved: t('support.status.resolved', 'Resolved'),
      closed: t('support.status.closed', 'Closed'),
      escalated: t('support.status.escalated', 'Escalated'),
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="ticket-list-container">
        <div className="loading-spinner">
          {t('common.loading', 'Loading tickets...')}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="ticket-list-container">
        <div className="empty-state">
          <h3>{t('support.noTickets', 'No support tickets yet')}</h3>
          <p>{t('support.noTicketsDesc', 'Create a ticket to get started with our support team')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-list-container">
      <div className="ticket-list">
        {tickets.map((ticket) => (
          <div
            key={ticket._id}
            className="ticket-item"
            onClick={() => onSelectTicket(ticket._id)}
          >
            <div className="ticket-header">
              <div className="ticket-number-subject">
                <span className="ticket-number">{ticket.ticketNumber}</span>
                <h3>{ticket.subject}</h3>
              </div>
              <div className="ticket-badges">
                <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                  {getStatusLabel(ticket.status)}
                </span>
                <span className={`priority-badge ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="ticket-meta">
              <span className="module-tag">{ticket.module}</span>
              <span className="category-tag">{ticket.category}</span>
              <span className="date">
                {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>

            <p className="ticket-description">{ticket.description.substring(0, 100)}...</p>

            <div className="ticket-footer">
              <span className="message-count">
                {ticket.messages?.length || 0} {t('support.messages', 'messages')}
              </span>
              {ticket.satisfactionRating && (
                <span className="satisfaction">
                  ⭐ {ticket.satisfactionRating}/5
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketList;
