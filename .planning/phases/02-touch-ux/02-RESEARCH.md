# Phase 02: Touch UX - Research

**Researched:** 2026-03-26
**Domain:** Mobile touch interaction — CSS native touch APIs, swipe gesture detection, scroll snap, touch target sizing, visual feedback
**Confidence:** HIGH (CSS patterns), HIGH (touch-action, scroll-snap), MEDIUM (swipe gesture implementation details in KakaoTalk WebView)

---

## Summary

Phase 02 adds touch interaction quality on top of the stable viewport foundation from Phase 01. The five requirements span CSS-only work (touch-action, scroll-snap, :active feedback), one JS-heavy requirement (swipe tab switching), and one mixed CSS+HTML audit (touch target sizing). No new external libraries are needed — everything is achievable with native CSS and Vanilla JS pointer/touch events, which is consistent with project constraints.

The most technically complex requirement is TOUCH-04 (swipe tab switching). The current tab system uses a `click` event delegation on `#tabNav`. To add swipe, a pointer-event tracker must be attached to `.main` (the scrollable content area) rather than the tab nav itself, and must distinguish a horizontal swipe from a vertical scroll gesture. The key risk is scroll conflict: `.main` is a vertically scrollable container, and a naive touchstart/touchend listener will fight with native scroll. The correct solution uses `touchstart`/`touchend` with a delta threshold check — no `preventDefault()` is called on the touchstart (which would block scroll), and `pointercancel` is handled to abort swipe tracking if the browser takes over.

For TOUCH-01 (44x44px targets) the audit reveals several elements currently below the minimum: `.btn-icon` is 32x32px, `.week-nav-btn` is 28x28px on mobile, `.settings-item .btn` has 4px/10px padding producing approximately 30px height. These must be increased for mobile without changing the desktop layout — achieved by wrapping the increases in `@media (pointer: coarse)`.

**Primary recommendation:** Use CSS `@media (pointer: coarse)` for all touch-specific sizing and feedback overrides. Use native pointer events (touchstart/touchend with delta check) for swipe. Use CSS `scroll-snap-type: x mandatory` for table scroll. Do not use any gesture library.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOUCH-01 | 모든 인터랙티브 요소가 최소 44x44px 터치 타겟을 보장 | CSS audit of current elements; `min-height`/`padding` fixes under `@media (pointer: coarse)` |
| TOUCH-02 | touch-action: manipulation으로 300ms 터치 지연 제거 | Already present on `.tab-btn`, `.btn`, `.btn-add`, `.btn-icon`; audit and add to missed elements |
| TOUCH-03 | 버튼 탭 시 시각적 터치 피드백(press/ripple) 제공 | CSS `:active` state + optional CSS ripple animation (no JS required) |
| TOUCH-04 | 탭 간 스와이프로 페이지 전환 | Native touchstart/touchend delta check on `.main`; integrates with existing tab switching function |
| TOUCH-05 | 테이블 가로 스크롤이 CSS scroll-snap으로 자연스럽게 동작 | `scroll-snap-type: x mandatory` on `.overflow-x`; `scroll-snap-align: start` on table cells |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md constrain all planning decisions for this phase:

- **단일 HTML 파일 유지** — No new files (no separate JS/CSS files). All changes go into `index.html`.
- **카카오톡 인앱 웹뷰 호환 필수** — Every touch pattern must work in both KakaoTalk Android (Chrome 108+ WebView) and KakaoTalk iOS (WKWebView/Safari engine).
- **Vanilla JS ES2020+** — No gesture libraries (Hammer.js, Interact.js, etc.). Native touch/pointer events only.
- **No build step** — CDN only. No npm, no bundlers.
- **Hammer.js is explicitly forbidden** — stated in CLAUDE.md "What NOT to Use" table.
- **touch-action: manipulation** is the prescribed pattern for 300ms delay removal (stated in CLAUDE.md).
- **CSS scroll-snap** is the prescribed pattern for table scroll (stated in CLAUDE.md).
- **`@media (pointer: coarse)`** is the prescribed method for touch device detection (stated in CLAUDE.md).
- **Existing 4-tab functionality must remain 100%** — tab switching logic must be preserved and extended, not replaced.

---

## Current Codebase Audit (What Already Exists)

### Elements with `touch-action: manipulation` ALREADY set (TOUCH-02 partial)

From reading `index.html`:

| Selector | Has touch-action |
|----------|-----------------|
| `.tab-btn` | YES (line 27) |
| `.btn` | YES (line 44) |
| `.btn-add` | YES (line 42) |
| `.btn-icon` | YES (line 38) |
| `.week-nav-btn` | YES (line 136) |
| `input`, `select` | NO |
| `.settings-item` delete/edit buttons | inherit from `.btn` YES |

**TOUCH-02 gap:** Input and select elements do not have `touch-action: manipulation`. The browser default for inputs is `touch-action: auto`, which can cause pan/zoom interactions. Adding `touch-action: manipulation` to `input`, `select`, `textarea` completes TOUCH-02.

### Elements BELOW 44x44px touch target (TOUCH-01 gaps)

| Element | Current size | Issue |
|---------|-------------|-------|
| `.btn-icon` | `width:32px; height:32px` | 12px below minimum |
| `.week-nav-btn` | `width:28px; height:28px` | 16px below minimum |
| `.settings-item .btn` | `padding:4px 10px; font-size:11px` | approx 30px tall |
| `.badge` | `padding:2px 10px` | not interactive — no fix needed |
| `.pin-digit` | `width:46px; height:52px` | OK |
| `.btn` (base) | `padding:10px 16px; font-size:13px` | approx 38-40px — borderline |
| `.btn-sm` | `padding:5px 12px; font-size:12px` | approx 30px — below minimum on mobile |

**Fix strategy:** Wrap all mobile size increases in `@media (pointer: coarse)` block — not the Desktop Override block, which is `min-width: 769px`. This correctly targets touch devices at any width.

### Current tab switching (TOUCH-04 baseline)

```javascript
// Lines 506-514 in index.html
document.getElementById('tabNav').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn'); if (!btn) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('page-' + btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'dashboard') renderDashboard();
  if (btn.dataset.tab === 'admin' && adminUnlocked) renderAdminSettings();
});
```

Tab order (for swipe): `input` → `myrecords` → `dashboard` → `admin` (indices 0–3).

The swipe handler must call the same logic by finding the current active tab and activating the next/previous one. Tab order must be extracted from DOM `[data-tab]` button order, not hardcoded.

### Current scroll containers (TOUCH-05 baseline)

```css
/* Line 169 — existing utility */
.overflow-x { overflow-x: auto; -webkit-overflow-scrolling: touch }
```

Used on:
- `#dailyReportArea` (일생산현황 표)
- `#weeklyArea` (주차별 생산 레이블)
- Dashboard CAPA table wrapper
- Dashboard leadTime table wrapper

**TOUCH-05 fix:** Add `scroll-snap-type: x mandatory` to `.overflow-x` and `scroll-snap-align: start` to the `th` and first `td` in each column. For the weekly table, snap align goes on `<th>` elements.

---

## Standard Stack

### Core (no new libraries)

| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| CSS `:active` pseudo-class | Native | Visual press feedback | No JS needed, instant, works in all WebViews. Preferable to JS-based ripple for performance on low-end devices. |
| CSS `@keyframes` ripple | Native | Optional ripple animation | Pure CSS, triggered via `:active` + `animation`. Zero JS cost. Already have `@keyframes` section in index.html. |
| `touchstart`/`touchend` events | Native DOM | Swipe gesture detection | Standard across all mobile browsers. `pointerdown`/`pointerup` is the modern alternative but `touch*` events are more reliable in WKWebView for detecting swipe vs scroll distinction. |
| `touch-action: manipulation` | Native CSS | 300ms tap delay removal | Already documented in CLAUDE.md as the prescribed approach. |
| `scroll-snap-type` / `scroll-snap-align` | Native CSS | Table horizontal snap | Full support in Chrome 69+, Safari 11+, Firefox 68+. No polyfill needed in KakaoTalk WebView. |
| `@media (pointer: coarse)` | Native CSS | Touch-only overrides | Prescribed in CLAUDE.md. More reliable than UA sniffing. |

### What NOT to Use

| Avoid | Why |
|-------|-----|
| Hammer.js | Explicitly banned in CLAUDE.md. Last npm release ~10 years ago. |
| Pointer Events API alone | `pointermove` fires during scroll, making swipe detection harder. Use `touch*` events for swipe in WebView. |
| `preventDefault()` on touchstart | Blocks native scroll on the element — breaks vertical scrolling of `.main`. |
| `overflow: hidden` on `.main` for swipe | Breaks vertical scroll of content tabs. |
| CSS `overscroll-behavior: none` on body | Prevents pull-to-refresh which KakaoTalk may use. Use `contain` on specific containers only. |
| JS-based ripple (DOM insertion) | More expensive than CSS-only; risky in fast-tap sequences in WebView. |

---

## Architecture Patterns

### Pattern 1: Touch Target Fix with `@media (pointer: coarse)`

**What:** Increase tap target size to 44x44px minimum for touch devices without affecting desktop layout.

**When to use:** When an element is visually small but must be larger for touch. Do not use min-width: 769px override — that is the desktop selector. Use `pointer: coarse` to target touch.

```css
/* Add to SECTION: Touch UX (new section between Animations and Desktop Override) */
@media (pointer: coarse) {
  .btn-icon {
    width: 44px;
    height: 44px;
  }
  .week-nav-btn {
    width: 44px;
    height: 44px;
  }
  .btn-sm {
    padding: 10px 14px;
  }
  .settings-item .btn {
    padding: 8px 12px;
  }
  /* touch-action additions */
  input, select, textarea {
    touch-action: manipulation;
  }
}
```

**Source:** CLAUDE.md `@media (pointer: coarse)` pattern, WCAG 2.2 touch target size guideline.

### Pattern 2: CSS-Only Touch Feedback (`:active` + ripple)

**What:** Provide immediate visual feedback when a button is tapped.

**Approach A — `:active` scale/darken (simpler, sufficient):**
```css
/* Under @media (pointer: coarse) */
.btn:active,
.btn-add:active,
.btn-icon:active,
.tab-btn:active {
  transform: scale(0.96);
  opacity: 0.85;
  transition: transform 0.05s, opacity 0.05s;
}
```

**Approach B — CSS ripple (more polished):**
```css
.btn {
  position: relative;
  overflow: hidden;
}
.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.3);
  border-radius: inherit;
  opacity: 0;
  transform: scale(0);
  transition: transform 0.3s, opacity 0.3s;
}
.btn:active::after {
  transform: scale(1);
  opacity: 1;
  transition: none; /* instant on press */
}
```

**Recommendation:** Use Approach A (scale + opacity) for all interactive elements. Simple, reliable in WebView, works without overflow:hidden (which can clip content). Add Approach B ripple only to `.btn-primary` and `.btn-danger` (call-to-action buttons), since those benefit from the stronger visual cue.

**Note:** `.btn` already has `transition: all .15s`. This needs to be refined to `transition: background .15s, box-shadow .15s` so the new `:active` transform transition overrides cleanly.

### Pattern 3: Swipe Tab Switching (TOUCH-04)

**What:** Detect horizontal swipe on the main content area and advance/retreat the active tab.

**Where to attach:** The `document.body` or `.main` element. Attaching to `.main` is preferred because swipe on the fixed tab nav itself should not trigger (it's a tap target, not a swipe surface).

**Critical constraint:** Must not prevent vertical scrolling. The browser will cancel a touch event sequence if it detects horizontal movement above a threshold. We must detect the swipe AFTER touchend, not during touchmove.

```javascript
// Swipe detection — attach after DOMContentLoaded
(function initSwipe() {
  const TAB_ORDER = ['input', 'myrecords', 'dashboard', 'admin'];
  const SWIPE_MIN_X = 60;  // px horizontal movement to count as swipe
  const SWIPE_MAX_Y = 80;  // px vertical movement — above this = scroll, not swipe

  let startX = 0, startY = 0;

  document.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });  // passive: true is CRITICAL — never block scroll

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN_X) return;   // too short
    if (Math.abs(dy) > SWIPE_MAX_Y) return;    // vertical scroll
    const dir = dx < 0 ? 1 : -1;  // left = next tab, right = prev tab

    const activeBtn = document.querySelector('.tab-btn.active');
    const curTab = activeBtn?.dataset.tab;
    const curIdx = TAB_ORDER.indexOf(curTab);
    const nextIdx = curIdx + dir;
    if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) return;

    // Reuse existing tab-switch logic
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${TAB_ORDER[nextIdx]}"]`);
    targetBtn?.click();
  }, { passive: true });
})();
```

**Why `{ passive: true }`:** Required so the browser knows the scroll cannot be cancelled — this is the only way to avoid the 300ms delay AND keep scroll working. Without it, Chrome will warn and in some cases defer the touchstart.

**Why touchend (not touchmove):** If we use touchmove to detect swipe direction, we'd need to call `preventDefault()` to stop scroll once we decide it's a swipe — which creates a jank moment. The touchend approach waits for the gesture to complete and then acts; no visual difference on tab switch speed.

**KakaoTalk-specific concern:** KakaoTalk sometimes intercepts horizontal swipes for its own navigation (back/forward). A threshold of 60px is conservative enough to avoid accidental activations from slight horizontal drift during vertical scrolling, but still responsive to intentional swipes. If the KakaoTalk shell intercepts edge swipes (within ~20px of screen edge), starting the swipe from the center is fine — `startX` will be well away from the edge.

### Pattern 4: CSS Scroll Snap for Tables (TOUCH-05)

**What:** Add snap behavior to horizontal table scroll containers.

```css
/* Modify SECTION: Utilities — .overflow-x */
.overflow-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;   /* proximity: snaps when close — less aggressive than mandatory */
  overscroll-behavior-x: contain;  /* prevent horizontal scroll from propagating to page */
}

/* Add to SECTION: Tables */
.dash-table th,
.dash-table td {
  scroll-snap-align: start;
}
```

**Why `proximity` not `mandatory`:**
`scroll-snap-type: x mandatory` forces a snap to occur after every scroll gesture, even partial swipes. For tables with many columns, this creates unnatural forced snapping that prevents users from settling between columns. `proximity` only snaps if the user releases near a snap point — feels more natural for data tables.

For the weekly production table (`.m-weekly-card` layout), there is no horizontal scroll — these are block cards, not a table. No snap needed there.

**Desktop consideration:** `scroll-snap` is harmless on desktop (mouse scroll does not trigger snap in the same way). No need to disable in Desktop Override.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 300ms tap delay | Custom JS timing measurement | `touch-action: manipulation` CSS | Browser-native, zero cost, works in all WebViews |
| Swipe gesture library | Import Hammer.js or similar | Native `touchstart`/`touchend` delta check | Hammer.js is banned by CLAUDE.md; 10-year old package |
| Touch press animation | JS DOM manipulation (add/remove class on touchstart) | CSS `:active` pseudo-class | CSS-only, no JS event cost, frame-accurate |
| Horizontal scroll snapping | JS scroll position math | CSS `scroll-snap-type`/`scroll-snap-align` | Fully browser-native since Chrome 69, Safari 11 |
| Touch target padding hack | Invisible overlay divs | CSS `padding`/`min-height` under `@media (pointer: coarse)` | Standard accessible approach, no DOM complexity |

**Key insight:** Every touch UX requirement in this phase has a direct CSS or minimal JS native solution. Adding a gesture library would introduce maintenance burden and fight with the browser's own touch handling — causing the exact scroll/click conflicts described in PITFALLS.md.

---

## Common Pitfalls

### Pitfall 1: `touchstart` `preventDefault()` Blocks Scroll

**What goes wrong:** Calling `e.preventDefault()` in a `touchstart` handler prevents the browser from scrolling the page. If the swipe gesture listener calls `preventDefault()`, users cannot scroll through the form on the 실적 입력 tab.

**Why it happens:** Developers want to "claim" the touch event for swipe detection. But claiming touchstart means the browser can never start a scroll, even if the user meant to scroll vertically.

**How to avoid:** Always register touchstart and touchend with `{ passive: true }`. Use the delta check at touchend to decide if it was a swipe. Never call `preventDefault()` in the swipe handler.

**Warning signs:** Vertical scrolling stops working on the form page after swipe handler is added.

### Pitfall 2: `:active` State Not Triggering on Mobile WebView

**What goes wrong:** CSS `:active` styles don't appear on tap in some mobile browsers. This is because the browser delays "activating" the state to wait for a possible scroll.

**How to avoid:** Add a no-op `touchstart` listener to the element or its ancestor. This "opts in" the element to immediate active state:
```javascript
// Force :active to trigger on touch — add once to document body
document.addEventListener('touchstart', function(){}, { passive: true });
```
This is a well-known quirk of iOS Safari. One empty `touchstart` listener on the document is sufficient to make `:active` fire immediately on all elements.

**Warning signs:** `:active` CSS rule is correct but no visual change appears when tapping on iOS.

### Pitfall 3: `scroll-snap-type: x mandatory` on Tables Creates Stuck Scroll

**What goes wrong:** With `mandatory`, after any horizontal scroll gesture the browser snaps to the nearest snap point. If snap points are dense (e.g., every cell in a wide table), the table becomes very difficult to scroll past the first few columns.

**How to avoid:** Use `scroll-snap-type: x proximity` instead of `mandatory`. Apply `scroll-snap-align: start` only to `th` (column headers), not every `td`, to create coarser snap points.

**Warning signs:** Dashboard tables are scrollable but every swipe only moves one column.

### Pitfall 4: Touch Target Size Fix Breaks Desktop Layout

**What goes wrong:** Adding `min-height: 44px` to `.btn-icon` or `.week-nav-btn` at the global level makes the desktop header oversized.

**How to avoid:** All touch target size increases MUST be inside `@media (pointer: coarse)`. Do not add them to the base style or the Desktop Override block. Desktop mice are `pointer: fine`, so the coarse block is never applied.

**Warning signs:** Desktop header row height increases after the phase is implemented.

### Pitfall 5: Swipe Activates on Admin Tab (PIN Screen)

**What goes wrong:** The swipe handler fires even when the admin PIN overlay is visible, navigating away from the admin tab while the user is trying to tap PIN digits.

**Why it happens:** The touchend handler checks the tab order globally without considering whether the user is interacting with a form element.

**How to avoid:** In the touchend handler, check `document.activeElement` — if it's a `.pin-digit` input, abort the swipe. Also add a minimum travel time check (swipe must complete in under 500ms to distinguish from a slow drag).

---

## Code Examples

### Complete Touch UX CSS Block (new SECTION to add)

```css
/* Source: CLAUDE.md prescribed patterns + WCAG 2.2 */
/* ═══ SECTION: Touch UX ═══ */
@media (pointer: coarse) {
  /* TOUCH-01: Minimum 44x44px touch targets */
  .btn-icon {
    width: 44px;
    height: 44px;
  }
  .week-nav-btn {
    width: 44px;
    height: 44px;
  }
  .btn-sm {
    padding: 10px 14px;
    min-height: 44px;
  }
  .settings-item .btn {
    padding: 8px 12px;
    min-height: 44px;
  }

  /* TOUCH-02: touch-action on inputs (buttons already have it) */
  input, select, textarea {
    touch-action: manipulation;
  }

  /* TOUCH-03: Visual press feedback — scale */
  .btn:active,
  .btn-add:active,
  .btn-icon:active,
  .week-nav-btn:active {
    transform: scale(0.94);
    opacity: 0.82;
  }
  .tab-btn:active {
    background: var(--pri-lt);
    color: var(--pri);
  }
}

/* TOUCH-03: Ripple for primary/danger CTA buttons (all screens) */
.btn-primary,
.btn-danger {
  position: relative;
  overflow: hidden;
}
.btn-primary::after,
.btn-danger::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.25);
  opacity: 0;
  transform: scale(0);
  border-radius: inherit;
  pointer-events: none;
}
.btn-primary:active::after,
.btn-danger:active::after {
  transform: scale(1);
  opacity: 1;
  transition: none;
}
```

### Swipe Tab Handler (JS addition)

```javascript
// Source: Native touch events — passive listener pattern
// Add in DOMContentLoaded, after tab-click handler
(function initSwipeNav() {
  const TAB_ORDER = ['input', 'myrecords', 'dashboard', 'admin'];
  const MIN_X = 60;
  const MAX_Y = 80;
  let sx = 0, sy = 0;

  document.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    // Skip if interacting with a PIN digit
    if (document.activeElement && document.activeElement.classList.contains('pin-digit')) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < MIN_X || Math.abs(dy) > MAX_Y) return;
    const dir = dx < 0 ? 1 : -1;
    const cur = document.querySelector('.tab-btn.active')?.dataset.tab;
    const ci = TAB_ORDER.indexOf(cur);
    const ni = ci + dir;
    if (ni < 0 || ni >= TAB_ORDER.length) return;
    document.querySelector(`.tab-btn[data-tab="${TAB_ORDER[ni]}"]`)?.click();
  }, { passive: true });
})();
```

### Scroll Snap for Tables (CSS modification)

```css
/* Source: MDN scroll-snap-type — HIGH confidence */
/* Modify existing .overflow-x in SECTION: Utilities */
.overflow-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;
}

/* Add to SECTION: Dashboard — snap columns on table headers */
.dash-table th {
  scroll-snap-align: start;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `touchstart` listeners with `preventDefault()` for swipe | `{ passive: true }` + `touchend` delta check | Chrome 51+ passive events (2016) | No more scroll jank; swipe and scroll coexist |
| 300ms click delay — `fastclick.js` library | `touch-action: manipulation` CSS | Chrome 32+ (2013), became standard ~2016 | Remove library, use one CSS property |
| Hammer.js for gestures | Native pointer/touch events | Hammer.js stagnated ~2016 | No external dependency needed |
| `scroll-snap-points-x` (old draft) | `scroll-snap-type` / `scroll-snap-align` | CSS Scroll Snap Level 1, 2019 | Simpler syntax, universal support |
| JS-calculated ripple (Material UI pattern) | CSS `::after` + `:active` | Widely adopted ~2020 | Zero JS, GPU-accelerated |

**Deprecated/outdated:**
- `fastclick.js`: Completely unnecessary with `touch-action: manipulation` on `width=device-width` pages.
- `scroll-snap-points-x: repeat(...)`: Old draft syntax, replaced by `scroll-snap-type` on container + `scroll-snap-align` on children.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 02 is purely CSS and Vanilla JS changes within `index.html`. No external tools, runtimes, CLIs, or services beyond the existing Supabase CDN are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no automated test framework detected) |
| Config file | none |
| Quick run command | Open `index.html` via local server; verify in Chrome DevTools mobile emulation |
| Full suite command | Manual check on Chrome DevTools (iPhone 14 Pro emulation) + real device if available |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOUCH-01 | All interactive elements >= 44x44px | Manual visual | Chrome DevTools → Device → Touch: inspect element sizes | N/A |
| TOUCH-02 | No 300ms delay on tap | Manual feel | Tap buttons on mobile emulation; check `touch-action` in computed styles | N/A |
| TOUCH-03 | Visual feedback on button press | Manual visual | Tap buttons in mobile emulation; observe scale/ripple | N/A |
| TOUCH-04 | Swipe switches tabs | Manual interaction | Swipe left/right on `.main` in device emulation | N/A |
| TOUCH-05 | Table scroll snaps naturally | Manual interaction | Horizontal swipe on dashboard tables in device emulation | N/A |

### Sampling Rate

- **Per task commit:** Open index.html in Chrome DevTools, iPhone 14 Pro (390x844), verify requirement under test
- **Per wave merge:** All 5 requirements verified in mobile emulation
- **Phase gate:** All 5 requirements verified in real KakaoTalk Android WebView (or emulation if device unavailable) before `/gsd:verify-work`

### Wave 0 Gaps

None — no test infrastructure setup required. All verification is manual/visual in browser DevTools.

---

## Open Questions

1. **KakaoTalk horizontal swipe interception**
   - What we know: KakaoTalk may intercept edge swipes for its own back-navigation.
   - What's unclear: Exact pixel threshold of KakaoTalk's edge swipe zone (likely ~20px from screen edge).
   - Recommendation: Use `MIN_X = 60px` threshold and do not constrain `startX` — swipe can start anywhere. If edge-swipe conflicts arise, they can be addressed in the human-verify checkpoint.

2. **`:active` on iOS KakaoTalk WebView**
   - What we know: iOS Safari requires a `touchstart` listener on the document to trigger `:active` immediately.
   - What's unclear: Whether the existing `initKeyboardHandler()` touchstart listener is sufficient, or if a dedicated empty listener is needed.
   - Recommendation: Add `document.addEventListener('touchstart', function(){}, { passive: true })` once in the init block to guarantee `:active` fires on iOS.

3. **Swipe interaction with `.scroll-box` elements**
   - What we know: `.scroll-box` elements have `overflow-y: auto` and appear inside the main area.
   - What's unclear: If a user swipes horizontally while their finger starts on a `.scroll-box`, will the swipe handler fire?
   - Recommendation: The `MAX_Y = 80px` threshold handles this — vertical-dominant gestures are ignored. No additional filtering needed.

---

## Sources

### Primary (HIGH confidence)

- MDN CSS `touch-action` — https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- MDN CSS `scroll-snap-type` — https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type
- MDN CSS `:active` pseudo-class — https://developer.mozilla.org/en-US/docs/Web/CSS/:active
- MDN `TouchEvent` — https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
- WCAG 2.2 Target Size (Minimum) 2.5.8 — 24x24px minimum, 44x44px recommended
- CLAUDE.md — touch-action, scroll-snap, pointer:coarse patterns all prescribed
- .planning/research/STACK.md — touch UX stack previously researched
- .planning/research/PITFALLS.md — Pitfall 5 (touch/scroll conflict) directly applicable

### Secondary (MEDIUM confidence)

- .planning/phases/01-foundation/ summaries — confirmed Phase 01 state: what CSS/JS was added
- index.html lines 14-244 (CSS) and 505-514 (tab switching JS) — direct audit of current code
- CLAUDE.md "Stack Patterns by Context" — iOS vs Android behavior differences

### Tertiary (LOW confidence)

- KakaoTalk edge swipe interception behavior — not officially documented; inferred from community reports (single source)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all technologies are CSS/JS native with MDN documentation
- Architecture: HIGH — patterns are CSS-native with direct spec support
- Pitfalls: HIGH — 4 of 5 pitfalls are verifiable from spec behavior; 1 (KakaoTalk edge swipe) is MEDIUM

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (stable CSS specs — 90 days)
