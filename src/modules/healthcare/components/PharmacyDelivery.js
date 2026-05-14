import React, { useMemo, useState } from "react";

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const NEXT_ORDER_STATUS = {
  placed: "packed",
  packed: "out_for_delivery",
  out_for_delivery: "delivered",
};

const PharmacyDelivery = ({ medicines, loading, orders, onCreateOrder, onVerifyPayment, onUpdateOrderStatus }) => {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionVerified, setPrescriptionVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    paymentMethod: "upi",
  });

  const filteredMedicines = useMemo(() => {
    if (!query.trim()) {
      return medicines;
    }

    const normalizedQuery = query.toLowerCase();
    return (medicines || []).filter((medicine) => {
      return (
        medicine.name.toLowerCase().includes(normalizedQuery) || medicine.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [medicines, query]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, [cart]);

  const addToCart = (medicine) => {
    if (medicine.requiresPrescription && !prescriptionVerified) {
      setFeedbackMessage("Prescription verification required before ordering this medicine.");
      return;
    }

    setCart((previous) => {
      const existingItem = previous.find((item) => item.id === medicine.id);
      if (existingItem) {
        return previous.map((item) => {
          if (item.id !== medicine.id) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity + 1,
          };
        });
      }

      return [...previous, { ...medicine, quantity: 1 }];
    });

    setFeedbackMessage(`${medicine.name} added to cart.`);
  };

  const verifyPrescription = async () => {
    if (!prescriptionFile) {
      setFeedbackMessage("Upload prescription first.");
      return;
    }

    setVerifying(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 700);
      });

      setPrescriptionVerified(true);
      setFeedbackMessage("Prescription verified. You can order restricted medicines now.");
    } finally {
      setVerifying(false);
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      setFeedbackMessage("Your cart is empty.");
      return;
    }

    if (!paymentForm.fullName || !paymentForm.phone || !paymentForm.address) {
      setFeedbackMessage("Fill all payment and delivery details.");
      return;
    }
    const hasPrescriptionMedicines = cart.some((item) => item.requiresPrescription);
    if (hasPrescriptionMedicines && (!prescriptionVerified || !prescriptionFile)) {
      setFeedbackMessage("Prescription verification is required for restricted medicines before checkout.");
      return;
    }

    setPlacingOrder(true);

    try {
      const created = await onCreateOrder?.({
        order: {
          items: cart.map((item) => ({
            medicineId: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            requiresPrescription: item.requiresPrescription,
          })),
          deliveryAddress: paymentForm.address,
          phone: paymentForm.phone,
          customerName: paymentForm.fullName,
          paymentMethod: paymentForm.paymentMethod,
          notes: "",
          prescriptionVerified,
          requiresPrescriptionReview: hasPrescriptionMedicines,
        },
        prescriptionFile,
      });

      if (created?.id && paymentForm.paymentMethod !== "cod") {
        const paymentReference = `PHARM-${Date.now()}`;
        await onVerifyPayment?.(created.id, paymentReference, "success");
      }

      setCart([]);
      setShowPayment(false);
      setShowCart(false);
      setLastCreatedOrder(created || null);
      setPaymentForm({
        fullName: "",
        phone: "",
        address: "",
        paymentMethod: "upi",
      });
      setFeedbackMessage("Order placed successfully. Payment flow completed.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Pharmacy Delivery</h2>
        <p>Cart and payment flow with prescription safety checks for restricted medicines.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-pharmacy-grid">
        <div className="healthcare-upload-card">
          <h3>Prescription Verification</h3>
          <p>Required for antibiotics and selected chronic-care medicines.</p>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => {
              setPrescriptionFile(event.target.files?.[0] || null);
              setPrescriptionVerified(false);
            }}
          />

          <button
            type="button"
            className="healthcare-primary-button"
            onClick={verifyPrescription}
            disabled={verifying || !prescriptionFile}
          >
            {verifying ? "Verifying..." : prescriptionVerified ? "Verified" : "Verify Prescription"}
          </button>

          <div className="healthcare-pill-row">
            <span className={`healthcare-pill ${prescriptionVerified ? "active" : "inactive"}`}>
              {prescriptionVerified ? "Verification complete" : "Not verified"}
            </span>
            <button type="button" className="healthcare-secondary-button" onClick={() => setShowCart(true)}>
              Open Cart ({cart.length})
            </button>
          </div>
        </div>

        <div className="healthcare-medicines-section">
          <label className="healthcare-field">
            <span>Search medicines</span>
            <input
              type="text"
              className="healthcare-search-input"
              placeholder="Search by medicine name or category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {loading ? <p>Loading medicines...</p> : null}

          <div className="healthcare-medicines-list">
            {filteredMedicines.map((medicine) => (
              <article key={medicine.id} className="healthcare-medicine-card">
                <div>
                  <strong>{medicine.name}</strong>
                  <span>
                    {medicine.category} | {formatCurrency(medicine.price)}
                  </span>
                  {medicine.requiresPrescription ? (
                    <span className="healthcare-warning-text">Prescription required</span>
                  ) : (
                    <span className="healthcare-success-text">No prescription required</span>
                  )}
                </div>

                <button
                  type="button"
                  className="healthcare-primary-button"
                  onClick={() => addToCart(medicine)}
                  disabled={medicine.requiresPrescription && !prescriptionVerified}
                >
                  Add To Cart
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {lastCreatedOrder ? (
        <div className="healthcare-inline-alert" role="status">
          Latest order: {lastCreatedOrder.id} ({lastCreatedOrder.orderStatus || "placed"}) payment{" "}
          {lastCreatedOrder.paymentStatus || "pending"}.
        </div>
      ) : null}

      <div className="healthcare-record-list-card">
        <h3>Recent Pharmacy Orders</h3>
        {(orders || []).length === 0 ? <p>No pharmacy orders yet.</p> : null}
        {(orders || []).slice(0, 5).map((order) => (
          <article key={order.id} className="healthcare-record-item">
            <div className="healthcare-record-meta">
              <strong>{order.id}</strong>
              <span>{(order.items || []).length} item(s)</span>
              <span>Total: {formatCurrency(order.totalAmount || 0)}</span>
              <span>Order status: {order.orderStatus || "placed"}</span>
              <span>Payment: {order.paymentStatus || "pending"}</span>
              {order.requiresPrescriptionReview ? <span>Prescription: verified</span> : null}
            </div>
            <div className="healthcare-record-actions">
              {NEXT_ORDER_STATUS[order.orderStatus || "placed"] ? (
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => onUpdateOrderStatus?.(order.id, NEXT_ORDER_STATUS[order.orderStatus || "placed"])}
                >
                  Mark {NEXT_ORDER_STATUS[order.orderStatus || "placed"].replaceAll("_", " ")}
                </button>
              ) : (
                <span className="healthcare-success-text">Delivery complete</span>
              )}
            </div>
          </article>
        ))}
      </div>

      {showCart ? (
        <div className="healthcare-modal-overlay" role="dialog" aria-modal="true" aria-label="Pharmacy cart">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>Cart</h3>
              <button type="button" className="healthcare-close-button" onClick={() => setShowCart(false)}>
                Close
              </button>
            </div>

            {cart.length === 0 ? <p>No items in cart.</p> : null}

            <div className="healthcare-cart-list">
              {cart.map((item) => (
                <div key={item.id} className="healthcare-cart-item">
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatCurrency(item.price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="healthcare-cart-footer">
              <strong>Total: {formatCurrency(cartTotal)}</strong>
              <button
                type="button"
                className="healthcare-primary-button"
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
              >
                Continue To Payment
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPayment ? (
        <div className="healthcare-modal-overlay" role="dialog" aria-modal="true" aria-label="Payment">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>Payment</h3>
              <button type="button" className="healthcare-close-button" onClick={() => setShowPayment(false)}>
                Close
              </button>
            </div>

            <form className="healthcare-form-grid" onSubmit={placeOrder}>
              <label className="healthcare-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={paymentForm.fullName}
                  onChange={(event) => setPaymentForm((previous) => ({ ...previous, fullName: event.target.value }))}
                  required
                />
              </label>

              <label className="healthcare-field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={paymentForm.phone}
                  onChange={(event) => setPaymentForm((previous) => ({ ...previous, phone: event.target.value }))}
                  required
                />
              </label>

              <label className="healthcare-field healthcare-field-full">
                <span>Delivery Address</span>
                <input
                  type="text"
                  value={paymentForm.address}
                  onChange={(event) => setPaymentForm((previous) => ({ ...previous, address: event.target.value }))}
                  required
                />
              </label>

              <label className="healthcare-field">
                <span>Payment Method</span>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(event) => setPaymentForm((previous) => ({ ...previous, paymentMethod: event.target.value }))}
                >
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="netbanking">Net banking</option>
                  <option value="cod">Cash on delivery</option>
                </select>
              </label>

              <div className="healthcare-modal-actions">
                <button type="button" className="healthcare-secondary-button" onClick={() => setShowPayment(false)}>
                  Back
                </button>
                <button type="submit" className="healthcare-primary-button" disabled={placingOrder}>
                  {placingOrder ? "Processing..." : `Pay ${formatCurrency(cartTotal)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PharmacyDelivery;
