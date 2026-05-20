# Dance Duet 10/10 Upgrade

## What this fixes
- Makes first screen simple and premium.
- Adds readiness score and clear tips.
- Adds reel/shorts 9:16 output.
- Adds auto best merge mode.
- Adds progress steps.
- Adds WhatsApp sharing.
- Adds mirror second dancer option.
- Adds safer backend mode validation.
- Keeps warning that true same-stage merge needs green/blue screen videos.

## Frontend install
Add these files to `src/modules/danceduet/`:
- `DanceDuetQuickStudio.js`
- `danceDuetUpgradeUtils.js`
- `DanceDuetUpgrade.css`

Then in your route/import, use:
```js
import DanceDuetQuickStudio from './modules/danceduet/DanceDuetQuickStudio';
```

## Backend install
Replace or merge:
- `backend/services/danceDuetService.js` with `danceDuetService.upgraded.js`
- `backend/routes/danceDuet.js` with `danceDuetRoutes.upgraded.js`

## Important truth
This patch uses FFmpeg. It creates a strong reel/duet/stage merge. It is not full AI human segmentation for ordinary videos. For true 10/10 same-stage dancer extraction from normal backgrounds, later integrate MediaPipe/SAM2/Robust Video Matting.
