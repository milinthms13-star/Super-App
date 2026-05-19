import React from "react";

const statusLabelMap = {
  lead_received: "Lead Received",
  documents_pending: "Pending Docs",
  consultant_assigned: "Consultant Assigned",
  in_review: "In Review",
  submitted_to_institution: "Submitted to Institution",
  approved: "Approved",
  rejected: "Rejected",
  disbursed: "Disbursed",
};

const getLeadPriority = (lead = {}) => {
  const amount = Number(lead.amount || 0);
  const cibil = Number(lead.eligibilitySnapshot?.cibilScore || 0);
  const status = String(lead.status || "");
  const docsUploaded = Array.isArray(lead.documents) && lead.documents.length > 0;

  if (status === "approved" || status === "submitted_to_institution") {
    return { key: "disbursal", label: "Disbursal Ready" };
  }
  if (status === "documents_pending" || !docsUploaded) {
    return { key: "pending", label: "Pending Docs" };
  }
  if (amount >= 500000 && cibil >= 700) {
    return { key: "hot", label: "Hot Lead" };
  }
  return { key: "callback", label: "Callback Today" };
};

const AdminMetricsPanel = ({ adminDashboard, commissionDashboard, formatCurrency }) => {
  const recentLeads = Array.isArray(adminDashboard?.recentLeads) ? adminDashboard.recentLeads : [];

  return (
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

      {recentLeads.length > 0 ? (
        <div className="finance-priority-list">
          <h4>Lead Priority Queue</h4>
          <ul className="finance-list">
            {recentLeads.slice(0, 8).map((lead) => {
              const priority = getLeadPriority(lead);
              return (
                <li key={lead.leadId || lead._id}>
                  <span className={`finance-lead-priority ${priority.key}`}>{priority.label}</span>
                  <strong>{lead.leadId || lead._id || "Lead"}</strong> | {lead.loanCategory} | {formatCurrency(lead.amount || 0)} | {statusLabelMap[lead.status] || lead.status || "Unknown"}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
};

export default AdminMetricsPanel;
