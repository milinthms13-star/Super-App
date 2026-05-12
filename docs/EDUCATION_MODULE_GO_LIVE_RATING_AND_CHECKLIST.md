# Education Module — Go-live Production Rating & Checklist

This rating/checklist is derived from inspecting:
- UI: `src/modules/education/Education.js`
- Styling: `src/modules/education/Education.css`
- App routing: `src/App.js`
- Module docs: `docs/user-manuals/education/USER_MANUAL.md`

---

## Production go-live rating (proposed): **3 / 5**

### Why not higher (main gaps / risks)
1. **Demo-only actions still exist**
   - Course enroll, scholarship apply, and tuition booking use `alert()` placeholders.
   - No real backend submission or state persistence is wired in.

2. **Course detail navigation is UI-only**
   - The `course-detail` screen is navigable but the selected course state is in-memory only.
   - There is no browser route or deep-linking support for course detail.

3. **No dedicated education tests are present**
   - No module-specific unit tests, integration tests, or E2E tests covering the new education flows.
   - Lack of test coverage increases release risk for navigation and filtering behavior.

4. **Accessibility and responsive QA are unverified**
   - New buttons, inputs, and section panels need keyboard and mobile layout validation.
   - No visible checks for ARIA attributes or form labels beyond basic HTML.

### Why it’s not lower (what is strong)
- The module renders clean separation of flows: `home`, `courses`, `my-learning`, `course-detail`, `community`, `career`, `government`.
- Course filtering is implemented with memoized search logic.
- Navigation state is centralized and user actions are clearly mapped to sections.

---

## Go-live checklist (must do)

### A) UI and navigation
- [ ] Confirm `home`, `courses`, `my-learning`, `course-detail`, `community`, `career`, and `government` sections render correctly.
- [ ] Validate `courses` search/filter input works and updates the course list.
- [ ] Verify `View Details` opens the selected course detail and `Back to Courses` returns to the list.
- [ ] Ensure `my-learning` shows enrolled courses or a realistic empty state if none are enrolled.
- [ ] Validate `community` and `career` cards render and action buttons are not broken.
- [ ] Confirm the `government` scholarship search works and filters results.

### B) Data and workflow wiring
- [ ] Replace placeholder `alert()` actions with real workflows or disable them until backend integration is available.
- [ ] Ensure course enrollment updates real user state or enrollment records (not just a demo message).
- [ ] Ensure scholarship apply action sends a valid request or launches the correct application flow.
- [ ] Confirm selected course persists while navigating into `course-detail`.
- [ ] Add a fallback for no selected course on `course-detail` and a clear path back to courses.

### C) Testing
- [ ] Add unit tests for:
  - active section rendering
  - `filteredCourses` search logic
  - scholarship search filtering
  - selected course detail handling
- [ ] Add integration/E2E tests for:
  - course browse → detail → enroll path
  - scholarship search and apply flow
  - community/career/government tab navigation
- [ ] Run `npm test` and confirm the education-module tests pass.

### D) Accessibility and responsiveness
- [ ] Verify input labels and buttons are keyboard-accessible.
- [ ] Confirm text is readable and section cards wrap correctly on mobile widths.
- [ ] Validate `education-nav` items are clearly tappable on small screens.
- [ ] Confirm form controls include visible labels and placeholders.

### E) Release readiness
- [ ] Ensure the education route is registered correctly in `src/App.js`.
- [ ] Remove or defer any features that are not fully implemented in production.
- [ ] Add user messaging for any “coming soon” or placeholder behavior.
- [ ] Perform a production build: `npm run build` and confirm no build-time errors.

---

## Suggested release gating rules
- Ship to production only if:
  - All education UI flows render and navigate correctly.
  - No placeholder alerts remain in user-facing action buttons.
  - Course detail navigation is stable and does not break when no course is selected.
  - Basic unit/integration tests are added and pass.
  - Mobile/responsive layout has been manually verified.

---

## References
- UI: `src/modules/education/Education.js`
- Styling: `src/modules/education/Education.css`
- Documentation: `docs/user-manuals/education/USER_MANUAL.md`
