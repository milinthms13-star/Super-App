# NilaHub SOS Upgrade Patch

## Files included

```txt
src/modules/sos/SOSQuickPanel.js
src/modules/sos/EmergencyProfileForm.js
src/modules/sos/sosSafetyUtils.js
src/modules/sos/useLiveLocationRefresh.js
src/styles/SOSUpgrade.css
backend/services/sosUpgradeService.js
backend/controllers/sosLocationUpgradeController.js
backend/routes/sosUpgradeRoutesSnippet.js
backend/models/SosIncidentUpgradeFields.js
```

## How to use in `SOSAlert.js`

Import:

```js
import SOSQuickPanel from './SOSQuickPanel';
import EmergencyProfileForm, { loadEmergencyProfile } from './EmergencyProfileForm';
import { useLiveLocationRefresh } from './useLiveLocationRefresh';
import '../../styles/SOSUpgrade.css';
```

Add state:

```js
const [emergencyProfile, setEmergencyProfile] = useState(loadEmergencyProfile());
const [activeIncidentId, setActiveIncidentId] = useState(null);

useLiveLocationRefresh({
  incidentId: activeIncidentId,
  active: Boolean(activeIncidentId),
  authToken: localStorage.getItem('token'),
});
```

Place near the top of your SOS page:

```jsx
<SOSQuickPanel
  contacts={trustedContacts}
  emergencyProfile={emergencyProfile}
  authToken={localStorage.getItem('token')}
  onIncidentCreated={(incident) => setActiveIncidentId(incident?._id || incident?.id)}
/>

<EmergencyProfileForm onSave={setEmergencyProfile} />
```

## Backend route

In `backend/routes/sosRoutes.js`, add:

```js
const sosLocationUpgradeController = require('../controllers/sosLocationUpgradeController');

router.patch(
  '/incident/:incidentId/location',
  authMiddleware,
  sosLocationUpgradeController.updateLiveLocation
);
```

## Backend model optional fields

Add the fields from `backend/models/SosIncidentUpgradeFields.js` inside `sosIncidentSchema` to store emergency profile, silent mode, and priority.

## Main upgrades

- Hold 3 seconds to send SOS
- 10-second cancel window
- Offline SOS queue with auto-retry
- WhatsApp deep-link fallback
- India emergency call buttons: 112, 108, 100, 101, 1091, 1098
- Emergency profile: blood group, allergies, medical conditions, hospital, address, notes
- Live location refresh every 30 seconds
- Privacy note for sensitive recording/location sharing

## Safety note

Do not claim SOS delivery is guaranteed. Always display a message like:

```txt
SOS delivery depends on internet/SMS/phone availability. In immediate danger, call 112 directly.
```
