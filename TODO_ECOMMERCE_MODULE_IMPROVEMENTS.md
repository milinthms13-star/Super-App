# Ecommerce (GlobeMart) Module Improvements - Progress Tracker

## Approved Plan Summary
- **High-Priority:** Security (image scan), Perf (pagination), Reliability (queue).
- **Medium:** UX split components, cart sync.
- **Low:** Tests, image zoom.

**Status:** ✅ User approved. Implementing step-by-step.

## TODO Steps (Mark ~~complete~~)

### Phase 1: Security & Perf
- [x] 1. Image security scan ✅ (pre-scan Sharp + ClamAV)
- [x] 2. Cursor pagination ✅ (orders/mine, orderStore + devOrderStore support cursor/limit)
- [x] 3. Order queue BullMQ ✅ (backend/jobs/orderQueue.js)
- [x] 4. Test Phase 1 ✅

### Phase 2: UX/Reliability
- [x] 5. Split Ecommerce.js components ✅ (EcommerceMarketplace.js, EcommerceSellerWorkspace.js)
- [x] 6. Cart PWA localStorage sync ✅ (useCart.js hook)
- [x] 7. Webhook signatures ✅ (orders.js Razorpay/Stripe verification)

### Phase 3: Polish
- [ ] 8. E2E tests Cypress
- [x] 9. Image zoom/lightbox ✅ (ProductCard hover + quickview)
- [ ] 10. Verify & complete

**Next:** Phase 1 Step 1 - Image security.
**Deps:** `cd backend && npm i clamav.js bullmq`
**Track:** Update after each step. attempt_completion at end.
