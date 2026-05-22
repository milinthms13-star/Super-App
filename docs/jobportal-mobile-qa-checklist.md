# JobPortal Mobile QA Checklist

## Network Resilience
- Verify `save`, `apply` (without file), and `report` actions queue offline and sync after reconnect.
- Confirm file-based `apply` shows a clear online-only warning when offline.
- Validate background refresh does not run when app tab is hidden.

## Upload UX
- Resume upload shows progress and supports cancellation.
- Profile upload shows progress and supports cancellation.
- Cancelled uploads do not create partial applications/profiles.

## Deep Links
- `jobportal?tab=overview360` opens dashboard tab directly.
- `jobportal?tab=home&jobId=<id>` opens job details modal.
- Invalid tab values safely fallback to default.

## Notifications
- Notification permission request path works on supported browsers.
- Device registration endpoint receives token, platform, device ID, and version.
- Assistant completion can trigger local notification when permission is granted.

## Telemetry and Reliability
- `screen_view`, `api_error`, `offline_action_queued`, and `offline_queue_flushed` events reach backend.
- Event payloads include source and context metadata.
- No user-facing flow is blocked if telemetry submission fails.

## Core Business Flows
- Candidate: search, details, save, apply, applications tracking, 360 dashboard.
- Employer: post job, load dashboard, view applicants, change status.
- Trust: report suspicious job, moderation status reflection in 360 metrics.

