# Messaging Module Documentation (MalaBarbazaar)

## 1) Overview

The **Messaging module** powers real-time conversation experiences and message lifecycle enhancements for user-to-user and group chat scenarios. It is organized into implementation phases, with this repo containing comprehensive documentation artifacts per phase.

This consolidated document is a **module-level guide**:
- what the messaging module includes
- architecture map (backend + frontend boundaries)
- feature capabilities by phase
- API namespace + conventions
- where to find the “deep dive” docs (specifications, API references, completion summaries)

> Deep dive references:
> - **Phase 4 specification**: `docs/MESSAGING_PHASE4_SPECIFICATION.md`
> - **Phase 4 API reference**: `docs/MESSAGING_PHASE4_API_REFERENCE.md`
> - **Phase 4 completion summary**: `MESSAGING_PHASE4_COMPLETION_SUMMARY.md`
> - **Phase 2 final status report**: `MESSAGING_PHASE2_FINAL_STATUS_REPORT.md`

---

## 2) Module Scope (High-Level)

### Core messaging experience (earlier phases)
- Messaging UI and message rendering
- Real-time delivery and status updates via WebSocket
- Abuse reporting + moderation workflow
- Admin moderation panel and analytics for moderation outcomes

### Phase 4 enhancements (message lifecycle + data operations)
Phase 4 focuses on **operational resilience** and **user-centric enhancements**:
- **Message scheduling & expiration**
- **Message bookmarks & polls**
- **Chat backup & restoration**
- **Real-time optimization (WebSocket performance)**
- **Analytics & data management (retention, purge, export)**

---

## 3) Architecture Map (Where Things Live)

### Backend (Node/Express + services/routes/models)
The repository follows a common structure:
- `backend/models/`  
- `backend/services/`
- `backend/routes/`
- `backend/server.js` (route registration + job initialization)

Phase 4 introduces a **model → service → route** pattern and integrates background job handlers via `backend/server.js`.

### Frontend (React)
The messaging UI and module wiring live in your React app (common in this repo’s module organization).
- Frontend components for Phase 4 features include UI panels/dashboards for bookmarks, polls, and related lifecycle features.
- (If your app uses a `src/modules/messaging/` convention, the equivalent entry point should be used to mount the module.)

> Tip: prefer checking Phase completion docs for exact frontend filenames and props, because those are often tracked per phase.

---

## 4) Feature Set (by Implementation Phase)

### Phase 2 — Moderation & Reporting (Final status report)
Source: `MESSAGING_PHASE2_FINAL_STATUS_REPORT.md`

Highlights documented in Phase 2:
- Core messaging UI
- Message reporting
- Admin moderation panel
- WebSocket optimization for real-time events
- Advanced abuse reporting system with:
  - bulk report submission (1–100)
  - analytics and trends
  - pattern detection (serial offender detection)

Primary deliverables described:
- Backend service: bulk reporting, aggregation, analytics
- API routes: reporting operations endpoints
- Frontend UI: advanced reporting panel + admin analytics dashboard
- Responsive styling and documentation

---

### Phase 4 — Enhancements (Features 11–15)

Source:
- Feature spec: `docs/MESSAGING_PHASE4_SPECIFICATION.md`
- API reference: `docs/MESSAGING_PHASE4_API_REFERENCE.md`
- Completion summary: `MESSAGING_PHASE4_COMPLETION_SUMMARY.md`

#### Feature 11: Message Scheduling & Expiration
Capabilities:
- schedule messages for future delivery
- update/cancel scheduled messages
- configure expiration behavior:
  - timed expiration
  - self-destruct after read
  - self-destruct after view
- background processing via cron jobs

API reference location:
- `docs/MESSAGING_PHASE4_API_REFERENCE.md` (Feature 11)

#### Feature 12: Message Bookmarks & Polls
Capabilities:
- bookmark messages with tags/metadata
- searchable bookmarks + filtering + pagination
- in-chat polls (multiple poll types)
- voting + results aggregation
- poll closure/deletion

API reference location:
- `docs/MESSAGING_PHASE4_API_REFERENCE.md` (Feature 12)

#### Feature 13: Chat Backup & Restoration
Capabilities:
- create chat backups (single/all/archive)
- export to JSON/CSV
- restore from backup with progress/status tracking
- auto-backup configuration
- backup verification via hashing
- async backup/restore flows

API reference location:
- `docs/MESSAGING_PHASE4_API_REFERENCE.md` (Feature 13)

#### Feature 14: Real-Time Optimization
Capabilities:
- batching typing/read receipts to reduce event spam
- delta sync (send only changed fields)
- compression for large payloads
- heartbeat/keep-alive
- duplicate detection by client message id
- performance/latency metrics collection

API reference location:
- `docs/MESSAGING_PHASE4_API_REFERENCE.md` (Feature 14)

#### Feature 15: Analytics & Data Management
Capabilities:
- detailed message/chat/media statistics
- most active chats
- message trends (time series)
- media usage breakdown
- retention policy configuration
- archive old messages
- purge deleted messages permanently
- GDPR-friendly user data export

API reference location:
- `docs/MESSAGING_PHASE4_API_REFERENCE.md` (Feature 15)

---

## 5) API Namespace & Conventions

### API versioning namespace
Phase 4 endpoints are under:
- `/api/messaging/v4/`

### Authentication
- JWT Bearer token required on protected routes (documented in Phase 4 API reference).
  - Header: `Authorization: Bearer {token}`

### Response shape
Phase 4 API reference includes:
- success responses with `message` and sometimes `data`
- standard error payloads for 400/401/404/500 cases

For deeper/complete examples, use:
- `docs/MESSAGING_PHASE4_API_REFERENCE.md`

---

## 6) Background Jobs (Phase 4)

Phase 4 completion summary describes background jobs configured for:
- scheduled message processing (cron)
- message expiration cleanup
- retention policy execution (archive/purge orchestration)
- daily purge of soft-deleted messages

Deep detail:
- `MESSAGING_PHASE4_COMPLETION_SUMMARY.md`

---

## 7) Data & Security Notes

From the Phase 4 completion summary and specs, the module emphasizes:
- authentication/authorization via JWT + role checks
- input validation on endpoints
- TTL indexes and cleanup via database mechanisms where applicable
- async processing safety (backup/restore with status)
- per-user data isolation rules (scheduled messages/bookmarks/backups/metrics)

Deep detail:
- `docs/MESSAGING_PHASE4_SPECIFICATION.md`
- `MESSAGING_PHASE4_COMPLETION_SUMMARY.md`

---

## 8) How to Use the Documentation (Developer)

When you need to implement or verify messaging-module behavior:
1. Start with the feature breakdown:
   - `docs/MESSAGING_PHASE4_SPECIFICATION.md`
2. Copy endpoint contracts and examples:
   - `docs/MESSAGING_PHASE4_API_REFERENCE.md`
3. Confirm integration completeness and job wiring:
   - `MESSAGING_PHASE4_COMPLETION_SUMMARY.md`
4. For earlier moderation/reporting context:
   - `MESSAGING_PHASE2_FINAL_STATUS_REPORT.md`

---

## 9) File Index (Quick Links)

### Phase 4
- Specification: `docs/MESSAGING_PHASE4_SPECIFICATION.md`
- API reference: `docs/MESSAGING_PHASE4_API_REFERENCE.md`
- Completion summary: `MESSAGING_PHASE4_COMPLETION_SUMMARY.md`

### Phase 2
- Final status report: `MESSAGING_PHASE2_FINAL_STATUS_REPORT.md`

---

## 10) Version / Last Updated

- Document version: 1.0
- Last updated: 2026-05-09
