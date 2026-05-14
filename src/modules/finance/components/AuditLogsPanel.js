import React from "react";

const AuditLogsPanel = ({ logs = [] }) => (
  <>
    <h4>Admin Audit Log</h4>
    {logs.length === 0 ? (
      <p className="finance-muted">No audit activity found yet.</p>
    ) : (
      <ul className="finance-list">
        {logs.map((log) => (
          <li key={log._id || `${log.actionType}-${log.timestamp || log.createdAt}`}>
            {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString()} | {log.actionType || "-"} | {log.leadId || "-"}
          </li>
        ))}
      </ul>
    )}
  </>
);

export default AuditLogsPanel;
