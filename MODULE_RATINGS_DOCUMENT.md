# NilaHub — Module Ratings & Project Valuation Document

## 1) Purpose
This document explains:
1. The **project valuation write-up** already available in this repository.
2. The **module ratings feature** (UI + route) that lets users review module performance/ratings.

## 2) Existing Investor Valuation (Static HTML)
The repository already contains an investor-facing valuation report (static HTML):

- `INVESTOR_VALUATION_REPORT_FINAL_PRINT.html`

Key sections include:
- Valuation conclusion (defensible range in USD/INR)
- What is included / not included
- Repository evidence table
- Valuation method breakdown
- Founder profile section
- Main investor questions
- Fastest ways to increase value

## 3) Investor Screenshot Appendix (Static HTML)
- `INVESTOR_SCREENSHOT_APPENDIX_PRINT.html`

This is a standalone appendix template with:
- A minimum screenshot set checklist (12 pages)
- Placeholders for PNG insertion under the intended directory: `docs/investor-screenshots/`

> Note: In this repo snapshot, the screenshot directory is not present; the HTML is ready to be updated once images are added.

## 4) “Rate My Modules” — What Was Implemented
### 4.1 Frontend: Module Ratings Page
A new frontend page was added:

- `src/modules/moduleratings/ModuleRatings.js`

It provides a **Module Ratings** table intended to display module-level rating metrics.

### 4.2 Frontend: Routing
The app routing was updated so the page is reachable at:

- **`/module-ratings`**

(Implemented by updating `src/App.js` to lazy-load the page and add the route.)

### 4.3 Data Source (Backend Endpoint)
The Module Ratings UI fetches module rating data from:

- `GET ${API_BASE_URL}/app-data/module-ratings?periodDays=90`

### 4.4 Where the “Rating” is Shown
On the `/module-ratings` page, the displayed rating values are shown in the table columns rendered from the backend response, typically including:
- **Rating** (e.g., numeric rating)
- Optional/derived fields such as **Hybrid Score** if the backend provides a `score` field.

If the backend response does not include rating fields (e.g., `rating`, `score`, `reviewCount`, etc.), the UI will show an empty/placeholder state (e.g., “No module ratings available”).

## 5) Backend Work Status
At the time of this document, the frontend route/page integration exists.

To fully populate “Rate my modules” with real values, the repository must provide the backend response for:

- `GET /app-data/module-ratings?periodDays=90`

If that endpoint does not yet exist or returns no data in your environment, you will see an empty ratings table.

## 6) How to Use
1. Start the frontend app.
2. Open:
   - `http(s)://<your-host>/module-ratings`
3. Review the module ratings table.

## 7) Files Summary
- `INVESTOR_VALUATION_REPORT_FINAL_PRINT.html` — investor valuation report (static)
- `INVESTOR_SCREENSHOT_APPENDIX_PRINT.html` — screenshot appendix template (static)
- `src/modules/moduleratings/ModuleRatings.js` — module ratings UI
- `src/App.js` — route wiring for `/module-ratings`

## 8) Expected Next Enhancements (if needed)
If the backend endpoint is missing or returns incomplete fields, next steps typically include:
- Implement/verify `GET /app-data/module-ratings?periodDays=90`
- Ensure response fields align with UI expectations (rating, score, review counts, etc.)
- Add unit/integration tests for the aggregation endpoint and UI rendering.

