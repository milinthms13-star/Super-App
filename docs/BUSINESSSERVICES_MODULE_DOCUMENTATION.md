# BusinessServices Module Documentation

## Overview
The `BusinessServices` module provides a catalog of business support offerings (registration, compliance, legal, accounting, digital services) and allows users to place and track service orders.

## Frontend
- Entry component: `src/modules/businessservices/BusinessServices.js`
- Styles: `src/modules/businessservices/BusinessServices.css`
- Core flows:
  - Browse categories and services
  - View service details (documents, packages, timeline, FAQ)
  - Submit order via multipart payload (`pricing`, `formData`, optional documents)
  - Track order status and download invoice
  - Book consultation/callback through order flow

## Backend
- Route: `backend/routes/businessServices.js`
- Model: `backend/models/BusinessServiceOrder.js`
- Catalog model: `backend/models/BusinessServiceCatalog.js`
- Interaction model: `backend/models/BusinessServiceInteraction.js`
- Mounted path: `/api/business-services`
- Key endpoints:
  - `GET /catalog`: read DB-configured services catalog
  - `POST /orders`: create order with optional document uploads
  - `POST /interactions`: persist chat/call/consult/vendor contact intents
  - `GET /orders/me`: list customer orders
  - `GET /orders/:orderId/invoice/pdf`: generate invoice PDF
  - `PATCH /orders/:orderId/status`: admin status update

## Status Lifecycle
Supported statuses are:
- `submitted`
- `under-review`
- `processing`
- `completed`

Legacy display statuses are normalized in the frontend timeline for compatibility.

## Validation Notes
- Multipart `pricing` and `formData` are sent as JSON strings by the UI and parsed server-side before Joi validation.
- Required order fields are validated in the UI before submission.

## DB Catalog Requirement
- Frontend no longer uses in-memory service catalog data.
- Catalog must exist in MongoDB collection `businessservicecatalogs` (`key: default`).
- Seed command:
  - `cd backend`
  - `npm run seed:business-services-catalog`

## Tests
- Frontend helper tests: `src/modules/businessservices/BusinessServices.test.js`
- Backend route/helper tests: `backend/tests/businessServices.route.test.js`
