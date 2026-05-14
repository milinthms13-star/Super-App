import React from "react";

const AdminMetricsPanel = ({ adminDashboard, commissionDashboard, formatCurrency }) => (
  <>
    <div className="finance-tag-row">
      <span>Total Leads: {adminDashboard?.metrics?.totalLeads || 0}</span>
      <span>Open Leads: {adminDashboard?.metrics?.openLeads || 0}</span>
      <span>Disbursed: {adminDashboard?.metrics?.disbursedLeads || 0}</span>
      <span>Deletion Requests: {adminDashboard?.metrics?.pendingDeletionRequests || 0}</span>
    </div>

    <p>
      Expected: {formatCurrency(commissionDashboard?.totals?.expected || 0)} | Actual: {formatCurrency(commissionDashboard?.totals?.actual || 0)} | Paid: {formatCurrency(commissionDashboard?.totals?.paid || 0)}
    </p>
  </>
);

export default AdminMetricsPanel;
