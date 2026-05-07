## Diary Phase 7 - Production Integration Guide

**Version**: 1.0  
**Date**: May 7, 2026  
**Status**: Ready for Implementation  

---

## Overview

This document provides step-by-step instructions to integrate Diary Phase 7 components into the main Malabarbazaar application. The integration involves:

1. Adding API routes to the main Express app
2. Integrating React components into the diary module
3. Database configuration and migrations
4. Environment variable setup
5. Authentication and security configuration
6. Testing in production environment
7. Monitoring and logging setup

---

## Prerequisites

Before starting integration, ensure:

- ✅ All 450+ Phase 7 tests passing
- ✅ Backend utilities created (4 files)
- ✅ API routes defined (diary-phase7.js)
- ✅ React components built (4 files)
- ✅ CSS styling complete
- ✅ Complete documentation available
- ✅ Node.js 18+ and npm installed
- ✅ MongoDB running and accessible
- ✅ Redis running (optional but recommended)
- ✅ Main app structure verified

---

## Step 1: Backend Integration

### 1.1 Verify Main App Structure

Check your main Express app file (`backend/index.js` or `backend/app.js`):

```javascript
// Current structure should look like:
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { authenticate } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(authenticate);

// Existing routes
const diaryPhase1Routes = require('./routes/diary-phase1');
const diaryPhase2Routes = require('./routes/diary-phase2');
// ... other phases

app.use('/api/diary/phase1', diaryPhase1Routes);
app.use('/api/diary/phase2', diaryPhase2Routes);
// ... other phases

module.exports = app;
```

### 1.2 Add Phase 7 Routes

Add Phase 7 routes to your main app:

```javascript
// In backend/index.js or backend/app.js

const diaryPhase7Routes = require('./routes/diary-phase7');

// Add after other diary routes
app.use('/api/diary/phase7', diaryPhase7Routes);

// Verify route is registered
console.log('Phase 7 routes registered at /api/diary/phase7');
```

**Location**: Add between line where other diary routes are mounted and final export

### 1.3 Verify Middleware Stack

Ensure authentication middleware is applied:

```javascript
// Middleware order is important
app.use(express.json());                    // Parse JSON
app.use(cors());                            // Enable CORS
app.use(authenticate);                      // Verify JWT token
app.use(rateLimiter);                       // Rate limiting
app.use(requestLogger);                     // Logging

// Then mount routes
app.use('/api/diary/phase7', diaryPhase7Routes);
```

### 1.4 Import Required Utilities

Ensure all utility functions are available in the Phase 7 routes file:

```javascript
// At top of backend/routes/diary-phase7.js
const {
  generateRecommendations,
  generateWritingPrompts,
  analyzeWritingPatterns
} = require('../utils/diaryRecommendations');

const {
  generateCSV,
  generateJSONExport,
  generatePDFMetadata,
  generateAnalyticsCSV
} = require('../utils/diaryExport');

const {
  createShare,
  addComment,
  getCollaborationSummary,
  getSharingStats
} = require('../utils/diaryCollaboration');

const {
  createPreferences,
  updatePreferences,
  getPersonalizedPrompts,
  getWritingMode,
  getThemeConfig
} = require('../utils/diaryPersonalization');
```

**Verify**: All imports resolve without errors

### 1.5 Test Backend Integration

```bash
# Run the backend server
npm start

# In another terminal, test an endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/diary/phase7/recommendations?daysBack=90

# Expected response
{
  "success": true,
  "data": {
    "focusAreas": [...],
    "wellnessActions": [...],
    "motivationBoosts": [...],
    ...
  }
}
```

**Success Indicator**: All endpoints return 200 with proper response structure

---

## Step 2: Database Configuration

### 2.1 Create Preferences Table/Collection

**For MongoDB**:

```javascript
// In backend/models/Preference.js
const mongoose = require('mongoose');

const PreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  theme: {
    mode: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    primaryColor: { type: String, default: '#6366f1' },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    fontFamily: { type: String, default: 'Segoe UI' },
    lineHeight: { type: Number, enum: [1.4, 1.6, 1.8, 2.0], default: 1.6 }
  },
  writing: {
    defaultMode: { type: String, enum: ['full', 'minimal', 'focused', 'typewriter'], default: 'full' },
    autoSave: { type: Boolean, default: true },
    autoSaveInterval: { type: Number, default: 30 }, // seconds
    wordGoal: { type: Number, default: 500 },
    suggestTags: { type: Boolean, default: true },
    spellCheck: { type: Boolean, default: true },
    grammarCheck: { type: Boolean, default: false }
  },
  notifications: {
    reminders: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: '09:00' },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' }
    },
    streakNotifications: { type: Boolean, default: true },
    analyticsDigest: { type: String, enum: ['daily', 'weekly', 'monthly', 'never'], default: 'weekly' }
  },
  privacy: {
    profileVisibility: { type: String, enum: ['private', 'contacts', 'public'], default: 'private' },
    allowSharing: { type: Boolean, default: true },
    encryptEntries: { type: Boolean, default: false },
    dataRetention: { type: String, enum: ['6months', '1year', 'forever'], default: '1year' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
PreferenceSchema.index({ userId: 1 });

module.exports = mongoose.model('Preference', PreferenceSchema);
```

### 2.2 Create Share/Comment Collections

```javascript
// In backend/models/Share.js
const ShareSchema = new mongoose.Schema({
  entryId: mongoose.Schema.Types.ObjectId,
  ownerId: mongoose.Schema.Types.ObjectId,
  shareId: { type: String, unique: true },
  shareLink: String,
  sharedWith: [String], // emails
  permission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
  isPublic: { type: Boolean, default: false },
  password: String,
  expiresAt: Date,
  restrictions: {
    allowDownload: { type: Boolean, default: true },
    allowScreenshot: { type: Boolean, default: false },
    allowCopy: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  revokedAt: Date,
  viewCount: { type: Number, default: 0 },
  lastViewedAt: Date
});

ShareSchema.index({ shareId: 1 });
ShareSchema.index({ entryId: 1 });
ShareSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Share', ShareSchema);
```

### 2.3 Create Database Indexes

```bash
# Run MongoDB shell
mongosh

# Select database
use malabarbazaar

# Create indexes for performance
db.preferences.createIndex({ userId: 1 })
db.shares.createIndex({ shareId: 1 })
db.shares.createIndex({ entryId: 1 })
db.shares.createIndex({ ownerId: 1 })
db.comments.createIndex({ entryId: 1, createdAt: -1 })
db.diaryentries.createIndex({ userId: 1, isDeleted: 1 })
db.diaryentries.createIndex({ title: 'text', content: 'text' })

# Verify indexes created
db.preferences.getIndexes()
db.shares.getIndexes()
```

### 2.4 Migration Script (Optional)

```javascript
// scripts/migrate-phase7.js
const mongoose = require('mongoose');
const Preference = require('../backend/models/Preference');

async function migratePhase7() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Starting Phase 7 migration...');
    
    // Create default preferences for existing users
    const User = mongoose.model('User');
    const users = await User.find();
    
    for (const user of users) {
      const exists = await Preference.findOne({ userId: user._id });
      if (!exists) {
        await Preference.create({ userId: user._id });
        console.log(`Created preferences for user ${user._id}`);
      }
    }
    
    console.log('Migration complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePhase7();
```

Run migration:
```bash
node scripts/migrate-phase7.js
```

---

## Step 3: Frontend Integration

### 3.1 Import Components into Diary Module

**File**: `frontend/src/modules/personaldiary/DiaryModule.js` (or similar)

```javascript
// Add imports at top
import RecommendationsPanel from './RecommendationsPanel';
import ExportManager from './ExportManager';
import SharingPanel from './SharingPanel';
import PersonalizationPanel from './PersonalizationPanel';
import './Phase7Components.css';

// Import types/utilities
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
```

### 3.2 Update Diary Module Structure

```jsx
function DiaryModule() {
  const [activeTab, setActiveTab] = useState('entries');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const { token } = useAuth();
  const { showError, showSuccess } = useNotification();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear selection when switching tabs
    if (tab !== 'entries') {
      setSelectedEntry(null);
    }
  };

  const handleError = (error) => {
    console.error('Diary module error:', error);
    showError(error || 'An error occurred');
  };

  const handleSuccess = (message = 'Success') => {
    showSuccess(message);
  };

  return (
    <div className="diary-module">
      {/* Navigation Tabs */}
      <nav className="diary-tabs">
        <button 
          className={activeTab === 'entries' ? 'active' : ''}
          onClick={() => handleTabChange('entries')}
        >
          Entries
        </button>
        <button 
          className={activeTab === 'recommendations' ? 'active' : ''}
          onClick={() => handleTabChange('recommendations')}
        >
          Recommendations
        </button>
        <button 
          className={activeTab === 'export' ? 'active' : ''}
          onClick={() => handleTabChange('export')}
        >
          Export
        </button>
        <button 
          className={activeTab === 'sharing' ? 'active' : ''}
          onClick={() => handleTabChange('sharing')}
        >
          Sharing
        </button>
        <button 
          className={activeTab === 'personalization' ? 'active' : ''}
          onClick={() => handleTabChange('personalization')}
        >
          Settings
        </button>
      </nav>

      {/* Tab Content */}
      <div className="diary-content">
        {activeTab === 'entries' && (
          <DiaryEntries 
            token={token}
            onSelectEntry={setSelectedEntry}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsPanel 
            token={token}
            apiUrl={process.env.REACT_APP_API_URL}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}

        {activeTab === 'export' && (
          <ExportManager 
            token={token}
            apiUrl={process.env.REACT_APP_API_URL}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}

        {activeTab === 'sharing' && (
          <SharingPanel 
            token={token}
            entryId={selectedEntry?._id}
            apiUrl={process.env.REACT_APP_API_URL}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}

        {activeTab === 'personalization' && (
          <PersonalizationPanel 
            token={token}
            apiUrl={process.env.REACT_APP_API_URL}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default DiaryModule;
```

### 3.3 Verify CSS Import

Ensure Phase7Components.css is imported:

```javascript
// In frontend/src/index.js or frontend/src/App.js
import './modules/personaldiary/Phase7Components.css';

// Or in the component file
import './Phase7Components.css';
```

### 3.4 Configure Environment Variables

**File**: `frontend/.env.production`

```
REACT_APP_API_URL=https://api.malabarbazaar.com
REACT_APP_AUTH_ENDPOINT=/api/auth/login
REACT_APP_DIARY_API=/api/diary
```

**File**: `frontend/.env.development`

```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_AUTH_ENDPOINT=/api/auth/login
REACT_APP_DIARY_API=/api/diary
```

---

## Step 4: Authentication & Security

### 4.1 Verify JWT Configuration

```javascript
// In backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

module.exports = { authenticate };
```

### 4.2 Add Rate Limiting

```javascript
// In backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

function createModerateRateLimiter() {
  return rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  });
}

function createStrictRateLimiter() {
  return rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: 'Too many requests, please try again later'
  });
}

module.exports = { createModerateRateLimiter, createStrictRateLimiter };
```

### 4.3 Add CORS Configuration

```javascript
// In backend/index.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',                    // Development
    'https://malabarbazaar.com',                // Production
    'https://www.malabarbazaar.com'             // www variant
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 4.4 Verify Input Validation

All Phase 7 routes validate inputs:

```javascript
// Example from diary-phase7.js
router.get('/recommendations', async (req, res) => {
  const { daysBack } = req.query;
  
  // Validate daysBack parameter
  if (daysBack && ![7, 30, 90, 180].includes(parseInt(daysBack))) {
    return res.status(400).json({ 
      success: false, 
      error: 'daysBack must be 7, 30, 90, or 180' 
    });
  }

  // ... rest of endpoint
});
```

---

## Step 5: Testing Production Integration

### 5.1 Run Integration Tests

```bash
# Test backend routes
npm test -- backend/routes/diary-phase7.test.js

# Test utilities
npm test -- backend/utils/diary*.test.js

# All tests
npm test

# With coverage
npm test -- --coverage
```

### 5.2 Test API Endpoints Manually

```bash
# Get recommendations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/diary/phase7/recommendations?daysBack=90

# Create share
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entryId":"...","permission":"view"}' \
  http://localhost:5000/api/diary/phase7/share/create

# Get preferences
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/diary/phase7/preferences

# Update preferences
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":{"mode":"dark"}}' \
  http://localhost:5000/api/diary/phase7/preferences
```

### 5.3 Run E2E Tests

```bash
# Start backend and frontend servers first
npm start &
npm run start:frontend &

# Run E2E tests
npx cypress run

# Or open Cypress UI
npx cypress open
```

### 5.4 Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/diary/phase7/recommendations?daysBack=90

# Monitor performance metrics
# Response time should be < 500ms for recommendations
# Response time should be < 200ms for preferences
```

---

## Step 6: Monitoring & Logging

### 6.1 Configure Request Logging

```javascript
// In backend/middleware/logger.js
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create logs directory
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Setup file logging
const accessLog = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLog }));

// Setup console logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
```

### 6.2 Add Performance Monitoring

```javascript
// In backend/middleware/metrics.js
function trackMetrics(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const endpoint = `${req.method} ${req.path}`;
    
    if (duration > 1000) {
      console.warn(`⚠️  Slow endpoint: ${endpoint} (${duration}ms)`);
    }
    
    // Log to monitoring service
    if (global.metrics) {
      global.metrics.recordEndpointMetric(endpoint, duration, res.statusCode);
    }
  });
  
  next();
}

app.use(trackMetrics);
```

### 6.3 Setup Error Logging

```javascript
// In backend/utils/errorHandler.js
function handleError(error, req, res) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    endpoint: `${req.method} ${req.path}`,
    userId: req.userId,
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500
  };

  // Log to file
  console.error('ERROR LOG:', errorLog);

  // Send to monitoring service
  if (process.env.MONITORING_SERVICE) {
    fetch(process.env.MONITORING_SERVICE, {
      method: 'POST',
      body: JSON.stringify(errorLog)
    }).catch(err => console.error('Failed to log error:', err));
  }

  return res.status(errorLog.statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error'
      : error.message
  });
}

module.exports = { handleError };
```

---

## Step 7: Deployment Checklist

### Pre-Deployment

- [ ] All 450+ tests passing
- [ ] Code coverage > 95%
- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] Authentication verified
- [ ] Rate limiting tested
- [ ] Error logging configured
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Team reviewed changes

### Deployment

```bash
# 1. Build frontend
npm run build

# 2. Run final tests
npm test -- --coverage

# 3. Deploy to staging first
npm run deploy:staging

# 4. Verify staging deployment
curl -H "Authorization: Bearer TEST_TOKEN" \
  https://staging.malabarbazaar.com/api/diary/phase7/recommendations

# 5. Deploy to production
npm run deploy:production

# 6. Verify production deployment
curl -H "Authorization: Bearer TOKEN" \
  https://api.malabarbazaar.com/api/diary/phase7/recommendations

# 7. Monitor logs
tail -f logs/access.log
tail -f logs/error.log
```

### Post-Deployment

- [ ] Verify all endpoints responding
- [ ] Monitor error logs for 24 hours
- [ ] Check performance metrics
- [ ] Confirm databases working
- [ ] Test critical workflows
- [ ] Monitor server resources
- [ ] Get stakeholder sign-off

---

## Rollback Plan

If issues occur post-deployment:

```bash
# 1. Revert routes
# Remove Phase 7 route from backend/index.js:
# app.use('/api/diary/phase7', diaryPhase7Routes);

# 2. Revert frontend
npm run deploy:previous-version

# 3. Verify rollback
curl -H "Authorization: Bearer TOKEN" \
  https://api.malabarbazaar.com/api/diary

# 4. Investigate issues
# Check logs: logs/access.log
# Check errors: logs/error.log
```

---

## Summary

Phase 7 integration requires:

1. **Backend**: Add routes to main app, configure middleware
2. **Database**: Create collections/tables, build indexes
3. **Frontend**: Import components, update module structure
4. **Security**: Verify authentication, rate limiting, CORS
5. **Testing**: Run all test suites before deployment
6. **Monitoring**: Setup logging and error tracking
7. **Deployment**: Follow checklist, deploy to staging first

Expected Timeline:
- Setup: 1 hour
- Testing: 1-2 hours
- Deployment: 30 minutes
- Verification: 1 hour
- **Total**: 3.5-4.5 hours

---

**Next Steps**:
1. Follow steps 1-6 in order
2. Run full test suite before deployment
3. Deploy to staging environment
4. Verify functionality in staging
5. Deploy to production
6. Monitor for 24 hours post-deployment
7. Celebrate completion! 🎉

