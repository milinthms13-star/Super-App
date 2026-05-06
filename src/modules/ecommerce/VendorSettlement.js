import React, { useEffect, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { formatCurrency, formatDisplayDate } from "../../utils/ecommerceHelpers";
import "./VendorSettlement.css";

const VendorSettlement = () => {
  const { apiCall, currentUser } = useApp();
  const [settlements, setSettlements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettlements = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiCall("/settlements/list?limit=50", "GET");

        if (!isMounted) return;

        if (!response?.success) {
          throw new Error(response?.message || "Failed to load settlements");
        }

        setSettlements(response.data || []);

        // Also load dashboard summary
        const dashboardResponse = await apiCall("/settlements/dashboard/vendor", "GET");
        if (dashboardResponse?.success) {
          setSummary(dashboardResponse.summary);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load settlement data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSettlements();
    return () => {
      isMounted = false;
    };
  }, [apiCall]);

  if (loading) {
    return (
      <div className="vendor-settlement-shell">
        <div className="vendor-settlement-loading">
          <strong>Loading settlements...</strong>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendor-settlement-shell">
        <div className="vendor-settlement-error">
          <strong>Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="vendor-settlement-shell">
      {/* Summary Cards */}
      {summary && (
        <div className="vendor-settlement-summary">
          <article className="settlement-summary-card">
            <span className="settlement-label">Total Settlements</span>
            <strong className="settlement-value">{summary.totalSettlements}</strong>
            <small className="settlement-meta">All time</small>
          </article>

          <article className="settlement-summary-card">
            <span className="settlement-label">Pending</span>
            <strong className="settlement-value settlement-pending">{summary.pending}</strong>
            <small className="settlement-meta">
              INR {formatCurrency(summary.pendingEarnings)}
            </small>
          </article>

          <article className="settlement-summary-card">
            <span className="settlement-label">Processing</span>
            <strong className="settlement-value settlement-processing">{summary.processing}</strong>
            <small className="settlement-meta">In progress</small>
          </article>

          <article className="settlement-summary-card">
            <span className="settlement-label">Completed</span>
            <strong className="settlement-value settlement-completed">{summary.completed}</strong>
            <small className="settlement-meta">
              INR {formatCurrency(summary.totalEarnings)}
            </small>
          </article>
        </div>
      )}

      {/* Settlements List */}
      <div className="vendor-settlement-list">
        <div className="settlement-list-header">
          <h3>Settlement History</h3>
          <p>{settlements.length} total</p>
        </div>

        {settlements.length === 0 ? (
          <div className="settlement-empty">
            <p>No settlements yet. Earnings will appear once order thresholds are met.</p>
          </div>
        ) : (
          <table className="settlement-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Commission</th>
                <th>Net Payable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr
                  key={settlement.settlementId}
                  className="settlement-row"
                  onClick={() => setSelectedSettlement(settlement)}
                >
                  <td className="settlement-period">
                    <div>
                      <strong>{formatDisplayDate(settlement.periodStartDate)}</strong>
                      <small>to {formatDisplayDate(settlement.periodEndDate)}</small>
                    </div>
                  </td>
                  <td className="settlement-orders">
                    <strong>{settlement.summary.totalOrderCount}</strong>
                    <small>{settlement.summary.deliveredOrderCount} delivered</small>
                  </td>
                  <td className="settlement-revenue">
                    <strong>INR {formatCurrency(settlement.summary.totalRevenue)}</strong>
                  </td>
                  <td className="settlement-commission">
                    <strong>{settlement.summary.commissionPercentage}%</strong>
                    <small>INR {formatCurrency(settlement.summary.platformCommission)}</small>
                  </td>
                  <td className="settlement-payable">
                    <strong className="payable-amount">
                      INR {formatCurrency(settlement.summary.netPayable)}
                    </strong>
                  </td>
                  <td className={`settlement-status status-${settlement.status.toLowerCase()}`}>
                    <span>{settlement.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Settlement Details Modal */}
      {selectedSettlement && (
        <div className="settlement-modal-overlay" onClick={() => setSelectedSettlement(null)}>
          <div className="settlement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settlement-modal-header">
              <h3>Settlement Details</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedSettlement(null)}
              >
                ✕
              </button>
            </div>

            <div className="settlement-modal-body">
              {/* Summary */}
              <div className="settlement-detail-section">
                <h4>Financial Summary</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Total Orders</span>
                    <strong>{selectedSettlement.summary.totalOrderCount}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Delivered Orders</span>
                    <strong>{selectedSettlement.summary.deliveredOrderCount}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Total Revenue</span>
                    <strong>INR {formatCurrency(selectedSettlement.summary.totalRevenue)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Commission ({selectedSettlement.summary.commissionPercentage}%)</span>
                    <strong>INR {formatCurrency(selectedSettlement.summary.platformCommission)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Net Payable</span>
                    <strong className="payable-highlight">
                      INR {formatCurrency(selectedSettlement.summary.netPayable)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {selectedSettlement.payment?.transactionId && (
                <div className="settlement-detail-section">
                  <h4>Payment Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Method</span>
                      <strong>{selectedSettlement.payment.method}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Transaction ID</span>
                      <strong>{selectedSettlement.payment.transactionId}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Completed</span>
                      <strong>{formatDisplayDate(selectedSettlement.payment.completedAt)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Period */}
              <div className="settlement-detail-section">
                <h4>Settlement Period</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Start Date</span>
                    <strong>{formatDisplayDate(selectedSettlement.periodStartDate)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>End Date</span>
                    <strong>{formatDisplayDate(selectedSettlement.periodEndDate)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Status</span>
                    <strong className={`status-badge status-${selectedSettlement.status.toLowerCase()}`}>
                      {selectedSettlement.status}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Top Orders */}
              {selectedSettlement.orders && selectedSettlement.orders.length > 0 && (
                <div className="settlement-detail-section">
                  <h4>Top Orders ({selectedSettlement.orders.length} total)</h4>
                  <div className="settlement-orders-list">
                    {selectedSettlement.orders.slice(0, 5).map((order) => (
                      <div key={order.orderId} className="order-item">
                        <div className="order-info">
                          <strong>{order.itemCount} items</strong>
                          <small>{order.customerEmail}</small>
                        </div>
                        <div className="order-amounts">
                          <span>INR {formatCurrency(order.itemRevenue)}</span>
                          <small>Commission: INR {formatCurrency(order.commissionAmount)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="settlement-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedSettlement(null)}
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

export default VendorSettlement;
