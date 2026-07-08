import React, { useState, useEffect } from "react";
import { tourismService } from "../../../services/tourismService";

const AuditLogViewer = ({ userRole, bookings, vendorId }) => {
  const [selectedType, setSelectedType] = useState("bookings");
  const [selectedId, setSelectedId] = useState("");
  const [auditData, setAuditData] = useState(null);
  const [adminLogs, setAdminLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = userRole === "admin";
  const isVendor = ["vendor", "business", "entrepreneur"].includes(userRole);

  useEffect(() => {
    if (selectedType === "admin" && isAdmin) {
      loadAdminLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const loadAdminLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const logs = await tourismService.getAdminActionLogs({ page: 1, limit: 50 });
      setAdminLogs(logs);
    } catch (err) {
      setError("Failed to load admin logs");
      console.error("Error loading admin logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAudit = async () => {
    if (!selectedId) {
      setError("Please select an item to view audit trail");
      return;
    }

    setLoading(true);
    setError("");
    setAuditData(null);

    try {
      let data = null;

      if (selectedType === "bookings") {
        data = await tourismService.getBookingAudit(selectedId);
      } else if (selectedType === "leads") {
        data = await tourismService.getLeadAudit(selectedId);
      } else if (selectedType === "complaints") {
        data = await tourismService.getComplaintAudit(selectedId);
      }

      setAuditData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit trail");
      console.error("Error loading audit:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: "#FFA500",
      confirmed: "#2563eb",
      paid: "#10b981",
      completed: "#059669",
      cancelled: "#dc2626",
      open: "#FFA500",
      in_progress: "#2563eb",
      resolved: "#10b981",
      closed: "#6b7280",
      new: "#8b5cf6",
      contacted: "#3b82f6",
      proposal_shared: "#06b6d4",
      negotiation: "#f59e0b",
      lost: "#dc2626",
    };
    return statusColors[status?.toLowerCase()] || "#6b7280";
  };

  const renderTimeline = (history) => {
    if (!history || history.length === 0) {
      return <p className="tourism-empty-state">No history available</p>;
    }

    return (
      <div className="tourism-audit-timeline">
        {history.map((entry, index) => (
          <div key={index} className="tourism-timeline-item">
            <div
              className="tourism-timeline-dot"
              style={{ backgroundColor: getStatusColor(entry.status) }}
            ></div>
            <div className="tourism-timeline-content">
              <div className="tourism-timeline-header">
                <span
                  className="tourism-status-badge"
                  style={{
                    backgroundColor: getStatusColor(entry.status),
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  {entry.status?.toUpperCase() || "UNKNOWN"}
                </span>
                <span className="tourism-timeline-timestamp">
                  {formatTimestamp(entry.timestamp || entry.date)}
                </span>
              </div>
              <div className="tourism-timeline-details">
                {entry.updatedBy && (
                  <p className="tourism-timeline-meta">
                    <strong>Updated by:</strong> {entry.updatedBy}
                  </p>
                )}
                {entry.note && (
                  <p className="tourism-timeline-note">
                    <strong>Note:</strong> {entry.note}
                  </p>
                )}
                {entry.reason && (
                  <p className="tourism-timeline-note">
                    <strong>Reason:</strong> {entry.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEscalationTimeline = (timeline) => {
    if (!timeline || timeline.length === 0) {
      return <p className="tourism-empty-state">No escalations</p>;
    }

    return (
      <div className="tourism-audit-timeline">
        {timeline.map((entry, index) => (
          <div key={index} className="tourism-timeline-item">
            <div className="tourism-timeline-dot" style={{ backgroundColor: "#f59e0b" }}></div>
            <div className="tourism-timeline-content">
              <div className="tourism-timeline-header">
                <span
                  className="tourism-status-badge"
                  style={{
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  ESCALATION
                </span>
                <span className="tourism-timeline-timestamp">
                  {formatTimestamp(entry.timestamp || entry.date)}
                </span>
              </div>
              <div className="tourism-timeline-details">
                {entry.level && (
                  <p className="tourism-timeline-meta">
                    <strong>Level:</strong> {entry.level}
                  </p>
                )}
                {entry.action && (
                  <p className="tourism-timeline-note">
                    <strong>Action:</strong> {entry.action}
                  </p>
                )}
                {entry.note && (
                  <p className="tourism-timeline-note">
                    <strong>Note:</strong> {entry.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAdminLogs = () => {
    if (!adminLogs?.logs || adminLogs.logs.length === 0) {
      return <p className="tourism-empty-state">No admin logs available</p>;
    }

    return (
      <div className="tourism-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference</th>
              <th>Action</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
            {adminLogs.logs.map((log, index) => (
              <tr key={index}>
                <td>
                  <span className="tourism-log-type">{log.type}</span>
                </td>
                <td>{log.reference || log.id}</td>
                <td>
                  {log.type === "booking" && (
                    <span>
                      {log.changes} status change
                      {log.changes !== 1 ? "s" : ""}
                    </span>
                  )}
                  {log.type === "vendor" && (
                    <span>
                      Approval: {log.approvalStatus} | KYC: {log.kycStatus}
                    </span>
                  )}
                  {log.type === "package" && (
                    <span>
                      {log.approvalStatus}
                      {log.fraudRisk && ` | Risk: ${log.fraudRisk}`}
                    </span>
                  )}
                </td>
                <td>{formatTimestamp(log.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="tourism-audit-viewer">
      <div className="tourism-audit-header">
        <h2>🔍 Audit Log Viewer</h2>
        <p>View detailed history and changes for bookings, leads, and complaints</p>
      </div>

      {/* Type Selector */}
      <div className="tourism-audit-controls">
        <div className="tourism-type-selector">
          <button
            className={selectedType === "bookings" ? "active" : ""}
            onClick={() => {
              setSelectedType("bookings");
              setAuditData(null);
              setSelectedId("");
            }}
          >
            📦 Bookings
          </button>
          {isVendor && (
            <button
              className={selectedType === "leads" ? "active" : ""}
              onClick={() => {
                setSelectedType("leads");
                setAuditData(null);
                setSelectedId("");
              }}
            >
              🎯 Leads
            </button>
          )}
          {isAdmin && (
            <>
              <button
                className={selectedType === "complaints" ? "active" : ""}
                onClick={() => {
                  setSelectedType("complaints");
                  setAuditData(null);
                  setSelectedId("");
                }}
              >
                ⚠️ Complaints
              </button>
              <button
                className={selectedType === "admin" ? "active" : ""}
                onClick={() => {
                  setSelectedType("admin");
                  setAuditData(null);
                  setSelectedId("");
                }}
              >
                👨‍💼 Admin Actions
              </button>
            </>
          )}
        </div>

        {selectedType !== "admin" && (
          <div className="tourism-audit-search">
            <label>
              {selectedType === "bookings" && "Select Booking"}
              {selectedType === "leads" && "Select Lead"}
              {selectedType === "complaints" && "Select Complaint"}
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">-- Choose --</option>
                {selectedType === "bookings" &&
                  bookings.map((booking) => (
                    <option key={booking._id} value={booking._id}>
                      {booking.confirmationNumber} - {booking.packageTitle}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="tourism-primary-button"
              onClick={handleLoadAudit}
              disabled={loading || !selectedId}
            >
              {loading ? "Loading..." : "Load Audit Trail"}
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="tourism-audit-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="tourism-audit-loading">
          <div className="tourism-spinner"></div>
          <p>Loading audit trail...</p>
        </div>
      )}

      {/* Audit Data Display */}
      {!loading && auditData && selectedType === "bookings" && (
        <div className="tourism-audit-details">
          <div className="tourism-audit-summary">
            <h3>Booking Audit Trail</h3>
            <div className="tourism-audit-info">
              <p>
                <strong>Confirmation Number:</strong> {auditData.confirmationNumber}
              </p>
              <p>
                <strong>Package:</strong> {auditData.packageTitle}
              </p>
              <p>
                <strong>Current Status:</strong>{" "}
                <span
                  className="tourism-status-badge"
                  style={{
                    backgroundColor: getStatusColor(auditData.currentStatus),
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontWeight: "600",
                  }}
                >
                  {auditData.currentStatus?.toUpperCase()}
                </span>
              </p>
              <p>
                <strong>Total Changes:</strong> {auditData.history?.length || 0}
              </p>
            </div>
          </div>
          {renderTimeline(auditData.history)}
        </div>
      )}

      {!loading && auditData && selectedType === "leads" && (
        <div className="tourism-audit-details">
          <div className="tourism-audit-summary">
            <h3>Lead Audit Trail</h3>
            <div className="tourism-audit-info">
              <p>
                <strong>Traveler:</strong> {auditData.travelerName}
              </p>
              <p>
                <strong>Destination:</strong> {auditData.destination}
              </p>
              <p>
                <strong>Current Status:</strong>{" "}
                <span
                  className="tourism-status-badge"
                  style={{
                    backgroundColor: getStatusColor(auditData.currentStatus),
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontWeight: "600",
                  }}
                >
                  {auditData.currentStatus?.toUpperCase()}
                </span>
              </p>
              <p>
                <strong>Total Changes:</strong> {auditData.history?.length || 0}
              </p>
            </div>
          </div>
          {renderTimeline(auditData.history)}
        </div>
      )}

      {!loading && auditData && selectedType === "complaints" && (
        <div className="tourism-audit-details">
          <div className="tourism-audit-summary">
            <h3>Complaint Audit Trail</h3>
            <div className="tourism-audit-info">
              <p>
                <strong>Issue:</strong> {auditData.issue}
              </p>
              <p>
                <strong>Current Status:</strong>{" "}
                <span
                  className="tourism-status-badge"
                  style={{
                    backgroundColor: getStatusColor(auditData.currentStatus),
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontWeight: "600",
                  }}
                >
                  {auditData.currentStatus?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          <h4 style={{ marginTop: "20px" }}>Escalation Timeline</h4>
          {renderEscalationTimeline(auditData.escalationTimeline)}
          {auditData.internalNotes && auditData.internalNotes.length > 0 && (
            <>
              <h4 style={{ marginTop: "20px" }}>Internal Notes</h4>
              <div className="tourism-internal-notes">
                {auditData.internalNotes.map((note, index) => (
                  <div key={index} className="tourism-note-item">
                    <p>
                      <strong>{note.addedBy}</strong> -{" "}
                      {formatTimestamp(note.timestamp || note.date)}
                    </p>
                    <p>{note.note}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Admin Logs */}
      {!loading && selectedType === "admin" && isAdmin && (
        <div className="tourism-audit-details">
          <div className="tourism-audit-summary">
            <h3>Admin Action Logs</h3>
            <p>Recent administrative actions on vendors, packages, and bookings</p>
          </div>
          {renderAdminLogs()}
        </div>
      )}

      {/* Empty State */}
      {!loading && !auditData && selectedType !== "admin" && (
        <div className="tourism-audit-empty">
          <p>👆 Select a {selectedType.slice(0, -1)} above to view its audit trail</p>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
