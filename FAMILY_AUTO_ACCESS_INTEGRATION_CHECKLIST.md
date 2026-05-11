# Family Auto-Access - Integration Checklist & Code Snippets

## ✅ Step-by-Step Integration

### Step 1: Add Routes to Express Server ✓

**File: `backend/server.js` or `backend/index.js`**

Add this code AFTER your authentication middleware:

```javascript
// Around line where you define other API routes
const express = require('express');
const { routes: familyAccessRoutes } = require('./controllers/FamilyAccessController');

// Your existing middleware...
app.use(express.json());
app.use(authMiddleware); // Your auth middleware

// ===== ADD THIS LINE =====
app.use('/api/family', familyAccessRoutes);
// =======================

// Rest of your routes...
```

**Verify:** Test with curl or Postman:
```bash
curl http://localhost:3001/api/family/list
# Should return 401 if not authenticated (good!)
# Or 200 with family list if authenticated
```

---

### Step 2: Add Component to React App ✓

**File: `src/App.js` or your router file**

Add the import and route:

```javascript
import FamilyAccess from './components/FamilyAccess';

// In your Route/Router definitions:
<Routes>
  {/* Your existing routes */}
  
  {/* Add this new route */}
  <Route 
    path="/family-access" 
    element={<FamilyAccess userId={currentUser._id} />} 
  />
  
  {/* Rest of routes */}
</Routes>
```

**Or add to a Settings/Dashboard page:**

```javascript
import FamilyAccess from './components/FamilyAccess';

function SettingsPage({ currentUser }) {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      {/* Add FamilyAccess component */}
      <FamilyAccess userId={currentUser._id} />
      
      {/* Other settings */}
    </div>
  );
}
```

**Test:** Navigate to `/family-access` in your app. You should see the Family Auto-Access UI.

---

### Step 3: Integrate with SOS Module ✓

**File: `backend/controllers/sosController.js`**

Add these imports at the top:

```javascript
const FamilyAccessService = require('../services/FamilyAccessService');
```

Then update your location sharing endpoint:

```javascript
// BEFORE (existing code):
exports.getLocation = async (req, res) => {
  const userId = req.user._id;
  const location = /* get location */;
  res.json({ location });
};

// AFTER (with family auto-access):
exports.getLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;

    // ===== ADD THIS BLOCK =====
    // Check family auto-access FIRST
    const accessResult = await FamilyAccessService.verifyLocationSharingAccess(
      userId,
      targetUserId
    );

    if (accessResult.granted && accessResult.reason === 'family_auto_access') {
      // Auto-grant - no consent needed!
      const location = /* get location */;
      return res.json({
        granted: true,
        reason: 'family_auto_access',
        location: location,
        updateInterval: accessResult.updateInterval
      });
    }
    // ========================

    // Your existing consent logic...
    const hasConsent = await checkExplicitConsent(userId, targetUserId);
    if (hasConsent) {
      const location = /* get location */;
      return res.json({ granted: true, location });
    }

    res.status(403).json({ granted: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Test:** Call the endpoint and verify family members get automatic access:
```bash
curl http://localhost:3001/api/location/userId123 \
  -H "Authorization: Bearer token"
```

---

### Step 4: Add Camera Access Integration ✓

**File: `backend/controllers/cameraController.js` (or wherever camera access is handled)**

```javascript
const FamilyAccessService = require('../services/FamilyAccessService');

exports.getCameraAccess = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;

    // Check family auto-access for camera
    const accessResult = await FamilyAccessService.verifyCameraAccess(
      userId,
      targetUserId
    );

    if (accessResult.granted) {
      // Return camera feed based on family permissions
      const feed = /* get camera feed */;
      
      return res.json({
        granted: true,
        reason: 'family_auto_access',
        camera: feed,
        permissions: accessResult.permissions // Include what they can do
      });
    }

    res.status(403).json({ granted: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

### Step 5: Integrate with SOS Trigger ✓

**File: `backend/controllers/sosController.js`**

```javascript
exports.triggerSOS = async (req, res) => {
  try {
    const userId = req.user._id;
    const { emergencyContacts } = req.body;

    // ===== ADD THIS BLOCK =====
    // Get all family members who can auto-access this user's location
    const familyMembers = await FamilyAccessService
      .getFamilyMembersWithLocationAccess(userId);

    const familyIds = familyMembers.map(m => m.memberId.toString());
    // ========================

    const location = /* get user location */;

    // Send SOS to each contact
    for (const contact of emergencyContacts) {
      const isFamilyMember = familyIds.includes(contact._id.toString());

      // If family member, auto-share location
      sendSOSNotification({
        recipientId: contact._id,
        message: 'SOS Alert!',
        location: isFamilyMember ? location : null, // Auto-include for family
        autoAccess: isFamilyMember,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 🧪 Testing Each Integration

### Test 1: Family Creation
```javascript
// Frontend
const familyService = require('./services/familyAccessService');

const result = await familyService.createFamilyGroup(
  'Test Family',
  [],
  { location: { enabled: true }, camera: { enabled: true } }
);

console.log('Family created:', result.family._id);
```

### Test 2: Auto-Access Check
```javascript
// Backend
const FamilyAccessService = require('./services/FamilyAccessService');

const hasAccess = await FamilyAccessService.hasAutoLocationAccess(
  userId1,
  userId2
);

console.log('Has auto-access:', hasAccess); // Should be true if in same family
```

### Test 3: Location Sharing
```bash
# Get location with family auto-access
curl http://localhost:3001/api/location/targetUserId \
  -H "Authorization: Bearer userToken"
# Should return location if in same family (no consent needed!)
```

### Test 4: SOS with Auto-Location
```bash
curl -X POST http://localhost:3001/api/sos/trigger \
  -H "Authorization: Bearer userToken" \
  -H "Content-Type: application/json" \
  -d '{"emergencyContacts": ["contactId1", "contactId2"]}'
# Should send location to family members automatically
```

---

## ✅ Integration Verification Checklist

After completing all steps:

- [ ] Routes added to Express server
- [ ] FamilyAccess component imported and routed
- [ ] Can navigate to `/family-access` in your app
- [ ] Can create a family group
- [ ] Can add members to family
- [ ] Can update permissions
- [ ] Location auto-access works (verified with API test)
- [ ] Camera auto-access works
- [ ] SOS sends location to family members automatically
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## 🚨 Common Issues & Fixes

### Issue: "FamilyAccessService is not defined"
**Fix:** Add import at top of file:
```javascript
const FamilyAccessService = require('../services/FamilyAccessService');
```

### Issue: "Cannot GET /api/family/list"
**Fix:** Verify routes are added to Express:
```javascript
app.use('/api/family', familyAccessRoutes);
```

### Issue: Component not rendering
**Fix:** Verify path is correct:
```javascript
<Route path="/family-access" element={<FamilyAccess userId={userId} />} />
```

### Issue: Members not getting auto-access
**Fix:** Check that:
1. Both users are in same family
2. `autoAccessEnabled` is true for both
3. `status` is "active" for both
4. Permission is enabled in family settings

---

## 📚 Documentation Files

Read these for more details:

1. **FAMILY_AUTO_ACCESS_QUICKSTART.md** - Quick examples
2. **FAMILY_AUTO_ACCESS_IMPLEMENTATION.md** - Complete implementation guide
3. **sosController.FamilyAutoAccessIntegration.js** - Full integration examples

---

## 🎉 You're All Set!

Once all steps are complete, family members can:
- ✅ Automatically see each other's location
- ✅ Automatically access each other's camera
- ✅ Automatically receive SOS alerts with location
- ✅ All without individual consent dialogs!

---

**Last Updated:** May 2026
**Status:** Production Ready
