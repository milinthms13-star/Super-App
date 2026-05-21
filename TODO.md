# TODO - Project valuation & module ratings

## Plan (high level)
1. Update investor valuation HTML to include a module ratings snapshot section (static placeholders if live data endpoints aren’t defined).
2. Add a dynamic module ratings page in the frontend that calls a backend aggregation endpoint.
3. Implement backend endpoint(s) that aggregate module-level ratings from existing module/domain rating data.
4. Wire routing + UI, and ensure it renders without breaking existing pages.
5. Validate with a local build/run.

## Current progress
- [x] Located existing investor valuation report HTML: INVESTOR_VALUATION_REPORT_FINAL_PRINT.html
- [x] Located existing investor appendix HTML: INVESTOR_SCREENSHOT_APPENDIX_PRINT.html
- [x] Confirmed no `docs/investor-screenshots/` directory in repo (only template placeholders)
- [x] Identify module rating primitives (avg rating + review counts + some score-style analytics live in domain data)
- [ ] Decide canonical “module rating” definition and mapping for modules (implementation choices + endpoint shape)
- [ ] Implement backend aggregation endpoint
- [ ] Implement frontend module ratings page + route
- [ ] Update investor valuation report HTML with snapshot
- [ ] Test/build

