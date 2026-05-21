# GulfServices 360 Canva Brief

## Objective
Design a complete Gulf Services ecosystem experience that is trustworthy, operationally auditable, and conversion-focused for Gulf migration workflows.

## Roles
1. Candidate / Family
2. Recruiter / Agency
3. Admin / Operations

## End-to-End Journeys
1. Candidate: discover service -> complete readiness checklist -> apply job -> visa + attestation -> travel/medical -> tracking -> emergency backup
2. Family: track request status -> receive alerts -> escalate emergency cases
3. Recruiter: apply onboarding -> KYC review -> verification -> list jobs -> handle applications
4. Admin: monitor funnel -> verify recruiters -> manage fraud cases -> update visa pipeline -> resolve escalations

## Required Screen Sets
1. Gulf Home (role-aware hero + trust indicators)
2. Jobs Discovery (filters, recruiter trust card, safety warnings)
3. Job Application (stepper form + document validation states)
4. Visa Request (type, urgency, timeline expectations)
5. Attestation Request + Payment (normal vs expedited)
6. Travel / Medical / Returnee / NRI Request forms
7. Unified Tracking Center (all request types)
8. User Dashboard (pipeline cards + pending actions)
9. Fraud Reporting + Case Tracking
10. Emergency Desk (quick actions: call, WhatsApp, embassy guide)
11. Admin Workflow Board (applications, recruiter queue, fraud queue)
12. Admin Analytics (funnel + SLA + risk panels)

## States (for every screen)
1. Loading
2. Empty
3. Success
4. Validation Error
5. Permission Denied
6. Escalated / Requires Human Review

## Visual Direction
1. Theme: Gulf migration operations + trust-centric support platform
2. Palette: deep navy, teal, amber warning accents, calm neutral cards
3. Typography: clear hierarchy for procedural guidance and legal notices
4. Components: timeline chips, status badges, fraud alert banners, trust seals, SLA cards

## Copy and Trust Rules
1. Always show next best action
2. Mark verified vs unverified actors explicitly
3. Keep anti-fraud warning persistent in jobs + payments + recruiter surfaces
4. Use plain-language timeline wording (no internal jargon)

## Accessibility
1. WCAG AA color contrast
2. 44x44 minimum touch targets
3. Keyboard focus for all modals/forms
4. Screen-reader labels for status timelines and warnings

## Analytics/KPI Board (Canva panel)
1. Job application completion rate
2. Visa request to travel-ready conversion
3. Recruiter verification turnaround time
4. Fraud report resolution time
5. Emergency response SLA
6. Drop-off by form step

## Engineering Handoff Notes
1. Trackable IDs to expose in UI: `VR-*`, `ATT-*`, `APP-*`, `TRV-*`, `MED-*`, `RET-*`, `NRI-*`, `FRD-*`
2. Role gating must be server-authoritative
3. Payment webhooks must be signature-verified
4. Dashboard must aggregate all service request types
5. Fraud lifecycle states: `open`, `in_review`, `resolved`, `rejected`

## Breakpoints
1. Mobile: 360 / 390 / 412
2. Tablet: 768
3. Desktop: 1280 / 1440

