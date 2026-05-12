# Local Services User Manual (Front-End)

> Module: `src/modules/localservices/LocalServicesMarketplace.js`

## 1) What this module does
Local Services Marketplace helps users discover local service providers (e.g., home services, professional services) and request/engage them through the module’s workflows.

## 2) Entry point
1. Login.
2. Open **Local Services** from navigation.
3. The module typically starts on a services listing or category selection screen.

## 3) Step-by-step user flows

### 3.1 Browse/search local services
1. Open Local Services.
2. Browse service categories or provider cards.
3. Use search/filters if provided.
4. Click a provider/service to open details.

Expected result:
- Details page displays description, pricing/terms (if available), and available actions.

### 3.2 Request/booking a service
1. On the detail page, click **Request**, **Book**, or **Get started**.
2. Fill the required form:
   - service requirements
   - preferred date/time (if applicable)
   - contact details (if prompted)
3. Submit the request.

Expected result:
- Request is created and shown in “My Requests” or the status area (if supported).

### 3.3 Track request status
1. Open **My Requests** / **Activity** section (if present).
2. Locate your request.
3. Review status updates and next actions.

Expected result:
- Status transitions are visible (pending/confirmed/in-progress/completed).

## 4) Troubleshooting (UI-level)
- Request doesn’t submit:
  - Verify login/session.
  - Ensure required form fields are completed.
  - Retry after checking network.
- Empty results:
  - Clear filters and search again.

## 5) UI sections reference
- Service/provider listing + filters
- Service detail view
- Request/booking form
- Requests/activity tracking
