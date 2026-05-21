# AstroNila Astrology Module Architecture Diagram

## High-level overview

```mermaid
flowchart TB
  User[User / Consultant / Admin]

  subgraph Frontend[Frontend React App]
    AH[AstrologyHome]
    QS[AstrologyQuickStartPanel]
    TV[TodayView]
    KV[KundliView]
    CV[ConsultView]
    AD[AnalyticsDashboard]
    CAP[ConsultantAdminPanel]
    SVC[astrologyService]
  end

  subgraph Backend[Backend Express API]
    AR[backend/routes/astrology.js]
    ASD[backend/utils/astrologyData.js]
    ASB[backend/services/astrologyBackendService.js]
    ASP[backend/services/astrologyProviderService.js]
    AP[Auth / Middleware]
    DB[(MongoDB / Data Store)]
    RZ[Razorpay]
    NTF[NotificationService]
    ABT[ABTestingService]
  end

  subgraph Reports[Generated Outputs]
    PDF1[Kundli PDF]
    PDF2[Horoscope PDF]
    PDF3[Analytics PDF/CSV]
  end

  User --> AH
  AH --> QS
  AH --> TV
  AH --> KV
  AH --> CV
  AH --> AD
  AH --> CAP
  AH --> SVC

  SVC --> AR
  AR --> AP
  AR --> ASD
  AR --> ASB
  AR --> ASP
  AR --> DB
  AR --> RZ
  AR --> NTF
  AR --> ABT

  AR --> PDF1
  AR --> PDF2
  AR --> PDF3

  ASD --> AR
  ASB --> AR
  ASP --> AR
```

## Component responsibilities

### Frontend
- **AstrologyHome**  
  Main entry screen that orchestrates the module tabs, profile state, and sign selection.
- **AstrologyQuickStartPanel**  
  Fast onboarding for profile and initial astrology actions.
- **TodayView**  
  Displays daily horoscope, guidance, panchangam, and report actions.
- **KundliView**  
  Handles birth-data-based astrology, charts, and Kundli export.
- **ConsultView**  
  Lets users book consultations and manage consultation flows.
- **AnalyticsDashboard**  
  Admin-only dashboard for operational analytics and exports.
- **ConsultantAdminPanel**  
  Consultant/admin dashboard for bookings, availability, and profile editing.
- **astrologyService**  
  API client and fallback-data layer for frontend requests.

### Backend
- **routes/astrology.js**  
  Main API router for astrology-related endpoints.
- **utils/astrologyData.js**  
  Zodiac metadata and deterministic horoscope generation.
- **services/astrologyBackendService.js**  
  Core business logic for astrology calculations, reports, analytics, and booking helpers.
- **services/astrologyProviderService.js**  
  External provider integration with fallback behavior.
- **middleware/auth**  
  Authentication and authorization guard.
- **MongoDB / Data Store**  
  Stores profiles, bookings, consultant data, and operational records.
- **Razorpay**  
  Handles payment order creation and verification.
- **NotificationService**  
  Sends booking confirmations and consultant notifications.
- **ABTestingService**  
  Tracks experiments and user variants.

## Request flow

1. User interacts with the astrology UI.
2. Frontend calls `astrologyService`.
3. Service sends HTTP requests to `/api/astrology/*`.
4. Backend validates auth and request payloads.
5. Route delegates to services, storage, or providers.
6. Response is normalized and returned to the UI.
7. UI renders live data or fallback content.

## Data flow by feature

### Daily horoscope
`User -> AstrologyHome -> astrologyService -> /api/astrology/daily/:sign -> astrologyData -> response`

### Profile save
`User -> Profile form -> astrologyService -> /api/astrology/profile -> MongoDB`

### Kundli generation
`User -> KundliView -> astrologyService -> /api/astrology/kundli -> astrologyBackendService -> PDF/data`

### Consultation booking
`User -> ConsultView -> astrologyService -> /api/astrology/consultations/book -> DB + NotificationService`

### Payments
`User -> consultation payment -> astrologyService -> /api/astrology/consultations/:bookingId/payment/* -> Razorpay + DB`

### Analytics
`Admin -> AnalyticsDashboard -> astrologyService -> /api/astrology/analytics/* -> aggregation + export`

## Mermaid sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend UI
  participant S as astrologyService
  participant R as /api/astrology route
  participant D as Data / Services

  U->>F: Select sign / open feature
  F->>S: Request data
  S->>R: HTTP call
  R->>D: Validate + compute + fetch
  D-->>R: Result
  R-->>S: JSON / PDF / blob
  S-->>F: Normalized response
  F-->>U: Render content
```

## Notes

- The module is built as a full-stack feature, so the frontend and backend should be changed together.
- PDF and CSV exports are handled server-side.
- Fallback data is used when external providers are unavailable.
- Admin-only and consultant-only paths rely on role checks in the backend and UI.

## Related docs

- `docs/astrology-user-manual.md`
- `docs/astrology-technical-reference.md`
