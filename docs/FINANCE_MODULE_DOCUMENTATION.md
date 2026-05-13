# Finance Module Technical Documentation

## Module summary
- Frontend entry: `src/modules/finance/FinanceHub.js`
- Frontend API client: `src/modules/finance/financeApi.js`
- Backend route: `backend/routes/finance.js`
- Backend models:
  - `backend/models/FinanceLead.js`
  - `backend/models/FinanceInstitution.js`
  - `backend/models/FinanceEligibilityRecord.js`
  - `backend/models/FinanceAuditLog.js`

Finance Hub provides:
- institution discovery
- eligibility scoring
- lead submission with document upload
- user tracking dashboard
- consultant workflow updates
- admin commission and audit workflow

## Security and access control
- Public, rate-limited:
  - `GET /api/finance/institutions`
  - `POST /api/finance/eligibility`
- Authenticated lead intake:
  - `POST /api/finance/leads`
- Authenticated and role-restricted workflow routes:
  - consultant/admin guarded: lead listing, assignment, status, consultant dashboard
  - institution guarded: institution dashboard
  - finance admin guarded: admin dashboard, commission dashboard, audit feed, commission updates
- Self-data protections:
  - user dashboard access is restricted to account phone for non-privileged users
  - data deletion requests are restricted to account phone for non-admin users

## Data protection controls
- Finance documents are stored under backend private path:
  - `backend/private/finance-docs`
- Document paths are not returned as public URLs in user-facing responses.
- Lead responses are sanitized before returning from backend dashboards.
- Audit actor details are derived from authenticated user context, not from client-supplied role fields.

## Rate limiting
- Public read limiter: lightweight discovery/eligibility endpoints
- Lead create limiter: submission throttling for abuse resistance
- Secure action limiter: workflow mutation/read protection for privileged endpoints

## Operational checklist for go-live
1. Set and verify production `JWT_SECRET`.
2. Confirm CORS `FRONTEND_URL` values for production domains only.
3. Ensure backups and retention policy for finance collections.
4. Restrict filesystem and backup access to `backend/private/finance-docs`.
5. Add monitoring alerts for repeated 401/403/429 patterns in finance routes.
6. Run end-to-end finance smoke tests in staging before production deployment.

## Known follow-up items
- Add dedicated finance backend integration tests for:
  - RBAC matrix (user/consultant/admin/institution)
  - self-data access controls
  - audit logging coverage
  - upload validation and error handling
- Add frontend tests for role-gated workflow rendering and restricted actions.
