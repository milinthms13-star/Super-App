import React from "react";
import { LEAD_STAGE_OPTIONS, } from "../realEstateConstants";
import { formatDateTime, mapLeadStatusLabel } from "../realEstateUtils";

const LeadBoard = ({ activeRole, leadBoard, onStageUpdate, loading }) => (
  <section className="realestate-surface-card">
    <div className="realestate-section-heading">
      <h2>Lead management</h2>
      <p>
        {activeRole === "admin"
          ? "Admins can see marketplace-wide pipeline activity."
          : "Sellers see only leads for properties they own."}
      </p>
    </div>
    <div className="realestate-lead-list">
      {leadBoard.length ? (
        leadBoard.map((lead) => (
          <div key={`${lead.propertyId}-${lead.id}`} className="realestate-lead-item">
            <strong>{lead.name}</strong>
            <span>{lead.propertyTitle}</span>
            <span>{lead.channel} / {lead.priority} / {mapLeadStatusLabel(lead.status)}</span>
            <span>
              {lead.followUpAt ? `Follow-up ${formatDateTime(lead.followUpAt)}` : "No follow-up reminder set"}
            </span>
            <div className="realestate-inline-actions">
              <button
                type="button"
                className="realestate-inline-button"
                onClick={() => onStageUpdate(lead.propertyId, lead.id, "contacted", lead.name)}
                disabled={loading}
              >
                Mark contacted
              </button>
              <label className="realestate-inline-select">
                <span className="sr-only">Lead stage</span>
                <select
                  value={lead.status}
                  onChange={(event) =>
                    onStageUpdate(lead.propertyId, lead.id, event.target.value, lead.name)
                  }
                  disabled={loading}
                  aria-label={`Lead stage for ${lead.name}`}
                >
                  {LEAD_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="realestate-inline-button"
                onClick={() =>
                  onStageUpdate(
                    lead.propertyId,
                    lead.id,
                    lead.status === "new" ? "contacted" : "site_visit",
                    lead.name
                  )
                }
                disabled={loading}
              >
                Quick advance
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="realestate-lead-item">
          <strong>No active leads yet</strong>
          <span>New enquiries will appear here as buyers contact your listings.</span>
        </div>
      )}
    </div>
  </section>
);

export default LeadBoard;
