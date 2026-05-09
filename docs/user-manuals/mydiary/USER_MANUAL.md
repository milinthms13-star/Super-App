# MyDiary User Manual (Front-End)

> Module: `src/modules/mydiary/*` (Personal diary / entries)

## 1) What this module does
MyDiary lets users maintain personal diary entries with basic create/view/update flows.

Common capabilities (depending on the current MVP scope):
- Create diary entry
- Edit/update existing entry
- View entry list
- Search/filter by date (if supported)

## 2) Entry point in the app
1. Navigate to **MyDiary** from the main navigation/menu.

## 3) Step-by-step user flow

### 3.1 Create a diary entry
1. Open **MyDiary**.
2. Click **New Entry**.
3. Add:
   - Title (if present)
   - Content/notes
   - Date/time (if editable; otherwise current timestamp is used)
4. Click **Save**.

Expected result:
- The entry appears in your diary list.

### 3.2 View entries
1. Open **MyDiary**.
2. Browse your entry list.
3. Click an entry card to open the full content view.

### 3.3 Edit an entry (if supported)
1. Open an entry.
2. Click **Edit**.
3. Update content.
4. Click **Update/Save**.

### 3.4 Delete an entry (if supported)
1. Open an entry.
2. Click **Delete**.
3. Confirm deletion.

## 4) Troubleshooting (UI-level)
- Entry not saved:
  - Verify you are logged in.
  - Refresh and retry.
  - Ensure required fields are filled.
- Content not loading:
  - Check connectivity.
  - Retry after reopening MyDiary.

## 5) UI sections reference
- Entry list (cards)
- New Entry / editor form
- Entry detail view
- Edit/Delete actions

