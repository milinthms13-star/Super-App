# TODO — Refresh module inventory + recompute cost/rating bounds

## Step 1 — Inventory refresh (src/modules/*)
- Enumerate all module folders under `src/modules/*`.
- Create a mapping of module folder -> user-facing module name(s) (where obvious).

## Step 2 — Delta evidence mapping (post-valuation)
- Search `*.md` for patterns indicating post-valuation additions/feature upgrades:
  - `*_COMPLETE*`, `*_COMPLETION*`, `*_ENHANCEMENTS*`, `*_STATUS*`, `PHASE*COMPLETE*`
  - plus “NEW”, “★NEW”, “ENHANCED”, “MODIFIED” markers.
- For each delta doc, infer the target module (from filename, headings, or referenced `src/modules/...` paths).

## Step 3 — Scoring model update (rule B)
- Apply rule B from user:
  - Both new top-level modules and major feature upgrades inside existing modules increase rating/price.
- Update the scoring rubric in `MODULES_RATING_AND_PRICE.md` (or create a new version) to account for deltas.

## Step 4 — Regenerate module table
- Recompute per-module:
  - Rating (/10)
  - Complexity bucket
  - Estimated price (USD range)
  - Evidence pointers to delta docs

## Step 5 — Recompute project totals
- Sum/update overall cost bounds based on the new module list.

## Step 6 — Write results
- Update/create an output doc (likely `MODULES_RATING_AND_PRICE.md`) with refreshed inventory + new total bounds.

## Step 7 — Validation
- Quick sanity checks:
  - Ensure every `src/modules/*` directory is represented.
  - Ensure every delta doc maps to at least one module.

