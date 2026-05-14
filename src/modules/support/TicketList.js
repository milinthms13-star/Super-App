import React from 'react';
import useI18n from '../../hooks/useI18n';
import { getStatusColor, getPriorityColor, getStatusLabel } from './supportUtils';
import './TicketList.css';

const TicketList = ({ tickets, loading, onSelectTicket, onCreateClick }) => {
  const { t } = useI18n();

  if (loading && tickets.length === 0) {
    return (
      <div className="ticket-list-container">
        <div className="ticket-list">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="ticket-item ticket-card-skeleton">
              <div className="skeleton header-skeleton" />
              <div className="skeleton meta-skeleton" />
              <div className="skeleton text-skeleton short" />
              <div className="skeleton text-skeleton long" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!loading && tickets.length === 0) {
    return (
      <div className="ticket-list-container">
        <div className="empty-state">
          <h3>{t('support.noTickets', 'No support tickets yet')}</h3>
          <p>{t('support.noTicketsDesc', 'Create a ticket to get started with our support team')}</p>
          <button type="button" className="btn btn-primary" onClick={onCreateClick}>
            {t('support.createTicket', 'Create Ticket')}
          </button>
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
            role="button"
            tabIndex={0}
            onClick={() => onSelectTicket(ticket._id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectTicket(ticket._id);
              }
            }}
            aria-label={`Open support ticket ${ticket.ticketNumber} about ${ticket.subject}`}
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
