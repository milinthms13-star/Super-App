# Astrology User Manual (Front-End)

> Module: `src/modules/astrology/AstrologyHome.js`  
> Product name in UI: **AstroNila**

## 1) What this module does
AstroNila provides:
- **Daily horoscope** for a selected sign (with offline fallback)
- **Astrology profile** saving (birth details + favorite topics + notification preferences)
- **Family profiles** (multiple people, switch active person)
- Section-based guidance tiles:
  - **Today**
  - **Profile** (family profile editor)
  - **Rashi/Nakshatra**
  - **Kundli** (chart summary + PDF download)
  - **Marriage Match** (compatibility)
  - **Panchangam** (tithi/time snapshot + festival note)
  - **Remedies**
  - **Talk to Astrologer** (consultation booking + payment verification)
  - **AI Assistant** (ask a question + get guidance)

## 2) Entry point in the app
1. Open **Astrology** from the main navigation/menu.

## 3) Core UI parts
### 3.1 Left sidebar
The sidebar has two main parts:

1) **Select your sign**
- Choose a sign card.
- Daily reading updates for the selected sign.

2) **Profile save form**
- Fields:
  - Birth date
  - Birth time
  - Birth place
  - Favorite topics (comma-separated text)
  - Toggle: keep daily horoscope reminders enabled for this profile
- Action:
  - **Save profile and today’s reading**

### 3.2 Main content area
- A welcome/highlights card with a **language toggle** (English ↔ Malayalam when content is available)
- A **Horoscope Card** area for the daily reading
- A grid of section tiles (Today/Profile/Rashi-Kundli/Match/Panchangam/Remedies/Consult/AI)

## 4) Daily horoscope workflow
1. In **Select your sign**, pick the sign you want.
2. Review the **Horoscope Card**:
   - the reading content
   - any offline notice if live data is unavailable
3. Optionally switch between:
   - **English** and **മലയാളം** using the language button.

## 5) Saving your Astrology profile
### 5.1 Fill/update profile details
1. Use the sidebar **Profile** form.
2. Update:
   - Birth date
   - Birth time
   - Birth place
   - Favorite topics
   - Daily horoscope reminders toggle

### 5.2 Save and verify expected behavior
1. Click **Save profile and today’s reading**.
2. If you’re not signed in, the UI blocks save and asks you to sign in.
3. After saving, you should see:
   - a confirmation message in the sidebar
   - your reading stored in **Recent saved readings** (small list)

## 6) Family profiles (multiple people)
### 6.1 View and switch family profiles
1. Go to the **Profile** section tile.
2. In the **Saved profiles** list:
   - click a profile to load it into the editor.

### 6.2 Add a new family profile
- Click **Add profile**.
- The editor resets and you can enter a new person’s details.

### 6.3 Edit and save a family profile
1. In **Edit family profile**, update:
   - Name
   - Relation
   - Sign
   - Birth date / birth time
   - Birth place
2. Click **Save family profile**.

Expected result:
- The selected profile is saved.
- The family profiles list updates.

## 7) Section tiles (step-by-step)

### 7.1 Today
- Read:
  - **Today’s Rashi phalam**
  - **Nakshatra guidance**
  - **Panchangam snapshot** (Tithi / Nakshatra / Rahu Kalam / Yamagandam)
  - **Kerala festival note**

If Panchangam/festival data is offline/unavailable, the UI shows offline fallback/notes.

### 7.2 Rashi/Nakshatra
- Review:
  - Rashi overview: Rashi / Nakshatra / Lagna
  - Energy focus guidance text

### 7.3 Kundli
1. Open **Kundli**.
2. Read the **Kundli summary**.
3. Use the **download** action to download the Kundli PDF.

> Login requirement: the PDF download relies on logged-in account access. If not logged in, downloading should be blocked.

### 7.4 Marriage Match (compatibility)
1. Open **Marriage Match**.
2. Provide/confirm:
   - your sign
   - partner sign
3. Click the compatibility action (UI triggers `getCompatibility`).
Expected result:
- A compatibility response card/summary is displayed.

### 7.5 Panchangam
- Review snapshot values:
  - Tithi
  - Nakshatra
  - Rahu Kalam
  - Yamagandam
- Then read the festival note/reminders provided by the module.

### 7.6 Remedies
- Read the remedies content.
- Review temple guidance / mantras section provided for the sign.

### 7.7 Talk to Astrologer (paid consultation)
1. Open **Talk to Astrologer**.
2. For a consultant:
   - choose an available slot from the slot selector
3. Click **Book consultation**.
4. After booking you’ll see booking details including a **confirmation code**.
5. Complete payment:
   - click the payment action to create a consultation payment order
   - if Razorpay SDK is available, a payment window opens
   - after payment, the module verifies payment and updates booking

Common blocker:
- If no slot is selected, the UI prevents booking and shows an error asking to choose a slot.

### 7.8 AI Assistant
1. Open **AI Assistant**.
2. Type an astrology question.
3. Click the action to send.
4. Wait for the response (loading state is shown).

Validation:
- If the question is empty, the UI shows an error to ask a question first.

## 8) Troubleshooting
- Signs/reading not updating:
  - re-select your sign; live data may be temporarily unavailable (offline fallback is supported)
- Profile save fails:
  - ensure you’re signed in
  - re-check birth date/time/place and favorite topics formatting
- Kundli PDF download fails:
  - confirm login
- Consultation booking/payment issues:
  - ensure you choose a slot before booking
  - if the payment window closes early, the UI warns that payment was not completed

## 9) UI sections reference
- Sidebar:
  - sign selection
  - profile form + save confirmation + recent saved readings
- Main:
  - horoscope card
  - section tile grid
  - individual section content:
    - Today / Profile / Rashi-Nakshatra / Kundli / Match / Panchangam / Remedies / Consult / AI
