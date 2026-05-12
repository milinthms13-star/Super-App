# Education User Manual (Front-End + Sync)

> Module: `src/modules/education/Education.js`

## 1) What this module does
The Education module provides:
- skill course discovery and enrollment
- My Learning continuation
- scholarship search and application tracking
- community group joining
- tuition request capture
- study assistant responses

Education progress is stored per account and synced via backend, with local fallback when offline.

## 2) Entry point
1. Login.
2. Open **Education** from app navigation.
3. Use the module navigation cards (Overview, Courses, My Learning, Community, Career, Government).

## 3) Step-by-step user flows

### 3.1 Browse and filter courses
1. Open **Courses**.
2. Use **Search courses**.
3. Course list filters instantly.

Expected result:
- Matching course cards are shown.

### 3.2 Open course detail
1. Click **View Details**.
2. Review syllabus, outcomes, duration, level, and price.

Expected result:
- Course detail renders.
- If no course is selected, fallback message appears with **Back to Courses**.

### 3.3 Enroll and sync
1. Click **Enroll Now**.
2. See status confirmation.
3. Open **My Learning**.

Expected result:
- Course appears in **My Learning**.
- Enrollment is synced to account-level education state.

### 3.4 Scholarship apply and sync
1. Open **Government**.
2. Search scholarship.
3. Click **Apply Now**.

Expected result:
- Button changes to **Applied**.
- Applied state syncs to account-level education state.

### 3.5 Join community and sync
1. Open **Community**.
2. Click group action.

Expected result:
- Button changes to **Joined**.
- Joined state syncs to account-level education state.

### 3.6 Tuition request
1. Open **Overview**.
2. Select subject.
3. Click **Request Tuition**.

Expected result:
- Status banner confirms request capture.

### 3.7 Study assistant
1. Enter question in **Study Assistant**.
2. Click **Ask Assistant**.

Expected result:
- Contextual guidance response is shown.

## 4) Sync behavior
- Primary sync: backend API (`/api/app-data/education/state`).
- Fallback: local browser storage if backend is unavailable.
- Sync indicator appears while state is being loaded/saved.

## 5) Troubleshooting
- State not syncing across devices:
  - Verify login uses same account on both devices.
  - Confirm backend API is reachable.
- Recent action shows but later disappears:
  - Check if backend sync failed and local data was cleared.
- UI shows sync banner for long time:
  - Check network/API latency and backend health.
