# Diary Module Enhancement - Phase 1 & 2

## Phase 1: Security & Data Integrity
- [x] 1. Create `backend/utils/diaryValidation.js` - centralized validation for entries & calendar items
- [x] 2. Update `backend/routes/diary.js` - integrate validation middleware, sanitize HTML content
- [x] 3. Update `backend/models/DiaryEntry.js` - add text index for search, fix attachment enum

## Phase 2: UX & Performance
- [ ] 4. Create `src/utils/diaryHelpers.js` - shared helpers (stripHtml, formatDate, truncateContent)
- [ ] 5. Update `src/modules/personaldiary/Diary.js` - infinite scroll pagination
- [ ] 6. Update `src/modules/personaldiary/DiaryEditor.js` - autosave to localStorage, keyboard shortcuts
- [ ] 7. Update `src/modules/personaldiary/DiaryCalendar.js` - month-by-month fetching
- [ ] 8. Update `src/modules/personaldiary/DiaryEntryCard.js` - use shared helpers
- [ ] 9. Update `src/modules/personaldiary/MoodChart.js` - use shared helpers
- [ ] 10. Update `src/modules/personaldiary/TodaysSummary.js` - use shared helpers
- [ ] 11. Update `src/services/diaryService.js` - add pagination params support

## Testing
- [ ] 12. Run backend tests to verify no regressions

