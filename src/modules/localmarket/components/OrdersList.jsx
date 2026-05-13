import React from "react";

function OrdersList({ orders, onBack, onLeaveReview }) {
  return (
    <>
      <div className="lm-back-button">
        <button onClick={onBack}>Back to Browse</button>
      </div>
      <div className="lm-orders-section">
        <h2>My Orders</h2>
        {orders.length === 0 ? (
          <p className="lm-empty">No orders yet.</p>
        ) : (
          <div className="lm-orders-list">
            {orders.map((order) => (
              <div key={order.id} className="lm-order-card">
                <div className="lm-order-header">
                  <h3>{order.shopName}</h3>
                  <span className={`lm-status lm-status-${order.status.replace(/\s+/g, "-").toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
                <p>Order ID: {order.orderId || order.id}</p>
                <p>Date: {new Date(order.createdAt || Date.now()).toLocaleString()}</p>
                <p>Payment: {order.paymentStatus || "Pending"}</p>
                <div className="lm-order-items">
                  {(order.items || []).map((item) => (
                    <div key={`${order.id}-${item.productId}`} className="lm-order-item">
                      {item.productName} x {item.quantity}
                    </div>
                  ))}
                </div>
                <div className="lm-order-total">
                  <p>Subtotal: INR {order.subtotal}</p>
                  <p>Discount: - INR {order.discount || 0}</p>
                  <p>Delivery: INR {order.deliveryCharge || 0}</p>
                  <h4>Total: INR {order.total}</h4>
                </div>
                <button
                  className="lm-btn lm-btn-secondary"
                  disabled={Boolean(order.review)}
                  onClick={() => onLeaveReview(order)}
                >
                  {order.review ? "Review Submitted" : "Leave Review"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default OrdersList;
