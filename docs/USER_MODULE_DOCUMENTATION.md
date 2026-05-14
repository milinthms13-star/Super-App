# User Module Documentation

## Overview

The user module in NilaHub is the foundation for authentication, session management, profile data, role handling, and user-linked feature persistence across the app.

This module is not limited to "login". It also controls:

- OTP-based authentication
- session restoration
- user profile updates
- language preference persistence
- storefront state persistence for cart, favorites, and saved addresses
- role-aware access for user, entrepreneur, and admin experiences
- profile enrichment used by modules like SoulMatch

The implementation spans both the frontend and backend.

## Primary Files

### Frontend

- `src/App.js`
  Handles bootstrap, session restore, login success, logout, role routing, and registration application submission.
- `src/components/LaunchPage.js`
  Entry screen for choosing login, user registration, or entrepreneur registration.
- `src/components/Login.js`
  Main auth UI for OTP send/verify, role-aware login, and registration forms.
- `src/contexts/AppContext.js`
  Uses the authenticated user as the anchor for cart, favorites, saved addresses, orders, and other module state.
- `src/utils/auth.js`
  Local token storage helpers.
- `src/modules/matrimonial/Matrimonial.js`
  Reads and updates extended user profile data and onboarding preferences.

### Backend

- `backend/models/User.js`
  Main persistent user profile model.
- `backend/models/OtpToken.js`
  Stores hashed OTP tokens with expiry.
- `backend/routes/auth.js`
  Exposes OTP auth, session, profile, logout, Gmail auth setup, and a debug endpoint.
- `backend/middleware/auth.js`
  JWT validation and authenticated user resolution.
- `backend/utils/devAuthStore.js`
  In-memory auth store for local development when `AUTH_STORAGE=memory`.
- `backend/routes/appData.js`
  Stores registration applications and `registeredAccounts`, especially for entrepreneur onboarding.

## Module Responsibilities

The user module is responsible for four major concerns:

1. Identity and access
   Email-based OTP login, JWT issuance, cookie support, and authenticated session restore.

2. User profile lifecycle
   Create default users, read current profile, patch profile fields, and persist preferences.

3. Role and registration management
   Support standard users, entrepreneurs, and admin access, plus entrepreneur registration review workflows.

4. Cross-module user state
   Make user data available to ecommerce, matrimonial, SOS, navigation, and other modules.

## Domain Model

### 1. User model

Defined in `backend/models/User.js`.

The `User` document stores:

- Core identity: `email`, `name`, `avatar`, `phone`
- Personal profile: `age`, `gender`, `religion`, `caste`, `community`, `education`, `profession`, `location`
- Matrimonial profile: `maritalStatus`, `familyDetails`, `bio`, `languages`, `hobbies`
- Privacy settings: `privacy.hidePhone`, `privacy.hidePhotos`, `premiumOnlyContact`
- Business fields: `businessName`, `selectedBusinessCategories`, `selectedCategoryDetails`
- Role fields: `registrationType`, `role`, `roles`
- Commerce state: `cart`, `favorites`, `savedAddresses`
- Preferences: `preferences.language`, plus feature flags like `preferences.soulmatchOnboardingSeen`
- Reputation data: `classifiedsTotalRating`, `classifiedsReviewCount`
- Audit timestamps: `createdAt`, `updatedAt`

### 2. OTP token model

Defined in `backend/models/OtpToken.js`.

Each OTP record stores:

- `email`
- `otpHash`
- `expiresAt`
- `used`
- `createdAt`

Important behavior:

- OTP values are never stored in plain text.
- A TTL index auto-removes expired OTPs.
- Only the latest valid unused OTP is accepted.

### 3. Registered account metadata

Stored in shared app data through `backend/routes/appData.js`, not in the `User` model alone.

This layer tracks:

- which roles an email has registered for
- entrepreneur registration submissions
- uploaded registration document metadata
- entrepreneur approval status
- category selections and related fees

This means the system uses both:

- `User` collection data for authenticated profile/session state
- shared app-data records for registration/admin workflow state

## Role Model

The implementation uses two related role concepts:

- `registrationType`
  Values like `user`, `entrepreneur`, `admin`
- `role`
  Values like `user`, `business`, `admin`

In practice:

- a normal user usually has `registrationType: "user"` and `role: "user"`
- an entrepreneur usually has `registrationType: "entrepreneur"` and `role: "business"`
- an admin uses `registrationType: "admin"` and `role: "admin"`

The `roles` array is used to remember which registration types a single email has access to.

## Authentication Flow

### Step 1: launch selection

From `src/components/LaunchPage.js`, the user chooses one of:

- Login
- Register as User
- Register as Entrepreneur

Feature cards can also send the user into login with a target module queued in `pendingModule`.

### Step 2: OTP request

`src/components/Login.js` calls:

- `POST /auth/send-otp`

Validation depends on flow:

- user registration requires name, phone, and terms acceptance
- entrepreneur registration requires business and document metadata before OTP is sent
- login flow checks whether the email is already registered for the selected role
- admin flow only allows the hardcoded admin email: `mgdhanyamohan@gmail.com`

Backend behavior in `backend/routes/auth.js`:

- validates email with Joi
- rate-limits OTP requests using Redis cache
- generates a 6-digit OTP
- hashes the OTP with SHA-256
- upserts or resolves a user record
- sends the OTP by Gmail API, SES, SMTP, or development fallback

### Step 3: OTP verification

`src/components/Login.js` calls:

- `POST /auth/verify-otp`

Backend behavior:

- validates email and 6-digit OTP
- resolves the latest active OTP
- compares the incoming OTP hash
- invalidates the token after success
- increments failure counters on invalid attempts
- issues a JWT
- sets the `mb_auth_token` cookie
- returns `{ token, user }`

### Step 4: frontend login success

After verification, `src/components/Login.js` merges backend user data with flow-specific data:

- user registration injects entered name and phone
- entrepreneur registration injects business fields and selected categories
- admin flow forces admin identity fields
- login flow maps the selected login role into `registrationType` and `role`

Then `onLoginSuccess` in `src/App.js`:

- stores the JWT in local storage
- sets the axios `Authorization` header
- reloads public or admin app data
- patches `/auth/me` to persist the resolved role and related profile fields
- updates `loggedInUser`
- routes the user to dashboard, admin dashboard, or the pending module

### Step 5: session restore

On app bootstrap, `src/App.js`:

- fetches public app data
- calls `GET /auth/me`
- restores the logged-in session if valid
- clears local auth state if the backend returns `401`

This allows refresh-safe sessions without forcing the user to log in again.

## Auth API Surface

### `POST /auth/send-otp`

Purpose:

- start authentication by email OTP

Returns:

- success message
- serialized user
- `devOtp` in development fallback mode

### `POST /auth/verify-otp`

Purpose:

- verify the OTP and create a session

Returns:

- JWT token
- serialized user

### `GET /auth/me`

Purpose:

- return the currently authenticated user

Used by:

- app bootstrap
- session restore

### `PATCH /auth/me`

Purpose:

- update the authenticated user's profile

Used for:

- role persistence after login
- language changes
- cart/favorites/address sync
- SoulMatch onboarding flag updates
- profile editing

### `POST /auth/logout`

Purpose:

- clear the auth cookie on the backend

Frontend also clears:

- stored JWT
- axios auth header
- logged-in user state

### `GET /auth/debug/user/:email`

Purpose:

- development/admin diagnostic endpoint to check whether a user exists in MongoDB

## User Serialization Contract

The backend does not return the raw Mongoose document directly. `serializeUser` in `backend/routes/auth.js` normalizes the response shape sent to the frontend.

Returned fields include:

- `id`
- identity and profile fields
- privacy fields
- role and registration fields
- business category selections
- `cart`, `favorites`, `savedAddresses`
- `preferences.language`
- `preferences.soulmatchOnboardingSeen`

This serialized shape is the main contract the frontend relies on.

## Registration Workflows

### User registration

Flow:

1. User enters name, phone, email, and accepts terms.
2. OTP is sent.
3. OTP is verified.
4. Frontend submits a lightweight registration record through `onRegistrationSubmit`.
5. `handleLoginSuccess` persists the active role into `/auth/me`.

Result:

- authenticated user session
- user profile seeded with basic identity data
- `registeredAccounts` updated for that email

### Entrepreneur registration

Flow:

1. User enters identity, business, category, fee acknowledgement, and document metadata.
2. OTP is sent.
3. OTP is verified.
4. Frontend submits a multipart registration application to:
   `POST /app-data/registration-applications`
5. Backend updates both:
   - `User` profile data
   - shared app-data records for `registrationApplications` and `registeredAccounts`
6. Admin later reviews the application through:
   `PATCH /app-data/registration-applications/:applicationId/review`

Result:

- authenticated session can begin immediately
- entrepreneur approval lifecycle is tracked separately in app data

### Admin access

Admin entry is handled in the frontend login component with a fixed allowed email:

- `mgdhanyamohan@gmail.com`

If verified, the frontend forces:

- `registrationType: "admin"`
- `role: "admin"`
- `avatar: "A"`

Admin-only backend routes rely on authenticated user role checks.

## Frontend State Integration

### App-level auth state

`src/App.js` keeps:

- `authToken`
- `isLoggedIn`
- `loggedInUser`
- `registrationType`
- `pendingModule`
- `language`

This file is the top-level orchestrator for the module.

### Persistent token storage

`src/utils/auth.js` stores the JWT in:

- `mb_auth_token`
- legacy fallback key `token`

### Context-level user usage

`src/contexts/AppContext.js` derives `currentUser` from `loggedInUser`.

That user object drives:

- cart hydration
- favorites hydration
- saved address hydration
- authenticated PATCH sync back to `/auth/me`
- seller/account capability checks
- module-specific fetch authorization headers

If no authenticated user exists, the context falls back to a demo-like default user object.

## Profile Updates and Feature Dependencies

### Language preference

Changing app language while logged in triggers:

- `PATCH /auth/me`

Stored under:

- `preferences.language`

### Storefront persistence

Cart, favorites, and saved addresses are synced through `AppContext` to:

- local storage snapshot
- service worker storefront sync
- backend user profile via `PATCH /auth/me`

### SoulMatch / matrimonial

The matrimonial module depends heavily on user profile data:

- age
- gender
- religion
- caste
- education
- profession
- location
- marital status
- family details
- bio
- languages
- hobbies
- privacy flags
- premium contact preference

It also marks first-time onboarding completion through:

- `preferences.soulmatchOnboardingSeen`

When the module updates profile data, it calls `onProfileUpdate`, which flows back into `src/App.js` and updates `loggedInUser`.

## Security and Validation

The current implementation includes several safety measures:

- OTPs are hashed before storage.
- OTPs expire automatically via TTL index.
- OTP request attempts are rate-limited using Redis.
- OTP verification failures are counted and can invalidate the token after repeated failures.
- JWT verification checks issuer and audience.
- Auth can come from either Bearer token or auth cookie.
- Sensitive cookie is `httpOnly` and `sameSite=lax`.
- In production, secure cookies are enabled.
- Joi validation strips unknown fields on profile patch requests.

## Development Mode Behavior

When:

- `AUTH_STORAGE=memory`
- and `NODE_ENV` is not production

the auth system can run fully in memory through `backend/utils/devAuthStore.js`.

In that mode:

- users are stored in memory maps
- OTPs are stored in memory
- a `devOtp` can be returned if real email delivery is not configured

This is useful for local testing but should not be relied on for production behavior.

## Known Implementation Notes

- The system is OTP-only. Password login is intentionally disabled.
- User records can be created during OTP send, before a full profile is completed.
- Entrepreneur registration metadata is split between the `User` collection and shared app data.
- The system distinguishes `registrationType` from `role`, so both fields must be understood when debugging permissions.
- Admin identity currently depends on a hardcoded frontend email constant.
- In non-production environments, JWT falls back to a development secret if `JWT_SECRET` is not set.

## Recommended Reading Order

For future development, read the module in this order:

1. `backend/models/User.js`
2. `backend/models/OtpToken.js`
3. `backend/middleware/auth.js`
4. `backend/routes/auth.js`
5. `backend/routes/appData.js`
6. `src/utils/auth.js`
7. `src/components/Login.js`
8. `src/App.js`
9. `src/contexts/AppContext.js`
10. `src/modules/matrimonial/Matrimonial.js`

## Summary

The NilaHub user module is a shared identity and profile platform rather than a narrow auth layer. It authenticates users through OTP, persists a normalized user profile, manages multi-role access, feeds module-level personalization, and acts as the main bridge between backend session state and frontend feature behavior.
