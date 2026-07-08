# Nila Beauty AI Module

## Overview

The Nila Beauty AI module provides personalized beauty care recommendations through AI-powered selfie analysis, custom beauty plans, progress tracking, and product recommendations. The module supports offline functionality, multi-language support (including Malayalam), and integrates with the platform's e-commerce and local services modules.

## Features

### Core Features
- **🤳 Selfie Analysis**: AI-powered skin analysis with concern detection
- **📋 Beauty Plans**: Personalized skincare routines based on skin type, concerns, and preferences
- **📊 Progress Tracking**: 7-day glow challenge with visual progress tracking
- **✨ Daily Tips**: Rotating beauty tips with category filtering
- **🛍️ Product Recommendations**: Budget-aware product suggestions
- **🔒 Privacy & Consent**: Granular consent management for data usage
- **📴 Offline Mode**: Queue actions when offline, auto-sync when connected
- **🌐 Multi-language**: Support for English, Malayalam, and other Indian languages

### Admin Features
- Tip library management
- Subscription rules configuration
- Usage analytics and alerts
- User activity monitoring

## Module Structure

```
src/modules/beautyai/
├── components/              # React components
│   ├── BeautyAIQuickStart.js       # Main plan generation interface
│   ├── BeautyProgressTracker.js    # 7-day challenge tracker
│   ├── BeautyTipsCarousel.js       # Rotating tips display
│   ├── BeautyPlanEditor.js         # Plan editing interface
│   ├── BeautySelfieGallery.js      # Selfie gallery with analysis
│   ├── BeautyAdminPanel.js         # Admin controls
│   ├── SelfieAnalysisResults.js    # Analysis results display
│   ├── BeautyConsent.js            # Consent management
│   ├── BeautyUsageStats.js         # Quota and usage display
│   ├── BeautyProductRecommendations.js  # Product suggestions
│   ├── BeautyRoutineCalendar.js    # Calendar view of routine
│   └── index.js                    # Component exports
├── services/                # API and offline services
│   ├── beautyaiApi.js              # Centralized API calls
│   └── offlineActionQueue.js       # Offline sync management
├── data/                    # Constants and mock data
│   ├── beautyaiConstants.js        # All constants
│   └── beautyaiMockData.js         # Mock data for dev/testing
├── __tests__/               # Test files
│   ├── NilaBeautyAI.test.js
│   └── beautyAiUpgradeUtils.test.js
├── NilaBeautyAI.js          # Main module component
├── NilaBeautyAI.css         # Module styles
├── beautyAiUpgradeUtils.js  # Utility functions
└── README.md                # This file
```

## Backend Structure

```
backend/
├── models/beautyai/         # Database models
│   ├── BeautyPlan.js               # Beauty plans
│   ├── BeautyTip.js                # Beauty tips
│   ├── BeautyProgressLog.js        # Progress logs
│   ├── BeautySubscriptionRule.js   # Subscription rules
│   ├── BeautyUsageQuota.js         # Usage quotas
│   ├── BeautyConsentAudit.js       # Consent audit log
│   ├── BeautyOpsEvent.js           # Operational events
│   ├── BeautySelfie.js             # Selfie metadata
│   └── index.js                    # Model exports
├── routes/
│   ├── beautyAI.js                 # API routes
│   └── beautyAI.routes.integration.test.js  # Integration tests
└── services/
    ├── beautyAiBackendHelpers.js   # Backend utilities
    └── beautyAiStorageService.js   # Storage utilities
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- AWS S3 (for image storage)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# .env
BEAUTY_AI_API_VERSION=beauty-ai-v1.1
BEAUTY_AI_MODEL_VERSION=heuristic-selfie-v2
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=your-region
BEAUTY_MEDIA_ALLOWED_HOSTS=your-allowed-hosts
```

3. Run backend tests:
```bash
cd backend
npm test -- --config jest.beautyai.config.js
```

### Usage

Import and use the main component:

```jsx
import NilaBeautyAI from './modules/beautyai/NilaBeautyAI';

function App() {
  return <NilaBeautyAI />;
}
```

## Key Components

### BeautyAIQuickStart
Main interface for selfie upload and plan generation.

**Props:**
- `onPlanReady`: Callback when plan is generated
- `onBookSalon`: Callback for salon booking
- `onOrderProducts`: Callback for product ordering
- `pushStatus`: Status message function
- `usageStatus`: Current usage status
- `consentStatus`: Consent status
- `savedSelfies`: Array of saved selfies
- `onRefreshSavedSelfies`: Refresh selfies callback
- `initialPlanBundle`: Initial plan data

### BeautyProgressTracker
7-day challenge progress tracker with weekly snapshots.

**Props:**
- `logs`: Array of progress logs
- `planId`: Active plan ID
- `planLabel`: Plan title
- `latestScore`: Latest skin score
- `selfiePreview`: Selfie URL
- `snapshotScopeKey`: User scope key
- `pushStatus`: Status message function
- `onEntriesUpdate`: Update callback

### BeautyTipsCarousel
Rotating beauty tips with category filtering.

**Props:**
- `tips`: Array of tips
- `todaysTip`: Featured tip
- `language`: Display language

## API Service

The `beautyaiApi.js` service provides centralized API calls with offline support:

```javascript
import { fetchDailyTips, generatePlan, saveProgressLog } from './services/beautyaiApi';

// Fetch tips
const result = await fetchDailyTips({ language: 'en' });

// Generate plan
const planResult = await generatePlan(planData);

// Save progress
const progressResult = await saveProgressLog({ planId, day: 1, done: true });
```

## Offline Support

The module includes offline queue management:

```javascript
import { startAutoSync, getQueueStats } from './services/offlineActionQueue';

// Start auto-sync
startAutoSync(30000, (progress) => {
  console.log(`Syncing: ${progress.current}/${progress.total}`);
});

// Check queue stats
const stats = getQueueStats();
console.log(`Pending: ${stats.pending}`);
```

## Constants

All constants are centralized in `beautyaiConstants.js`:

```javascript
import { SKIN_TYPES, SKIN_CONCERNS, BUDGET_LEVELS } from './data/beautyaiConstants';

// Use constants
const skinType = SKIN_TYPES.OILY;
const concern = SKIN_CONCERNS.ACNE;
const budget = BUDGET_LEVELS.MEDIUM;
```

## User Tiers

### Free Tier
- 3 selfie analyses per day
- 3 plan generations per day
- 7-day beauty plans
- Basic tips

### Premium Tier
- 20 selfie analyses per day
- 20 plan generations per day
- 30-day beauty plans
- Premium reports
- Dermatologist referrals

## Safety & Compliance

### Data Privacy
- All selfies encrypted in transit and at rest
- User consent required for analysis
- GDPR-compliant data handling
- User can delete data anytime

### Medical Disclaimer
This module is for informational purposes only and not a substitute for professional medical advice. Users with severe skin conditions should consult a dermatologist.

### Safety Warnings
- Patch test all recommended products
- Avoid mixing strong actives
- Consult dermatologist for severe concerns
- Stop use if irritation occurs

## Integrations

### E-commerce Module
Product recommendations link to the e-commerce module for purchases.

```javascript
handleOrderProducts={(products) => navigate('/ecommerce')}
```

### Local Services Module
Salon booking links to local services module.

```javascript
handleBookSalon={() => navigate('/localservices')}
```

## Testing

### Unit Tests
```bash
npm test -- beautyAiUpgradeUtils.test.js
```

### Integration Tests
```bash
cd backend
npm test -- beautyAI.routes.integration.test.js
```

### E2E Tests
```bash
npm run cypress -- --spec "cypress/e2e/beautyai.cy.js"
```

## Development

### Adding a New Component

1. Create component in `components/`:
```javascript
// components/NewComponent.js
import React from 'react';

const NewComponent = ({ prop1, prop2 }) => {
  return <div>New Component</div>;
};

export default NewComponent;
```

2. Export from `components/index.js`:
```javascript
export { default as NewComponent } from './NewComponent';
```

3. Use in main component:
```javascript
import { NewComponent } from './components';
```

### Adding a New API Endpoint

1. Add function to `services/beautyaiApi.js`:
```javascript
export const newApiFunction = async (data) => {
  try {
    const request = createAuthenticatedRequest();
    const response = await request.post(buildApiUrl('/beauty-ai/new-endpoint'), data);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error?.response?.data?.message };
  }
};
```

2. Use in components:
```javascript
import { newApiFunction } from '../services/beautyaiApi';

const result = await newApiFunction(data);
if (result.success) {
  // Handle success
}
```

## Troubleshooting

### Selfie Upload Issues
- Check image size (max 8MB)
- Verify allowed image types: JPEG, PNG, WebP
- Ensure S3 bucket permissions are correct

### Offline Sync Issues
- Check browser localStorage is not full
- Verify network connectivity
- Check auto-sync is running

### Quota Exceeded
- Check current usage in Usage Stats tab
- Verify subscription tier
- Contact admin for quota increase

## Performance Optimization

- Images lazy loaded in galleries
- API calls debounced
- Local caching with expiration
- Offline queue prevents duplicate requests

## Accessibility

- Keyboard navigation supported
- ARIA labels on interactive elements
- Screen reader friendly
- High contrast mode compatible

## Contributing

1. Create feature branch
2. Make changes with tests
3. Update documentation
4. Submit pull request
5. Pass CI/CD checks

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Create GitHub issue
- Contact support team
- Check API documentation

## Changelog

### v1.1.0 (Current)
- Restructured frontend with new components
- Added offline support
- Centralized API service
- Improved admin controls
- Enhanced privacy controls
- Multi-language support
- Product recommendations

### v1.0.0
- Initial release
- Basic selfie analysis
- Plan generation
- Progress tracking
