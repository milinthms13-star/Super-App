# TODO - Project valuation

## Plan (high level)
1. Update investor valuation HTML to include a performance snapshot section (static placeholders if live data endpoints aren’t defined).
2. Add a dynamic analytics page in the frontend that calls existing backend metrics.
3. Implement backend endpoint(s) that aggregate performance metrics from existing module/domain data.
4. Wire routing + UI, and ensure it renders without breaking existing pages.
5. Validate with a local build/run.

## Current progress
- [x] Located existing investor valuation report HTML: INVESTOR_VALUATION_REPORT_FINAL_PRINT.html
- [x] Located existing investor appendix HTML: INVESTOR_SCREENSHOT_APPENDIX_PRINT.html
- [x] Confirmed no `docs/investor-screenshots/` directory in repo (only template placeholders)
- [x] Identify performance primitives (avg rating + review counts + some score-style analytics live in domain data)
- [ ] Decide canonical analytics definition and mapping for modules (implementation choices + endpoint shape)
- [ ] Implement backend aggregation endpoint
- [ ] Implement frontend analytics page + route
- [ ] Update investor valuation report HTML with snapshot
- [ ] Test/build

