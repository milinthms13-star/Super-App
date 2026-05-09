# Matrimonial User Manual (Front-End)

> Module: `src/modules/matrimonial/*` (Matrimonial / profiles & connections)

## 1) What this module does
The Matrimonial module enables users to browse profiles, maintain their profile, and initiate interest/connection actions.

Typical capabilities (depending on current MVP scope):
- View suggested profiles / browse profiles
- View profile details
- Search/filter profiles
- Express interest / contact (if supported)
- Manage your own profile

## 2) Entry point in the app
1. Navigate to **Matrimonial** from the main navigation/menu.
2. If the app includes onboarding, complete your profile setup.

## 3) Step-by-step user flow

### 3.1 Complete or update your profile
1. Open **My Profile** / **Profile** section.
2. Fill required details:
   - basic information
   - preferences (if requested)
   - contact details (if applicable)
3. Upload profile photo(s) (if supported).
4. Click **Save Profile**.

### 3.2 Browse profiles
1. Go to **Discover / Profiles**.
2. View profile cards.
3. Click a profile to open details.

### 3.3 Search / filter (if supported)
1. Use filter panel:
   - age range
   - location
   - other preferences
2. Apply filters.

### 3.4 Express interest / connect (if supported)
1. Open a profile.
2. Click **Send Interest** / **Connect** / **Message** (exact button name depends on UI).
3. Confirm any prompts.

Expected result:
- The profile shows a sent status or message in your activity list.

### 3.5 View received interests (if supported)
1. Open **Inbox / Requests / Interests**.
2. Review and respond to requests.

## 4) Troubleshooting (UI-level)
- Profiles not showing:
  - Check filters/search criteria.
  - Refresh the screen.
  - Ensure you have completed onboarding/profile setup if required.
- Unable to send interest/message:
  - Verify your profile status is active.
  - Confirm permissions are allowed in the app.

## 5) UI sections reference
- Onboarding / Profile form
- Profile cards list
- Profile detail view
- Filters/search panel
- Interests/requests inbox

