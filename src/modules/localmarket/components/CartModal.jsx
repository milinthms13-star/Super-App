import React from "react";
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS, PROMO_CODES } from "../constants";

function CartModal({
  cart,
  orderForm,
  onOrderFormChange,
  onClose,
  onUpdateQuantity,
  promoCodeInput,
  onPromoCodeInputChange,
  appliedPromo,
  onApplyPromo,
  cartTotals,
  onPlaceOrder,
  validationErrors,
  checkoutLoading,
}) {
  return (
    <div className="lm-modal-overlay" onClick={onClose}>
      <div className="lm-modal lm-checkout-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Checkout</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <div className="lm-cart-items">
              {cart.map((item) => (
                <div key={`${item.productId}-${item.shopId}`} className="lm-cart-item">
                  <span>
                    {item.image || "P"} {item.productName}
                  </span>
                  <div className="lm-quantity-control">
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.shopId, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.shopId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span>INR {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {validationErrors.length > 0 ? (
              <div className="lm-validation-list">
                {validationErrors.map((error) => (
                  <p key={error} className="lm-validation-item">
                    {error}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="lm-form">
              <input
                type="text"
                placeholder="Phone Number"
                value={orderForm.phoneNumber}
                onChange={(event) => onOrderFormChange("phoneNumber", event.target.value)}
              />
              <input
                type="text"
                placeholder="Delivery Address"
                value={orderForm.deliveryAddress}
                onChange={(event) => onOrderFormChange("deliveryAddress", event.target.value)}
              />
              <select
                value={orderForm.deliveryType}
                onChange={(event) => onOrderFormChange("deliveryType", event.target.value)}
              >
                {DELIVERY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={orderForm.paymentMethod}
                onChange={(event) => onOrderFormChange("paymentMethod", event.target.value)}
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
                value={orderForm.specialInstructions}
                onChange={(event) => onOrderFormChange("specialInstructions", event.target.value)}
              />
            </div>

            <div className="lm-promo-section">
              <h4>Apply Promo Code</h4>
              <div className="lm-form">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCodeInput}
                  onChange={(event) => onPromoCodeInputChange(event.target.value.toUpperCase())}
                />
                <button className="lm-btn lm-btn-secondary" onClick={onApplyPromo}>
                  Apply Promo
                </button>
              </div>
              <div className="lm-promo-codes">
                {Object.entries(PROMO_CODES).map(([code, details]) => (
                  <button
                    key={code}
                    className={`lm-promo-btn ${appliedPromo === code ? "applied" : ""}`}
                    onClick={() => onPromoCodeInputChange(code)}
                  >
                    {code} - {details.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lm-price-breakdown">
              <p>
                <span>Subtotal</span>
                <span>INR {cartTotals.subtotal.toFixed(2)}</span>
              </p>
              <p>
                <span>Discount</span>
                <span>- INR {cartTotals.discount.toFixed(2)}</span>
              </p>
              <p>
                <span>Delivery</span>
                <span>INR {cartTotals.delivery.toFixed(2)}</span>
              </p>
              <h3>
                <span>Total</span>
                <span>INR {cartTotals.total.toFixed(2)}</span>
              </h3>
            </div>

            <div className="lm-modal-buttons">
              <button className="lm-btn lm-btn-primary" onClick={onPlaceOrder} disabled={checkoutLoading}>
                {checkoutLoading ? "Placing..." : "Place Order"}
              </button>
              <button className="lm-btn lm-btn-secondary" onClick={onClose}>
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CartModal;
