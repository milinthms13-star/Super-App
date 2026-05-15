import React, { useMemo } from "react";
import AuditLogsPanel from "./AuditLogsPanel";
import AdminMetricsPanel from "./AdminMetricsPanel";
import { buildLeadAlerts, buildLeadTimeline, deriveRepaymentInsights, getStatusLabel } from "../services/financeLifecycle";

const TrackingDashTab = ({
  trackPhone,
  setTrackPhone,
  onTrackFetch,
  trackLoadError,
  userDashboard,
  leadHistory,
  formatCurrency,
  workflowRole,
  setWorkflowRole,
  canUseConsultantWorkflow,
  canUseAdminWorkflow,
  canUseInstitutionWorkflow,
  canUseCommissionWorkflow,
  consultantId,
  setConsultantId,
  assignmentForm,
  setAssignmentForm,
  onAssignmentSubmit,
  statusForm,
  setStatusForm,
  onStatusSubmit,
  consultantDashboard,
  loadConsultantDashboard,
  adminDashboard,
  commissionForm,
  setCommissionForm,
  onCommissionSubmit,
  auditLogs,
  institutionDashboardId,
  setInstitutionDashboardId,
  institutions,
  loadInstitutionDashboard,
  institutionDashboard,
  commissionDashboard,
  dataDeletionReason,
  setDataDeletionReason,
  onDataDeletionRequest,
  workflowMessage,
}) => {
  const leadAlerts = useMemo(() => buildLeadAlerts(leadHistory || []), [leadHistory]);
  const hasOpsAccess =
    canUseConsultantWorkflow || canUseAdminWorkflow || canUseInstitutionWorkflow || canUseCommissionWorkflow;

  return (
    <section className="finance-section">
      <div className="finance-section-header">
        <h2>Application Tracking</h2>
        <p>
          {hasOpsAccess
            ? "Track customer applications and switch to operations dashboards by role."
            : "Track your application status, updates, and next action in one place."}
        </p>
      </div>

      <div className="finance-filter-row">
        <label>
          Track by Phone
          <input type="tel" value={trackPhone} onChange={(event) => setTrackPhone(event.target.value)} placeholder="10 digit phone" />
        </label>
        <button type="button" onClick={onTrackFetch}>Load User Dashboard</button>
      </div>
      {trackLoadError ? <p className="finance-error">{trackLoadError}</p> : null}

      {userDashboard ? (
        <article className="finance-panel">
          <h3>User Loan Dashboard</h3>
          <p>Total Leads: {userDashboard.totalLeads || 0}</p>
          <div className="finance-tag-row">
            {Object.entries(userDashboard.statusCounts || {}).map(([status, count]) => (
              <span key={status}>{getStatusLabel(status)}: {count}</span>
            ))}
          </div>
          <ul className="finance-list">
            {(leadHistory || []).map((lead) => (
              <li key={lead.leadId || lead._id}>
                <strong>{lead.leadId || lead._id || "Lead"}</strong> | {lead.loanCategory} | {formatCurrency(lead.amount)} | {getStatusLabel(lead.status)}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {leadAlerts.length > 0 ? (
        <article className="finance-panel">
          <h3>Notifications & Reminders</h3>
          <ul className="finance-list">
            {leadAlerts.map((alert) => (
              <li key={alert.id} className={`finance-alert finance-alert-${alert.severity}`}>
                <strong>{alert.title}</strong>: {alert.message}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {(leadHistory || []).length > 0 ? (
        <article className="finance-panel">
          <h3>Lead Lifecycle Timeline</h3>
          <div className="finance-lifecycle-grid">
            {leadHistory.map((lead) => {
              const timeline = buildLeadTimeline(lead);
              const repaymentInsights = deriveRepaymentInsights(lead);

              return (
                <details key={`timeline-${lead.leadId || lead._id}`} className="finance-card" open={lead.status === "disbursed"}>
                  <summary className="finance-card-summary">
                    <span>{lead.leadId || lead._id || "Lead"}</span>
                    <span className="finance-verified">{getStatusLabel(lead.status)}</span>
                  </summary>
                  <p><strong>Category:</strong> {lead.loanCategory}</p>
                  <p><strong>Callback:</strong> {lead.callbackWindow || "Not specified"}</p>
                  <ol className="finance-timeline-list">
                    {timeline.map((item) => (
                      <li key={item.key}>
                        <strong>{item.statusLabel}</strong> ({item.changedAtLabel})
                        {item.note ? <p>{item.note}</p> : null}
                      </li>
                    ))}
                  </ol>

                  {repaymentInsights ? (
                    <div className="finance-result">
                      <p><strong>Disbursed On:</strong> {repaymentInsights.disbursedAtLabel}</p>
                      <p><strong>Next EMI Due (est.):</strong> {repaymentInsights.nextDueDateLabel}</p>
                      <ul className="finance-list">
                        {repaymentInsights.checklist.map((item) => (
                          <li key={`${lead.leadId || lead._id}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </details>
              );
            })}
          </div>
        </article>
      ) : null}

      {hasOpsAccess ? (
        <div className="finance-chip-row">
          <button type="button" onClick={() => setWorkflowRole("user")}>User</button>
          {canUseConsultantWorkflow ? <button type="button" onClick={() => setWorkflowRole("consultant")}>Consultant</button> : null}
          {canUseAdminWorkflow ? <button type="button" onClick={() => setWorkflowRole("admin")}>Admin</button> : null}
          {canUseInstitutionWorkflow ? <button type="button" onClick={() => setWorkflowRole("institution")}>Institution</button> : null}
          {canUseCommissionWorkflow ? <button type="button" onClick={() => setWorkflowRole("commission")}>Commission</button> : null}
        </div>
      ) : null}

      {workflowRole === "consultant" && canUseConsultantWorkflow ? (
        <article className="finance-panel">
          <h3>Consultant Dashboard</h3>
          <div className="finance-filter-row">
            <label>
              Consultant ID
              <input
                type="text"
                value={consultantId}
                onChange={(event) => {
                  setConsultantId(event.target.value);
                  setAssignmentForm((current) => ({ ...current, consultantId: event.target.value }));
                }}
              />
            </label>
            <button type="button" onClick={loadConsultantDashboard}>Load Consultant Dashboard</button>
          </div>

          <form className="finance-form" onSubmit={onAssignmentSubmit}>
            <h4>Assign Consultant to Lead</h4>
            <label>
              Lead ID
              <input type="text" value={assignmentForm.leadId} onChange={(event) => setAssignmentForm((current) => ({ ...current, leadId: event.target.value }))} />
            </label>
            <label>
              Consultant Name
              <input type="text" value={assignmentForm.consultantName} onChange={(event) => setAssignmentForm((current) => ({ ...current, consultantName: event.target.value }))} />
            </label>
            <label>
              Consultant Phone
              <input type="tel" value={assignmentForm.consultantPhone} onChange={(event) => setAssignmentForm((current) => ({ ...current, consultantPhone: event.target.value }))} />
            </label>
            <button type="submit">Assign</button>
          </form>

          <form className="finance-form" onSubmit={onStatusSubmit}>
            <h4>Update Lead Status</h4>
            <label>
              Lead ID
              <input type="text" value={statusForm.leadId} onChange={(event) => setStatusForm((current) => ({ ...current, leadId: event.target.value }))} />
            </label>
            <label>
              Status
              <select value={statusForm.status} onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="documents_pending">Documents Pending</option>
                <option value="consultant_assigned">Consultant Assigned</option>
                <option value="in_review">In Review</option>
                <option value="submitted_to_institution">Submitted to Institution</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="disbursed">Disbursed</option>
              </select>
            </label>
            <label>
              Note
              <input type="text" value={statusForm.note} onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))} />
            </label>
            <button type="submit">Update Status</button>
          </form>

          {consultantDashboard ? (
            <div className="finance-result">
              <p>Assigned Leads: {consultantDashboard.assignedLeads || 0}</p>
              <div className="finance-tag-row">
                {Object.entries(consultantDashboard.statusCounts || {}).map(([status, count]) => (
                  <span key={status}>{getStatusLabel(status)}: {count}</span>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ) : null}

      {workflowRole === "admin" && canUseAdminWorkflow ? (
        <article className="finance-panel">
          <h3>Admin Lead Management</h3>
          <AdminMetricsPanel
            adminDashboard={adminDashboard}
            commissionDashboard={commissionDashboard}
            formatCurrency={formatCurrency}
          />

          <form className="finance-form" onSubmit={onCommissionSubmit}>
            <h4>Update Commission</h4>
            <label>
              Lead ID
              <input type="text" value={commissionForm.leadId} onChange={(event) => setCommissionForm((current) => ({ ...current, leadId: event.target.value }))} />
            </label>
            <label>
              Actual Amount
              <input type="number" value={commissionForm.actualAmount} onChange={(event) => setCommissionForm((current) => ({ ...current, actualAmount: event.target.value }))} />
            </label>
            <label>
              Status
              <select value={commissionForm.status} onChange={(event) => setCommissionForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="pending">Pending</option>
                <option value="eligible">Eligible</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <button type="submit">Save Commission</button>
          </form>

          <AuditLogsPanel logs={auditLogs} />
        </article>
      ) : null}

      {workflowRole === "institution" && canUseInstitutionWorkflow ? (
        <article className="finance-panel">
          <h3>Institution Dashboard</h3>
          <div className="finance-filter-row">
            <label>
              Institution
              <select value={institutionDashboardId} onChange={(event) => setInstitutionDashboardId(event.target.value)}>
                <option value="">Select institution</option>
                {institutions.map((institution) => (
                  <option key={institution._id} value={institution._id}>{institution.name}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={loadInstitutionDashboard}>Load Institution Dashboard</button>
          </div>

          {institutionDashboard ? (
            <div className="finance-result">
              <p>Total Leads: {institutionDashboard.totalLeads || 0}</p>
              <p>Approved: {institutionDashboard.approvedCount || 0}</p>
              <p>Conversion Rate: {institutionDashboard.conversionRate || 0}%</p>
            </div>
          ) : null}
        </article>
      ) : null}

      {workflowRole === "commission" && canUseCommissionWorkflow ? (
        <article className="finance-panel">
          <h3>Commission Dashboard</h3>
          <p>
            Expected: {formatCurrency(commissionDashboard?.totals?.expected || 0)} | Actual: {formatCurrency(commissionDashboard?.totals?.actual || 0)} | Paid: {formatCurrency(commissionDashboard?.totals?.paid || 0)}
          </p>
          <ul className="finance-list">
            {(commissionDashboard?.byInstitution || []).map((row) => (
              <li key={row.institutionName}>
                {row.institutionName}: Leads {row.leadCount}, Expected {formatCurrency(row.expected)}, Paid {formatCurrency(row.paid)}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="finance-panel">
        <h3>Data Deletion Request</h3>
        <p className="finance-muted">For compliance and privacy rights under data protection norms.</p>
        <label>
          Reason
          <textarea rows={2} value={dataDeletionReason} onChange={(event) => setDataDeletionReason(event.target.value)} />
        </label>
        <button type="button" onClick={onDataDeletionRequest}>Submit Data Deletion Request</button>
      </article>

      {workflowMessage ? <p className="finance-status">{workflowMessage}</p> : null}
    </section>
  );
};

export default TrackingDashTab;
