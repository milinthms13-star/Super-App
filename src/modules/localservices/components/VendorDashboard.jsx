import React from "react";
import { InputField } from "./FormControls";

function VendorDashboard({
  vendorPhone,
  onVendorPhoneChange,
  onLoadDashboard,
  loading,
  dashboard,
  formatInr,
}) {
  return (
    <article className="local-services-panel">
      <h2>Vendor Dashboard</h2>
      <div className="local-services-form">
        <InputField label="Vendor phone">
          <input type="text" value={vendorPhone} onChange={(event) => onVendorPhoneChange(event.target.value)} />
        </InputField>
        <button type="button" onClick={onLoadDashboard} disabled={loading}>
          {loading ? "Loading..." : "Load Dashboard"}
        </button>
      </div>

      {dashboard ? (
        <div className="local-services-vendor-dashboard">
          <p>
            Vendor: <strong>{dashboard.vendor.businessName}</strong> | Status:{" "}
            {dashboard.vendor.approvalStatus}
          </p>
          <p>
            Leads: {dashboard.stats.totalLeads} | Active leads: {dashboard.stats.activeLeads}
          </p>
          <p>
            Revenue: {formatInr(dashboard.stats.totalRevenue)} | Commission due:{" "}
            {formatInr(dashboard.stats.commissionDue)}
          </p>
          <h3>Recent Leads</h3>
          <ul className="local-services-list">
            {(dashboard.leadEntries || []).slice(0, 8).map((entry) => (
              <li key={entry.id}>
                {entry.bookingCode} | {entry.eventType} | {entry.eventDate} | {entry.status}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="local-services-empty-card">
          Use vendor phone to load lead management, calendar, payment tracking, and commission view.
        </p>
      )}
    </article>
  );
}

export default VendorDashboard;
