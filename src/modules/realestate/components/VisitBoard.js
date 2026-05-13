import React from "react";
import { formatDateTime } from "../realEstateUtils";

const VisitBoard = ({ visitBoard, onStatusUpdate, loading }) => (
  <section className="realestate-surface-card">
    <div className="realestate-section-heading">
      <h2>Visit schedule</h2>
      <p>Track scheduled visits, confirm attendance, and avoid overlapping slots.</p>
    </div>
    <div className="realestate-lead-list">
      {visitBoard.length ? (
        visitBoard.map((visit) => (
          <div key={`${visit.propertyId}-${visit.id}`} className="realestate-lead-item">
            <strong>{visit.buyerName}</strong>
            <span>{visit.propertyTitle}</span>
            <span>{formatDateTime(visit.scheduledAt)} / {visit.mode} / {visit.status}</span>
            <div className="realestate-inline-actions">
              {visit.status === "scheduled" ? (
                <button
                  type="button"
                  className="realestate-inline-button"
                  onClick={() => onStatusUpdate(visit.propertyId, visit.id, "confirmed")}
                  disabled={loading}
                >
                  Confirm visit
                </button>
              ) : null}
              {visit.status === "confirmed" ? (
                <button
                  type="button"
                  className="realestate-inline-button"
                  onClick={() => onStatusUpdate(visit.propertyId, visit.id, "completed")}
                  disabled={loading}
                >
                  Mark completed
                </button>
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <div className="realestate-lead-item">
          <strong>No visits booked yet</strong>
          <span>New buyer visit requests will appear here with their next reminder.</span>
        </div>
      )}
    </div>
  </section>
);

export default VisitBoard;

