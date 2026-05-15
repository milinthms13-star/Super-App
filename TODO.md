# TODO - Local Market & Grocery Delivery (List-based requests)


## Plan (approved)
1. Backend: update `LocalMarketOrder` model to support shop-less creation and counter-payment fields.
2. Backend: add new routes/endpoints for list-based order request + delivery acceptance + shop assignment + counter-paid.
3. Backend: keep existing shop-cart flow intact (do not break `POST /api/localmarket/orders` or review/status update).
4. Frontend: add buyer “Request List (No shop browsing)” mode.
5. Frontend: implement delivery role UI to accept and proceed through shop assignment + delivery completion.
6. Frontend: add service functions + update Orders list rendering for new statuses/payment scheme.
7. Tests/smoke: run backend tests and verify endpoints via cURL.

## Progress
- [x] Step 1: Backend model update
- [x] Step 2: Backend routes
- [x] Step 3: Frontend buyer mode
- [x] Step 4: Frontend delivery UI
- [x] Step 5: Frontend wiring (service/components)
- [ ] Step 6: Tests + smoke

