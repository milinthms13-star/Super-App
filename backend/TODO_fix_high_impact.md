# TODO: High-impact fixes to unblock test runs

## Step 1 — Fix test runner teardown crash (Mongoose readyState close)
- File: `backend/tests/setup.js`
- Problem: `TypeError: Cannot assign to read only property 'readyState'` during `mongoose.connection.close()`.
- Change teardown to use safe checks + guards:
  - Only close if connection state supports it.
  - Prevent double-close and handle partially-initialized test runs.
  - Ensure we don’t mutate connection internals.

## Step 2 — Stop node-cron jobs from keeping Jest open
- Files:
  - `backend/services/dataManagementService.js`
  - `backend/services/schedulingService.js`
  - plus any other cron schedulers used during unit tests
- Problem: Jest reports open handles from `cron.schedule(...)`.
- Change cron startup so it returns references and is disabled under `NODE_ENV==='test'` OR provides a `stop()` method called by tests/setup.js.

## Step 3 — Make DataRetentionPolicy accept required enum values from tests
- File: `backend/models/DataRetentionPolicy.js`
- Problem: tests use `autoDeleteMode: 'archive'` but schema enum excludes it.
- Add `archive` to `autoDeleteMode` enum.

## Step 4 — Align DataManagementService with tests’ expected argument names + return types
- File: `backend/services/dataManagementService.js`
- Problems observed:
  - Duplicate key errors in `Message` due to unique index with `clientMessageId:null`.
  - Wrong handling of `thresholdDays` vs `olderThanDays` / `purgeAfterDays`.
  - `getRetentionPolicy` should return `null` when missing (tests expect null, service currently creates default).
  - `startDataManagementJobs()` should return boolean.
  - `purgeDeletedMessages` should handle invalid dates / field names.

## Step 5 — Fix RichMediaService tests (buffering timeout + validation error)
- Files: `backend/services/richMediaService.js`, `backend/models/MediaMetadata.js`, likely test setup
- Problems observed:
  - `mediametadatas.insertOne/find` buffering timeout indicates Mongo not connected or connection teardown issues.
  - `Cannot read properties of undefined (reading 'includes')` suggests `supportedFormats` undefined.
- Ensure supported formats property exists and mediaType validation uses correct property.

## Step 6 — Fix BackupRestoreService API mismatch
- Files: `backend/services/backupRestoreService.js`, `backend/models/ChatBackup.js`
- Problems observed:
  - backupName/backipHash not set as expected.
  - `getBackupStatus` missing.
  - deleteBackup failing because storageLocation file missing (test-created path).
  - scheduleAutoBackup userId cast mismatch.

## Step 7 — Fix remaining unit services
- BookmarkPollService, SchedulingService, OptimizationService, SmartRepliesService
- Most likely root cause is shared schema/API mismatch + test DB connectivity/teardown.

