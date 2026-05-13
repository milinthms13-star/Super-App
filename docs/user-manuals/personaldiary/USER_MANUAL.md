# My Diary / PersonalDiary User Manual (Front-End)

> Module: `src/modules/personaldiary/*` (My Diary: entries, calendar, analytics, AI, encryption/backup, versioning, autosave recovery)

## 1) What this module does
**My Diary** is a complete personal reflection journal that lets you:
- Create, edit, and delete diary entries
- Use **search + filters** (category, mood, tags, text search)
- Switch views: **List / Calendar / Mood Analytics**
- Track **moods** with mood analytics and charts
- Access advanced features:
  - **Autosave** while editing
  - **Autosave Recovery** for draft recovery
  - **Version History** (for restoring previous versions)
  - **Trash** (recover deleted items)
  - **App Lock (PIN lock)**
  - **Encryption & Backup** settings
  - **AI insights** and **AI summary**
  - **Export** entries as **PDF** (current / filtered / all)

## 2) Entry point in the app
1. Open **My Diary** / **PersonalDiary** from the main navigation/menu.
2. You land on the **My Diary** home screen (hero + entry tools + view selector).

## 3) Main screen layout (what you see)
### 3.1 Hero actions (top buttons)
From the hero area you can:
- **✍️ New Entry** → open the editor (no entry selected)
- **📜 History** → version history (enabled only while editing an entry)
- **🗑️ Trash** → trash bin modal
- **🔒 Lock** → app lock settings modal
- **🔐 Backup** → encryption/backup settings modal
- **✨ AI** → AI insights modal (enabled while editing an entry)
- **📄 Export** → export diary entries as PDF (opens export modal)
- **📊 Analytics** → writing/mood analytics dashboard modal
- **✨ AI Summary** → AI summary & insights modal

> Some actions require an active selected entry in the editor context (`editingEntry`).

### 3.2 Todays Summary
- A “Today’s Summary” section is always visible below the hero.

### 3.3 View selector
Use the view buttons to switch:
- **📋 List**
- **📅 Calendar**
- **📊 Mood Analytics**

## 4) Creating a new diary entry
1. Click **✍️ New Entry**.
2. In the editor, fill:
   - Title and content
   - Mood
   - Category
   - Tags (if your editor supports them)
3. Click save (editor handles create/update based on whether you are editing an existing entry).

Expected result:
- The saved entry appears in the diary list/calendar (depending on your view).
- Tags and mood stats are refreshed.

## 5) Editing an existing entry
1. In **List** view (default), locate an entry card.
2. Click **Edit** on the entry card.
3. Make changes in the editor and save.

Autosave behavior while editing:
- When the editor is open and the entry is being edited, the module runs an **autosave every 30 seconds**.
- You’ll see an **Autosave Indicator** showing status (saving/saved/error/offline).

## 6) Deleting an entry
1. In **List** view, click **Delete** on an entry card.
2. Confirm the browser prompt.

Expected result:
- The entry is removed from the list.
- You can use **Trash** to recover deleted entries (if enabled by backend/UI).

## 7) List view: search and filters
When you are in **📋 List** view, you can filter entries using:

### 7.1 Search
- Use **“🔍 Search entries...”** to filter by title/content (server-side search request).

### 7.2 Category
- Use the **category dropdown** (values come from `CATEGORIES` helper list).

### 7.3 Mood filter
- Use **All Moods** or mood emoji buttons.

### 7.4 Tags (quick tag toggles)
- If tags exist, you’ll see tag buttons like: `#tagName (count)`
- Click a tag to add/remove it from `selectedTags`.

Expected result:
- Entries refresh based on filters (the module reloads entries when filters change).

## 8) Calendar view
1. Switch to **📅 Calendar** using the view selector.
2. Use calendar features inside `DiaryCalendar`:
   - Create calendar items (where supported)
   - Update calendar items
   - Delete calendar items

Expected result:
- Calendar items display based on diary entries + calendar item data.

## 9) Mood analytics view
1. Switch to **📊 Mood Analytics**.
2. View mood distribution charts from `MoodChart`.

Expected result:
- Mood charts reflect the latest mood stats fetched from backend (`fetchMoodStats(30)`).

## 10) Version History (restore previous versions)
1. Open/edit an entry so **History** becomes enabled.
2. Click **📜 History**.
3. Restore/inspect prior versions using the VersionHistory modal.

## 11) Trash (recover deleted entries)
1. Click **🗑️ Trash**.
2. Recover deleted entries from the Trash modal.

## 12) App Lock (PIN lock)
1. Click **🔒 Lock**.
2. Configure app lock settings in the modal.
3. Close the modal.

## 13) Encryption & Backup
1. Click **🔐 Backup**.
2. Manage encryption/backup settings in the modal.
3. If you perform backup/restore actions, the module reloads entries afterward.

## 14) AI features
### 14.1 AI insights (entry-level)
1. Open an entry in the editor context.
2. Click **✨ AI**.
3. Close the modal when done.

### 14.2 AI Summary (global/period-based)
1. Click **✨ AI Summary**.
2. Review AI-generated summary and insights.

## 15) Export diary as PDF
1. Click **📄 Export**.
2. Choose export scope:
   - **Current Entry** (requires an open/selected entry)
   - **Filtered Entries** (exports based on current filters: category, mood, tags, search)
   - **All Entries** (exports entire dataset shown by the module)
3. Click **Download PDF**.

Expected result:
- Export uses backend services (`exportEntryAsPDF` / `exportEntriesAsPDF`)
- On success, you get UI notifications (via notificationService).

## 16) Autosave Recovery modal (draft recovery)
If drafts exist:
- On load, the module attempts to fetch drafts and may show **Autosave Recovery Modal**.
Actions:
- **Recover**: loads draft into editor for review/save
- **Discard**: deletes draft(s) via API calls

## 17) Troubleshooting
- Entries not loading / errors:
  - Check backend connectivity (fetchDiaryEntries / tags / stats).
- Autosave errors:
  - The Autosave Indicator shows `error`. Wait and retry; autosave recovers after a short period.
- Export fails:
  - Ensure entries exist and that you selected the correct export scope (current vs filtered vs all).

## 18) UI sections reference
- Hero actions: New Entry, History, Trash, Lock, Backup, AI, Export, Analytics, AI Summary
- Autosave Indicator + Recovery modal
- List filters: search, category, mood, tags
- Entry cards: edit/delete
- View selector: List / Calendar / Mood Analytics
- Calendar module + MoodChart
