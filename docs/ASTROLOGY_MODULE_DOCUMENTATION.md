# Astrology Module Documentation (Front-End)

## 1) Overview
The Astrology module provides horoscope/devotional-style content experiences. Users typically browse horoscope cards and access details for personalized insights.

## 2) Front-End Entry Points
- `src/modules/astrology/AstrologyHome.js`
- `src/modules/astrology/HoroscopeCard.js`

## 3) Architecture Map (UI-level)
- Home screen:
  - shows a set of horoscope/content cards
  - provides navigation to detail views (if supported)
- Card component:
  - renders horoscope text/metadata
  - exposes actions (e.g., view details, save, share if present)

## 4) Key Features
- Horoscope card browsing
- User interactions on horoscope cards (view/open actions depending on UI)

## 5) Data & API Conventions
This repo’s docs commonly use:
- `success` / `data` / `message` for successful responses
- `success: false` with `message` and optional `error` for failures

For exact endpoint contracts, check backend API docs if present for astrology.

## 6) Troubleshooting
- Content not showing:
  - verify authentication/session if astrology content is gated
  - refresh the page and retry
  - check network connectivity
- Cards render incorrectly:
  - validate translations/assets loaded (images, localized strings)
