# Astro / Astrology — Go-live Production Rating & Checklist

This rating/checklist is derived from inspecting:
- UI: `src/modules/astrology/AstrologyHome.js`, `src/modules/astrology/HoroscopeCard.js`
- Service layer: `src/services/astrologyService.js`
- Backend: `backend/routes/astrology.js`, `backend/models/AstrologyUserProfile.js`, `backend/utils/astrologyData.js`
- Docs: `docs/ASTROLOGY_MODULE_DOCUMENTATION.md`

---

## Production go-live rating (proposed): **3.5 / 5**

### Why not 5/5 (main gaps / risks)
1. **Kundli PDF/Download is not fully implemented end-to-end**
   - UI shows a “Download PDF report” button in the Kundli section.
   - No explicit dedicated Kundli PDF generation/download endpoint is evident in the service/UI.

2. **Booking flow is UI-only (likely incomplete)**
   - “Talk to Astrologer / Book consultation” is present as a button.
   - There is no clear client-to-backend booking submission flow visible for this module.

3. **Some sections show placeholder/assumed content**
   - Several sections (e.g., panchangam snapshot values in Today) include hard-coded values or text strings.
   - Even if live data is fetched for Panchangam, the “Today snapshot” portion shows fixed examples.

4. **Localization quality risk**
   - There is a “prevent placeholder content” guard, but some strings can still look like placeholders depending on translation data.

### Why it’s not low (what is strong)
- Clear separation between **UI** and **service** layers.
- Service layer provides **offline fallbacks** for critical reads.
- Profile + family profile storage is supported via backend endpoints.
- Panchangam + festival lists are fetched with fallbacks.

---

## Go-live checklist (must do)

### A) Backend API contract validation
- [ ] Verify these endpoints exist and are secured appropriately (auth where required):
  - `/api/astrology/signs`
  - `/api/astrology/daily/:sign`
  - `/api/astrology/profile` (GET + PUT)
  - `/api/astrology/panchangam`
  - `/api/astrology/festivals`
  - `/api/astrology/compatibility` (POST)
  - `/api/astrology/assistant` (POST)
  - `/api/astrology/consultants`
- [ ] Confirm response shape matches the client normalizers:
  - `{ success: true, data: ... }`
  - reading/profile normalization rules.

### B) Data persistence & correctness
- [ ] Test creating a profile from scratch (no existing profile).
- [ ] Test updating profile preferences + notification toggles.
- [ ] Test adding, editing, switching family profiles.
- [ ] Test saved readings history ordering and de-dup rules.

### C) Kundli PDF report (end-to-end)
- [ ] Implement/confirm backend endpoint for Kundli PDF generation OR remove/disable the button until ready.
- [ ] Confirm the UI triggers the endpoint and downloads/opens the generated file.
- [ ] Validate PDF formatting and size/timeouts.

### D) “Book consultation” end-to-end
- [ ] Add booking submission flow (client → backend) with:
  - selected consultant
  - time slot (or availability selection)
  - payment/confirmation handling if needed
- [ ] If booking is out of scope, remove the button or disable with “coming soon”.

### E) Performance & resilience
- [ ] Ensure live failures correctly use fallbacks for:
  - signs
  - daily horoscope
  - profile
  - panchangam
  - festivals
  - compatibility
  - assistant
  - consultants
- [ ] Add/verify caching strategy if endpoints are called frequently.

### F) Security & compliance
- [ ] Ensure astrology endpoints that read/write profiles require authentication.
- [ ] Add rate limiting to assistant/compatibility endpoints to prevent abuse.
- [ ] Validate user input sanitization for assistant questions.

### G) QA test matrix (minimum)
- [ ] User signed in + signed out flows.
- [ ] Each section navigation (Today/Profile/Rashi/Kundli/Match/Panchangam/Remedies/Consultant/AI).
- [ ] Language toggle EN ↔ ML with multiple devices.
- [ ] Offline mode / simulated backend failure.

---

## Suggested release gating rules
- Ship to production only if:
  - Profile save/update + family profile editing are verified in staging.
  - Panchangam & festival lists render correctly with real backend responses.
  - Kundli PDF download is either fully implemented or disabled.
  - “Book consultation” is either wired end-to-end or disabled.

---

## References
- UI: `src/modules/astrology/AstrologyHome.js`, `src/modules/astrology/HoroscopeCard.js`
- Service: `src/services/astrologyService.js`
- Backend: `backend/routes/astrology.js`, `backend/models/AstrologyUserProfile.js`, `backend/utils/astrologyData.js`

