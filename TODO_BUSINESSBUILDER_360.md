# TODO_BUSINESSBUILDER_360

## Step 1 — Remove roadmap180/plan shape hacks
- [ ] Update `normalize10xPlanShape()` to always provide `roadmap180`.
- [ ] Ensure AI parsing + fallback generation both produce `roadmap180` as a string or canonical format.
- [ ] Remove the current “360 fix” workaround block inside `generateBusinessPlanAI()`.
- [ ] Make PDF generator handle canonical plan format consistently.

## Step 2 — Fix analytics correctness
- [ ] Rework `getMiniAppFunnel()` to compute metrics using event/order state consistently.
- [ ] Rework `getBusinessAnalyticsDashboard()` attribution by source to avoid mixing leads/orders incorrectly.
- [ ] Where possible, use Mongo aggregation to avoid loading whole collections.

## Step 3 — Strengthen payment webhook idempotency
- [ ] Add idempotency using payment.orderReference + payment status reference check.
- [ ] (If needed) extend Order schema and service logic to store `webhookEventId`/idempotency key.

## Step 4 — Wire 360 growth loop attribution
- [ ] Ensure asset attribution updates are triggered consistently across: view/click/lead/order_paid.
- [ ] Ensure leads/orders use `attribution.sourceAssetId` from the originating asset.
- [ ] Ensure `createOrderBySlug()` persists sourceAssetId into order.attribution.

## Step 5 — Reliability / maintainability
- [ ] Centralize enum normalization for eventType/source/assetType.
- [ ] Add minimal structured logging for key flows.
- [ ] Add input validation helpers for public endpoints.


