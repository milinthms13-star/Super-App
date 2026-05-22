# JobPortal Vercel Operations

This document covers the Vercel deployment, cache, and cron setup for the JobPortal 360 module.

## Endpoints

- Auth 360 dashboard: `GET /api/jobportal/overview360`
- Public marketplace 360 snapshot: `GET /api/jobportal/overview360/public`
- Cron cache rebuild: `GET|POST /api/jobportal/internal/cron/overview360-rebuild`

## Cache strategy

- `GET /api/jobportal/jobs`
  - Personalized queries (auth header or `applicantSkills`) -> `private, no-store`
  - Generic browsing -> `public, s-maxage=45, stale-while-revalidate=300`
- `GET /api/jobportal/overview360`
  - Always private no-store (user-specific)
- `GET /api/jobportal/overview360/public`
  - Public edge cache: `s-maxage=120, stale-while-revalidate=600`

## Server-side overview cache

- Env: `JOBPORTAL_ENABLE_OVERVIEW_CACHE` (default `true`)
- Env: `JOBPORTAL_OVERVIEW_CACHE_TTL_MS` (default `120000`)
- Any significant marketplace mutation invalidates the cache:
  - post/update/delete job
  - apply job
  - application status update
  - report submit / moderation update

## Cron security

- Env: `JOBPORTAL_CRON_SECRET`
- The cron endpoint accepts either:
  - `Authorization: Bearer <JOBPORTAL_CRON_SECRET>`
  - `x-cron-secret: <JOBPORTAL_CRON_SECRET>`

## vercel.json additions

- Cron schedule:
  - `/api/jobportal/internal/cron/overview360-rebuild` every 15 minutes
- Route headers for:
  - `/api/jobportal/jobs`
  - `/api/jobportal/overview360`
  - `/api/jobportal/overview360/public`

## GitHub Actions deploy workflow

File: `.github/workflows/vercel-jobportal.yml`

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Flow:

- Pull request: preview deploy with `vercel build` + `vercel deploy --prebuilt`
- `main` push: production deploy with `vercel build --prod` + `vercel deploy --prebuilt --prod`
