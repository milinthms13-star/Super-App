import React, { useEffect, useState } from "react";
import { localMarketService } from "../../../services/localMarketService";

import { normalizeOrder } from "../utils";

function DeliveryDashboard({ onNotify = () => {} }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Minimal: until backend provides delivery-specific endpoints,
      // we reuse "my orders" which should be scoped to delivery partner.
      const data = await localMarketService.getMyOrders();
      setOrders((Array.isArray(data) ? data : []).map((o) => normalizeOrder(o)));
    } catch (e) {
      onNotify("error", "Could not load delivery orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lm-orders-section">
      <h2>Delivery Partner Dashboard</h2>
      {loading ? <p className="lm-empty">Loading orders...</p> : null}
      {!loading && orders.length === 0 ? (
        <p className="lm-empty">No assigned orders yet.</p>
      ) : null}

      <div className="lm-orders-list">
        {orders.map((order) => (
          <div key={order.id} className="lm-order-card">
            <div className="lm-order-header">
              <h3>{order.shopName}</h3>
              <span
                className={`lm-status lm-status-${order.status.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {order.status}
              </span>
            </div>

            {order.requestedItemsText ? (
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
            ) : null}

            <p>Order ID: {order.orderId || order.id}</p>
            <p>Date: {new Date(order.createdAt || Date.now()).toLocaleString()}</p>
            <p>Payment Scheme: {order.paymentScheme || "COUNTER_PAY"}</p>
            {order.paymentScheme === "COUNTER_PAY" ? (
              <p>
                Platform Fee: INR {order.platformFee || 0} | Delivery to Partner: INR {order.deliveryChargeToPartner || 0}
              </p>
            ) : null}

            <div className="lm-modal-buttons" style={{ justifyContent: "flex-start" }}>
              {order.status === "Requested" ? (
                <button
                  className="lm-btn lm-btn-primary"
                  onClick={async () => {
                    await localMarketService.updateOrderStatus(order.id, "AcceptedByDelivery");
                    await load();
                  }}
                >
                  Accept (Counter-pay)
                </button>
              ) : null}

              {order.status === "AcceptedByDelivery" ? (
                <button
                  className="lm-btn lm-btn-primary"
                  onClick={async () => {
                    // Shop assignment is not exposed by backend route in this phase.
                    // We advance to shopping state so shop owner can proceed.
                    await localMarketService.updateOrderStatus(order.id, "Shopping");
                    await load();
                  }}
                >
                  Mark Shopping
                </button>
              ) : null}

              {order.status === "Shopping" ? (
                <button
                  className="lm-btn lm-btn-primary"
                  onClick={async () => {
                    await localMarketService.updateOrderStatus(order.id, "Out for Delivery");
                    await load();
                  }}
                >
                  Start Delivery
                </button>
              ) : null}

              {order.status === "Out for Delivery" ? (
                <button
                  className="lm-btn lm-btn-primary"
                  onClick={async () => {
                    await localMarketService.updateOrderStatus(order.id, "Delivered");
                    await load();
                  }}
                >
                  Mark Delivered
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeliveryDashboard;

