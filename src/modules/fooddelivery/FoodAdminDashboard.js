import React, { useCallback, useEffect, useState } from 'react';
import foodDeliveryService from '../../services/foodDeliveryService';

const formatTimestamp = (value) => {
  if (!value) {
    return 'just now';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'just now' : date.toLocaleString('en-IN');
};

const FoodAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchAdminData = useCallback(async (filters = {}) => {
    try {
      const [dashboardData, orderData, auditEntries] = await Promise.all([
        foodDeliveryService.getAdminDashboard(),
        foodDeliveryService.getAdminOrders({
          status: filters.status ?? statusFilter,
          unassignedOnly: (filters.unassignedOnly ?? showUnassignedOnly) ? 'true' : 'false',
        }),
        foodDeliveryService.getAdminAuditLog({
          limit: 20,
        }),
      ]);

      setDashboard(dashboardData);
      setOrders(orderData);
      setAuditLog(auditEntries);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to load admin food delivery data.');
    }
  }, [showUnassignedOnly, statusFilter]);

  useEffect(() => {
    const run = async () => {
      await fetchAdminData();
    };

    run();
  }, [fetchAdminData]);

  const handleDisputeStatus = async (orderId, disputeId, nextStatus) => {
    try {
      await foodDeliveryService.updateDispute(orderId, disputeId, {
        status: nextStatus,
        resolutionNote: `Status moved to ${nextStatus}`,
      });
      setStatusMessage(`Dispute ${disputeId} moved to ${nextStatus}.`);
      await fetchAdminData();
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update dispute.');
    }
  };

  return (
    <div className="restaurant-dashboard">
      <h2>Food Admin Operations</h2>

      <div className="fd-controls">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          <option value="placed">Placed</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="out-for-delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={showUnassignedOnly}
            onChange={(event) => setShowUnassignedOnly(event.target.checked)}
          />
          Unassigned only
        </label>
        <button onClick={() => fetchAdminData()}>Refresh</button>
      </div>

      {statusMessage && <p>{statusMessage}</p>}

      <div className="orders-list">
        <h3>Admin Analytics</h3>
        {dashboard ? (
          <>
            <div className="order-item">
              <span>Total orders: {dashboard.totalOrders}</span>
              <span>Active: {dashboard.activeOrders}</span>
              <span>Unassigned: {dashboard.unassignedOrders}</span>
              <span>Open disputes: {dashboard.openDisputes}</span>
              <span>Online riders: {dashboard.onlineRiders}</span>
              <span>Active SOS: {dashboard.activeRiderSos || 0}</span>
            </div>
            <div className="order-item">
              <span>
                Staffed restaurants: {dashboard.governanceSummary?.restaurantsWithGovernance || 0}
              </span>
              <span>Active team members: {dashboard.governanceSummary?.activeTeamMembers || 0}</span>
              <span>
                Governance events (24h): {dashboard.governanceSummary?.governanceEventsLast24Hours || 0}
              </span>
            </div>
          </>
        ) : (
          <p>Loading admin analytics...</p>
        )}
      </div>

      <div className="orders-list">
        <h3>Restaurant Governance</h3>
        {auditLog.length === 0 && <p>No governance events recorded yet.</p>}
        {auditLog.slice(0, 8).map((entry) => (
          <div key={entry.id} className="order-item">
            <span>{entry.summary}</span>
            <span>{entry.source}</span>
            <span>{entry.performedByName || entry.performedByRole || 'system'}</span>
            <span>{formatTimestamp(entry.timestamp)}</span>
          </div>
        ))}
      </div>

      <div className="orders-list">
        <h3>Disputes and Feedback</h3>
        {orders.length === 0 && <p>No food delivery orders match the current filter.</p>}
        {orders.map((order) => (
          <div key={order.id} className="order-item">
            <span>Order {order.id}</span>
            <span>Status: {order.status}</span>
            <span>Rider: {order.driverProfile?.name || 'Unassigned'}</span>
            <span>Disputes: {order.activeDisputeCount || 0}</span>
            {order.riderSafety?.activeSos && <span>Rider SOS active</span>}
            {Array.isArray(order.disputes) &&
              order.disputes.map((dispute) => (
                <div key={dispute.id}>
                  <strong>{dispute.issueType}</strong> - {dispute.status}
                  <button onClick={() => handleDisputeStatus(order.id, dispute.id, 'investigating')}>
                    Investigate
                  </button>
                  <button onClick={() => handleDisputeStatus(order.id, dispute.id, 'resolved')}>
                    Resolve
                  </button>
                  <button onClick={() => handleDisputeStatus(order.id, dispute.id, 'rejected')}>
                    Reject
                  </button>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoodAdminDashboard;
