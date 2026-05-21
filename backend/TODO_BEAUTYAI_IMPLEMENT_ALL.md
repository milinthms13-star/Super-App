# TODO: Implement all requested BeautyAI improvements

## Scope
Implement A1 real selfie analysis + plan lifecycle + photo replacement + quota UX + safety severity/disclaimer + client versioning.

## Steps
1. Update `backend/routes/beautyAI.js`
   - Modify `POST /analyze-selfie` to accept multipart upload (`selfie` file), sanitize via sharp, upload to S3 (or local fallback), and derive `selfieSignals` heuristically from the image buffer.
   - Return analysis + also generate/return a plan payload (or at minimum updated analysis), consistent with existing response format.
   - Ensure quota enforcement still works.

2. Add subscription UX fields to quota responses (and optionally to success responses)
   - `nextAllowedAt` (based on quota timezone/dateKey logic)
   - `featureFlags`

3. Add plan lifecycle endpoints
   - `GET /plans/:id` (ownership check)
   - `PUT /plans/:id` (update notes/concerns/safety fields in plan)
   - `POST /plans/:id/duplicate` (create new Active plan)

4. Add photo management endpoint
   - `PUT /plans/:id/photo` accepts multipart `selfie` and replaces stored selfie by deleting old S3 object (best effort) and saving new selfie URL/storage key/provider.

5. Add safety escalation + severity classification
   - Add `concernSeverity` and `disclaimer` bundle to plan response.
   - Add helper logic in `backend/services/beautyAiBackendHelpers.js` if needed.

6. Add client versioning
   - Add `apiVersion` and `modelVersion` to all BeautyAI responses (or at least key endpoints: analyze-selfie, plan, plans CRUD).

7. Update integration tests
   - Update existing BeautyAI integration test suite for changed `analyze-selfie` behavior (now requires selfie upload).
   - Add new tests for:
     - new endpoints (plans/:id, PUT plans/:id, duplicate, PUT plans/:id/photo)
     - quota responses include `nextAllowedAt` and `featureFlags`
     - plan response includes `concernSeverity` + `disclaimer` + version fields

8. Run tests
   - `cd backend && npm test --silent -- --config jest.beautyai.config.js`
   - `cd backend && npm test --silent -- --config jest.beautyai.config.js`

## Done criteria
- All new endpoints tested and passing.
- All existing tests updated to reflect modified `analyze-selfie`.
- No security regressions (maintain MIME allowlist, sharp sanitization, and trusted photo host logic).

