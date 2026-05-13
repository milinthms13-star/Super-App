import React from "react";

const AdminPanel = ({
  canManageAdmin,
  adminAccessMessage,
  adminQueues,
  onVendorUpdate,
  onPackageUpdate,
  adminBusy,
}) => (
  <section className="tourism-section">
    <div className="tourism-section-heading">
      <h2>Admin Controls</h2>
      <p>Approve vendors, moderate packages, monitor fraud, and control refund workflows.</p>
    </div>

    {!canManageAdmin ? (
      <div className="tourism-empty-state">{adminAccessMessage}</div>
    ) : (
      <div className="tourism-workspace-grid">
        <div className="tourism-panel">
          <h3>Vendor Approval & KYC Queue</h3>
          <div className="tourism-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vendor</th>
                  <th>KYC</th>
                  <th>Approval</th>
                  <th>Risk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(adminQueues.vendorApprovalQueue || []).map((vendor) => (
                  <tr key={vendor.id}>
                    <td>{vendor.id}</td>
                    <td>{vendor.name}</td>
                    <td>{vendor.kycStatus}</td>
                    <td>{vendor.approvalStatus}</td>
                    <td>{vendor.riskFlag || "low"}</td>
                    <td>
                      <div className="tourism-inline-actions">
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() =>
                            onVendorUpdate(vendor.id, {
                              approvalStatus: "approved",
                              kycStatus: "verified",
                              riskFlag: "low",
                            })
                          }
                          disabled={adminBusy}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() =>
                            onVendorUpdate(vendor.id, {
                              approvalStatus: "rejected",
                              kycStatus: "rejected",
                              riskFlag: "high",
                            })
                          }
                          disabled={adminBusy}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tourism-panel">
          <h3>Package Approval Workflow</h3>
          <div className="tourism-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(adminQueues.packageApprovalQueue || []).map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{pkg.title}</td>
                    <td>{pkg.vendor}</td>
                    <td>{pkg.approvalStatus}</td>
                    <td>{pkg.fraudRisk || "low"}</td>
                    <td>
                      <div className="tourism-inline-actions">
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() => onPackageUpdate(pkg.id, { approvalStatus: "approved", fraudRisk: "low" })}
                          disabled={adminBusy}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() => onPackageUpdate(pkg.id, { approvalStatus: "rejected", fraudRisk: "high" })}
                          disabled={adminBusy}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tourism-panel">
          <h3>Safety, Refunds, Complaints</h3>
          <ul>
            <li>Fraud/Risk flags: {(adminQueues.riskFlags || []).length}</li>
            <li>Refund approvals pending: {(adminQueues.refundApprovalQueue || []).length}</li>
            <li>Complaints open: {(adminQueues.complaints || []).length}</li>
            <li>Complaint escalation SLA: 24 hours</li>
            <li>Tourist helpline visible at booking stage</li>
          </ul>
          <div className="tourism-admin-badges">
            <span>Featured package management enabled</span>
            <span>KYC document review workflow enabled</span>
            <span>Vendor badge linked to approved + verified</span>
          </div>
        </div>
      </div>
    )}
  </section>
);

export default AdminPanel;

