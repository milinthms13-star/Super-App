import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { normalizeOrderStatus, formatDisplayDate, getReturnWindowText, formatCurrency } from "../../utils/ecommerceHelpers";
import { sanitizeText } from "../../utils/xssProtection";
import { getPathForModule } from "../../utils/moduleRoutes";
import "../../styles/Ecommerce.css";

const ORDER_STEPS = ["Confirmed", "Packed", "Shipped", "Delivered"];

const getReturnStatusLabel = (item) => {
  if (!item) {
    return "Returns not available";
  }

  const request = item.returnRequest;
  if (request) {
    const status = String(request.refundStatus || request.status || "requested").toLowerCase();
    if (status === "completed") {
      return "Return completed";
    }
    if (status === "approved") {
      return "Return approved";
    }
    if (status === "rejected") {
      return "Return rejected";
    }
    return "Return requested";
  }

  if (item.returnAllowed && Number(item.returnWindowDays || 0) > 0 && !item.returnEligibleUntil) {
    return `Return by within ${item.returnWindowDays} day(s)`;
  }

  return getReturnWindowText(item);
};

const OrdersPage = ({ onContinueShopping = null, onOpenReturns = null }) => {
  const navigate = useNavigate();
  const {
    orders,
    ordersPagination,
    loadMoreOrders,
    checkoutStatus,
    clearCheckoutStatus,
  } = useApp();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const handleContinueShopping = () => {
    if (typeof onContinueShopping === "function") {
      onContinueShopping();
      return;
    }

    navigate(getPathForModule("ecommerce"));
  };
  const handleOpenReturns = () => {
    if (typeof onOpenReturns === "function") {
      onOpenReturns();
      return;
    }

    navigate(getPathForModule("returns"));
  };

  // Filter and search orders - memoized to prevent unnecessary recalculations
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch =
      order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.items || []).some((item) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesStatus =
      filterStatus === "all" ||
      normalizeOrderStatus(order.status).toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  }), [orders, searchQuery, filterStatus]);

  const totalOrders = ordersPagination?.totalItems || orders.length;
  const displayedOrders = filteredOrders.length;

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <h1>Order History</h1>
        <p>Review your past GlobeMart purchases, shipment progress, and delivery details.</p>
      </div>

      {checkoutStatus.message && (
        <div className="products-notice">
          <span>{checkoutStatus.message}</span>
          <button type="button" className="btn btn-outline" onClick={clearCheckoutStatus}>
            Dismiss
          </button>
        </div>
      )}

      <div className="ecommerce-header-actions">
        <button type="button" className="btn btn-outline" onClick={handleContinueShopping}>
          Back to GlobeMart
        </button>
      </div>

      {orders.length > 0 && (
        <div className="orders-search-filter">
          <input
            type="text"
            placeholder="Search by order ID, address, or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search orders"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
            aria-label="Filter by status"
          >
            <option value="all">All order statuses</option>
            <option value="confirmed">Status: Confirmed</option>
            <option value="packed">Status: Packed</option>
            <option value="shipped">Status: Shipped</option>
            <option value="delivered">Status: Delivered</option>
          </select>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="seller-empty-state">
          <h4>No orders yet</h4>
          <p>Your completed purchases and live delivery updates will appear here.</p>
          <div className="seller-card-actions">
            <button type="button" className="btn btn-primary" onClick={handleContinueShopping}>
              Start Shopping
            </button>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="seller-empty-state">
          <h4>No matching orders</h4>
          <p>Try adjusting your search or filters.</p>
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="orders-pagination-info">
            Showing {displayedOrders} of {totalOrders} order(s)
          </p>
          <div className="seller-orders-grid">
            {filteredOrders.map((order) => (
              <article className="seller-order-card" key={order.id}>
              <div className="seller-order-top">
                <div>
                  <h4>Order {String(order.id)}</h4>
                  <p>{formatDisplayDate(order.createdAt)}</p>
                </div>
                <span className={`listing-status listing-status-${normalizeOrderStatus(order.status).toLowerCase()}`}>
                  Order {normalizeOrderStatus(order.status)}
                </span>
              </div>

              <div className="seller-card-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                  }
                >
                  {expandedOrderId === order.id ? "Hide details" : "View details"}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className="seller-order-detail-panel">
                  <div className="seller-order-detail-row">
                    <span>Order ID</span>
                    <strong>{order.id}</strong>
                  </div>
                  <div className="seller-order-detail-row">
                    <span>Payment method</span>
                    <strong>{order.paymentMethod || "Cash on Delivery"}</strong>
                  </div>
                  <div className="seller-order-detail-row">
                    <span>Payment status</span>
                    <strong>{order.paymentStatus || "Pending"}</strong>
                  </div>
                  <div className="seller-order-detail-row">
                    <span>Delivery address</span>
                    <strong>{sanitizeText(order.deliveryAddress) || "Address unavailable"}</strong>
                  </div>
                  {order.estimatedDeliveryAt && (
                    <div className="seller-order-detail-row">
                      <span>Expected delivery</span>
                      <strong>{formatDisplayDate(order.estimatedDeliveryAt)}</strong>
                    </div>
                  )}
                  {order.note && (
                    <div className="seller-order-detail-row">
                      <span>Order note</span>
                      <strong>{sanitizeText(order.note)}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="seller-order-meta">
                <span>Total {formatCurrency(order.amount)}</span>
                <span>Subtotal {formatCurrency(order.subtotal)}</span>
                <span>Delivery {formatCurrency(order.deliveryFee)}</span>
                <span>{(order.items || []).length} line item(s)</span>
              </div>

              <div className="seller-order-progress">
                {ORDER_STEPS.map((step) => {
                  const isActive =
                    ORDER_STEPS.indexOf(step) <= ORDER_STEPS.indexOf(normalizeOrderStatus(order.status));
                  return (
                    <span
                      key={`${order.id}-${step}`}
                      className={`seller-order-step ${isActive ? "active" : ""}`}
                    >
                      {step}
                    </span>
                  );
                })}
              </div>

              <div className="seller-inventory-header">
                <h5>Items</h5>
                <p>Each seller segment below keeps its own fulfillment timeline and tracking details.</p>
              </div>

              <div className="seller-return-request-list">
                {(order.items || []).map((item) => (
                  <article className="seller-return-request-card" key={`${order.id}-${item.id}`}>
                    <div className="seller-return-request-top">
                      <div>
                        <strong>{sanitizeText(item.name)}</strong>
                        <p>{sanitizeText(item.businessName || item.sellerName) || "Marketplace seller"}</p>
                      </div>
                      <span className={`listing-status listing-status-${normalizeOrderStatus(item.status).toLowerCase()}`}>
                        Item {normalizeOrderStatus(item.status)}
                      </span>
                    </div>
                    <div className="seller-return-request-meta">
                      <span>Qty {item.quantity}</span>
                      <span>Unit {item.price}</span>
                      <span>{item.batchLabel ? `Batch ${sanitizeText(item.batchLabel)}` : "Batch info unavailable"}</span>
                      <span>
                        {item.batchLocation || item.location
                          ? `Dispatch ${sanitizeText(item.batchLocation || item.location)}`
                          : "Dispatch info unavailable"}
                      </span>
                      <span>{getReturnStatusLabel(item)}</span>
                    </div>
                  </article>
                ))}
              </div>

              {(order.sellerFulfillments || []).length > 0 && (
                <>
                  <div className="seller-inventory-header">
                    <h5>Shipment Tracking</h5>
                    <p>Seller-level tracking numbers and providers are shown once fulfillment begins.</p>
                  </div>

                  <div className="seller-batch-list">
                    {order.sellerFulfillments.map((fulfillment) => (
                      <article className="seller-batch-card" key={`${order.id}-${fulfillment.sellerKey}`}>
                        <div className="seller-batch-top">
                          <div>
                            <strong>{sanitizeText(fulfillment.businessName || fulfillment.sellerName) || "Seller"}</strong>
                            <p>Seller {normalizeOrderStatus(fulfillment.status)}</p>
                          </div>
                          <span className={`listing-status listing-status-${normalizeOrderStatus(fulfillment.status).toLowerCase()}`}>
                            Seller {normalizeOrderStatus(fulfillment.status)}
                          </span>
                        </div>
                        <div className="seller-batch-meta">
                          <span>Provider {fulfillment.provider || "manual"}</span>
                          <span>
                            {fulfillment.trackingNumber
                              ? `Tracking ${fulfillment.trackingNumber}`
                              : "Tracking number pending"}
                          </span>
                          <span>
                            {fulfillment.shipmentId
                              ? `Shipment ${fulfillment.shipmentId}`
                              : "Shipment ID pending"}
                          </span>
                          <span>
                            {fulfillment.externalStatus
                              ? `Carrier ${fulfillment.externalStatus}`
                              : "Carrier sync not available yet"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {expandedOrderId !== order.id && (
                <div className="seller-inventory-header">
                  <h5>Delivery Address</h5>
                  <p>{sanitizeText(order.deliveryAddress) || "Address unavailable"}</p>
                </div>
              )}

              <div className="seller-card-actions">
                <button type="button" className="btn btn-outline" onClick={handleOpenReturns}>
                  Manage Returns
                </button>
                <button type="button" className="btn btn-primary" onClick={handleContinueShopping}>
                  Continue Shopping
                </button>
              </div>
            </article>
            ))}
          </div>
        </>
      )}

      {ordersPagination.hasNextPage && (
        <div className="seller-card-actions">
          <button type="button" className="btn btn-outline" onClick={loadMoreOrders}>
            Load more orders
          </button>
        </div>
      )}
    </div>
  );
};

OrdersPage.propTypes = {
  onContinueShopping: PropTypes.func,
  onOpenReturns: PropTypes.func,
};

export default OrdersPage;
