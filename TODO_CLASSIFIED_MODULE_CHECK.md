# Classified Module Functional Feature Check - TODO

## Issues Identified & Fix Plan

### 1. CRITICAL: Frontend Review Bug ✅ FIXED
- **File**: `src/modules/classifieds/Classifieds.js`
- **Issue**: `handleSubmitReview` called `reportClassifiedListing` instead of `addClassifiedReview`
- **Fix**: Changed API call to use correct `addClassifiedReview` function

### 2. HIGH: Rate Limiters Not Applied ✅ FIXED
- **File**: `backend/routes/appData.js`
- **Issue**: `classifiedsRateLimiter.js` middleware defined but never used
- **Fix**: Imported and applied rate limiters to classified routes:
  - `createListingLimiter` on POST /classifieds/listings
  - `messageLimiter` on POST /classifieds/listings/:id/messages
  - `reportLimiter` on POST /classifieds/listings/:id/reports
  - `searchLimiter` on GET /classifieds/search

### 3. HIGH: Missing Dedicated Classifieds Search Endpoint ✅ FIXED
- **File**: `backend/routes/appData.js`
- **Issue**: References `/api/classifieds/search` didn't exist
- **Fix**: Added new `GET /app-data/classifieds/search` endpoint with full search capabilities

### 4. MEDIUM: WebSocket Not Integrated ✅ FIXED
- **File**: `backend/server.js`
- **Issue**: `classifiedsWebSocket.js` defined but not initialized
- **Fix**: Imported and initialized `setupClassifiedsWebSocket` after main WebSocket init

### 5. MEDIUM: voiceInput.js Using fetch() Instead of axios ✅ FIXED
- **File**: `backend/routes/voiceInput.js`
- **Issue**: Used `fetch()` which doesn't exist in Node.js without import
- **Fix**: Replaced with `axios.get()` calls to internal API endpoints

### 6. LOW: Test File Imports Mismatch - PENDING
- **File**: `backend/routes/classifieds.test.js`
- **Issue**: Imports validation functions but tests utility functions
- **Fix**: Update test imports or create proper test file

## Verification Checklist
- [x] Data Model Integrity
- [x] CRUD Operations
- [x] Search & Filter
- [x] Messaging
- [x] Reviews & Ratings
- [x] Reports & Moderation
- [x] Spam Detection
- [x] Geolocation
- [x] Monetization Plans
- [x] Rate Limiting
- [x] Frontend Integration
- [x] WebSocket Features
- [x] Security & Auth
- [x] Pagination
- [x] Media Handling

