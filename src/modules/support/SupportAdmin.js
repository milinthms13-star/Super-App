import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useI18n from '../../hooks/useI18n';
import { API_BASE_URL } from '../../utils/api';
import TicketDetails from './TicketDetails';
import { ADMIN_STATUS_OPTIONS, AGENT_OPTIONS, CANNED_REPLIES, SUPPORT_PAGE_SIZE_OPTIONS } from './supportConstants';
import './Support.css';

const SupportAdmin = ({ currentUser }) => {
  const { t } = useI18n();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ query: '', status: '', page: 1, limit: 10 });
  const [totalCount, setTotalCount] = useState(0);

  const pushToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAdminTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.query) params.append('query', filters.query);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`${API_BASE_URL}/support/admin/tickets?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.data.success) {
        setTickets(response.data.tickets || []);
        setTotalCount(response.data.totalCount ?? response.data.count ?? (response.data.tickets || []).length);
      } else {
        setError(response.data.message || t('support.errors.fetchFailed', 'Unable to load admin tickets.'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('support.errors.fetchFailed', 'Unable to load admin tickets.'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    fetchAdminTickets();
  }, [fetchAdminTickets]);

  const updateTicket = async (ticketId, payload, successMessage) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.patch(`${API_BASE_URL}/support/admin/tickets/${ticketId}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (response.data.success) {
        if (selectedTicket?._id === ticketId) {
          setSelectedTicket(response.data.ticket);
        }
        setTickets((current) => current.map((ticket) => (ticket._id === ticketId ? response.data.ticket : ticket)));
        pushToast(successMessage, 'success');
      } else {
        setError(response.data.message || t('support.errors.updateFailed', 'Unable to update ticket.'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('support.errors.updateFailed', 'Unable to update ticket.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = (ticketId, value) => {
    updateTicket(ticketId, { assignedAgent: value }, t('support.agentAssigned', 'Agent assigned successfully.'));
  };

  const handleChangeStatus = (ticketId, value) => {
    updateTicket(ticketId, { status: value }, t('support.statusUpdated', 'Ticket status updated.'));
  };

  const handleSendCannedReply = (ticketId, message) => {
    updateTicket(ticketId, { cannedReply: message }, t('support.replySent', 'Reply sent successfully.'));
  };

  const handleEscalationQueue = (ticketId) => {
    updateTicket(ticketId, { escalated: true }, t('support.escalatedTicket', 'Ticket moved to escalation queue.'));
  };

  const handleRefundQueue = (ticketId) => {
    updateTicket(ticketId, { refundReview: true }, t('support.refundQueueAdded', 'Ticket added to refund queue.'));
  };

  const handleBack = () => setSelectedTicket(null);

  const pageCount = Math.max(1, Math.ceil(totalCount / filters.limit));

  return (
    <div className="support-admin-panel">
      <div className="support-action-row">
        <div className="support-filters">
          <input
            type="search"
            className="filter-input"
            value={filters.query}
            placeholder={t('support.searchTickets', 'Search tickets')}
            onChange={(e) => setFilters({ ...filters, query: e.target.value, page: 1 })}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="filter-select"
          >
            <option value="">{t('common.allStatuses', 'All Statuses')}</option>
            {ADMIN_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {toast && <div className={`toast-banner toast-${toast.type}`}>{toast.message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="support-admin-grid">
        <div className="support-admin-list">
          <div className="ticket-list">
            {loading && tickets.length === 0 ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="ticket-item ticket-card-skeleton">
                  <div className="skeleton header-skeleton" />
                  <div className="skeleton meta-skeleton" />
                </div>
              ))
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <h3>{t('support.noAdminTickets', 'No tickets in admin queue')}</h3>
                <p>{t('support.noAdminTicketsDesc', 'Refresh or adjust filters to view more tickets.')}</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket._id} className="ticket-item admin-ticket-item">
                  <div className="ticket-header">
                    <div className="ticket-number-subject">
                      <span className="ticket-number">{ticket.ticketNumber}</span>
                      <h3>{ticket.subject}</h3>
                    </div>
                  </div>
                  <div className="ticket-meta admin-meta">
                    <span>{ticket.module}</span>
                    <span>{ticket.category}</span>
                    <span>{ticket.status}</span>
                  </div>
                  <div className="admin-actions-row">
                    <select value={ticket.assignedAgent || ''} onChange={(e) => handleAssignAgent(ticket._id, e.target.value)}>
                      {AGENT_OPTIONS.map((agent) => (
                        <option key={agent.value} value={agent.value}>{agent.label}</option>
                      ))}
                    </select>
                    <select value={ticket.status} onChange={(e) => handleChangeStatus(ticket._id, e.target.value)}>
                      {ADMIN_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary" type="button" onClick={() => setSelectedTicket(ticket)}>
                      {t('support.viewDetails', 'View')}
                    </button>
                  </div>
                  <div className="admin-quick-actions">
                    {CANNED_REPLIES.slice(0, 2).map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleSendCannedReply(ticket._id, reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="support-pagination">
            <div className="pagination-info">
              <span>{t('support.totalTickets', 'Total tickets')}: {totalCount}</span>
              <span>{t('support.pageNumber', 'Page')} {filters.page} / {pageCount}</span>
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={filters.page <= 1}
              >
                {t('support.previous', 'Previous')}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(pageCount, prev.page + 1) }))}
                disabled={filters.page >= pageCount}
              >
                {t('support.next', 'Next')}
              </button>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
                className="filter-select"
              >
                {SUPPORT_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} {t('support.rowsPerPage', 'rows per page')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="support-admin-detail-panel">
          {selectedTicket ? (
            <>
              <button type="button" className="btn btn-back" onClick={handleBack}>
                ← {t('common.back', 'Back')}
              </button>
              <TicketDetails ticket={selectedTicket} onBack={handleBack} onTicketUpdate={setSelectedTicket} />
              <div className="admin-panel-actions">
                <button type="button" className="btn btn-primary" onClick={() => handleEscalationQueue(selectedTicket._id)}>
                  {t('support.escalateQueue', 'Escalation Queue')}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => handleRefundQueue(selectedTicket._id)}>
                  {t('support.refundQueue', 'Refund Queue')}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state admin-empty">
              <h3>{t('support.selectTicketAdmin', 'Select a ticket for admin actions')}</h3>
              <p>{t('support.selectTicketAdminDesc', 'Choose a ticket from the list to view details, assign agent, or escalate.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportAdmin;
