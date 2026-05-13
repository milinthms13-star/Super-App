# Matrimonial User Manual (Front-End)

> Module: `src/modules/matrimonial/Matrimonial.js`  
> Product name in UI: **SoulMatch — Matrimonial Matchmaking Workspace**

## 1) What this module does
Matrimonial (SoulMatch) is a matchmaking workspace with:
- Profile setup + **profile completion score**
- Discovery/search with **advanced filters** (religion, location, caste, education, profession, verified-only)
- **Match scoring** + match breakdown (best-match sorting options)
- **Interests** (send interest, track incoming/outgoing interest states, accept/decline)
- **Messaging preview** with premium controls (privacy-aware contact visibility)
- **KYC** verification (via the KYCVerification component)
- **Shortlist, block, report** support (with admin moderation workflow)
- **Admin moderation queue** and moderation actions (if you’re an admin)

## 2) Entry point in the app
1. Open **Matrimonial / SoulMatch** from main navigation/menu.

## 3) Premium preview toggle (privacy-aware)
At the top hero, you can switch between:
- **Free Member**
- **Premium Preview**

Expected behavior:
- Messaging controls may be unlocked for preview purposes, but **privacy-aware member controls remain enforced** (phone/photo visibility depends on profile privacy and viewer tier).

## 4) Profile completion (required before best results)
You may see a profile completion modal when:
- you have not completed profile setup enough, or
- you are in edit mode

In the profile completion modal:
- Upload **profile photo** (optional)
- Complete fields such as:
  - name, Gmail, phone, age, gender
  - religion/caste/community
  - education, profession, location
  - marital status
  - family details
  - bio
  - languages, hobbies
- Privacy toggles:
  - hide phone number
  - hide photos for non-premium viewers
  - allow contact only for premium members
- Click **Save & Continue**

Expected behavior:
- Profile saves via backend, and discovery/features refresh.

## 5) Workspace layout
### 5.1 Tabs (main navigation inside the module)
Use the tab buttons:
- **Discover**
- **Interests**
- **Messages**
- **KYC**
- **Profile Score**
- **Admin** (only if you are an admin)

### 5.2 Sidebar areas
- **Your Profile** (view summary + Edit Profile button)
- **Partner Preferences** (match rules)
- **Notifications** (live events + premium preview notice)
- **Shortlist** (saved profiles)

## 6) Discover (search & matchmaking)
### 6.1 Search & filters
In **Discover** you can:
- Type in **search query** (debounced)
- Use advanced filters:
  - Religion (Any / specific)
  - Location (Any / specific)
  - Caste (Any / specific)
  - Education (Any / specific)
  - Profession (Any / specific)
  - Verified-only toggle (on by default)

### 6.2 Sorting
Sort modes include (as implemented):
- best match (default)
- recently-active
- most-viewed
- age-low

### 6.3 View match details
For a selected profile you can view:
- **match score**
- a **score breakdown** (why it matches your preferences)

### 6.4 Actions on a profile
From discover, you can:
- Send **Interest**
- **Shortlist** (save)
- **Block** (remove from discovery)
- **Report** (flags for moderation)

Expected behavior:
- Interest/shortlist/block/report actions trigger backend calls and update UI.

Phone/contact visibility:
- phone may show messages like:
  - “Premium required to view contact details”
  - “Hidden by privacy settings”
  - or actual phone number (if permitted)

## 7) Interests (incoming + outgoing)
In **Interests** tab you’ll see:
- Incoming interests list with states like:
  - Accepted / Declined / Pending Response
- Outgoing interests tracking

Actions:
- Respond to an interest (Accept/Decline)
- After responding, the app refreshes interests and message threads.

## 8) Messages (secure preview + composer)
In **Messages** tab:
- You’ll see message threads with:
  - member name
  - last message
  - unread count
  - premium-locked indicator when applicable
- To send:
  1. Type in the message composer for the thread
  2. Click send
- Expected behavior:
  - message is sent via backend
  - composer clears
  - thread list refreshes

Validation:
- If message draft is empty, the UI asks you to type a message.

## 9) KYC
In the **KYC** tab:
- Use the built-in KYCVerification component to complete verification.
- Purpose: improve trust and support premium/visibility workflows (depending on backend).

## 10) Profile Score (completion)
In the **Profile Score** tab:
- A progress bar shows profile completion percent.
- Goal: complete family details, verification, preferences, and other profile fields to improve match quality and unlock more features.

## 11) Admin moderation (admin users only)
If `isAdmin` is true, you’ll have the **Admin** tab:
- Admin queue summary:
  - verified count
  - pending count
  - report count
  - premium count
- Admin can:
  - approve verified profiles
  - move profiles back for changes
  - approve or update moderation based on queue actions

Expected behavior:
- Admin moderation actions refresh both the admin queue and discovery list.

## 12) Troubleshooting
- “Messaging controls are unlocked in preview but privacy stays enforced”:
  - premium preview affects UI messaging controls, but contact visibility still depends on privacy settings.
- Profile doesn’t save:
  - check highlighted fields in profile modal (the app validates required fields and shows errors).
- Discovery shows demo profiles:
  - live matchmaking may be failing; UI switches to fallback profiles + a notice.
- Can’t send interest:
  - check if interest was already sent; the app blocks duplicates with a status message.

## 13) UI sections reference (quick)
- Hero: premium preview toggle + overview
- Discover: search + filters + match scoring + interest/block/report/shortlist
- Interests: accept/decline + state updates
- Messages: thread list + message composer
- KYC: verification flow
- Profile Score: completion progress
- Admin: moderation queue/actions
