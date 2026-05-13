# My Diary User Manual (Front-End)

> Module: `src/modules/*mydiary/personaldiary*` (Personal reflection diary / entries + views + advanced features)

## 1) What this module does
**My Diary** is a personal reflection journal that lets you:
- Create, edit, and delete diary entries
- Search and filter entries (text search, category, mood, tags)
- Switch views: **List / Calendar / Mood Analytics**
- Track **moods** with mood analytics and charts
- Use advanced features:
  - **Autosave** while editing
  - **Autosave Recovery** for draft recovery
  - **Version History** (restore previous versions)
  - **Trash** (recover deleted items)
  - **App Lock (PIN lock)**
  - **Encryption & Backup** settings
  - **AI insights** and **AI summary**
  - **Export** entries as **PDF** (current / filtered / all)

## 2) Entry point in the app
1. Open **My Diary** from the main navigation/menu.
2. You land on the **My Diary home screen** (hero + entry tools + view selector).

## 3) Main screen layout (what you see)

### 3.1 Hero actions (top buttons)
From the hero area you can:
- **✍️ New Entry** → open the editor (no entry selected)
- **📜 History** → version history (enabled when you are editing an entry)
- **🗑️ Trash** → open trash bin modal
- **🔒 Lock** → open app lock (PIN) settings modal
- **🔐 Backup** → open encryption/backup settings modal
- **✨ AI** → open AI insights modal (enabled while editing an entry)
- **📄 Export** → export diary entries as PDF (opens export modal)
- **📊 Analytics** → open writing/mood analytics dashboard modal
- **✨ AI Summary** → open AI summary & insights modal

> Some actions require an active selected entry / editor context.

### 3.2 Today’s Summary
A **Today’s Summary** section is shown below the hero.

### 3.3 View selector
Use the view buttons to switch:
- **📋 List**
- **📅 Calendar**
- **📊 Mood Analytics**

## 4) Create a new diary entry
1. Click **✍️ New Entry**.
2. In the editor, fill the available fields:
   - Title and content
   - Mood
   - Category
   - Tags (if supported in your editor)
3. Click save (the editor creates or updates based on whether you’re editing an existing entry).

Expected result:
- The entry appears in your diary list/calendar (based on your selected view).
- Mood stats and tags update.

## 5) Edit an existing entry (with autosave)
1. In **List** view, locate an entry card.
2. Click **Edit**.
3. Update content in the editor and review the autosave status.

Autosave behavior while editing:
- The module autosaves on a schedule (e.g., every ~30 seconds).
- You’ll see an **Autosave Indicator** showing status like: saving / saved / error / offline.

## 6) Delete an entry (and recover it if needed)
1. In **List** view, click **Delete** on an entry card.
2. Confirm the browser prompt.

Expected result:
- The entry is removed from the visible list.
- If **Trash** is enabled, you can recover it from the trash modal.

## 7) List view: search + filters
When you’re in **📋 List** view, you can filter entries using:

### 7.1 Search
- Use **“🔍 Search entries...”** to filter by title/content.

### 7.2 Category
- Use the **category dropdown**.

### 7.3 Mood filter
- Use **All Moods** or mood buttons/emoji.

### 7.4 Tags
- Use tag toggles (e.g., `#tagName (count)`), if tags are available.
- Click a tag to add/remove it from your selection.

Expected result:
- Entries refresh when filters change.

## 8) Calendar view
1. Switch to **📅 Calendar**.
2. Use calendar features to view and manage calendar items (where supported).

Expected result:
- Calendar items display based on diary entries and any calendar item data.

## 9) Mood analytics view
1. Switch to **📊 Mood Analytics**.
2. Review mood distribution charts.

Expected result:
- Charts reflect the latest mood statistics fetched by the module.

## 10) Version history (restore previous versions)
1. Open an entry so **History** becomes available.
2. Click **📜 History**.
3. Restore or inspect a prior version using the version history modal.

## 11) Trash (recover deleted entries)
1. Click **🗑️ Trash**.
2. Recover entries from the trash modal (if enabled).

## 12) App Lock (PIN lock)
1. Click **🔒 Lock**.
2. Configure your app lock settings in the modal.
3. Close the modal.

## 13) Encryption & Backup
1. Click **🔐 Backup**.
2. Configure encryption/backup settings in the modal.
3. If you perform backup/restore, the module reloads entries afterward.

## 14) AI features
### 14.1 AI insights (entry-level)
1. Open an entry in the editor.
2. Click **✨ AI**.
3. Review insights, then close the modal.

### 14.2 AI Summary (global/period-based)
1. Click **✨ AI Summary**.
2. Review the generated summary and insights.

## 15) Export diary as PDF
1. Click **📄 Export**.
2. Choose an export scope:
   - **Current Entry** (requires an open/selected entry)
   - **Filtered Entries** (based on current filters: category, mood, tags, search)
   - **All Entries**
3. Click **Download PDF**.

Expected result:
- The export generates a PDF using backend export services.
- You’ll see success/failure notifications in the UI.

## 16) Autosave Recovery (draft recovery)
If drafts exist:
- On load, the module may show an **Autosave Recovery Modal**.

Actions:
- **Recover**: loads the draft into the editor
- **Discard**: deletes draft(s) via API calls

## 17) Troubleshooting
- **Entries not loading / errors**
  - Check backend connectivity and authentication.
- **Autosave errors**
  - The autosave indicator may show `error`. Wait briefly and retry; recovery usually succeeds after connectivity stabilizes.
- **Export fails**
  - Confirm entries exist and verify the chosen export scope (current vs filtered vs all).

## 18) UI sections reference
- Hero actions: New Entry, History, Trash, Lock, Backup, AI, Export, Analytics, AI Summary
- Autosave Indicator + Recovery modal
- List filters: search, category, mood, tags
- Entry cards: edit/delete
- View selector: List / Calendar / Mood Analytics
- Calendar module + MoodChart
