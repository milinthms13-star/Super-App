import React from "react";
import { LEAD_STATUS_OPTIONS } from "../tourismData";

const VendorPanel = ({
  canManageVendor,
  vendorAccessMessage,
  vendorPackages,
  vendorLeads,
  vendorDraft,
  setVendorDraft,
  onCreatePackage,
  onUpdatePackage,
  onDeletePackage,
  onLeadStatusUpdate,
  vendorBusy,
}) => (
  <section className="tourism-section">
    <div className="tourism-section-heading">
      <h2>Vendor Workspace</h2>
      <p>Manage packages, availability calendar, leads, KYC, and commission tracking.</p>
    </div>

    {!canManageVendor ? (
      <div className="tourism-empty-state">{vendorAccessMessage}</div>
    ) : (
      <div className="tourism-workspace-grid">
        <div className="tourism-panel">
          <h3>Add / Edit Package</h3>
          <div className="tourism-custom-form">
            <label className="tourism-field">
              <span>Package title</span>
              <input value={vendorDraft.title} onChange={(event) => setVendorDraft((state) => ({ ...state, title: event.target.value }))} />
            </label>
            <label className="tourism-field">
              <span>Destination</span>
              <input value={vendorDraft.destination} onChange={(event) => setVendorDraft((state) => ({ ...state, destination: event.target.value }))} />
            </label>
            <label className="tourism-field">
              <span>Category</span>
              <input value={vendorDraft.category} onChange={(event) => setVendorDraft((state) => ({ ...state, category: event.target.value }))} />
            </label>
            <label className="tourism-field">
              <span>Duration (days)</span>
              <input type="number" min="1" max="20" value={vendorDraft.durationDays} onChange={(event) => setVendorDraft((state) => ({ ...state, durationDays: Number(event.target.value) }))} />
            </label>
            <label className="tourism-field">
              <span>Base price</span>
              <input type="number" min="1000" value={vendorDraft.startPrice} onChange={(event) => setVendorDraft((state) => ({ ...state, startPrice: Number(event.target.value) }))} />
            </label>
            <label className="tourism-field">
              <span>Image URLs (one per line)</span>
              <textarea rows="3" value={vendorDraft.imageGalleryText} onChange={(event) => setVendorDraft((state) => ({ ...state, imageGalleryText: event.target.value }))} />
            </label>
            <label className="tourism-field">
              <span>Available dates (comma separated)</span>
              <input value={vendorDraft.availableDatesText} onChange={(event) => setVendorDraft((state) => ({ ...state, availableDatesText: event.target.value }))} />
            </label>
            <label className="tourism-field">
              <span>Seasonal pricing (JSON)</span>
              <textarea rows="3" value={vendorDraft.seasonalPricingText} onChange={(event) => setVendorDraft((state) => ({ ...state, seasonalPricingText: event.target.value }))} />
            </label>
            <div className="tourism-inline-actions">
              <button type="button" className="tourism-primary-button" onClick={onCreatePackage} disabled={vendorBusy}>
                {vendorBusy ? "Saving..." : "Add New Package"}
              </button>
            </div>
          </div>

          <h4>Current Packages</h4>
          <div className="tourism-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Destination</th>
                  <th>Price</th>
                  <th>Approval</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorPackages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{pkg.title}</td>
                    <td>{pkg.destination}</td>
                    <td>INR {Number(pkg.startPrice || 0).toLocaleString("en-IN")}</td>
                    <td>{pkg.approvalStatus}</td>
                    <td>
                      <div className="tourism-inline-actions">
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() => onUpdatePackage(pkg)}
                          disabled={vendorBusy}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() => onDeletePackage(pkg.id)}
                          disabled={vendorBusy}
                        >
                          Delete
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
          <h3>Lead Management</h3>
          <div className="tourism-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Package</th>
                  <th>Traveler</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vendorLeads.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.packageTitle || row.packageId}</td>
                    <td>{row.travelerName}</td>
                    <td>INR {Number(row.budget || 0).toLocaleString("en-IN")}</td>
                    <td>{row.status}</td>
                    <td>
                      <select
                        value={row.status}
                        onChange={(event) => onLeadStatusUpdate(row.id, event.target.value)}
                        disabled={vendorBusy}
                      >
                        {LEAD_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tourism-card-meta">
            Commission report: 8% default commission on confirmed/paid bookings with seasonal pricing enabled.
          </p>
        </div>
      </div>
    )}
  </section>
);

export default VendorPanel;

