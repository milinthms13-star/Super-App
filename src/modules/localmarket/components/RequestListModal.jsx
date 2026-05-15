import React, { useMemo, useState } from "react";
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS } from "../constants";

function RequestListModal({
  onClose,
  onSubmit,
  submitting,
  defaultDeliveryType = "Home Delivery",
}) {
  const [requestedItemsText, setRequestedItemsText] = useState("");
  const [preferredShopName, setPreferredShopName] = useState("");
  const [deliveryType, setDeliveryType] = useState(defaultDeliveryType);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  const validate = useMemo(() => {
    const errors = [];

    if (!requestedItemsText.trim()) {
      errors.push("Requested items description is required.");
    }

    if (!deliveryType) {
      errors.push("Delivery type is required.");
    }

    const phonePattern = /^\+?\d{10,13}$/;
    if (!phone.trim() || !phonePattern.test(phone.trim())) {
      errors.push("Please provide a valid phone number.");
    }

    if (deliveryType === "Home Delivery" && deliveryAddress.trim().length < 12) {
      errors.push("Please provide a complete delivery address.");
    }

    if (!paymentMethod) {
      errors.push("Please select a payment method.");
    }

    return errors;
  }, [requestedItemsText, deliveryType, phone, deliveryAddress, paymentMethod]);

  const handleSubmit = () => {
    const errs = validate;
    setValidationErrors(errs);
    if (errs.length) {
      return;
    }

    onSubmit({
      requestedItemsText: requestedItemsText.trim(),
      preferredShopName: preferredShopName.trim(),
      deliveryType,
      deliveryAddress: deliveryType === "Home Delivery" ? deliveryAddress.trim() : deliveryAddress.trim() || "",
      phone: phone.trim(),
      paymentMethod,
      specialInstructions: specialInstructions.trim(),
    });
  };

  return (
    <div className="lm-modal-overlay" onClick={onClose}>
      <div className="lm-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Request List (No Shop Browsing)</h2>

        {validationErrors.length > 0 ? (
          <div className="lm-validation-list">
            {validationErrors.map((e) => (
              <p key={e} className="lm-validation-item">
                {e}
              </p>
            ))}
          </div>
        ) : null}

        <div className="lm-form">
          <textarea
            rows={4}
            placeholder="Describe items you want (e.g., 1kg tomatoes, 500g onions...)"
            value={requestedItemsText}
            onChange={(e) => setRequestedItemsText(e.target.value)}
          />

          <input
            type="text"
            placeholder="Preferred shop name (optional)"
            value={preferredShopName}
            onChange={(e) => setPreferredShopName(e.target.value)}
          />

          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
          >
            {DELIVERY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={deliveryType === "Home Delivery" ? "Delivery Address" : "Pickup instructions (optional)"}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
          />

          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Special Instructions (Optional)"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
          />
        </div>

        <div className="lm-modal-buttons">
          <button
            className="lm-btn lm-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
          <button className="lm-btn lm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestListModal;

