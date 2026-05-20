# Beauty AI Upgrade

Add these files near your existing Beauty AI module.

## Frontend
- `BeautyAIQuickStart.js` gives the simplified first screen.
- `BeautyProgressTracker.js` gives 7-day progress tracking.
- Import `BeautyAIUpgrade.css` in your Beauty AI module or global CSS.

Example:
```jsx
import BeautyAIQuickStart from './BeautyAIQuickStart';
import BeautyProgressTracker from './BeautyProgressTracker';
import './BeautyAIUpgrade.css';
```

Place `<BeautyAIQuickStart />` at the top of your Beauty AI page.
Place `<BeautyProgressTracker />` below the generated routine.

## Backend
- Copy `beautyAiBackendHelpers.js` to `backend/services/beautyAiBackendHelpers.js`.
- Use `beautyAiRoutesSnippet.js` as a guide to add `/api/beauty-ai/plan`.

## Important
This patch keeps demo working without paid image AI. Real selfie analysis should be added later with a dermatology-safe image model/API.
