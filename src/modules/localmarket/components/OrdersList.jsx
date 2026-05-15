import React from "react";

function OrdersList({ orders, onBack, onLeaveReview }) {
  const renderRequestedText = (order) => {
    if (!order?.requestedItemsText) {
      return null;
    }

    return (
      <>
        <p>
          Requested: <strong>{order.requestedItemsText}</strong>
        </p>
        {order.preferredShopName ? (
          <p>
            Preferred Shop: <strong>{order.preferredShopName}</strong>
          </p>
        ) : null}
      </>
    );
  };

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
                {order?.requestedItemsText ? renderRequestedText(order) : null}

                <div className="lm-order-items">
                  {(order.items || []).map((item) => (
                    <div key={`${order.id}-${item.productId}`} className="lm-order-item">
                      {item.productName} x {item.quantity}
                    </div>
                  ))}

                  {(!order.items || order.items.length === 0) && !order?.requestedItemsText ? (
                    <p className="lm-empty">No items yet.</p>
                  ) : null}
                </div>

                <div className="lm-order-total">
                  {order?.paymentScheme === "COUNTER_PAY" ? (
                    <>
                      <p>Platform Fee: INR {order.platformFee || 0}</p>
                      <p>Delivery to Partner: INR {order.deliveryChargeToPartner || 0}</p>
                      <h4>Total (Computed by system): INR {order.total || 0}</h4>
                    </>
                  ) : (
                    <>
                      <p>Subtotal: INR {order.subtotal}</p>
                      <p>Discount: - INR {order.discount || 0}</p>
                      <p>Delivery: INR {order.deliveryCharge || 0}</p>
                      <h4>Total: INR {order.total}</h4>
                    </>
                  )}
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
