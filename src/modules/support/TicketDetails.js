import React, { useState } from 'react';
import axios from 'axios';
import useI18n from '../../hooks/useI18n';
import { API_BASE_URL } from '../../utils/api';
import './TicketDetails.css';

const TicketDetails = ({ ticket, onBack, onTicketUpdate }) => {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState(ticket.satisfactionRating || 0);
  const [showFeedback, setShowFeedback] = useState(ticket.satisfactionRating ? false : false);

  const handleAddMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/support/${ticket._id}/messages`,
        { content: message },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );

      if (response.data.success) {
        onTicketUpdate(response.data.ticket);
        setMessage('');
      }
    } catch (error) {
      console.error('Error adding message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (satisfactionRating === 0) return;

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
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="ticket-details-container">
      <button className="btn btn-back" onClick={onBack}>
        ← {t('common.back', 'Back')}
      </button>

      <div className="ticket-details-header">
        <div>
          <h2>{ticket.subject}</h2>
          <p className="ticket-number">{ticket.ticketNumber}</p>
        </div>

        <div className="ticket-status">
          <span className={`status-badge ${getStatusColor(ticket.status)}`}>
            {ticket.status.toUpperCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="ticket-info-grid">
        <div className="info-item">
          <label>{t('support.category', 'Category')}</label>
          <p>{ticket.category}</p>
        </div>

        <div className="info-item">
          <label>{t('support.priority', 'Priority')}</label>
          <p>{ticket.priority.toUpperCase()}</p>
        </div>

        <div className="info-item">
          <label>{t('support.module', 'Module')}</label>
          <p>{ticket.module}</p>
        </div>

        <div className="info-item">
          <label>{t('common.createdAt', 'Created')}</label>
          <p>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <div className="ticket-description-section">
        <h3>{t('common.description', 'Description')}</h3>
        <p>{ticket.description}</p>
      </div>

      <div className="ticket-messages-section">
        <h3>{t('support.conversation', 'Conversation')}</h3>

        <div className="messages-container">
          {ticket.messages?.map((msg, index) => (
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
                  {new Date(msg.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="message-content">{msg.content}</p>
            </div>
          ))}
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !message.trim()}
          >
            {loading ? t('common.sending', 'Sending...') : t('support.sendMessage', 'Send Message')}
          </button>
        </form>
      )}

      {ticket.status === 'resolved' && !ticket.satisfactionRating && (
        <div className="feedback-section">
          <h3>{t('support.feedbackTitle', 'How would you rate our support?')}</h3>

          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
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
