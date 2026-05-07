# TODO: Implement Missing Personal Diary Module Checklist Items

This checklist is derived from comparing your PERSONAL DIARY MODULE FEATURE CHECKLIST against current code implementation in:
- `DIARY_IMPLEMENTATION_COMPLETE.md`
- `DIARY_REMINDER_NOTIFICATION_IMPLEMENTATION.md`
- `backend/routes/diary.js`, `backend/models/DiaryEntry.js`, `backend/models/DiaryCalendarItem.js`
- `src/modules/personaldiary/*` components
- `src/services/diaryService.js`

---

## 🔐 Security & Privacy (CRITICAL - HIGHEST PRIORITY)

### Locking & Access Control
- [ ] **App lock implementation** (app-level PIN/biometric)
  - Model: DiaryAppLock with PIN hash / biometric flag
  - Route: POST /api/diary/app-lock/setup, /verify, /disable
  - Frontend: PIN entry modal on app load
  - Status: ❌ NOT FOUND

- [ ] **Entry-level password protection** (passwordHash exists in schema but routes not found)
  - Route: POST /api/diary/:id/set-password, /verify-password
  - Validation: Add passwordHash to DiaryEntry if not present
  - Frontend: Password input before viewing protected entry
  - Status: ⚠️ Schema field exists, routes/UI NOT FOUND

- [ ] **PIN-protected sensitive entries**
  - Model: DiaryEntry.sensitivityLevel (normal/sensitive/confidential)
  - Route: PUT /api/diary/:id/mark-sensitive
  - Frontend: PIN verification before viewing sensitive entries
  - Status: ❌ NOT FOUND

- [ ] **Biometric protection** (fingerprint/face unlock)
  - Model: DiaryAppLock.biometricEnabled flag
  - Frontend: WebAuthn API or device-level biometric
  - Status: ❌ NOT FOUND

### Encryption & Data Protection
- [ ] **End-to-end encryption** (E2EE) - VERY IMPORTANT
  - Backend: Implement crypto.createCipheriv for content encryption
  - Model: Add encryptionKey, encryptedContent fields to DiaryEntry
  - Route: Decrypt on /GET, encrypt on POST/PUT (transparent to frontend)
  - Status: ❌ NOT FOUND

- [ ] **Hide sensitive entries** (isHidden flag + access control)
  - Model: DiaryEntry.isHidden boolean
  - Route: GET /api/diary only returns isHidden=false entries (+ explicit /hidden-entries route)
  - Frontend: Toggle visibility in entry editor
  - Status: ⚠️ isPrivate exists; isHidden field NOT FOUND

- [ ] **Screenshot protection** (watermark overlay on sensitive entries)
  - Frontend: Add CSS pointer-events:none + watermark background on view page when sensitivityLevel="confidential"
  - Status: ❌ NOT FOUND

- [ ] **Auto logout** (configurable timeout)
  - Model: UserPreferences.autoLogoutMinutes
  - Backend: JWT middleware with session tracking
  - Frontend: Show warning + auto-logout at timeout
  - Status: ❌ NOT FOUND

- [ ] **Secure cloud backup** (encrypted backup to cloud)
  - Route: POST /api/diary/backup/create (triggers backup job)
  - Route: POST /api/diary/backup/restore
  - Model: DiaryBackup with encryptedData, backupDate, status
  - Status: ❌ NOT FOUND

---

## 🤖 AI Features (VERY IMPORTANT - HIGH PRIORITY)

### Core AI Analysis
- [ ] **AI diary summary** (auto-generate weekly/monthly summaries)
  - Service: diaryAISummaryService.js
  - Route: GET /api/diary/ai/summary?period=week|month
  - Uses: OpenAI API to summarize entries
  - Caches: Last summary date to avoid regenerating
  - Status: ❌ NOT FOUND

- [ ] **AI mood analysis** (sentiment analysis + emotional insights)
  - Service: diaryAIMoodAnalyzer.js (different from current analyzeMood)
  - Route: GET /api/diary/ai/mood-insights?daysBack=30
  - Uses: OpenAI to extract emotion/sentiment from content
  - Returns: Emotional themes, stress patterns, wellbeing trends
  - Status: ⚠️ Current analyzeMood is classification only; sentiment/insights NOT FOUND

- [ ] **AI sentiment detection** (positivity/negativity/neutral scores)
  - Service: extend aiTemplateSuggestionsService pattern
  - Route: GET /api/diary/:id/ai/sentiment
  - Returns: positivityScore, sentimentLabel, emotionalTone
  - Status: ❌ NOT FOUND

- [ ] **AI writing suggestions** (grammar, tone, clarity improvements)
  - Route: POST /api/diary/:id/ai/get-suggestions
  - Uses: OpenAI to suggest improvements to entry
  - Returns: Array of {suggestion, type (grammar|tone|clarity), original, improved}
  - Status: ❌ NOT FOUND

- [ ] **AI auto-tagging** (suggest tags from entry content)
  - Route: POST /api/diary/:id/ai/suggest-tags
  - Uses: OpenAI to extract topics
  - Frontend: Auto-populate tags on entry save
  - Status: ❌ NOT FOUND

- [ ] **AI smart search** (semantic search, not just regex)
  - Route: GET /api/diary/search/smart?query=feeling overwhelmed
  - Uses: OpenAI embeddings for semantic matching
  - Model: DiaryEntry.embedding vector field
  - Status: ❌ NOT FOUND

- [ ] **AI emotional trend analysis** (beyond mood chart)
  - Route: GET /api/diary/ai/emotional-trends?daysBack=90
  - Returns: Trend lines, patterns, risk factors (depression indicators, anxiety spikes)
  - Status: ❌ NOT FOUND

### Voice & Transcription
- [ ] **Voice-to-text AI transcription**
  - Frontend: Audio recorder component + upload
  - Route: POST /api/diary/:id/transcribe-audio
  - Uses: Google Speech-to-Text or OpenAI Whisper API
  - Stores: Transcript + audio file
  - Status: ❌ NOT FOUND (audio attachments exist, but no transcription)

- [ ] **Voice diary workflow** (record → transcribe → create entry)
  - Frontend: VoiceDiaryRecorder.js component
  - Route: POST /api/diary/voice/record (combines recording + transcription + entry creation)
  - Status: ❌ NOT FOUND

---

## 📊 Analytics & Statistics (HIGH PRIORITY)

- [ ] **Writing statistics**
  - Route: GET /api/diary/analytics/writing-stats?period=month
  - Returns: totalEntries, totalWords, avgWordsPerEntry, entriesPerDay
  - Status: ❌ NOT FOUND

- [ ] **Word count analytics**
  - Model: DiaryEntry.wordCount (computed on save)
  - Route: GET /api/diary/analytics/word-count?groupBy=day|week|month
  - Status: ❌ NOT FOUND

- [ ] **Streak tracking** (consecutive days written)
  - Model: UserDiaryStats.currentStreak, longestStreak, lastEntryDate
  - Route: GET /api/diary/streaks
  - Scheduler: Daily job to update streak status
  - Status: ❌ NOT FOUND

- [ ] **Advanced wellness analytics** (mental health insights)
  - Route: GET /api/diary/analytics/wellness?daysBack=90
  - Returns: moodTrend, stressPattern, sleepQuality, emotionalBalance
  - Status: ⚠️ mood-stats exists; wellness insights NOT FOUND

---

## 🔄 Backup, Sync & Recovery (HIGH PRIORITY)

### Versioning & Recovery
- [ ] **Entry version history** (save all revisions)
  - Model: DiaryEntryVersion with versionNumber, content, savedAt
  - Route: GET /api/diary/:id/versions, POST /api/diary/:id/revert/:versionId
  - Frontend: Version timeline UI in editor
  - Status: ❌ NOT FOUND

- [ ] **Deleted entry recovery/trash** (soft delete + recovery)
  - Model: DiaryEntry.deletedAt, isDeleted flags (+ trash status)
  - Route: GET /api/diary/trash, POST /api/diary/:id/restore, DELETE /api/diary/:id/permanently-delete
  - Current: backend DELETE hard-deletes; change to soft-delete
  - Frontend: Trash page with restore/delete options
  - Status: ❌ HARD DELETE currently; soft-delete NOT FOUND

- [ ] **Auto-save recovery** (recover unsaved drafts)
  - Model: DiaryEntryDraft.content, lastAutoSaveAt
  - Route: GET /api/diary/autosave-recovery
  - Frontend: Show "recover unsaved entry?" dialog on load
  - Status: ⚠️ Drafts exist (isDraft), recovery mechanism NOT FOUND

### Backup & Export
- [ ] **Cloud sync** (multi-device sync with conflict handling)
  - Route: POST /api/diary/sync/pull (get all entries modified after lastSyncTime)
  - Route: POST /api/diary/sync/push (push local changes + resolve conflicts)
  - Model: DiaryEntry.lastSyncAt, syncStatus
  - Status: ❌ NOT FOUND

- [ ] **Cloud sync conflict handling** (if same entry edited on 2 devices)
  - Service: diaryConflictResolver.js
  - Logic: timestamp-based (latest wins) OR ask user to merge
  - Status: ❌ NOT FOUND

- [ ] **Google Drive backup** (export all entries to Google Drive)
  - Route: POST /api/diary/backup/google-drive
  - Uses: Google Drive API
  - Status: ❌ NOT FOUND

- [ ] **Export PDF** (beautiful PDF export of entries)
  - Route: GET /api/diary/export/pdf?startDate=&endDate=
  - Uses: pdfkit or puppeteer
  - Status: ❌ NOT FOUND (mentioned as "future enhancement")

- [ ] **Export DOC/TXT** (Word/Text export)
  - Route: GET /api/diary/export/doc, /export/txt
  - Status: ❌ NOT FOUND

- [ ] **Restore backup** (import from backup file)
  - Route: POST /api/diary/backup/restore (upload & import)
  - Status: ❌ NOT FOUND

- [ ] **Offline mode** (write entries offline, sync when online)
  - Frontend: LocalStorage buffer for offline entries
  - Route: POST /api/diary/sync/offline-entries (bulk upload)
  - Model: DiaryEntry.syncStatus (synced/pending/failed)
  - Status: ❌ NOT FOUND

- [ ] **Offline mode sync handling** (merge offline + server changes)
  - Service: offlineSyncResolver.js
  - Logic: Handle conflicts between offline draft & server version
  - Status: ❌ NOT FOUND

---

## 🎨 Rich Content & Media (MEDIUM PRIORITY)

### Rich Text & Content
- [ ] **Rich text editor** (formatting: bold/italic/lists/links)
  - Frontend: Replace textarea with React Quill or Draft.js
  - Store: HTML content in DiaryEntry.content
  - Status: ⚠️ Docs say "textarea"; rich text NOT FOUND

- [ ] **Drawing/sketch support**
  - Frontend: Canvas-based drawing component (e.g., react-sketch-app)
  - Route: POST /api/diary/:id/sketches (store as image attachment)
  - Status: ❌ NOT FOUND

- [ ] **Emojis & stickers in content**
  - Frontend: Emoji picker (react-emoji-picker) + sticker library
  - Store: As text (emoji unicode) or as embedded images
  - Status: ⚠️ Mood emojis supported; content emojis/stickers NOT FOUND

### Media Handling
- [ ] **Audio recording workflow** (in-app recording UI)
  - Frontend: AudioRecorder.js component (MediaRecorder API)
  - Route: POST /api/diary/:id/audio (store as attachment)
  - Status: ⚠️ Backend accepts audio; workflow UI NOT FOUND

- [ ] **Video diary workflow** (in-app video recording)
  - Frontend: VideoRecorder.js component
  - Route: POST /api/diary/:id/video
  - Status: ⚠️ Backend accepts video; workflow NOT FOUND

- [ ] **Camera integration** (take photo directly from diary)
  - Frontend: CameraCapture.js with file input accept="image/*" camera
  - Status: ❌ NOT FOUND

- [ ] **Gallery organization** (view all media in diary)
  - Route: GET /api/diary/media/gallery
  - Frontend: MediaGallery.js component with thumbnails
  - Status: ❌ NOT FOUND

- [ ] **Media compression** (reduce file size on upload)
  - Service: diaryMediaCompression.js
  - Uses: imagemin / ffmpeg for compression
  - Store: compressed size + compression ratio
  - Status: ❌ NOT FOUND

- [ ] **Media encryption** (encrypt attachments)
  - Model: DiaryAttachment.encryptedData
  - Status: ❌ NOT FOUND

---

## 🤝 Sharing & Collaboration (MEDIUM PRIORITY)

- [ ] **Share entry** (via link or direct share)
  - Schema field shareToken + shareExpiresAt exist but routes NOT FOUND
  - Route: POST /api/diary/:id/share (generate token)
  - Route: GET /api/diary/shared/:shareToken (view shared entry)
  - Status: ⚠️ Fields exist; sharing routes NOT FOUND

- [ ] **Private share link** (encrypted link with expiry)
  - Route: POST /api/diary/:id/share?expiresIn=7days
  - Returns: shareable URL + QR code
  - Status: ⚠️ Fields exist; full implementation NOT FOUND

- [ ] **Read-only sharing** (viewer cannot edit)
  - Model: DiaryShare.permission (view|edit)
  - Route: Validate permission on PUT/DELETE
  - Status: ⚠️ Not confirmed

- [ ] **Export selected entries**
  - Route: POST /api/diary/export/selected (body: entryIds, format=pdf|doc|txt)
  - Status: ❌ NOT FOUND

- [ ] **Print diary page**
  - Frontend: Print stylesheet for diary entry
  - Route: GET /api/diary/:id/print (returns printable HTML)
  - Status: ❌ NOT FOUND

---

## 🌟 Wellness & Habit Tracking (MEDIUM PRIORITY)

- [ ] **Habit tracking** (track repeating behaviors/routines)
  - Model: DiaryHabit with frequency, category, progress
  - Route: POST /api/diary/habits, GET /api/diary/habit-stats
  - Status: ❌ NOT FOUND

- [ ] **Gratitude journal** (dedicated gratitude entries)
  - Model: DiaryEntry.entryType (journal|gratitude|mood|voice)
  - Route: GET /api/diary/gratitude
  - Frontend: Gratitude template
  - Status: ❌ NOT FOUND

- [ ] **Sleep tracking notes** (log sleep quality/duration)
  - Model: DiaryEntry.sleepData { duration, quality }
  - Route: GET /api/diary/sleep-tracking
  - Frontend: Sleep data input on entry
  - Status: ❌ NOT FOUND

- [ ] **Stress level tracking** (log daily stress)
  - Model: DiaryEntry.stressLevel (1-10)
  - Frontend: Stress slider on entry
  - Status: ❌ NOT FOUND

- [ ] **Mental wellness insights** (AI-powered wellness score)
  - Route: GET /api/diary/wellness-score
  - Returns: wellnessScore, recommendations, riskFactors
  - Status: ❌ NOT FOUND

---

## 🎯 Organization & Navigation (LOW-MEDIUM PRIORITY)

- [ ] **Favorites** (star/bookmark entries)
  - Model: DiaryEntry.isFavorite
  - Route: GET /api/diary?favorites=true
  - Frontend: Star icon on entry
  - Status: ❌ NOT FOUND

- [ ] **Color labels** (tag entries with color categories)
  - Model: DiaryLabel with color, icon
  - Model: DiaryEntry.labelIds
  - Status: ❌ NOT FOUND

- [ ] **Folder management** (organize entries into folders)
  - Model: DiaryFolder with userId, name
  - Model: DiaryEntry.folderId
  - Route: GET /api/diary/folders
  - Status: ❌ NOT FOUND

- [ ] **Timeline view** (dedicated timeline mode, not just list)
  - Frontend: TimelineView.js component
  - Route: GET /api/diary/timeline (return entries sorted by date)
  - Status: ✅ list + calendar exist; explicit timeline view NOT FOUND

---

## 👤 User Preferences & Customization (LOW PRIORITY)

- [ ] **Themes** (color schemes: light/dark/custom)
  - Model: UserPreferences.theme (light|dark|custom)
  - Frontend: Theme toggle in settings
  - Status: ❌ NOT FOUND (only CSS styling exists)

- [ ] **Dark mode** (with system preference detection)
  - Frontend: useMediaQuery for prefers-color-scheme
  - Status: ⚠️ CSS may support; toggle NOT FOUND

- [ ] **Font customization** (font family/size selection)
  - Model: UserPreferences.fontFamily, fontSize
  - Status: ❌ NOT FOUND

- [ ] **Language support** (i18n for diary module)
  - Status: ⚠️ App has i18n; diary module support NOT FOUND

- [ ] **Custom backgrounds** (diary theme backgrounds)
  - Model: UserPreferences.backgroundImageUrl
  - Status: ❌ NOT FOUND

- [ ] **Diary templates** (pre-formatted entry templates)
  - Model: DiaryTemplate with structure, prompts
  - Route: GET /api/diary/templates
  - Frontend: Template selector on "new entry"
  - Status: ❌ NOT FOUND (mentioned as "future enhancement")

---

## ⏰ Reminders & Notifications (LOW PRIORITY - ALREADY PARTIAL)

Current status: ✅ Core reminder system exists (reminders, scheduler, today summary, upcoming reminders)

- [ ] **Mood logging reminder** (daily reminder to log mood)
  - Model: DiaryCalendarItem.type = "mood-reminder"
  - Status: ❌ NOT FOUND (only generic reminders exist)

- [ ] **Anniversary/birthday reminder** (from entries)
  - Model: DiaryEntry.isAnniversary flag + date
  - Route: Auto-create reminders for anniversary entries
  - Status: ❌ NOT FOUND

- [ ] **Notification customization** (quiet hours, sound, badges)
  - Model: UserPreferences.notificationSettings { quietHours, sound, badges }
  - Status: ⚠️ Reminders exist; customization NOT FOUND

- [ ] **Push notifications** (FCM/APNs, not just browser)
  - Status: ⚠️ Browser notifications only; mobile push NOT FOUND

---

## 🏆 Advanced Features & Next-Level (VERY LOW PRIORITY)

- [ ] **Timeline memories** ("On this day" feature)
  - Route: GET /api/diary/memories?month=5&day=7 (show entries from this date in past years)
  - Status: ❌ NOT FOUND

- [ ] **Location-based entries** (location tagging)
  - Model: DiaryEntry.location { latitude, longitude, placeName }
  - Status: ❌ NOT FOUND

- [ ] **Weather integration** (show weather on entry date)
  - API: OpenWeatherMap API
  - Route: GET /api/diary/:id/weather
  - Status: ❌ NOT FOUND

- [ ] **Daily quote/motivation** (inspire users to write)
  - Route: GET /api/diary/daily-quote
  - Status: ❌ NOT FOUND

- [ ] **Community/social features** (if applicable):
  - [ ] Anonymous public diary
  - [ ] Community journals
  - [ ] Support groups
  - Status: ❌ NOT FOUND (design decision: private diary or social?)

---

## 👨‍💼 Admin Panel (LOW PRIORITY - If Needed)

- [ ] **Admin analytics dashboard**
  - Route: GET /api/admin/diary/analytics
  - Returns: totalUsers, totalEntries, avgEntriesPerUser, activeUsersChart
  - Status: ❌ NOT FOUND

- [ ] **Abuse reporting system**
  - Model: DiaryReport with reason, status
  - Route: POST /api/diary/:id/report
  - Admin route: GET /api/admin/reports
  - Status: ❌ NOT FOUND

- [ ] **Content moderation**
  - AI moderation: flag entries for harmful content
  - Status: ❌ NOT FOUND

- [ ] **Storage monitoring** (track per-user media usage)
  - Model: UserStorageQuota with used, limit
  - Status: ❌ NOT FOUND

- [ ] **Backup monitoring** (track backup status)
  - Model: DiaryBackup with status, completedAt
  - Status: ❌ NOT FOUND

---

## 💾 Data Management (MEDIUM PRIORITY)

- [ ] **Encryption key management** (secure key storage + rotation)
  - Service: cryptoKeyManager.js
  - Model: UserEncryptionKey with keyVersion, rotatedAt
  - Status: ❌ NOT FOUND

- [ ] **Storage quota management** (limit per-user storage)
  - Model: UserStorageQuota with used, limit
  - Middleware: Check quota before allowing uploads
  - Status: ❌ NOT FOUND

- [ ] **Backup failure alerts** (notify user if backup fails)
  - Model: DiaryBackupStatus with lastFailureAt, lastFailureReason
  - Frontend notification: Show alert if backup fails
  - Status: ❌ NOT FOUND

- [ ] **Time zone handling** (correctly store + display times)
  - Model: DiaryEntry.timezone
  - Currently: ⚠️ timezoneOffsetMinutes used in some routes
  - Full support NOT FOUND across all endpoints
  - Status: ⚠️ Partial

---

## 🔑 Authentication (LOW PRIORITY - IF NEEDED AT DIARY LEVEL)

These are user-level auth features; not diary-specific but should exist in user module:

- [ ] **OTP login** (for diary module context/recovery)
  - Status: ❌ NOT FOUND in diary module (user module concern)

- [ ] **Social login** (Google/Facebook diary signup)
  - Status: ❌ NOT FOUND in diary module

- [ ] **Forgot password**
  - Status: ❌ NOT FOUND in diary module

- [ ] **Two-factor authentication**
  - Status: ❌ NOT FOUND in diary module

---

## 📋 Summary: Priority Matrix

### 🔴 CRITICAL (Must Have for Production)
1. **Entry version history + trash/recovery** (data safety)
2. **End-to-end encryption** (privacy)
3. **App lock / Entry-level password** (security)
4. **Offline mode + sync conflict handling** (usability)
5. **Cloud backup + restore** (data protection)

### 🟠 HIGH (Strongly Recommended)
1. **AI diary summary + mood analysis** (key differentiator)
2. **AI writing suggestions + auto-tagging** (UX improvement)
3. **Voice-to-text transcription** (accessibility)
4. **Writing statistics + streak tracking** (engagement/gamification)
5. **Secure export (PDF/DOC/TXT)** (user control)
6. **Sharing + shared entry routes** (schema fields exist, implement routes)

### 🟡 MEDIUM (Nice to Have)
1. **Rich text editor** (better UX)
2. **Gallery organization** (for media users)
3. **Habit tracking + gratitude journal** (wellness features)
4. **Wellness insights** (AI-powered recommendations)
5. **Notification customization** (quiet hours, sound, badges)

### 🟢 LOW (Optional / Phase 2)
1. Themes/Dark mode/Font customization
2. Advanced features (timeline memories, location, weather)
3. Admin panel (if needed)
4. Community/social features (if applicable)

---

## 📝 Implementation Roadmap

### Phase 5.1 (CRITICAL PATH - 2 weeks)
- [ ] Entry version history (DiaryEntryVersion model + routes + UI)
- [ ] Soft delete + trash recovery (update DELETE logic)
- [ ] Auto-save recovery (autosave drafts + recovery dialog)
- [ ] App lock (PIN + biometric in DiaryAppLock model)

### Phase 5.2 (HIGH VALUE - 2 weeks)
- [ ] End-to-end encryption (crypto utils + encrypted fields)
- [ ] Cloud backup + restore (DiaryBackup model + export/import routes)
- [ ] AI diary summary (call OpenAI API via diaryAISummaryService)
- [ ] AI mood insights (sentiment analysis)

### Phase 5.3 (HIGH VALUE - 2 weeks)
- [ ] Voice-to-text transcription (Whisper API integration)
- [ ] Writing statistics (word count + streak tracking)
- [ ] Rich text editor (replace textarea with Quill)
- [ ] Secure export (PDF via pdfkit)

### Phase 5.4 (MEDIUM - 1 week)
- [ ] Sharing routes (POST /share, GET /shared/:token)
- [ ] Gallery organization (media endpoint + UI)
- [ ] Habit tracking (DiaryHabit model + dashboard)

### Phase 5.5 (OPTIONAL - 1 week)
- [ ] Themes + Dark mode
- [ ] Advanced features (timeline memories, etc.)

---

## 🧪 Testing Checklist (Critical Paths)

- [ ] Entry creation, edit, delete, version history, restore
- [ ] Soft delete, trash, recover flow
- [ ] Autosave on edit (every 30s), autosave recovery on reload
- [ ] App lock setup, verify, unlock (password + biometric)
- [ ] Encryption: create entry → encrypted in DB → decrypt on read
- [ ] Backup: export → backup file → import → all data recovered
- [ ] AI: analyze entry → get summary/sentiment/suggestions (mock OpenAI if needed)
- [ ] Sharing: generate share link → view as non-owner → try to edit (should fail)
- [ ] Voice: record audio → transcribe → create entry with transcript
- [ ] Offline: write entry offline → detect offline → sync on reconnect
- [ ] Conflict resolution: edit on device A, edit on device B → merge correctly

---

## 📌 Notes

**Current implementation provides:**
- ✅ Diary CRUD + drafts
- ✅ Mood tracking + analytics
- ✅ Categories + tags
- ✅ Search (text index)
- ✅ Reminders (basic)
- ✅ Media attachments (backend)

**Biggest gaps:**
- ❌ Security hardening (encryption, app lock)
- ❌ Data recovery (versions, trash, offline sync)
- ❌ AI features (summaries, insights, suggestions)
- ❌ Backup + export
- ❌ Rich UX (rich text, recording, gallery)
- ❌ Sharing routes (fields exist, routes missing)

**Recommended action:**
Complete Phase 5.1 (CRITICAL) before production launch. Phase 5.2-5.5 can be iterative releases.
