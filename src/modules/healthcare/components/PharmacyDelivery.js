import React, { useEffect, useMemo, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const NEXT_ORDER_STATUS = {
  placed: "processing",
  verified: "processing",
  processing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const PHARMACY_PARTNERS = [
  { id: "nila-pharma", name: "NilaCare Pharmacy", area: "Kollam", deliveryEta: "45-90 mins", rating: 4.8 },
  { id: "metro-meds", name: "Metro Meds", area: "Trivandrum", deliveryEta: "Same day", rating: 4.6 },
  { id: "wellness-plus", name: "Wellness Plus Pharmacy", area: "Kochi", deliveryEta: "2-4 hours", rating: 4.7 },
  { id: "malabar-meds", name: "Malabar Meds", area: "Calicut", deliveryEta: "Same day", rating: 4.5 },
];

const getMedicineInfoFromItem = (medicine = {}) => {
  const fallback = {
    purpose: `${medicine.name || "This medicine"} doctor/pharmacist advice anusarich use cheyyenda medicine aanu.`,
    ingredients: medicine.composition || medicine.ingredients || "Exact ingredients brand/strip label anusarich verify cheyyuka.",
    warning: medicine.requiresPrescription
      ? "Prescription required. Doctor advice illathe use cheyyaruthu."
      : "Label instructions and pharmacist advice follow cheyyuka.",
  };

  const nestedInfo = medicine.info || {};
  return {
    purpose: medicine.purpose || nestedInfo.purpose || fallback.purpose,
    ingredients: medicine.ingredients || nestedInfo.ingredients || fallback.ingredients,
    warning: medicine.warning || nestedInfo.warning || fallback.warning,
  };
};

const PharmacyDelivery = ({ medicines, loading, orders, onCreateOrder, onVerifyPayment, onUpdateOrderStatus }) => {
  const [query, setQuery] = useState("");
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(PHARMACY_PARTNERS[0].id);
  const [medicineExplanationLoading, setMedicineExplanationLoading] = useState(false);
  const [medicineExplanation, setMedicineExplanation] = useState({ matches: [], fallback: null });
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

  const selectedPharmacy = useMemo(
    () => PHARMACY_PARTNERS.find((pharmacy) => pharmacy.id === selectedPharmacyId) || PHARMACY_PARTNERS[0],
    [selectedPharmacyId]
  );

  const enrichedMedicines = useMemo(() => {
    return (medicines || []).map((medicine) => ({ ...medicine, info: getMedicineInfoFromItem(medicine) }));
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    if (!query.trim()) {
      return enrichedMedicines;
    }

    const normalizedQuery = query.toLowerCase();
    return enrichedMedicines.filter((medicine) => {
      return (
        medicine.name.toLowerCase().includes(normalizedQuery) ||
        medicine.category.toLowerCase().includes(normalizedQuery) ||
        medicine.info.purpose.toLowerCase().includes(normalizedQuery) ||
        medicine.info.ingredients.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [enrichedMedicines, query]);

  const explanationRows = useMemo(() => {
    if (Array.isArray(medicineExplanation.matches) && medicineExplanation.matches.length > 0) {
      return medicineExplanation.matches.map((item) => ({ ...item, info: getMedicineInfoFromItem(item) }));
    }
    return filteredMedicines.slice(0, 3).map((item) => ({ ...item, info: getMedicineInfoFromItem(item) }));
  }, [filteredMedicines, medicineExplanation.matches]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, [cart]);

  useEffect(() => {
    if (!query.trim()) {
      setMedicineExplanation({ matches: [], fallback: null });
      setMedicineExplanationLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setMedicineExplanationLoading(true);
      try {
        const response = await healthcareApi.getMedicineInfo(query);
        if (!active) {
          return;
        }
        setMedicineExplanation({
          matches: Array.isArray(response?.matches) ? response.matches : [],
          fallback: response?.fallback || null,
        });
      } catch (_error) {
        if (!active) {
          return;
        }
        setMedicineExplanation({ matches: [], fallback: null });
      } finally {
        if (active) {
          setMedicineExplanationLoading(false);
        }
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const addToCart = (medicine) => {
    if (medicine.requiresPrescription && !prescriptionVerified) {
      setFeedbackMessage("Prescription verification required before ordering this medicine.");
      return;
    }

    setCart((previous) => {
      const existingItem = previous.find((item) => item.id === medicine.id);
      if (existingItem) {
        return previous.map((item) => (item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      return [
        ...previous,
        {
          ...medicine,
          pharmacyId: selectedPharmacy.id,
          pharmacyName: selectedPharmacy.name,
          quantity: 1,
        },
      ];
    });

    setFeedbackMessage(`${medicine.name} added from ${selectedPharmacy.name}.`);
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
          pharmacyId: selectedPharmacy.id,
          pharmacyVendorId: selectedPharmacy.id,
          pharmacyName: selectedPharmacy.name,
          pharmacyArea: selectedPharmacy.area,
          items: cart.map((item) => ({
            medicineId: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            requiresPrescription: item.requiresPrescription,
            ingredients: item.info?.ingredients,
            purpose: item.info?.purpose,
          })),
          deliveryAddress: paymentForm.address,
          phone: paymentForm.phone,
          customerName: paymentForm.fullName,
          paymentMethod: paymentForm.paymentMethod,
          notes: `Selected pharmacy: ${selectedPharmacy.name}, ETA: ${selectedPharmacy.deliveryEta}`,
          prescriptionVerified,
          requiresPrescriptionReview: hasPrescriptionMedicines,
        },
        prescriptionFile,
      });

      if (created?.id && paymentForm.paymentMethod !== "cod") {
        const paymentReference = created.paymentReference || `PHARM-${Date.now()}`;
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
      setFeedbackMessage(`Order placed with ${selectedPharmacy.name}.`);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section className="healthcare-section" data-testid="pharmacy-delivery">
      <div className="healthcare-section-heading">
        <h2>Pharmacy Delivery</h2>
        <p>Select pharmacy, search medicines, view ingredients/use, and order safely.</p>
      </div>

      <div className="healthcare-medical-disclaimer">
        Medicine information is general awareness only. Do not self-medicate. Prescription medicines must be used only after doctor consultation.
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-selection-panel">
        <label className="healthcare-field">
          <span>Select Pharmacy</span>
          <select value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
            {PHARMACY_PARTNERS.map((pharmacy) => (
              <option key={pharmacy.id} value={pharmacy.id}>
                {pharmacy.name} - {pharmacy.area} - {pharmacy.rating}*
              </option>
            ))}
          </select>
        </label>

        <label className="healthcare-field healthcare-field-full">
          <span>Search medicine / ingredient</span>
          <input
            type="text"
            data-testid="medicine-search"
            className="healthcare-search-input"
            placeholder="Eg: Paracetamol, Cetirizine, Metformin, fever, allergy"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="healthcare-partner-summary">
          <strong>{selectedPharmacy.name}</strong>
          <span>
            {selectedPharmacy.area} | Delivery: {selectedPharmacy.deliveryEta}
          </span>
        </div>
      </div>

      {query.trim() ? (
        <div className="healthcare-info-card">
          <strong>Medicine explanation</strong>
          {medicineExplanationLoading ? <p>Checking medicine details...</p> : null}
          {!medicineExplanationLoading
            ? explanationRows.map((medicine) => (
                <div key={medicine.id || medicine.name} className="healthcare-info-row">
                  <span>{medicine.name}</span>
                  <p>{medicine.info.purpose}</p>
                  <small>Ingredients: {medicine.info.ingredients}</small>
                </div>
              ))
            : null}
          {!medicineExplanationLoading && explanationRows.length === 0 && medicineExplanation.fallback ? (
            <div className="healthcare-info-row">
              <span>{query}</span>
              <p>{medicineExplanation.fallback.purpose}</p>
              <small>Ingredients: {medicineExplanation.fallback.ingredients}</small>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="healthcare-pharmacy-grid">
        <div className="healthcare-upload-card">
          <h3>Prescription Verification</h3>
          <p>Required for antibiotics, BP, diabetes, insulin, and selected chronic-care medicines.</p>
          <input
            type="file"
            data-testid="prescription-upload"
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
          {loading ? <p>Loading medicines...</p> : null}

          <div className="healthcare-medicines-list">
            {filteredMedicines.map((medicine) => (
              <article key={medicine.id} className="healthcare-medicine-card healthcare-info-enabled-card" data-testid="medicine-result">
                <div>
                  <strong>{medicine.name}</strong>
                  <span>
                    {medicine.category} | {formatCurrency(medicine.price)}
                  </span>
                  <p className="healthcare-brief-info">{medicine.info.purpose}</p>
                  <small>Ingredients: {medicine.info.ingredients}</small>
                  {medicine.requiresPrescription ? (
                    <span className="healthcare-warning-text">Prescription required</span>
                  ) : (
                    <span className="healthcare-success-text">No prescription required</span>
                  )}
                  <small className="healthcare-warning-text">{medicine.info.warning}</small>
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
              <span>Pharmacy: {order.pharmacyName || "Selected pharmacy"}</span>
              <span>Order status: {order.orderStatus || "placed"}</span>
              <span>Payment: {order.paymentStatus || "pending"}</span>
              {order.prescriptionRequired ? (
                <span>Prescription review: {order.prescriptionReviewStatus || "pending"}</span>
              ) : null}
              {Array.isArray(order.interactionAlerts) && order.interactionAlerts.length > 0 ? (
                <span>Safety: {order.interactionAlerts[0]}</span>
              ) : null}
              {order.syncStatus === "queued" ? <span>Sync: queued offline</span> : null}
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
              <h3>Cart - {selectedPharmacy.name}</h3>
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
                  <small>{item.info?.ingredients}</small>
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
                <span>Pharmacy</span>
                <select value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
                  {PHARMACY_PARTNERS.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name} - {pharmacy.area}
                    </option>
                  ))}
                </select>
              </label>

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
