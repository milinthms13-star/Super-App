# GulfServices Vercel Ops Checklist

## Purpose

This checklist defines the Vercel release posture for GulfServices to support 360 readiness.

## Preview Quality Gates

1. Every PR should produce a Vercel preview deployment.
2. Preview verification should include:
   - `/gulf-services` page render check
   - visa modal open/close check
   - jobs listing render check
   - recruiter onboarding modal open check
3. Block merge if preview checks fail.

## Observability Baseline

Enable Vercel Observability and monitor these GulfServices routes:

- `/gulf-services`
- API endpoints used by GulfServices from `backend/routes/gulfservices.js`

Track:

1. p95 response latency
2. 4xx/5xx error rate
3. peak traffic windows
4. failed payment webhook processing counts

## Feature Flag Rollout Plan

Guard high-risk releases with flags:

1. `gulf_payments_v2`
2. `gulf_fraud_admin_v2`
3. `gulf_workflow_ui_v2`

Recommended rollout:

1. `5%` internal users
2. `25%` trusted users
3. `100%` after 24h stability

## Incident Response

If error rate spikes:

1. disable relevant feature flag
2. verify payment idempotency + webhook event status
3. inspect admin audit event stream
4. redeploy last known good build
