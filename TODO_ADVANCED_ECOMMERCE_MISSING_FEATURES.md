# TODO: Missing Advanced Ecommerce Features (GlobeMart)

## Scope (based on checklist gaps)
1. Coupons / Promo codes (customer)
2. Order Cancel (customer)
3. Delivery OTP + Delivery Proof + Google Maps link (delivery/partner + UI)
4. Vendor Settlement + Commission + Settlement reports (vendor)
5. Abandoned Cart reminder (customer retention)
6. Inventory Alerts (low/out-of-stock proactive alerts)

---

## Implementation Order (recommended)
### Phase 1 (core checkout/order lifecycle)
- [ ] Add coupon validation + application in backend checkout flow
- [ ] Add coupon UI + wiring in `src/modules/ecommerce/CartPage.js`
- [ ] Ensure discount amount is reflected in order amount/subtotal/delivery summary
- [ ] Add customer order cancel endpoint in backend and restore/release stock rules
- [ ] Add cancel UI + button + confirm modal in `src/modules/ecommerce/OrdersPage.js`
- [ ] Add cancel status handling in seller fulfillment progression and invoice generation guards

### Phase 2 (delivery verification)
- [ ] Add delivery proof upload + OTP verification endpoint
- [ ] Add optional delivery location (lat/lng) capture and google maps link builder
- [ ] Update tracking UI to show OTP/proof status

### Phase 3 (vendor settlement)
- [ ] Add commission calculation rules (admin commission % or product-level)
- [ ] Add settlement endpoints + settlement report generation (PDF optional)
- [ ] Add vendor settlement UI in `src/modules/ecommerce/Ecommerce.js`

### Phase 4 (growth + alerts)
- [ ] Add abandoned cart reminder scheduler/job + dispatch logic (email/SMS/WhatsApp optional)
- [ ] Add inventory alert rules + alert delivery (at least seller dashboard list UI first)

---

## Verification Checklist (after each phase)
- [ ] Cart with coupon applies discount and order totals match backend
- [ ] Cancel works only for allowed states, releases inventory, and does not generate invoice
- [ ] Delivered path still generates GST invoice
- [ ] Delivery proof/OTP updates order fulfillment status timeline
- [ ] Seller analytics/settlement shows commission totals consistent with order items

---

## Notes
- This repo currently has solid foundations for: cart/checkout, payments, returns/refunds, and GST invoice download.
- The missing items above require both frontend UI and backend endpoints + order/inventory state changes.

