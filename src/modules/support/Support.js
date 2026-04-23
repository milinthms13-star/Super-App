import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useI18n from '../../hooks/useI18n';
import { API_BASE_URL } from '../../utils/api';
import './Support.css';
import CreateTicket from './CreateTicket';
import TicketList from './TicketList';
import TicketDetails from './TicketDetails';

const Support = () => {
  const { t } = useI18n();
  const [view, setView] = useState('list'); // 'list', 'create', 'details'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    module: '',
    page: 1,
    limit: 10,
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.module) params.append('module', filters.module);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`${API_BASE_URL}/support/my-tickets?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (ticketData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/support/create`, ticketData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.data.success) {
        setView('list');
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  };

  const handleSelectTicket = async (ticketId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/support/${ticketId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.data.success) {
        setSelectedTicket(response.data.ticket);
        setView('details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
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

      {view === 'list' && (
        <>
          <button className="btn btn-primary" onClick={() => setView('create')}>
            {t('support.newTicket', 'Create New Ticket')}
          </button>

          <div className="support-filters">
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
              onChange={(e) => setFilters({ ...filters, module: e.target.value, page: 1 })}
              className="filter-select"
            >
              <option value="">{t('common.allModules', 'All Modules')}</option>
              <option value="ecommerce">GlobeMart</option>
              <option value="messaging">LinkUp</option>
              <option value="classifieds">TradePost</option>
              <option value="realestate">HomeSphere</option>
              <option value="fooddelivery">Feastly</option>
              <option value="localmarket">Local Market</option>
              <option value="ridesharing">SwiftRide</option>
              <option value="general">{t('common.general', 'General')}</option>
            </select>
          </div>

          <TicketList
            tickets={tickets}
            loading={loading}
            onSelectTicket={handleSelectTicket}
          />
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
