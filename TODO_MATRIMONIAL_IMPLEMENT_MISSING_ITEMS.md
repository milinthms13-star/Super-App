# TODO: Implement Missing Matrimonial Checklist Items

This checklist is derived from comparing your MATRIMONIAL MODULE FEATURE CHECKLIST against the current code.

## High-priority (must implement)
- [ ] Horoscope/Astrology fields in `MatrimonialProfile` (Nakshatra, Rashi, Star, time/place of birth, horoscope upload URL + parsing)
- [ ] Horoscope matching logic + compatibility score integration into `src/modules/matrimonial/matching.js` and backend search
- [ ] Watermark protection for matrimonial images (server-side watermark on upload and metadata tracking)
- [ ] Image moderation / fake-image detection pipeline (AI moderation + store moderation status/risk score)
- [ ] Screenshot protection (optional): deterrent watermark overlay + UI gating behavior
- [ ] KYC verification artifacts (Aadhaar/PAN/selfie) + KYC status fields
- [ ] Blue tick issuance workflow (admin review + automatic issuance rules)
- [ ] Real premium subscription entitlements for matrimonial (Gold/Premium/VIP) (server-side entitlement checks)
- [ ] Subscription expiry handling + reminders (backend scheduler + frontend notification hooks)
- [ ] Refund handling for matrimonial subscriptions (status tracking + webhook endpoints)
- [ ] Partner preference mandatory matching enforcement (block discovery until partner preferences complete)

## Communication & safety depth
- [ ] Typing indicator + read receipts completeness (websocket events + server updates)
- [ ] Chat moderation/spam detection for matrimonial chats
- [ ] Voice call + video call + WhatsApp integration (or explicit roadmap if using external services)

## Admin/SEO/monetization
- [ ] Admin analytics dashboard for matrimonial (users growth, match analytics, gender ratio)
- [ ] Admin CMS pages for matrimonial: Success stories, Blog, FAQ, Terms/Privacy
- [ ] SEO pages for Google ranking (server-rendered or static routes)
- [ ] Referral program + affiliate system (backend endpoints + tracking + rewards)

## Scalability
- [ ] Multi-language support for matrimonial UI and backend responses
- [ ] Image CDN optimization hooks (S3 + CloudFront or equivalent)
- [ ] Search improvements: ElasticSearch/Redis caching for matrimonial discovery

---

## Notes
Current implementation provides a baseline MVP: profile wizard, preferences, search, interest request flow, messaging with isRead, privacy toggles, blocking/reporting, and admin profile approval queue.

