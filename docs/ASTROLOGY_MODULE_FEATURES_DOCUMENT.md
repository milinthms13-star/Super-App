# Astro / Astrology Module — Features

This document lists the features implemented for the **Astro / Astrology** module by inspecting the UI module (`src/modules/astrology/*`) and its backend service wrapper (`src/services/astrologyService.js`).

---

## 1) Daily Horoscope by Zodiac Sign
- Users can browse **daily horoscope readings** based on the selected zodiac **Rashi/sign**.
- A **sign grid** lets users choose the sign (includes label, date range, element, and theme accent).
- The module displays a **Daily Reading card** (rendered by `src/modules/astrology/HoroscopeCard.js`).
- Supports **offline/off-fallback data** when live services fail.

---

## 2) Astrology Profile (Save & Manage)
- Users can save their astrology preferences and birth details:
  - Preferred **sign**
  - **Birth date**, **birth time**, **birth place**
  - **Favorite topics** (e.g., career/relationships/finance)
  - Notification preferences/toggles (e.g., daily horoscope, good muhurtham, festival reminders, dasha alerts)
- Persisted using `astrologyService.updateProfile()`.
- The saved profile drives personalization in the module.

---

## 3) Family Member Birth Profiles
- Users can manage multiple family profiles within the astrology experience:
  - Add new profile
  - Edit family member details (name, relation, sign, birth details)
  - The module computes derived fields such as **nakshatra**, **rashi**, and **lagna**
- Profiles are stored together through the main astrology profile via `updateProfile()`.

---

## 4) Recent Saved Readings History
- After saving/updating the profile, the module displays a **small sidebar history** of recent saved readings.
- Shows last few readings (recent reads are derived from `profile.savedReadings`).

---

## 5) Quick Insights (Today)
- Shows sign-based quick highlights for the selected sign:
  - **Lucky color**
  - **Lucky number**
  - **Good time** (muhrtham-like window)
  - **Avoid time**

---

## 6) Section-Based Experience Navigation
The module provides multiple feature sections users can switch between:
- **Today**
- **Profile**
- **Rashi/Nakshatra**
- **Kundli**
- **Marriage Match**
- **Panchangam**
- **Remedies**
- **Talk to Astrologer**
- **AI Assistant**

---

## 7) Today Section
Includes:
- **Rashi phalam** summary
- **Nakshatra guidance**
- **Panchangam snapshot** (tithi, nakshatra, rahu kalam, yamagandam)
- **Kerala festival note** (example: Vishu guidance)

---

## 8) Rashi / Nakshatra Section
- Provides sign-based summaries and guidance text.
- Mentions derived values like:
  - **Rashi**
  - **Nakshatra**
  - **Lagna**
- Also includes an “energy focus” guidance paragraph.

---

## 9) Kundli Section
- Shows a **Kundli summary** (ascendant/lagna and other high-level items).
- Includes a “**Download PDF report**” button (UI-level feature; generation/actual download likely handled elsewhere).

---

## 10) Marriage Match / Compatibility
- Users select:
  - “Your sign”
  - “Partner sign”
- The module calls `astrologyService.getCompatibility(sign, partnerSign)`.
- Displays compatibility output:
  - **score**
  - **summary**
  - **keyMatch** (porutham/compatibility breakdown text)

---

## 11) Panchangam + Festival Reminders
- Loads **Panchangam today** using `astrologyService.getPanchangam()`.
- Displays key Panchangam fields (when loaded):
  - Tithi
  - Nakshatra
  - Rahu Kalam
  - Yamagandam
  - Gulika
- Loads **festival reminders** using `astrologyService.getFestivalUpdates()` and displays them as a list.

---

## 12) Remedies Section
- Shows a list of sign/strength oriented remedies.
- Includes guidance items like mantra recitation, offerings, and temple/ritual suggestions.

---

## 13) Talk to Astrologer (Consultants Listing)
- Loads consultant profiles using `astrologyService.getConsultants()`.
- Displays for each consultant:
  - Name
  - Specialty
  - Rate
  - Availability
- Includes a “**Book consultation**” button (UI action).

---

## 14) AI Assistant (Astrology Q&A)
- Users can type an astrology question.
- The module calls `astrologyService.askAstrologyAssistant(question, selectedSign)`.
- Displays:
  - Assistant answer text
  - Optional tips list
- Includes offline fallback response when live fails.

---

## 15) Language Toggle (EN / Malayalam)
- The module supports a language toggle between:
  - English (en)
  - Malayalam (ml)
- Contains safety logic to avoid placeholder/incorrect Malayalam rendering (e.g., preventing “????” when Malayalam strings contain placeholder characters).

---

## References (implementation locations)
- UI:
  - `src/modules/astrology/AstrologyHome.js`
  - `src/modules/astrology/HoroscopeCard.js`
- Service layer (endpoints + fallbacks):
  - `src/services/astrologyService.js`
- Main docs:
  - `docs/ASTROLOGY_MODULE_DOCUMENTATION.md`
  - `docs/user-manuals/astrology/USER_MANUAL.md`

