import React, { useEffect, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { formatCurrency, formatDisplayDate } from "../../utils/ecommerceHelpers";
import "./InventoryAlerts.css";

const InventoryAlerts = () => {
  const { apiCall } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterType, setFilterType] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (filterStatus) params.append("status", filterStatus);
        if (filterType) params.append("alertType", filterType);
        params.append("limit", "50");

        const response = await apiCall(`/alerts/list?${params.toString()}`, "GET");

        if (!isMounted) return;

        if (!response?.success) {
          throw new Error(response?.message || "Failed to load alerts");
        }

        setAlerts(response.data || []);

        // Also load dashboard summary
        const summaryResponse = await apiCall("/alerts/inventory/dashboard/summary", "GET");
        if (summaryResponse?.success) {
          setSummary(summaryResponse.summary);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load alert data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAlerts();
    return () => {
      isMounted = false;
    };
  }, [apiCall, filterStatus, filterType]);

  const handleAcknowledge = async (alertId) => {
    try {
      const response = await apiCall(`/alerts/${alertId}/acknowledge`, "PATCH");
      if (response?.success) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.alertId === alertId ? { ...a, status: "acknowledged" } : a
          )
        );
      }
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const response = await apiCall(`/alerts/${alertId}/resolve`, "PATCH", {
        action: "manual_restock",
        reason: "Item restocked",
      });
      if (response?.success) {
        setAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
  };

  if (loading) {
    return (
      <div className="inventory-alerts-shell">
        <div className="alerts-loading">
          <strong>Loading inventory alerts...</strong>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-alerts-shell">
        <div className="alerts-error">
          <strong>Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const getAlertColor = (alertType) => {
    switch (alertType) {
      case "out_of_stock":
        return "critical";
      case "low_stock":
        return "warning";
      case "overstock":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <section className="inventory-alerts-shell">
      {/* Summary Cards */}
      {summary && (
        <div className="alerts-summary">
          <article className="alert-summary-card">
            <span className="alert-label">Total Alerts</span>
            <strong className="alert-value">{summary.totalAlerts}</strong>
            <small>{summary.activeAlerts} active</small>
          </article>

          <article className="alert-summary-card alert-critical">
            <span className="alert-label">Out of Stock</span>
            <strong className="alert-value">{summary.outOfStockAlerts}</strong>
            <small>{summary.productsAffected} products affected</small>
          </article>

          <article className="alert-summary-card alert-warning">
            <span className="alert-label">Low Stock</span>
            <strong className="alert-value">{summary.lowStockAlerts}</strong>
            <small>Need attention</small>
          </article>

          <article className="alert-summary-card">
            <span className="alert-label">Resolved Today</span>
            <strong className="alert-value">{summary.resolvedToday}</strong>
            <small>Manual restocks</small>
          </article>
        </div>
      )}

      {/* Filters */}
      <div className="alerts-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="overstock">Overstock</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-list">
        <div className="alerts-list-header">
          <h3>Inventory Alerts</h3>
          <p>{alerts.length} alerts</p>
        </div>

        {alerts.length === 0 ? (
          <div className="alerts-empty">
            <p>No alerts matching your filters. Great inventory health!</p>
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Triggered</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.alertId}
                  className={`alert-row alert-${getAlertColor(alert.alertType)}`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <td className="alert-product">
                    <strong>{alert.productName}</strong>
                    <small>{alert.productSku}</small>
                  </td>
                  <td className="alert-type">
                    <span className={`type-badge type-${alert.alertType}`}>
                      {alert.alertType.replace("_", " ")}
                    </span>
                  </td>
                  <td className="alert-stock">
                    <strong>{alert.currentStock}</strong>
                    <small>units</small>
                  </td>
                  <td className="alert-threshold">
                    <strong>{alert.threshold}</strong>
                    <small>minimum</small>
                  </td>
                  <td className={`alert-status status-${alert.status}`}>
                    <span>{alert.status}</span>
                  </td>
                  <td className="alert-time">
                    <small>{formatDisplayDate(alert.triggeredAt)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="alert-modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alert-modal-header">
              <h3>{selectedAlert.productName}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedAlert(null)}
              >
                ✕
              </button>
            </div>

            <div className="alert-modal-body">
              {/* Alert Info */}
              <div className="alert-detail-section">
                <h4>Alert Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Type</span>
                    <strong className={`type-badge type-${selectedAlert.alertType}`}>
                      {selectedAlert.alertType.replace("_", " ")}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Current Stock</span>
                    <strong>{selectedAlert.currentStock}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Threshold</span>
                    <strong>{selectedAlert.threshold}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Status</span>
                    <strong className={`status-badge status-${selectedAlert.status}`}>
                      {selectedAlert.status}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Settings */}
              {selectedAlert.settings && (
                <div className="alert-detail-section">
                  <h4>Alert Settings</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Reorder Quantity</span>
                      <strong>{selectedAlert.settings.reorderQuantity}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Lead Time</span>
                      <strong>{selectedAlert.settings.leadTimeDays} days</strong>
                    </div>
                    <div className="detail-item">
                      <span>Enabled</span>
                      <strong>{selectedAlert.settings.enabled ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {selectedAlert.suggestions && selectedAlert.suggestions.length > 0 && (
                <div className="alert-detail-section">
                  <h4>Suggested Actions</h4>
                  <div className="suggestions-list">
                    {selectedAlert.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="suggestion-item">
                        <span className="suggestion-action">{suggestion.action}</span>
                        <p>{suggestion.details}</p>
                        <small>{suggestion.estimatedImpact}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggered Date */}
              <div className="alert-detail-section">
                <h4>Timeline</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Triggered</span>
                    <strong>{formatDisplayDate(selectedAlert.triggeredAt)}</strong>
                  </div>
                  {selectedAlert.resolvedAt && (
                    <div className="detail-item">
                      <span>Resolved</span>
                      <strong>{formatDisplayDate(selectedAlert.resolvedAt)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="alert-modal-footer">
              {selectedAlert.status === "active" && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleAcknowledge(selectedAlert.alertId)}
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleResolve(selectedAlert.alertId)}
                  >
                    Mark Resolved
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default InventoryAlerts;
