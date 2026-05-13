# Hyperlocal Module Technical Documentation

## Overview
The Hyperlocal module provides marketplace-style local delivery across grocery, pharmacy, food, parcel, and other nearby service categories.

- Frontend entrypoint: `src/modules/hyperlocal/HyperlocalDeliveryHub.js`
- API base route: `/api/hyperlocal`
- User-facing product name: **Nila Hyperlocal Delivery**

## Key Capabilities
- Nearby shop discovery with category filtering
- Instant and scheduled orders
- Multi-shop order support
- Prescription upload and emergency pharmacy requests
- Vendor onboarding and product management
- Delivery partner onboarding, availability toggle, and job acceptance
- Admin approval workflows, analytics, and settlement reporting
- Wallet topup, subscription plans, and local advertising

## Frontend/Backend Integration
### Frontend
- `src/modules/hyperlocal/hyperlocalApi.js` wraps backend endpoints
- `HyperlocalDeliveryHub.js` loads bootstrap data, shops, addresses, and orders
- UI sections include: user order flow, vendor dashboard, partner dashboard, admin panel, wallet/growth

### Backend
- `backend/routes/hyperlocal.js` implements all Hyperlocal API routes
- `backend/models/hyperlocal.js` defines MongoDB schemas and models
- `backend/server.js` mounts the module at `/api/hyperlocal`

## API Endpoints
### Public
- `GET /api/hyperlocal/bootstrap`
- `GET /api/hyperlocal/shops`

### User
- `POST /api/hyperlocal/cart/quote`
- `POST /api/hyperlocal/orders`
- `GET /api/hyperlocal/orders`
- `GET /api/hyperlocal/orders/:orderId/track`
- `POST /api/hyperlocal/orders/:orderId/cancel`
- `POST /api/hyperlocal/orders/:orderId/refund-request`
- `POST /api/hyperlocal/orders/:orderId/complaint`
- `POST /api/hyperlocal/addresses`
- `GET /api/hyperlocal/addresses`
- `GET /api/hyperlocal/wallet/me`
- `POST /api/hyperlocal/wallet/topup`
- `GET /api/hyperlocal/subscriptions/plans`
- `POST /api/hyperlocal/subscriptions/subscribe`
- `GET /api/hyperlocal/subscriptions/me`

### Vendor
- `POST /api/hyperlocal/vendor/shops`
- `GET /api/hyperlocal/vendor/shops`
- `POST /api/hyperlocal/vendor/shops/:shopId/products`
- `PATCH /api/hyperlocal/vendor/shops/:shopId/products/:productId`
- `PATCH /api/hyperlocal/vendor/shops/:shopId/open-status`
- `PATCH /api/hyperlocal/vendor/shops/:shopId/opening-hours`
- `GET /api/hyperlocal/vendor/orders`
- `GET /api/hyperlocal/vendor/settlements`
- `GET /api/hyperlocal/vendor/analytics`
- `PATCH /api/hyperlocal/vendor/orders/:orderId/action`

### Partner
- `POST /api/hyperlocal/partners/apply`
- `GET /api/hyperlocal/partners/me`
- `GET /api/hyperlocal/partners/jobs`
- `PATCH /api/hyperlocal/partners/:partnerId/availability`
- `POST /api/hyperlocal/partners/jobs/:orderId/accept`
- `POST /api/hyperlocal/partners/jobs/:orderId/reject`
- `POST /api/hyperlocal/partners/jobs/:orderId/update`
- `GET /api/hyperlocal/partners/:partnerId/wallet`
- `POST /api/hyperlocal/partners/:partnerId/payouts/request`

### Admin
- `PATCH /api/hyperlocal/admin/shops/:shopId/approval`
- `PATCH /api/hyperlocal/admin/partners/:partnerId/approval`
- `GET /api/hyperlocal/admin/pending-shops`
- `GET /api/hyperlocal/admin/pending-partners`
- `PATCH /api/hyperlocal/admin/config`
- `GET /api/hyperlocal/admin/analytics`
- `GET /api/hyperlocal/admin/refunds`
- `PATCH /api/hyperlocal/admin/refunds/:refundId/review`
- `GET /api/hyperlocal/admin/complaints`
- `PATCH /api/hyperlocal/admin/complaints/:complaintId/resolve`
- `GET /api/hyperlocal/admin/settlement-reports`

## Production Readiness Status
- ✅ Module is mounted in backend under `/api/hyperlocal`
- ✅ Frontend route available at `/hyperlocal`
- ✅ Shop discovery and ordering are implemented
- ✅ Vendor and partner workflows are implemented
- ✅ Admin workflows are implemented
- ✅ Wallet/topup/subscription flows are implemented
- ✅ Refund and complaint workflows now persist in Mongo when DB is available
- ✅ Missing technical documentation file added

## Go-live checklist
- [ ] Confirm backend JWT auth and `authenticate` middleware are active
- [ ] Confirm MongoDB connection is healthy and `Hyperlocal` collections are populated
- [ ] Ensure `backend/uploads/hyperlocal` is writable for prescription and KYC uploads
- [ ] Verify admin email/role rules permit the `/admin` endpoints
- [ ] Perform end-to-end validation of order placement, delivery partner acceptance, refund request, and admin review
- [ ] Run the frontend build and smoke test the `/hyperlocal` module UI
