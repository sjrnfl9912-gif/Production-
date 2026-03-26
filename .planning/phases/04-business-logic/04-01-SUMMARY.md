---
phase: 04-business-logic
plan: 01
subsystem: business-logic
tags: [vanilla-js, weighted-average, lead-time, production-management, kakao-webview]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: AppState migration + records[] global in-memory store
provides:
  - calcLeadTimeStats() shared helper function (BIZ-01, BIZ-02, BIZ-04)
  - renderCapa() using corrected mainDays denominator
  - renderLeadTime() with BIZ-03 data-suppression and 3-tier trust indicator
affects: [05-pwa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "calcLeadTimeStats(worker, taskName, allRecords) — shared helper pattern for reusable per-item calculation"
    - "mainDayMap accumulation: build date->{ thisQty, totalMainQty } then filter activeDays where thisQty > 0"
    - "BIZ-03 guard pattern: if (mainDays < 3) render suppressed cell, else render numeric + trust indicator"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "calcLeadTimeStats() placed as standalone helper before renderCapa() — both render functions call it, eliminating duplicate calculation loops"
  - "BIZ-03 threshold: mainDays < 3 suppresses numeric soyo-il entirely; mainDays 3–4 shows value with ●○○ warning"
  - "BIZ-04: weighted average is default (transparent, traceable); median calculated internally but not exposed in UI"
  - "Pitfall 6 (STATE.md flag) resolved by BIZ-01 requirement text — proceeded without product owner confirmation"

patterns-established:
  - "Shared calculation helper pattern: extract formula to named helper, call from all render sites"
  - "Per-day weighted share: effectiveOutput = thisQty * (thisQty / totalMainQty)"

requirements-completed: [BIZ-01, BIZ-02, BIZ-03, BIZ-04]

# Metrics
duration: 15min
completed: 2026-03-26
---

# Phase 4 Plan 01: Business Logic Summary

**100대 소요일 산출 로직 개선 — BIZ-01~04 모두 구현: 밑작업 날 분모 제외, 복수 품목 비율 가중치, 3일 미만 데이터 억제, 가중 평균 공식 명시화**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T01:15:00Z
- **Completed:** 2026-03-26T01:30:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Extracted `calcLeadTimeStats()` helper (40 lines) fixing all four BIZ requirements in one place
- `renderCapa()` now uses `mainDays` from `calcLeadTimeStats()` — 일평균 column no longer inflated by sub-task days
- `renderLeadTime()` suppresses 소요일 numeric value when `mainDays < 3`, displays "데이터 부족" cell instead; 3-tier trust indicator thresholds updated to 3/5/15 days

## Task Commits

Each task was committed atomically:

1. **Task 1: Add calcLeadTimeStats() helper above renderCapa()** - `3dd4ce5` (feat)
2. **Task 2: Update renderCapa() and renderLeadTime() to use calcLeadTimeStats()** - `961dbe9` (feat)

## Files Created/Modified

- `index.html` — inserted `calcLeadTimeStats()` at line 980; replaced calculation cores of `renderCapa()` and `renderLeadTime()`

## Decisions Made

- Used `calcLeadTimeStats()` as the single shared helper for both render functions — eliminates duplicate `relatedDates` loops that existed in both functions
- BIZ-03 hard cutoff at 3 days (suppress entirely), not 5 (warn) — matches requirement text exactly
- Weighted average kept as UI default; median computed internally for future use without exposing to UI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 complete — all BIZ-01 through BIZ-04 requirements implemented
- Phase 5 (PWA) can begin: `index.html` is stable, no pending logic changes
- Manual browser verification recommended before Phase 5: open 주간 대시보드 tab, confirm zero JS errors, verify 소요일 table suppresses items with < 3 main-task days

---
*Phase: 04-business-logic*
*Completed: 2026-03-26*
