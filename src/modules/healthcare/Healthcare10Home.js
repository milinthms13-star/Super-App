import React, { useState } from "react";
import "./Healthcare10Home.css";

const services = [
  {
    id: "doctor",
    title: "Doctor Consultation",
    subtitle: "Book clinic or video consultation",
    icon: "👨‍⚕️",
    action: "Find Doctor",
  },
  {
    id: "lab",
    title: "Lab & Scan Booking",
    subtitle: "Blood test, scan, home collection",
    icon: "🧪",
    action: "Book Test",
  },
  {
    id: "pharmacy",
    title: "Pharmacy Delivery",
    subtitle: "Upload prescription and order medicine",
    icon: "💊",
    action: "Order Medicine",
  },
  {
    id: "emergency",
    title: "Emergency SOS",
    subtitle: "Ambulance, hospital, trusted contacts",
    icon: "🚨",
    action: "Open SOS",
  },
];

const statusLabels = {
  placed: "Placed",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Pending",
};

export default function Healthcare10Home({ onSelect, summary = {}, loading = false, errorMessage = "", recentOrders = [] }) {
  const [symptom, setSymptom] = useState("");

  const healthScore = Number(summary.healthScore ?? 42);

  return (
    <div className="health10" data-testid="healthcare-10home">
      <section className="health10-hero">
        <div>
          <p className="health10-tag">NilaCare Health</p>
          <h1>Your complete healthcare companion</h1>
          <p>
            Doctor booking, lab test, pharmacy delivery, health records and
            emergency help in one place.
          </p>
        </div>

        <div className="symptom-card">
          <h3>AI Health Guide</h3>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="Tell your symptom, example: fever and body pain for 2 days..."
          />
          <button onClick={() => onSelect("doctor")}>Suggest Doctor</button>
          <small>This is not medical diagnosis. For emergency, use SOS.</small>
        </div>
      </section>

      {loading ? (
        <div className="health10-status health10-loading">Loading healthcare overview...</div>
      ) : null}

      {errorMessage ? (
        <div className="health10-status health10-error" role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      ) : null}

      <section className="health10-summary">
        <div>
          <strong>Health score</strong>
          <p>{healthScore}/100</p>
        </div>
        <div>
          <strong>Appointments</strong>
          <p>{summary.appointments ?? 0}</p>
        </div>
        <div>
          <strong>Pharmacy orders</strong>
          <p>{summary.pharmacyOrders ?? 0}</p>
        </div>
        <div>
          <strong>Records</strong>
          <p>{summary.records ?? 0}</p>
        </div>
        <div>
          <strong>Pending approvals</strong>
          <p>{summary.pendingApprovals ?? 0}</p>
        </div>
      </section>

      <section className="health10-grid">
        {services.map((item) => (
          <button key={item.id} className="health10-service" onClick={() => onSelect(item.id)}>
            <span>{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
            <strong>{item.action} →</strong>
          </button>
        ))}
      </section>

      <section className="health10-strip">
        <div>
          <strong>Family Health</strong>
          <p>Book for parents, kids and elderly members.</p>
        </div>
        <div>
          <strong>Secure Records</strong>
          <p>Store prescriptions, reports and bills safely.</p>
        </div>
        <div>
          <strong>Partner Dashboard</strong>
          <p>Doctors, labs and pharmacies can manage requests.</p>
        </div>
      </section>

      <section className="health10-orders" data-testid="healthcare-10home-orders">
        <div className="health10-orders-header">
          <h3>Recent Pharmacy Orders</h3>
          <p>Track order status, payment, and delivery in one place.</p>
        </div>

        {recentOrders.length === 0 ? (
          <div className="health10-order-empty">No recent pharmacy orders yet. Start with the pharmacy flow to place an order.</div>
        ) : (
          <div className="health10-order-grid">
            {recentOrders.slice(0, 3).map((order) => (
              <article key={order.id} className="health10-order-card">
                <div className="health10-order-meta">
                  <strong>{order.pharmacyName || "Selected pharmacy"}</strong>
                  <span>Order ID: {order.id}</span>
                  <span>Total: INR {Number(order.totalAmount || 0).toLocaleString("en-IN")}</span>
                  <span>Payment: {order.paymentStatus || "pending"}</span>
                  <span>Status: {statusLabels[order.orderStatus] || order.orderStatus}</span>
                </div>
                <div className="health10-order-status-bar">
                  <div className={`health10-order-status-pill ${order.orderStatus || "placed"}`}>
                    {statusLabels[order.orderStatus] || order.orderStatus}
                  </div>
                  {order.prescriptionVerified ? <div className="health10-order-pill verified">Prescription verified</div> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
