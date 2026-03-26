# Phase 3: UI Redesign - Research

**Researched:** 2026-03-26
**Domain:** Mobile card-form layout, dashboard optimization, bottom tab bar, skeleton/spinner loading states, edit screen UX
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | 실적 입력 폼이 모바일 카드형 레이아웃으로 재설계된다 | task-table is already `display:block` card layout on mobile (Phase 1); needs visual polish — spacing, label clarity, field sizing within cards |
| UI-02 | 대시보드 KPI/테이블이 모바일 화면에 최적화된다 | kpi-grid is 3-col on mobile (cramped); dash-table has no mobile card fallback; daily report table needs col reduction or card mode |
| UI-03 | 하단 탭바가 카카오톡 웹뷰 safe-area를 고려하여 개선된다 | tab-nav already has `padding-bottom: calc(6px + env(safe-area-inset-bottom))` — needs visual redesign (icons + labels, active state highlight) |
| UI-04 | 데이터 로딩 중 스켈레톤/스피너 UI가 표시된다 | loadAll() is called with no loading indicator; renderDashboard() renders inline with no skeleton; needs CSS-only shimmer skeleton |
| UI-05 | 내 실적 수정 화면이 모바일에서 사용하기 편하게 개선된다 | myRecordsArea currently renders .edit-table card layout; worker selector + date grouping needs UX improvement |
</phase_requirements>

---

## Summary

Phase 3 is a pure CSS and HTML/JS polish phase — no new libraries, no structural changes. The foundation (Phase 1) already laid mobile-first CSS, card layouts for both .task-table and .edit-table, and .tab-nav with safe-area padding. Phase 2 added touch targets, ripple feedback, and swipe navigation. Phase 3 refines visual quality on top of this stable base.

The five requirements fall into three categories: (1) visual layout improvement (UI-01, UI-02, UI-05), (2) infrastructure already 90% done but needing explicit enhancement (UI-03), and (3) new loading state implementation (UI-04). None require external libraries. All changes are CSS additions and targeted HTML/JS modifications within the existing single-file structure.

The primary risk is regression — the dashboard has six render functions (renderDailyReport, renderKPI, renderWeekly, renderCapa, renderLeadTime, renderInventory, renderRecent) that produce innerHTML. Changes must be surgical: add CSS classes and skeleton wrappers, not refactor render logic. The desktop view must remain pixel-identical (all mobile changes stay inside `@media (pointer: coarse)` or `@media (max-width: 768px)` — actually already inside base styles that are overridden by `@media (min-width: 769px)`).

**Primary recommendation:** Add a new `SECTION: UI Redesign` CSS block, enhance the six dashboard render functions to emit skeleton markup while loading, and improve the tab bar icon/label hierarchy. Zero new dependencies.

---

## Standard Stack

### Core (all native, no new dependencies)

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| CSS `@keyframes` shimmer | Native | Skeleton loading animation | Already in index.html (`SECTION: Animations`). Add `skeleton-shimmer` keyframe alongside existing animations. No library needed. |
| CSS Custom Properties | Native | Skeleton color tokens | Already defined in `:root` — add `--skeleton-base` and `--skeleton-highlight` vars. |
| CSS Grid (mobile card layout) | Native | KPI 2-col on mobile | Currently `.kpi-grid` is `repeat(3,1fr)` on mobile (cramped for 360px screens). Change to `repeat(2,1fr)` base, `repeat(3,1fr)` at `min-width:400px`. |
| `data-label` attribute pattern | Native HTML | Card-mode column labels | Already established in `.edit-table td::before { content: attr(data-label) }`. Extend the same pattern to any new card-mode tables. |
| `env(safe-area-inset-bottom)` | Native CSS | Tab bar safe area | Already applied to `.tab-nav`. Phase 3 enhances visual structure around it. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS-only skeleton | Skeleton loading library | Library adds CDN weight, no benefit for single-file app. CSS `@keyframes` with `background: linear-gradient` shimmer is 8 lines. |
| Native grid for KPI | Flexbox | Grid gives equal-width columns without math. Already used for kpi-grid — extend, don't switch. |
| Inline JS spinner | CSS spinner class | `.spinner` class already exists in `SECTION: Components` (`.spinner{width:18px;height:18px;border:2px solid...}`). Reuse it. |

---

## Architecture Patterns

### Current CSS Section Order (must be respected)

```
SECTION: CSS Variables
SECTION: Reset & Base
SECTION: Layout
SECTION: Components
SECTION: Forms
SECTION: Tables
SECTION: Dashboard
SECTION: PIN
SECTION: Utilities
SECTION: Animations     ← add skeleton keyframe here
SECTION: Touch UX       ← Phase 2 block (do not touch)
SECTION: Desktop Override  ← last block, add any desktop KPI overrides here
```

New CSS for Phase 3 goes in one of these locations:
- `SECTION: Dashboard` — kpi-grid mobile fix, mobile card for dash-table
- `SECTION: Utilities` — add `.skeleton`, `.skeleton-line`, `.skeleton-card`
- `SECTION: Animations` — add `@keyframes skeleton-shimmer`
- `SECTION: Desktop Override` — any desktop-specific skeleton display:none

### Pattern 1: Skeleton Loading (CSS-only shimmer)

**What:** Placeholder blocks that animate while data loads, then are replaced by real content.
**When to use:** Any container whose innerHTML is set asynchronously from Supabase.
**Trigger point:** Set skeleton HTML before the async call; replace with real content after.

```css
/* Source: established CSS pattern — MDN gradient + keyframes */
/* Add to SECTION: Utilities */
.skeleton {
  background: var(--skeleton-base, #e9eaec);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.5) 50%,
    transparent 100%
  );
  animation: skeleton-shimmer 1.4s ease infinite;
}
.skeleton-line {
  height: 14px;
  margin-bottom: 8px;
  border-radius: 4px;
}
.skeleton-line.short { width: 40%; }
.skeleton-line.medium { width: 70%; }
.skeleton-line.full { width: 100%; }
.skeleton-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--r);
  padding: 14px;
  margin-bottom: 10px;
}

/* Add to SECTION: Animations */
@keyframes skeleton-shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}
```

**JS integration pattern:**

```javascript
// Before async call — set skeleton
function showKPISkeleton() {
  document.getElementById('kpiArea').innerHTML =
    `<div class="skeleton-card skeleton"><div class="skeleton-line short"></div><div class="skeleton-line medium"></div></div>`.repeat(3);
}

// After data arrives — replace with real content
function renderKPI() {
  // ... existing render logic
}
```

**Key constraint:** The `.spinner` class already exists for button loading states (`handleSubmit` already uses `btn.textContent='저장 중...'`). Skeleton is for section-level loading (kpiArea, weeklyArea, etc.), not button-level.

### Pattern 2: KPI Grid — 2-column Mobile Fix

**What:** Change `.kpi-grid` from 3-column to 2-column on narrow mobile screens.
**Current issue:** `repeat(3,1fr)` at 360px gives each card ~110px — too narrow for the `font-size:18px` value + unit.

```css
/* In SECTION: Dashboard — replace current kpi-grid rule */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);  /* 2-col base for narrow mobile */
  gap: 8px;
  margin-bottom: 16px;
}

/* In SECTION: Desktop Override — restore 3-col on wider screens */
@media (min-width: 400px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 769px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  /* ...existing kpi-card, kpi-icon, kpi-value desktop overrides stay unchanged */
}
```

**Note:** This changes the base `.kpi-grid` rule which is currently in `SECTION: Dashboard` (line ~100). The `@media (min-width: 769px)` block already restores 3-col desktop — just add the `400px` breakpoint.

### Pattern 3: Dashboard Table — Mobile Card Fallback

**What:** `.dash-table` currently uses `table-layout:fixed` with no mobile card fallback. On narrow screens, the weekly production table and CAPA table overflow horizontally (mitigated by `.overflow-x` scroll-snap, but still cramped).
**When to use:** Apply to `.dash-table` that wrap around data-heavy weekly/CAPA/leadtime tables.

Two approaches:
1. **Keep as scrollable table + improve column widths** — lower risk, same `.overflow-x` wrapper stays
2. **Add card-mode fallback** like `.task-table` and `.edit-table`

Recommendation: **Keep as scrollable table** for the dashboard tables (weekly, CAPA, leadtime). The data is relational and loses meaning as cards. Improve by:
- Reducing column padding on mobile (`dash-table th/td` padding: `4px 6px` on mobile vs current `6px 8px`)
- Ensuring `table-layout: auto` on mobile so columns self-size (currently `fixed` even on mobile — causes cramping)

```css
/* In SECTION: Dashboard — add mobile-specific rule */
/* (only applies at base/mobile; desktop override restores) */
.dash-table {
  font-size: 12px;
  table-layout: auto;  /* Let columns size to content on mobile */
}
/* Remove table-layout:fixed from base — it's already set to auto in desktop override */
```

### Pattern 4: Tab Bar Visual Improvement (UI-03)

**What:** The tab bar already has correct positioning and safe-area padding (Phase 1). UI-03 requires visual improvement — clearer active state, icon+label hierarchy.
**Current state:**
- `.tab-btn` uses emoji prefix (📋, ✏️, 📊, ⚙️) as "icons"
- Active state: `background: var(--pri-lt); color: var(--pri)` — subtle
- Font size: 10px — very small

**Improvement approach (CSS only, no SVG icon refactor needed):**

```css
/* In SECTION: Layout — enhance existing .tab-btn rules */
.tab-btn {
  /* existing rules */
  position: relative;  /* for active indicator pseudo-element */
}
.tab-btn.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: var(--pri);
  border-radius: 0 0 3px 3px;
}
```

**Safe-area note:** The existing `padding-bottom: calc(6px + env(safe-area-inset-bottom))` on `.tab-nav` is correct. The `.main` bottom padding `calc(80px + env(safe-area-inset-bottom))` accounts for the tab bar height. If tab bar height increases (e.g., to 60px from current ~52px), update `.main` padding accordingly.

**Tab bar height math:**
- Current `.tab-btn` padding: `8px top + 8px bottom = 16px` + font `10px` * `1.2` line-height + `gap:2px` icon + 2x `6px` nav padding = ~52px total
- If increasing to `min-height: 56px` on `.tab-btn`, `.main` bottom padding becomes `calc(88px + env(safe-area-inset-bottom))`

### Pattern 5: My Records (UI-05) — Mobile UX Improvement

**What:** `loadMyRecords()` renders an `.edit-table` which already has card-mode CSS from Phase 1. The UX issue is that the worker select + list of records has no date grouping and the "수정/삭제" buttons are both inline on each card (mobile: they appear in flex row via `td:last-child` rule).

**Current state:**
```css
/* From Phase 1 — already applied */
.edit-table td:last-child { display:flex; gap:6px; margin-top:8px; padding-top:8px; border-top:1px solid var(--border-light) }
```

**Improvement options:**
1. **Date grouping headers** — group records by date with a date header row between groups. Moderate JS change to `loadMyRecords()` — loop through dates, emit header before each date group.
2. **Sticky worker select bar** — make the worker selector sticky so it stays visible while scrolling the record list.
3. **Button sizing** — `.btn-sm` on touch devices already gets `min-height: 44px` from Phase 2. No change needed.

Recommended: Add date grouping (option 1) + sticky worker select. This is the highest-value UX change for "find and edit a specific day's record."

```javascript
// Modified loadMyRecords() — group by date
function loadMyRecords() {
  const w = document.getElementById('myWorkerSelect').value;
  const area = document.getElementById('myRecordsArea');
  if (!w) { area.innerHTML = '<div class="empty-row">작업자를 선택해주세요.</div>'; return; }
  const mine = records.filter(r => r.worker === w).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!mine.length) { area.innerHTML = '<div class="empty-row">데이터가 없습니다.</div>'; return; }

  // Group by date
  const byDate = {};
  mine.forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });

  let h = '';
  Object.keys(byDate).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const ok = isWithin7Days(date);
    h += `<div class="records-date-group">`;
    h += `<div class="records-date-header">${fmtDate(date)}${!ok ? ' <span class="text-xs-muted">(수정 불가)</span>' : ''}</div>`;
    byDate[date].forEach(r => {
      // ... render each record card
    });
    h += `</div>`;
  });
  area.innerHTML = h;
}
```

```css
/* New CSS for SECTION: Tables or a new block */
.records-date-header {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sec);
  padding: 8px 4px 4px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 6px;
}
.records-date-group {
  margin-bottom: 12px;
}
```

### Anti-Patterns to Avoid

- **Replacing .edit-table card layout** — Phase 1 established the card pattern for .edit-table and .task-table. Do not rebuild this. Extend it.
- **Adding loading state to renderDashboard() caller only** — `renderDashboard()` is called on tab switch (which fires from client-side data, not async). The actual async loading is `loadAll()` at DOMContentLoaded. Show skeletons in the *initial* `loadAll()` window, not on tab switches.
- **Changing .dash-table to card layout** — dashboard tables (weekly, CAPA, leadtime) are cross-referential. Card layout loses column relationships. Use horizontal scroll instead.
- **Increasing tab bar height without updating `.main` bottom padding** — the main content area uses `calc(80px + env(safe-area-inset-bottom))` to account for the tab bar. Any height change to the tab bar requires an equal update to `.main` padding.
- **Using display:none on skeleton inside desktop override** — skeleton elements should auto-disappear when replaced by real content (innerHTML replacement), not via CSS. No desktop override needed for skeletons.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton loading animation | Custom JS polling / opacity fade | CSS `@keyframes` shimmer + `::after` pseudo | 8 lines of CSS, zero JS, works in all target browsers |
| Icon set for tab bar | Custom SVG set or icon library | Existing emoji characters (📋 ✏️ 📊 ⚙️) already in HTML | Replacing emojis with SVG is a scope creep risk — emojis render correctly in KakaoTalk WebView |
| Loading spinner | New spinner component | `.spinner` class already exists in SECTION: Components | Reuse: `<span class="spinner"></span>` |
| Date formatting | date library | `fmtDate(s)` already exists at line ~769 | It returns `"M/D (요일)"` format — extend if needed |
| Confirm modal | New confirm component | `customConfirm()` already implemented (Phase 1) | Established pattern |

---

## Common Pitfalls

### Pitfall 1: Skeleton Shown for Wrong Loading Events

**What goes wrong:** Developer adds skeleton to `renderDashboard()` (called on every tab switch). Users see skeleton flash on every tab switch even though data is already loaded.

**Why it happens:** `renderDashboard()` runs synchronously from client-side data. The async network call is only `loadAll()` at init.

**How to avoid:** Apply skeleton only in the `loadAll()` window — before `await loadAll()` completes in `DOMContentLoaded`. Show skeletons for `kpiArea`, `weeklyArea`, etc. at DOMContentLoaded. `loadAll()` completes, then `renderDashboard()` replaces them. On subsequent tab switches: no skeleton.

**Warning signs:** If you see skeleton flashing between tab switches, you've wired it to the wrong event.

### Pitfall 2: Tab Bar Height / Main Padding Mismatch

**What goes wrong:** Tab bar visual height increases (taller active state, bigger icons) but `.main` bottom padding stays at `calc(80px + env(safe-area-inset-bottom))`. Last card in any tab is obscured behind the tab bar.

**Why it happens:** `.main` padding-bottom is a hardcoded compensation for the fixed `.tab-nav` height.

**How to avoid:** If tab bar height changes, update `.main` padding-bottom to match. Current tab bar = ~52px. If target is 60px, set `.main` to `calc(68px + env(safe-area-inset-bottom))` (60px bar + 8px breathing room).

**Warning signs:** Scroll to the bottom of any page. If the last element is hidden behind the tab bar, the padding is wrong.

### Pitfall 3: KPI 2-col Change Breaking Desktop Layout

**What goes wrong:** Changing `.kpi-grid` to `repeat(2,1fr)` base affects desktop if the `@media (min-width: 769px)` override doesn't explicitly set it back to `repeat(3,1fr)`.

**Why it happens:** Desktop override already sets `repeat(3,1fr)` — this should be safe. But if the override is removed or merged incorrectly, desktop gets 2-col KPI.

**How to avoid:** After change, verify in DevTools at both 375px (mobile) and 1200px (desktop) that KPI shows 2-col and 3-col respectively.

**Warning signs:** Desktop dashboard shows only 2 KPI cards per row.

### Pitfall 4: `.dash-table` `table-layout` Regression

**What goes wrong:** Setting `table-layout: auto` on mobile fixes column cramping, but if there are JS-set `style="width:..."` attributes on `<th>` elements inside renderWeekly/renderCapa, those inline styles override `table-layout: auto` anyway. Result: no visible improvement.

**Why it happens:** `renderDailyReport()` (line ~794) emits `<th style="width:100px">`, `<th style="width:70px">` inline. `table-layout: fixed` makes these deterministic; `table-layout: auto` ignores them but the browser may still respect width hints.

**How to avoid:** For `renderDailyReport()`, remove the inline `style="width:Xpx"` from TH elements when on mobile (or remove them entirely and rely on `table-layout: auto` + `min-width` CSS on column classes).

**Warning signs:** After setting `table-layout: auto`, columns still overflow at the same places.

### Pitfall 5: `initKeyboardHandler()` Hides Tab Bar — Skeleton Visible Under Missing Tab Bar

**What goes wrong:** When keyboard opens, `initKeyboardHandler()` sets `tabNav.style.display = 'none'`. If a skeleton is visible in `kpiArea` at that moment, the skeleton persists (no tab bar) with unexpected layout shift.

**Why it happens:** Skeletons are replaced when `loadAll()` completes. On first load, keyboard could theoretically open before `loadAll()` completes (worker selects an input immediately). Edge case, low probability.

**How to avoid:** Skeletons should only exist during the `loadAll()` async window (~1-2 seconds at app start). After that they're replaced. No special handling needed.

---

## Code Examples

### Skeleton for Dashboard Init

```javascript
// Source: established project pattern (DOMContentLoaded block, line ~1207)
// Add before await loadAll():
function showInitSkeletons() {
  const skLine = (cls='') => `<div class="skeleton skeleton-line ${cls}"></div>`;
  const skCard = (n=3) => `<div class="skeleton-card">${skLine('short')}${skLine('medium')}${skLine('full').repeat(n)}</div>`;

  document.getElementById('kpiArea').innerHTML = skCard(1) + skCard(1) + skCard(1);
  document.getElementById('weeklyArea').innerHTML = skCard(4);
  document.getElementById('dailyReportArea').innerHTML = skCard(5);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('dateInput').value = todayStr();
  createPinInputs('adminPinWrap');
  showInitSkeletons();          // NEW: show skeletons
  await loadAll();              // existing
  renderDashboard();            // NEW: render after data arrives (currently called lazily on tab switch)
  addRow();
  initKeyboardHandler();
  // ... rest unchanged
});
```

**Note:** Currently `renderDashboard()` is only called when the user taps the dashboard tab (`if(btn.dataset.tab==='dashboard') renderDashboard()`). Pre-rendering at init (hidden, tab inactive) means the dashboard is instant when the user taps it. This is an optional improvement but aligns with the skeleton approach.

### Tab Bar Active Indicator

```css
/* Source: native CSS, established project pattern */
/* Add to SECTION: Layout under existing .tab-btn rules */
.tab-btn {
  position: relative; /* add to existing rule */
}
.tab-btn.active::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: var(--pri);
  border-radius: 0 0 4px 4px;
}
```

### KPI Grid 2-col Mobile

```css
/* Source: native CSS grid */
/* Modify in SECTION: Dashboard */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* was repeat(3,1fr) */
  gap: 8px;
  margin-bottom: 16px;
}

/* Add breakpoint for slightly wider phones */
@media (min-width: 400px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
/* Desktop override in SECTION: Desktop Override (already present — no change needed) */
```

### My Records Date Grouping CSS

```css
/* Add to SECTION: Tables */
.records-date-header {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sec);
  padding: 10px 4px 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.records-date-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-light);
}
.records-date-group {
  margin-bottom: 16px;
}
```

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`. No automated test infrastructure exists in this project (no test directory, no package.json test script, no test framework). All validation is manual visual/functional verification.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — manual browser testing only |
| Config file | None |
| Quick run command | Open index.html in browser / KakaoTalk WebView |
| Full suite command | Manual checklist below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | 실적 입력 폼 카드 레이아웃이 모바일에서 보기 편함 | visual | None — manual DevTools 375px | N/A |
| UI-02 | KPI 2열, 대시보드 테이블이 모바일 화면 안에 표시됨 | visual | None — manual DevTools 375px | N/A |
| UI-03 | 탭바 하단 safe-area 아래로 숨지 않음 | visual | None — manual iOS/Android real device | N/A |
| UI-04 | loadAll() 완료 전 스켈레톤 표시, 완료 후 실 데이터 표시 | functional | None — manual init test (throttle network) | N/A |
| UI-05 | 내 실적 수정 화면에서 날짜별 그룹 표시, 수정 가능 항목 명확 | functional | None — manual test with worker selected | N/A |

### Manual Verification Checklist

- [ ] UI-01: DevTools 375px — task-table card rows readable, type selector + task name + quantity visible without horizontal scroll
- [ ] UI-02: DevTools 375px — kpi-grid shows 2-col, kpi values not clipped; dash-table columns visible without forced overflow
- [ ] UI-02: DevTools 1280px — kpi-grid shows 3-col (regression check)
- [ ] UI-03: Real device or DevTools iPhone frame — tab bar visible above home bar, not hidden; active tab has blue indicator
- [ ] UI-04: DevTools Network tab → throttle to "Slow 3G" → reload page — skeleton visible for 1-2 seconds before real content
- [ ] UI-05: Select worker → records grouped by date, most recent at top, expired records labeled
- [ ] Regression: Submit form still works (handleSubmit unchanged)
- [ ] Regression: Delete record still shows customConfirm modal
- [ ] Regression: Desktop at 1200px — no layout changes vs current (all mobile CSS gated below 769px)

### Wave 0 Gaps

None — no automated test infrastructure needed. All verification is manual. This matches the established pattern from Phase 1 and Phase 2 summaries (both used manual `grep` verification commands rather than test frameworks).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely CSS and HTML/JS changes within the existing single-file project. No external tools, CLIs, databases, or runtimes are added. Supabase (already configured) is the only external dependency and remains unchanged.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Impact on Phase 3 |
|------------|-------------------|
| 단일 HTML 파일 유지 | All CSS/JS additions go into index.html. No separate skeleton.css or ui.js. |
| 카카오톡 인앱 웹뷰 호환 필수 | All CSS must work in Chrome 108+ (Android KakaoTalk) and WebKit/Safari (iOS KakaoTalk). No CSS that requires Chrome 120+. |
| Supabase 유지 | Loading states tie to Supabase fetch timing. No mock data, no API layer change. |
| 기존 4개 탭 기능 100% 유지 | All render functions (renderDashboard, loadMyRecords, etc.) must produce identical output after skeleton is replaced. No logic changes. |
| Hammer.js 금지 | Not relevant to this phase — no new gesture libraries. |
| `user-scalable=no` 금지 | Not relevant to this phase. |
| `100vh` sole height 금지 | Tab bar and main padding already use dvh/calc(var(--vh)). No new `100vh` solo usage. |
| CSS framework CDN 금지 | No Bootstrap, Tailwind, etc. All styling is custom CSS in the existing file. |

---

## What's Already Done (from Previous Phases)

This is critical context to avoid re-doing work:

| Feature | Status | Where |
|---------|--------|-------|
| `.task-table` mobile card layout | DONE (Phase 1) | CSS `SECTION: Tables` — display:block, tr as card, td:last-child absolute positioned |
| `.edit-table` mobile card layout | DONE (Phase 1) | CSS `SECTION: Tables` — same pattern, `data-label` pseudo-content |
| `.tab-nav` safe-area padding | DONE (Phase 1) | `padding-bottom: calc(6px + env(safe-area-inset-bottom))` |
| `.main` bottom padding for tab bar | DONE (Phase 1) | `padding: 12px 10px calc(80px + env(safe-area-inset-bottom))` |
| `touch-action: manipulation` on inputs | DONE (Phase 2) | `SECTION: Touch UX` |
| `.btn-sm` 44px touch target | DONE (Phase 2) | `SECTION: Touch UX` @media(pointer:coarse) |
| Button ripple + active feedback | DONE (Phase 2) | `SECTION: Touch UX` |
| Swipe tab navigation | DONE (Phase 2) | `initSwipeNav()` IIFE |
| `.overflow-x` scroll-snap on tables | DONE (Phase 2) | `scroll-snap-type:x proximity` |
| `.spinner` CSS class | DONE (Phase 1) | `SECTION: Components` |
| `customConfirm()` modal | DONE (Phase 1) | JS function |
| `fmtDate()` helper | EXISTS | line ~769 |

**Do not reimplement any of the above.**

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `max-width:768px` mobile block | `min-width:769px` desktop override | Phase 1 | All mobile CSS is base — no overrides needed for mobile changes |
| DOM data-rows state | AppState.tasks array | Phase 1 | Can add loading state to AppState without DOM coupling |
| window.confirm() | customConfirm() Promise | Phase 1 | Edit modal already established — reuse for any new modals in UI-05 |
| Table-only desktop layout | Card-mobile / Table-desktop dual mode | Phase 1 | task-table and edit-table already bifurcated |

---

## Open Questions

1. **Tab bar emoji vs SVG icons**
   - What we know: Current emoji icons (📋 ✏️ 📊 ⚙️) render correctly in KakaoTalk WebView. Replacing with SVG is feasible but requires adding ~4 SVG paths to the HTML.
   - What's unclear: Is there a UI-03 visual requirement that explicitly needs SVG (e.g., to apply CSS color to the icon for active state)?
   - Recommendation: Keep emojis for Phase 3. The active indicator (top border) is sufficient visual differentiation. SVG icons can be a Phase 3 bonus task if time allows.

2. **Pre-rendering dashboard on init**
   - What we know: Currently `renderDashboard()` is lazy (called only on tab switch). If we add skeletons to init, we should also pre-render to avoid skeleton showing on first tab switch.
   - What's unclear: Is there a performance concern with rendering all 6 dashboard functions at init while app data is being loaded?
   - Recommendation: Call `renderDashboard()` once after `loadAll()` completes in DOMContentLoaded. The render is synchronous and fast (~5ms). This makes the first tab switch instantaneous.

3. **toast bottom position with tab bar**
   - What we know: `.toast` uses `bottom:24px` which could overlap with the tab bar (height ~52px) on mobile.
   - What's unclear: Current behavior — does the toast appear behind the tab bar?
   - Recommendation: Update toast to `bottom: calc(60px + env(safe-area-inset-bottom))` to clear the tab bar on mobile. Add to Phase 3 scope as a low-effort fix.

---

## Sources

### Primary (HIGH confidence)

- index.html (current codebase, read directly) — all existing CSS sections, JS structure, line numbers
- .planning/phases/01-foundation/01-01-SUMMARY.md — CSS section order, mobile-first decisions
- .planning/phases/01-foundation/01-02-SUMMARY.md — AppState pattern, customConfirm pattern
- .planning/phases/02-touch-ux/02-01-SUMMARY.md — Touch UX CSS block location, pointer:coarse gating
- .planning/phases/02-touch-ux/02-02-SUMMARY.md — scroll-snap decisions, proximity vs mandatory
- CLAUDE.md — project constraints, recommended stack, what NOT to use
- MDN CSS @keyframes — skeleton shimmer technique (standard pattern, no library)
- CSS grid spec — repeat(2,1fr) mobile / repeat(3,1fr) desktop breakpoint pattern

### Secondary (MEDIUM confidence)

- FEATURES.md (project research, 2026-03-25) — skeleton loading rated "LOW complexity", differentiator feature
- STACK.md (project research, 2026-03-25) — env(safe-area-inset-bottom) pattern, kpi-grid desktop pattern

### Tertiary (LOW confidence)

- None — all findings verified against codebase directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all native CSS/JS, no libraries, verified against codebase
- Architecture: HIGH — patterns derived from existing Phase 1/2 code, not hypothetical
- Pitfalls: HIGH — identified from direct code analysis (actual line numbers, actual CSS rules)
- Validation: HIGH — project has no test framework; manual checklist approach matches established pattern

**Research date:** 2026-03-26
**Valid until:** 2026-05-26 (stable CSS spec — no expiry concern)
