import React, { useState, useMemo } from 'react';
import axios from 'axios';
import useI18n from '../../hooks/useI18n';
import { API_BASE_URL } from '../../utils/api';
import { getStatusColor, getStatusLabel, formatDateTime, getTicketTimeline } from './supportUtils';
import './TicketDetails.css';

const TicketDetails = ({ ticket, onBack, onTicketUpdate }) => {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState(ticket.satisfactionRating || 0);
  const [showFeedback, setShowFeedback] = useState(!ticket.satisfactionRating && ticket.status === 'resolved');

  const ticketTimeline = useMemo(() => getTicketTimeline(ticket), [ticket]);

  const handleAddMessage = async (e) => {
    e.preventDefault();
    setError('');
    if (!message.trim()) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('content', message);
      if (attachmentFile) {
        data.append('attachment', attachmentFile);
      }

      const response = await axios.post(
        `${API_BASE_URL}/support/${ticket._id}/messages`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        onTicketUpdate(response.data.ticket);
        setMessage('');
        setAttachmentFile(null);
      } else {
        setError(response.data.message || t('support.errors.messageFailed', 'Unable to send message.'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('support.errors.messageFailed', 'Unable to send message.'));
    } finally {
      setLoading(false);
    }
  };

  const handleTicketAction = async (newStatus) => {
    setError('');
    setStatusMessage('');
    setLoading(true);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/support/${ticket._id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );
      if (response.data.success) {
        onTicketUpdate(response.data.ticket);
        setStatusMessage(t('support.statusUpdated', 'Ticket status updated successfully.'));
        setShowFeedback(newStatus === 'resolved' && !response.data.ticket.satisfactionRating);
      } else {
        setError(response.data.message || t('support.errors.statusUpdateFailed', 'Unable to update ticket status.'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('support.errors.statusUpdateFailed', 'Unable to update ticket status.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (satisfactionRating === 0) return;
    setError('');
    setLoading(true);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/support/${ticket._id}/status`,
        {
          satisfactionRating,
          status: 'closed',
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );

      if (response.data.success) {
        onTicketUpdate(response.data.ticket);
        setShowFeedback(false);
      } else {
        setError(response.data.message || t('support.errors.feedbackFailed', 'Unable to submit feedback.'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('support.errors.feedbackFailed', 'Unable to submit feedback.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-details-container">
      <button className="btn btn-back" onClick={onBack}>
        ← {t('common.back', 'Back')}
      </button>

      {error && <div className="alert alert-error">{error}</div>}
      {statusMessage && <div className="alert alert-success">{statusMessage}</div>}

      <div className="ticket-details-header">
        <div>
          <h2>{ticket.subject}</h2>
          <p className="ticket-number">{ticket.ticketNumber}</p>
          <p className="ticket-subtitle">{ticket.module} • {ticket.category}</p>
        </div>

        <div className="ticket-status">
          <span className={`status-badge ${getStatusColor(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>
      </div>

      <div className="ticket-info-grid">
        <div className="info-item">
          <label>{t('support.priority', 'Priority')}</label>
          <p>{ticket.priority.toUpperCase()}</p>
        </div>

        <div className="info-item">
          <label>{t('support.assignedAgent', 'Assigned Agent')}</label>
          <p>{ticket.assignedAgent?.name || ticket.assignedAgent || t('support.unassigned', 'Unassigned')}</p>
        </div>

        <div className="info-item">
          <label>{t('support.slaDue', 'SLA due')}</label>
          <p>{ticket.slaDueAt ? formatDateTime(ticket.slaDueAt) : t('support.notAvailable', 'Not available')}</p>
        </div>

        <div className="info-item">
          <label>{t('common.createdAt', 'Created')}</label>
          <p>{formatDateTime(ticket.createdAt)}</p>
        </div>
      </div>

      <div className="ticket-description-section">
        <h3>{t('common.description', 'Description')}</h3>
        <p>{ticket.description}</p>
      </div>

      {ticket.attachments?.length > 0 && (
        <div className="ticket-attachments-section">
          <h3>{t('support.attachments', 'Attachments')}</h3>
          <div className="attachment-list">
            {ticket.attachments.map((attachment, index) => (
              <a
                key={index}
                className="attachment-card"
                href={attachment.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{attachment.name || `Attachment ${index + 1}`}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="ticket-timeline-section">
        <h3>{t('support.timeline', 'Ticket Timeline')}</h3>
        <div className="timeline-list">
          {ticketTimeline.map((event, index) => (
            <div key={`${event.timestamp}-${index}`} className="timeline-item">
              <span className="timeline-time">{formatDateTime(event.timestamp)}</span>
              <strong>{event.title}</strong>
              <p>{event.details}</p>
            </div>
          ))}
        </div>
      </div>

      {(ticket.status !== 'closed' || ticket.status === 'resolved') && (
        <div className="ticket-action-row">
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleTicketAction('escalated')}
              disabled={loading}
            >
              {t('support.escalateTicket', 'Escalate Ticket')}
            </button>
          )}
          {ticket.status !== 'closed' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleTicketAction('resolved')}
              disabled={loading}
            >
              {t('support.closeTicket', 'Close Ticket')}
            </button>
          )}
          {(ticket.status === 'closed' || ticket.status === 'resolved') && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleTicketAction('open')}
              disabled={loading}
            >
              {t('support.reopenTicket', 'Reopen Ticket')}
            </button>
          )}
        </div>
      )}

      <div className="ticket-messages-section">
        <h3>{t('support.conversation', 'Conversation')}</h3>

        <div className="messages-container">
          {ticket.messages?.length ? (
            ticket.messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.senderType === 'user' ? 'user-message' : 'support-message'}`}
              >
                <div className="message-header">
                  <span className="sender-name">
                    {msg.senderType === 'support_agent'
                      ? t('support.supportTeam', 'Support Team')
                      : t('support.you', 'You')}
                  </span>
                  <span className="message-time">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
                <p className="message-content">{msg.content}</p>
                {msg.attachment && (
                  <a
                    href={msg.attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="message-attachment"
                  >
                    {msg.attachment.name || 'View attachment'}
                  </a>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>{t('support.noMessagesYet', 'No messages yet for this ticket.')}</p>
            </div>
          )}
        </div>
      </div>

      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
        <form onSubmit={handleAddMessage} className="message-form">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('support.messagePlaceholder', 'Type your message...')}
            rows="4"
          />
          <div className="form-row attachment-row">
            <label className="attachment-label">
              {t('support.uploadAttachment', 'Upload attachment')}
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
            </label>
            {attachmentFile && <span className="attachment-name">{attachmentFile.name}</span>}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !message.trim()}
          >
            {loading ? t('common.sending', 'Sending...') : t('support.sendMessage', 'Send Message')}
          </button>
        </form>
      )}

      {ticket.status === 'resolved' && showFeedback && (
        <div className="feedback-section">
          <h3>{t('support.feedbackTitle', 'How would you rate our support?')}</h3>

          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star ${star <= satisfactionRating ? 'filled' : ''}`}
                onClick={() => setSatisfactionRating(star)}
              >
                ⭐
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSubmitFeedback}
            disabled={satisfactionRating === 0 || loading}
          >
            {t('support.submitFeedback', 'Submit Feedback')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketDetails;
