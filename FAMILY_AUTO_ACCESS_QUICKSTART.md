# Family Auto-Access Quick Start Guide

## ⚡ Quick Setup (5 Minutes)

### 1. Backend Setup

**Add to your Express server** (`backend/server.js` or `backend/index.js`):

```javascript
// Import the FamilyAccessController
const { routes: familyAccessRoutes } = require('./controllers/FamilyAccessController');

// Add the routes AFTER your authentication middleware
app.use('/api/family', familyAccessRoutes);
```

### 2. Frontend Setup

**Add the component to your app:**

```javascript
import FamilyAccess from './components/FamilyAccess';

// In your route definitions or component
<Route path="/family-access" element={<FamilyAccess userId={currentUserId} />} />
```

### 3. Verify Database Models

Ensure MongoDB is running and Mongoose models load correctly:

```javascript
// backend/server.js
const FamilyAccess = require('./models/FamilyAccess');
const FamilyAccessService = require('./services/FamilyAccessService');

// Models will auto-create collections on first use
```

## 🎯 Basic Usage Examples

### Create a Family Group

```javascript
import FamilyAccessService from './services/familyAccessService';

const createFamily = async () => {
  const result = await FamilyAccessService.createFamilyGroup(
    'Smith Family',
    ['member1@email.com', 'member2@email.com'],
    {
      location: { enabled: true, realTime: true },
      camera: { enabled: true, liveView: true }
    }
  );
  
  console.log('Family created:', result.family);
};
```

### Check Auto-Access

```javascript
// Backend - In your SOS or location sharing handler
const hasAccess = await FamilyAccessService.hasAutoLocationAccess(
  requesterId,  // User asking for access
  targetUserId  // User whose location is requested
);

if (hasAccess) {
  // Automatically grant location access - no consent needed!
  const accessData = await FamilyAccessService.verifyLocationSharingAccess(
    requesterId,
    targetUserId
  );
  
  return {
    granted: true,
    reason: 'family_auto_access',
    updateInterval: accessData.updateInterval,
    location: userLocation
  };
}
```

### Get All Members with Access

```javascript
// Get all family members who can access current user's location
const membersWithAccess = await FamilyAccessService
  .getFamilyMembersWithLocationAccess(userId);

console.log(membersWithAccess);
// Output: [
//   { memberId: '...', relationship: 'spouse', familyGroup: '...' },
//   { memberId: '...', relationship: 'child', familyGroup: '...' }
// ]
```

## 🔌 Integration with SOS Module

### Update SOSTrackingPage.js

```javascript
import FamilyAccessService from '../services/familyAccessService';

const SOSTrackingPage = ({ userId, targetUserId }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const accessResult = await FamilyAccessService.checkLocationAccess(targetUserId);
        setHasAccess(accessResult.granted);
        
        if (accessResult.granted) {
          // Auto-fetch location - user is in same family!
          console.log('Auto-access granted via family');
        }
      } catch (error) {
        console.error('Access check failed:', error);
      }
    };

    checkAccess();
  }, [targetUserId]);

  if (!hasAccess) {
    return <div>Cannot access location - not in same family</div>;
  }

  return (
    <div>
      {/* Show live location */}
    </div>
  );
};
```

### Update SOS Alert Handler

```javascript
// backend/controllers/sosController.js
const FamilyAccessService = require('../services/FamilyAccessService');

exports.sendSOSAlert = async (req, res) => {
  try {
    const userId = req.user._id;
    const emergencyContacts = req.body.contacts;
    
    // Auto-grant location access to emergency contacts if in family
    const familyMembers = await FamilyAccessService
      .getFamilyMembersWithLocationAccess(userId);
    
    const familyContactIds = familyMembers.map(m => m.memberId);
    
    // Send SOS to all contacts
    for (const contact of emergencyContacts) {
      const isFamily = familyContactIds.includes(contact._id);
      
      // Send SOS with location if family member (auto-access)
      sendSOSNotification({
        contactId: contact._id,
        location: isFamily ? getUserLocation(userId) : null,
        autoAccess: isFamily
      });
    }
    
    res.json({ success: true, message: 'SOS alerts sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## 🎬 Complete Flow Example

```javascript
// 1. Admin creates family
const family = await FamilyAccessService.createFamilyGroup(
  adminUserId,
  'Emergency Circle',
  [childId, spouseId],
  {
    location: { enabled: true, updateInterval: 10, realTime: true },
    camera: { enabled: true, liveView: true, snapshot: true }
  }
);

// 2. System stores all members with auto-access enabled
// 3. Family members access location/camera without asking admin

// 4. When child requests location:
const canAccess = await FamilyAccessService.hasAutoLocationAccess(
  childId,
  adminId
);
// Returns: true (same family, auto-access enabled)

// 5. Return location immediately
const location = getLocation(adminId);
res.json({ granted: true, location });

// No consent dialog needed!
```

## 📋 Common Tasks

### View All My Families
```javascript
const families = await FamilyAccessService.getUserFamilies();
```

### Add a New Member
```javascript
await FamilyAccessService.addFamilyMember(
  groupId,
  adminId,
  newMemberId,
  'child' // relationship
);
```

### Change Permissions
```javascript
await FamilyAccessService.updateAccessPermissions(
  groupId,
  adminId,
  {
    location: { enabled: true, updateInterval: 60 },
    camera: { enabled: true, liveView: true, recordVideo: false }
  }
);
```

### Disable Auto-Access for a Member
```javascript
await FamilyAccessService.disableAutoAccessForMember(
  groupId,
  adminId,
  memberId
);
```

### Remove a Member
```javascript
await FamilyAccessService.removeFamilyMember(
  groupId,
  adminId,
  memberId
);
```

## 🧪 Testing Checklist

- [ ] Can create family group
- [ ] Can add members to family
- [ ] Location auto-access works (hasAutoLocationAccess returns true)
- [ ] Camera auto-access works (hasAutoCameraAccess returns true)
- [ ] Can update permissions
- [ ] Can disable auto-access for members
- [ ] Can remove members
- [ ] SOS integration works
- [ ] Access checks work correctly

## 🐛 Troubleshooting

### Family not found
```javascript
// Check if family exists and user has access
const family = await FamilyAccessService.getFamilyGroup(groupId, userId);
```

### Auto-access returns false
```javascript
// Check if:
// 1. Both users are in same family
// 2. Access is enabled for both
// 3. Members are active (not removed)
```

### Permissions not updating
```javascript
// Ensure user is admin of the family
// Check family.adminId === currentUserId
```

## 📞 Support Notes

- Auto-access is mutual within a family group
- Only admins can modify permissions
- Removing a member revokes all access
- Disabling auto-access keeps member in family but revokes access
- All actions are logged in activityLog

---

**Ready to use!** Add the routes and component, then test with the examples above.
