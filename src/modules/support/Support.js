import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import useI18n from '../../hooks/useI18n';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import './Support.css';
import CreateTicket from './CreateTicket';
import TicketList from './TicketList';
import TicketDetails from './TicketDetails';
import SupportAdmin from './SupportAdmin';
import { CATEGORY_OPTIONS_BY_MODULE, SUPPORT_MODULE_OPTIONS, SUPPORT_PAGE_SIZE_OPTIONS } from './supportConstants';

const Support = () => {
  const { t } = useI18n();
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.registrationType === 'admin';

  const [view, setView] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    module: '',
    category: '',
    query: '',
    page: 1,
    limit: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [adminView, setAdminView] = useState('my');

  const categoryOptions = useMemo(() => {
    if (filters.module) {
      return CATEGORY_OPTIONS_BY_MODULE[filters.module] || [];
    }
    const allCategories = Object.values(CATEGORY_OPTIONS_BY_MODULE).flat();
    const unique = Array.from(new Map(allCategories.map((item) => [item.value, item])).values());
    return unique;
  }, [filters.module]);

  const pageCount = Math.max(1, Math.ceil(totalCount / filters.limit));

  const pushToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.module) params.append('module', filters.module);
      if (filters.category) params.append('category', filters.category);
      if (filters.query) params.append('query', filters.query);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`${API_BASE_URL}/support/my-tickets?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.data.success) {
        setTickets(response.data.tickets || []);
        setTotalCount(response.data.totalCount ?? response.data.count ?? (response.data.tickets || []).length);
      } else {
        setError(response.data.message || t('support.errors.fetchFailed', 'Unable to load tickets.'));
      }
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || t('support.errors.fetchFailed', 'Unable to load tickets.'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (ticketData) => {
    setError('');
    try {
      const isFormData = ticketData instanceof FormData;
      const response = await axios.post(`${API_BASE_URL}/support/create`, ticketData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {}),
        },
      });

      if (response.data.success) {
        setView('list');
        setFilters((prev) => ({ ...prev, page: 1 }));
        fetchTickets();
        pushToast(t('support.ticketCreated', 'Ticket created successfully.'), 'success');
      } else {
        throw new Error(response.data.message || 'Failed to create ticket');
      }
    } catch (createError) {
      const message = createError.response?.data?.message || createError.message || t('support.errors.createFailed', 'Failed to create ticket');
      setError(message);
      pushToast(message, 'error');
      throw createError;
    }
  };

  const handleSelectTicket = async (ticketId) => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/support/${ticketId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.data.success) {
        setSelectedTicket(response.data.ticket);
        setView('details');
      } else {
        setError(response.data.message || t('support.errors.detailFetchFailed', 'Unable to load ticket details.'));
      }
    } catch (detailError) {
      setError(detailError.response?.data?.message || t('support.errors.detailFetchFailed', 'Unable to load ticket details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedTicket(null);
    fetchTickets();
  };

  return (
    <div className="support-container">
      <div className="support-header">
        <h1>{t('support.title', 'Customer Support')}</h1>
        <p>{t('support.subtitle', 'Get help with your issues across all modules')}</p>
      </div>

      {toast && (
        <div className={`toast-banner toast-${toast.type}`}>{toast.message}</div>
      )}

      {isAdmin && (
        <div className="support-admin-toggle">
          <button
            type="button"
            className={`btn ${adminView === 'my' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAdminView('my')}
          >
            {t('support.myTickets', 'My Tickets')}
          </button>
          <button
            type="button"
            className={`btn ${adminView === 'admin' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAdminView('admin')}
          >
            {t('support.adminPanel', 'Admin Panel')}
          </button>
        </div>
      )}

      {isAdmin && adminView === 'admin' ? (
        <SupportAdmin currentUser={currentUser} />
      ) : (
        <>
          <div className="support-action-row">
            <button className="btn btn-primary support-create-mobile" onClick={() => setView('create')}>
              {t('support.newTicket', 'Create New Ticket')}
            </button>

            <div className="support-filters">
              <input
                type="search"
                className="filter-input"
                value={filters.query}
                placeholder={t('support.searchPlaceholder', 'Search ticket number, subject')}
                onChange={(e) => setFilters({ ...filters, query: e.target.value, page: 1 })}
              />

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="filter-select"
              >
                <option value="">{t('common.allStatuses', 'All Statuses')}</option>
                <option value="open">{t('support.status.open', 'Open')}</option>
                <option value="in_progress">{t('support.status.inProgress', 'In Progress')}</option>
                <option value="awaiting_user">{t('support.status.awaitingUser', 'Awaiting Your Response')}</option>
                <option value="resolved">{t('support.status.resolved', 'Resolved')}</option>
                <option value="closed">{t('support.status.closed', 'Closed')}</option>
              </select>

              <select
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value, category: '', page: 1 })}
                className="filter-select"
              >
                <option value="">{t('common.allModules', 'All Modules')}</option>
                {SUPPORT_MODULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
                className="filter-select"
              >
                <option value="">{t('support.allCategories', 'All Categories')}</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <TicketList
            tickets={tickets}
            loading={loading}
            onSelectTicket={handleSelectTicket}
            onCreateClick={() => setView('create')}
          />

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
                  <option key={size} value={size}>
                    {size} {t('support.rowsPerPage', 'rows per page')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {view === 'create' && (
        <CreateTicket
          onCancel={() => setView('list')}
          onSubmit={handleCreateTicket}
        />
      )}

      {view === 'details' && selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onBack={handleBackToList}
          onTicketUpdate={setSelectedTicket}
        />
      )}
    </div>
  );
};

export default Support;
