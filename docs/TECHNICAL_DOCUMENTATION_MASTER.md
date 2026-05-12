# TECHNICAL DOCUMENTATION MASTER — MalabarBazaar

> Engineering roll-up: architecture, technical entry points, integration readiness, and cross-cutting state model.

## 1) Documentation entry points (where to go deeper)
- Module technical docs index: `docs/TECHNICAL_DOCUMENTATION_INDEX.md`
- User-facing workflows index (per module): `docs/user-manuals/INDEX.md`
- Auth/User technical doc (foundation): see `USER_MODULE_DOCUMENTATION.md` in repo root and module docs under `docs/*_MODULE_DOCUMENTATION.md`

---

## 2) System architecture (high level)
MalabarBazaar uses:
- **Frontend**: React-based app (module-based under `src/modules/*`)
- **Backend**: Node/Express with modular routes under `backend/routes/*`
- **Data**: MongoDB via Mongoose models under `backend/models/*`
- **Cross-platform**: Capacitor config exists (`capacitor.config.json`), suggesting mobile wrappers.

---

## 3) Cross-cutting technical foundation: User / Auth module
### 3.1 Frontend entry points
- `src/App.js`
  - app bootstrap
  - session restore (calls backend `/auth/me`)
  - login success orchestration and role routing
- `src/components/Login.js`
  - OTP send/verify UI
- `src/contexts/AppContext.js`
  - anchors user state for cart/favorites/saved addresses
- `src/utils/auth.js`
  - token storage helpers

### 3.2 Backend entry points
- `backend/routes/auth.js`
  - `POST /auth/send-otp`
  - `POST /auth/verify-otp`
  - `GET /auth/me`
  - `PATCH /auth/me`
  - `POST /auth/logout`
  - debug endpoints
- `backend/middleware/auth.js`
  - JWT validation + user resolution
- `backend/models/User.js`
- `backend/models/OtpToken.js`

### 3.3 State model contract
- Frontend relies on a **serialized user contract** (normalized shape returned from auth/me).
- Persisted user preference fields include:
  - language
  - onboarding flags
- Cart/favorites/saved addresses are persisted in user document via PATCH.

---

## 4) Module architecture pattern (what to expect)
Each module typically has:
- A UI entry component under `src/modules/<module>/*`
- A service layer under `src/services/*` (for API calls / simulation + fallbacks)
- A user manual under `docs/user-manuals/<module>/USER_MANUAL.md`
- A technical module doc under `docs/<MODULE>_MODULE_DOCUMENTATION.md` (naming varies)

### 4.1 Feature coverage docs
- `docs/*_FEATURES*.md` documents what exists in UI + service layer.

---

## 5) Polishing / design system (frontend)
The repo contains a technical reference for UI polish:
- `TECHNICAL_REFERENCE_GUIDE.md`
  - design tokens
  - animation library
  - glass effects
  - navigation architecture notes

This improves maintainability and consistent UX.

---

## 6) Security notes (cross-cutting)
- OTP is hashed before storage.
- OTP TTL expiration is enabled.
- OTP request rate limiting exists (Redis-based per notes).
- JWT is used for auth; middleware validates issuer/audience.
- Cookie strategy includes httpOnly and sameSite.

---

## 7) Integration readiness matrix (current repo reality)
Based on existing docs:
- Some modules are documented as **UI/state simulation** and are ready for backend wiring (example: Bill Pay doc indicates simulation with planned wiring).
- For each module, follow this sequence when integrating backend:
  1. Confirm UI entry points/components
  2. Confirm service layer methods and expected payloads
  3. Confirm backend routes/controllers
  4. Confirm models and persistence schema
  5. Validate auth gating via JWT and PATCH `/auth/me` dependencies

---

## 8) Where to find per-module technical details
Use `docs/TECHNICAL_DOCUMENTATION_INDEX.md` to open:
- `docs/<MODULE>_MODULE_DOCUMENTATION.md`
- `docs/user-manuals/<module>/USER_MANUAL.md`

---

## 9) Recommended next actions to reach “complete” coverage
1. Create/collect remaining module docs under `docs/` using naming from the index.
2. Update this master roll-up with:
   - per-module entrypoints
   - key backend routes/models
   - API contracts
   - state persistence mappings


