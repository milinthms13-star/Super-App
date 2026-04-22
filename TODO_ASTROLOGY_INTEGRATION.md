# Astrology Module Integration - TODO Steps

## Plan Overview
Integrate Astrology module into home/launch page by:
1. Enabling in backend `enabledModules`
2. Adding UI entries (LaunchPage, Dashboard, Navigation)
3. Translation keys
4. App.js render case
5. Icon & complete AstrologyHome.js

**Status: 0/8 Complete**

## Step-by-Step Tasks

### 1. [✅] Backend: Enable "astrology" in enabledModules
- Edit `backend/data/app-data.json` or `backend/utils/defaultAppData.js`
- Add `"astrology"` to `enabledModules` array
- Restart backend server

### 2. [✅] Translations: Add keys to `src/data/translations.js`
- `modules.astrology: "AstroNila"` (all languages)
- `dashboard.moduleDescriptions.astrology`

### 3. [✅] LaunchPage: Add mapping `src/components/LaunchPage.js`
- `moduleMapping["AstroNila"] = "astrology"`
- `launch.features` add entry

### 4. [✅] Dashboard: Add to MODULE_CONFIG `src/modules/Dashboard.js`
- New config object for astrology
- Add "astrology" icon case in Icon component

### 5. [✅] Navigation: Add to allBusinessModules `src/components/Navigation.js`
- `{ id: "astrology", label: t("modules.astrology", "AstroNila") }`

### 6. [✅] App.js: Add render case `src/App.js`
- Import AstrologyHome
- `case "astrology": return <AstrologyHome />;`

### 7. [✅] Complete AstrologyHome.js `src/modules/astrology/AstrologyHome.js`
- Fix incomplete imports
- Add full UI with HoroscopeCard & service calls

### 8. [ ] Test & Verify
- npm start (frontend/backend)
- AdminDashboard: Toggle astrology ON
- LaunchPage: AstroNila card visible
- Click: Navigates to AstrologyHome
- Data loads (horoscopes)

## Next Command
Run this after each step:  
`npx prettier --write .`  
`npm run lint -- --fix`

