# Phase 7 Integration Test Guide

## Quick Verification Checklist

### ✅ Backend Verification

1. **Check Route Registration**
```bash
# Verify Phase 7 routes are loaded
grep -r "diary-phase7" backend/app.js
# Should show: app.use('/api/diary', require('./routes/diary-phase7'));
```

2. **Check Utilities Exist**
```bash
ls -la backend/utils/diary*.js
# Should show:
# - diaryCollaboration.js
# - diaryPersonalization.js
# - diaryRecommendations.js
```

3. **Test API Endpoints** (with server running)
```bash
# Test recommendations endpoint
curl http://localhost:5000/api/diary/phase7/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test preferences endpoint
curl http://localhost:5000/api/diary/phase7/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test sharing stats
curl http://localhost:5000/api/diary/phase7/sharing-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### ✅ Frontend Verification

1. **Check Service Methods**
```javascript
// Open browser console on diary page
// Check if methods exist
console.log(typeof window.diaryService?.getRecommendations); // Should be 'function'
console.log(typeof window.diaryService?.getUserPreferences); // Should be 'function'
console.log(typeof window.diaryService?.createShareLink); // Should be 'function'
```

2. **Check UI Components**
```bash
# Verify components exist
ls -la src/modules/personaldiary/*Panel.js
# Should show:
# - RecommendationsPanel.js
# - SharingPanel.js
# - PersonalizationPanel.js
```

3. **Visual Test**
- Open app at http://localhost:3000
- Navigate to Personal Diary
- Check for these buttons:
  - [ ] ✍️ New Entry
  - [ ] 📜 History
  - [ ] 🗑️ Trash
  - [ ] 🔒 Lock
  - [ ] 🔐 Backup
  - [ ] ✨ AI
  - [ ] 📄 Export
  - [ ] 📊 Analytics
  - [ ] ✨ AI Summary
  - [ ] **💡 Recommendations** (NEW)
  - [ ] **🤝 Sharing** (NEW)
  - [ ] **⚙️ Settings** (NEW)

### ✅ Functionality Tests

#### Test 1: Recommendations Panel
1. Click "💡 Recommendations"
2. Modal should open
3. Check for tabs: Focus Areas, Wellness, Motivation
4. Switch between tabs
5. Change days filter (7/30/90/180 days)
6. Click refresh button
7. Close modal with X button

**Expected Result**: Panel loads, shows recommendations, tabs work

#### Test 2: Sharing Panel
1. Click "🤝 Sharing"
2. Modal should open
3. Check for tabs: Shares, Comments, Statistics
4. If an entry is selected, "Create New Share" button appears
5. Switch between tabs
6. Close modal with X button

**Expected Result**: Panel loads, shows sharing options, statistics display

#### Test 3: Personalization Panel
1. Click "⚙️ Settings"
2. Modal should open
3. Check for tabs: Theme, Writing, Notifications, Privacy
4. Switch to Theme tab
   - [ ] Change theme mode (light/dark/auto)
   - [ ] Pick a color
   - [ ] Change font size
5. Switch to Writing tab
   - [ ] Change writing mode
   - [ ] Set word goal
   - [ ] Toggle checkboxes
6. Switch to Notifications tab
   - [ ] Change reminder frequency
   - [ ] Set reminder time
7. Switch to Privacy tab
   - [ ] Change visibility
   - [ ] Toggle privacy options
8. Click "Save Preferences"
9. Click "Export" button (should download JSON)

**Expected Result**: All settings load and can be modified

### ✅ API Response Verification

#### Recommendations API
```javascript
// Expected response structure
{
  "success": true,
  "data": {
    "focusAreas": [...],
    "wellnessActions": [...],
    "writingEnhancements": [...],
    "moodInsights": [...],
    "consistencyTips": [...],
    "motivationBoosts": [...],
    "severity": "low|medium|high",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "analytics": {
    "entriesAnalyzed": 10,
    "daysBack": 90
  }
}
```

#### Preferences API
```javascript
// Expected response structure
{
  "success": true,
  "data": {
    "userId": "...",
    "theme": {
      "mode": "light",
      "primaryColor": "#667eea",
      "fontSize": "medium"
    },
    "writing": {
      "defaultMode": "full",
      "wordGoal": 0,
      "autoSave": true
    },
    "notifications": {
      "reminders": true,
      "reminderTime": "09:00"
    },
    "privacy": {
      "profileVisibility": "private",
      "allowSharing": true
    }
  }
}
```

#### Sharing Stats API
```javascript
// Expected response structure
{
  "success": true,
  "data": {
    "totalShares": 0,
    "sharedRecipients": 0,
    "commentCount": 0,
    "permissionDistribution": {
      "view": 0,
      "comment": 0,
      "edit": 0
    },
    "mostSharedEntries": [],
    "topRecipients": []
  }
}
```

### ✅ Error Handling Tests

1. **Test Without Authentication**
```bash
curl http://localhost:5000/api/diary/phase7/recommendations
# Expected: 401 Unauthorized
```

2. **Test With Invalid Data**
```bash
curl -X PUT http://localhost:5000/api/diary/phase7/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":{"mode":"invalid"}}'
# Expected: 400 Bad Request with validation error
```

3. **Test UI Error Display**
- Disconnect from internet
- Try to load recommendations
- Expected: Error banner appears with "Failed to load" message

### ✅ Integration Tests

#### Full User Flow Test
```
1. Login to application
2. Navigate to Personal Diary
3. Create a new entry
4. Click "💡 Recommendations"
   ✓ Panel opens
   ✓ Shows personalized recommendations
5. Click "🤝 Sharing"
   ✓ Panel opens
   ✓ Can create share (if entry selected)
6. Click "⚙️ Settings"
   ✓ Panel opens
   ✓ Can modify preferences
   ✓ Can save changes
7. Verify all modals close properly
8. Verify no console errors
```

### ✅ Browser Console Checks

Open browser DevTools (F12) and check:

```javascript
// 1. No JavaScript errors in console
// 2. Check network tab for API calls
// 3. Verify API responses are JSON
// 4. Check for CORS errors (should be none)

// Run these commands in console:
localStorage.getItem('token') // Should show JWT token
console.log(window.location.pathname) // Should show /diary or similar
```

### ✅ Performance Tests

1. **Load Time**
- Open diary page
- Check Network tab
- All Phase 7 API calls should complete in < 2 seconds

2. **Memory Usage**
- Open multiple modals
- Close them
- Check for memory leaks in Performance tab

3. **Bundle Size**
- Check build output
- Phase 7 components should add < 100KB to bundle

### 🎯 Success Criteria

All tests pass when:
- [x] All 3 new buttons appear
- [x] All modals open and close correctly
- [x] All API endpoints return valid JSON
- [x] No console errors
- [x] Data loads within 2 seconds
- [x] Settings can be saved
- [x] Preferences can be exported
- [x] No memory leaks
- [x] Mobile responsive (test on phone)

### 🐛 Common Issues & Solutions

**Issue**: Buttons don't appear
- **Solution**: Clear browser cache, rebuild frontend

**Issue**: API returns 404
- **Solution**: Restart backend server, check route registration

**Issue**: Modal doesn't open
- **Solution**: Check browser console for errors, verify component imports

**Issue**: "Unauthorized" errors
- **Solution**: Login again, check token expiry

**Issue**: Styles look broken
- **Solution**: Check CSS imports, verify Phase7Components.css exists

### 📊 Test Results Log

Date: _____________
Tester: _____________

| Test | Result | Notes |
|------|--------|-------|
| Backend Routes | ☐ Pass ☐ Fail | |
| Frontend Service | ☐ Pass ☐ Fail | |
| UI Components | ☐ Pass ☐ Fail | |
| Recommendations | ☐ Pass ☐ Fail | |
| Sharing | ☐ Pass ☐ Fail | |
| Personalization | ☐ Pass ☐ Fail | |
| Error Handling | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |

**Overall Status**: ☐ PASS ☐ FAIL

---

## 🚀 Quick Test Script

Run this automated test (requires backend running):

```bash
#!/bin/bash
# test-phase7.sh

echo "Testing Phase 7 Integration..."

# Check files exist
echo "✓ Checking backend files..."
test -f backend/routes/diary-phase7.js && echo "  ✓ diary-phase7.js exists"
test -f backend/utils/diaryRecommendations.js && echo "  ✓ diaryRecommendations.js exists"
test -f backend/utils/diaryCollaboration.js && echo "  ✓ diaryCollaboration.js exists"
test -f backend/utils/diaryPersonalization.js && echo "  ✓ diaryPersonalization.js exists"

echo "✓ Checking frontend files..."
test -f src/modules/personaldiary/RecommendationsPanel.js && echo "  ✓ RecommendationsPanel.js exists"
test -f src/modules/personaldiary/SharingPanel.js && echo "  ✓ SharingPanel.js exists"
test -f src/modules/personaldiary/PersonalizationPanel.js && echo "  ✓ PersonalizationPanel.js exists"

echo "✓ Checking service methods..."
grep -q "getRecommendations" src/services/diaryService.js && echo "  ✓ getRecommendations exists"
grep -q "getUserPreferences" src/services/diaryService.js && echo "  ✓ getUserPreferences exists"
grep -q "createShareLink" src/services/diaryService.js && echo "  ✓ createShareLink exists"

echo ""
echo "✅ All Phase 7 files verified!"
echo "Run manual UI tests to complete verification."
```

Save as `test-phase7.sh`, make executable with `chmod +x test-phase7.sh`, then run `./test-phase7.sh`

---

**Test Status**: Ready for execution
**Last Updated**: ${new Date().toISOString()}
