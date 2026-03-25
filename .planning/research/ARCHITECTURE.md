# Architecture Research

**Domain:** Single-file HTML production management app — KakaoTalk webview mobile-first
**Researched:** 2026-03-25
**Confidence:** HIGH (based on direct code inspection + verified web sources)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    index.html (single file)                      │
├──────────────┬──────────────────────────────────────────────────┤
│  <head>      │  <style>  CSS Design Tokens + Base + Components   │
│              │           Mobile overrides (@media max-width:768) │
├──────────────┴──────────────────────────────────────────────────┤
│  <body>      HTML Structure (4 tab pages + modal container)      │
│              ├── header.tab-nav (desktop: inline / mobile: fixed  │
│              │    bottom — hidden on keyboard open)               │
│              ├── #page-input      (Tab 1: 실적 입력)              │
│              ├── #page-myrecords  (Tab 2: 내 실적 수정)           │
│              ├── #page-dashboard  (Tab 3: 주간 대시보드)          │
│              ├── #page-admin      (Tab 4: 관리자 설정)            │
│              └── #modalContainer  (shared modal slot)            │
├──────────────────────────────────────────────────────────────────┤
│  <script>    JavaScript (section-comment delimited)              │
│              ├── SUPABASE INIT     (sb client)                   │
│              ├── STATE             (records, workers, tasks, pin) │
│              ├── UTILS             (toast, date helpers)          │
│              ├── DATA LOADING      (loadAll, populateSelects)     │
│              ├── TAB SWITCHING     (event delegation)             │
│              ├── PIN SYSTEM        (createPinInputs, checkPin)    │
│              ├── INPUT FORM (T1)   (row state, handleSubmit)      │
│              ├── MY RECORDS (T2)   (loadMyRecords)                │
│              ├── EDIT MODAL        (openEditModal, saveEdit)      │
│              ├── DASHBOARD (T3)    (renderDashboard + sub-fns)    │
│              ├── ADMIN (T4)        (renderAdminSettings + CRUD)   │
│              ├── KEYBOARD HANDLER  (visualViewport / focusin)     │
│              └── INIT              (DOMContentLoaded)             │
├──────────────────────────────────────────────────────────────────┤
│  External                                                        │
│  ├── Supabase JS v2 (CDN)                                        │
│  └── Pretendard Variable Font (CDN)                              │
├──────────────────────────────────────────────────────────────────┤
│  Backend (Supabase)                                              │
│  ├── production_records (date, worker, type, task_name, qty...)  │
│  ├── workers            (name, active)                           │
│  ├── main_tasks         (name, active, sort_order)               │
│  ├── sub_tasks          (name, active, sort_order, related_main) │
│  └── admin_config       (key, value — stores admin_pin)          │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| CSS Design Tokens | CSS variables for color, spacing, radius | Good — well-organized as `:root{}` block |
| CSS Base / Utilities | Reset, body, buttons, form elements | Present, but font-size:16px forced by `!important` only in media query — should be base |
| CSS Mobile Overrides | `@media(max-width:768px)` block | Monolithic — all mobile overrides in one block at bottom |
| HTML Shell | 4 pages + modal slot + toast | Clean tab structure, modal uses innerHTML injection pattern |
| State Object | `records`, `workers`, `mainTasks`, `subTasks`, `adminPin`, `rowId`, `adminUnlocked` | Global vars — no encapsulation |
| Data Layer | `loadAll()` — parallel Supabase fetches on init | Single load, no refresh/subscription. `records` held in RAM. |
| Tab Router | `tabNav` click → show/hide `.page` divs | Functional but no lazy-load — dashboard renders all on tab switch |
| Row State (Tab 1) | Stored on `data-rows` attribute of `<tbody>` as JSON | Unusual pattern — serializes to DOM, re-renders on every change |
| Dashboard Renderers | 6 render functions — each builds HTML string, assigns to `innerHTML` | Imperative string concat — hard to modify in isolation |
| Modal System | Single `#modalContainer` slot, injected via template literals | Shared slot works for one modal at a time |
| Keyboard Handler | `visualViewport` resize OR focusin/focusout fallback | Already handles tab-bar hide — needs improvement for scroll-into-view |
| PIN System | 4-digit input chain, blur-on-fill, paste handling | Solid implementation |

## Recommended Internal Structure

The file cannot be split — the constraint is firm. The architecture target is logical separation within one file using section comments as module boundaries. This maps the current chaotic structure to a clean layered pattern:

```
index.html
├── <head>
│   ├── [META]         viewport (with interactive-widget), theme-color, PWA meta
│   ├── [CDN]          Pretendard (preconnect + stylesheet), Supabase JS
│   └── <style>
│       ├── /* === TOKENS === */      CSS custom properties
│       ├── /* === RESET === */       * box-sizing, body font
│       ├── /* === LAYOUT === */      .header, .main, .page, tab-nav
│       ├── /* === COMPONENTS === */  .card, .btn, .badge, .toast, .modal
│       ├── /* === FORMS === */       input, select, label, .form-grid
│       ├── /* === TABLES === */      .task-table, .edit-table, .dash-table
│       ├── /* === DASHBOARD === */   .kpi-grid, .scroll-box, .dash-grid
│       ├── /* === PIN === */         .pin-digit, .lock-overlay
│       ├── /* === ANIMATIONS === */  @keyframes
│       └── /* === MOBILE === */      @media(max-width:768px) — mirrors above sections
│
├── <body>
│   ├── <header>       .header + .tab-nav (data-tab routing)
│   ├── <main>
│   │   ├── #page-input       Tab 1 HTML
│   │   ├── #page-myrecords   Tab 2 HTML
│   │   ├── #page-dashboard   Tab 3 HTML
│   │   └── #page-admin       Tab 4 HTML
│   ├── #modalContainer   (empty — JS injects here)
│   └── #toast
│
└── <script>
    ├── /* === CONFIG === */          SB_URL, SB_KEY, sb client
    ├── /* === STATE === */           let records, workers, ... (group all globals)
    ├── /* === UTILS === */           showToast, todayStr, isWithin7Days
    ├── /* === DATA === */            loadAll, populateWorkerSelects, buildDatalist
    ├── /* === ROUTER === */          tab switching + keyboard handler
    ├── /* === PIN === */             createPinInputs, checkPinFor
    ├── /* === TAB1 INPUT === */      row management, handleSubmit
    ├── /* === TAB2 RECORDS === */    loadMyRecords, deleteRecord
    ├── /* === MODAL === */           openEditModal, onEditTypeChange, saveEdit, closeModal
    ├── /* === TAB3 DASHBOARD === */  renderDashboard + all sub-renderers
    ├── /* === TAB4 ADMIN === */      renderAdminSettings + all CRUD functions
    └── /* === INIT === */            DOMContentLoaded bootstrap
```

### Structure Rationale

- **Section comments as module boundaries:** `/* === SECTION === */` delimiters allow IDE folding (VS Code supports code folding on comment blocks), `Ctrl+F` section-jumping, and mental model separation without any tooling.
- **CSS mirrors structure:** Mobile `@media` block stays at bottom but internal comment labels mirror the desktop sections above — a developer hunting `.kpi-grid` mobile styles can `Ctrl+F "DASHBOARD"` and find both.
- **State grouped at top:** All `let` declarations together make global state auditable in one scan.
- **INIT at bottom:** `DOMContentLoaded` as the last block — functions are defined before called.

## Architectural Patterns

### Pattern 1: Row State as In-Memory Array (not DOM attribute)

**What:** Current code stores the input form's row list as JSON in `data-rows` attribute of `<tbody>`, then reads/writes it on every interaction.

**Problem with current approach:** The DOM is used as the source of truth, causing `JSON.parse` on every row operation and losing reactivity — re-rendering the entire table on every keystroke change (`renderRows()` rebuilds all `innerHTML`).

**Recommended replacement:** Keep row state as a plain JavaScript array in module scope. Only call `renderRows()` on structural changes (add/remove), not on field value changes. Use `input` event listeners with direct DOM updates for quantity/note fields.

```javascript
// === TAB1 INPUT ===
let inputRows = []; // source of truth — not the DOM

function addRow() {
  inputRows.push({ id: ++rowId, type: '메인작업', taskName: '', quantity: '', note: '' });
  renderRows(); // only rebuild structure
}

function updateRowField(id, field, value) {
  const row = inputRows.find(r => r.id === id);
  if (row) row[field] = value;
  // NO renderRows() call — field value already in DOM from event
  if (field === 'taskName' && row?.type === '밑작업') renderRelatedInfo(id, value);
}
```

**When to use:** Any time state lives in variables and DOM reflects it — not the reverse.

### Pattern 2: VisualViewport-Driven Keyboard Handling

**What:** KakaoTalk inapp browser (both iOS and Android) has unique keyboard behavior. iOS keeps layout viewport unchanged while shrinking visual viewport. Android (Chrome) resizes both by default.

**The existing code already handles tab-bar hiding** via `visualViewport.resize`. The gap is: input fields do not scroll into view reliably on iOS KakaoTalk.

**Recommended pattern:**

```javascript
// === ROUTER ===
function initKeyboardHandler() {
  const tabNav = document.getElementById('tabNav');
  const isMobile = () => window.innerWidth <= 768;

  if (window.visualViewport) {
    let baseH = window.visualViewport.height;

    window.visualViewport.addEventListener('resize', () => {
      if (!isMobile()) return;
      const isKeyboard = window.visualViewport.height < baseH * 0.75;

      // Hide bottom tab bar so it doesn't cover keyboard
      tabNav.style.display = isKeyboard ? 'none' : '';

      // Scroll active input into view — iOS KakaoTalk fix
      if (isKeyboard) {
        const focused = document.activeElement;
        if (focused && ['INPUT', 'SELECT', 'TEXTAREA'].includes(focused.tagName)) {
          setTimeout(() => focused.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
        }
      } else {
        baseH = window.visualViewport.height; // recalibrate on keyboard close
      }
    });
  }
}
```

**When to use:** Any mobile web app with a fixed bottom nav and form inputs. The `scrollIntoView` call is the missing piece in the current implementation.

**Confidence:** MEDIUM — verified against Korean webview blog (jooonho.dev) and HTMHell 2024 interactive-widget article. iOS KakaoTalk behavior may vary by OS version.

### Pattern 3: Viewport Meta with interactive-widget

**What:** The `interactive-widget` meta tag controls whether the virtual keyboard resizes the layout viewport or just the visual viewport.

**Recommended setting for this app:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  viewport-fit=cover, interactive-widget=resizes-content">
```

**Why `resizes-content`:** The app has a fixed bottom tab bar that should move up when keyboard appears. With `resizes-content`, viewport units (vh, dvh) recalculate when keyboard opens, making CSS-only solutions viable. Bottom padding (`calc(80px + env(safe-area-inset-bottom))`) adjusts automatically.

**Caveat:** `interactive-widget` is Chrome 108+/Firefox 132+ only. KakaoTalk on iOS uses WKWebView (Safari engine) which does NOT support it. The `visualViewport` JS fallback remains required for iOS.

**Confidence:** MEDIUM (Chrome Android confirmed HIGH, iOS via WKWebView unconfirmed — needs testing).

### Pattern 4: innerHTML Template String Rendering (acceptable for this scale)

**What:** The current approach builds entire table/list HTML as a string and assigns to `element.innerHTML`. This is appropriate for this app's scale.

**Keep this pattern because:**
- No virtual DOM overhead
- 1,100 lines total — component isolation via functions is sufficient
- Re-renders are triggered explicitly, not reactively — predictable

**Improve it by:** Extracting each render sub-function to its own clearly-commented block, and documenting what state each renderer reads.

```javascript
// === TAB3 DASHBOARD ===
// Reads: records (global), weekOffset (module-level)
// Mutates: DOM only
function renderDashboard() { ... }
```

## Data Flow

### Initial Load Flow

```
DOMContentLoaded
    ↓
loadAll()  ─── parallel fetch ───→  Supabase DB (5 tables)
    ↓
records[], workers[], mainTasks[],
subTasks[], adminPin
    ↓
populateWorkerSelects()   buildDatalist()   addRow()
    ↓
App ready (Tab 1 visible, others render on tab switch)
```

### User Input (Tab 1) Flow

```
User fills form
    ↓
inputRows[] updated (in-memory)
    ↓
handleSubmit()
    ↓
Supabase INSERT → returns new record
    ↓
records[].unshift(newRecord)   (optimistic local update)
    ↓
Form reset   showToast()
```

### Tab Switch Flow

```
Tab button click
    ↓
Router: hide all .page, show target .page
    ↓
if (dashboard tab) → renderDashboard()   [reads records[] directly]
if (admin tab + unlocked) → renderAdminSettings()
```

### State Flow (global vars as store)

```
Supabase DB (source of truth)
    ↓ (loadAll on init — no real-time subscription)
records[]   workers[]   mainTasks[]   subTasks[]   adminPin
    ↓ (read by renderers)
DOM (display only)
    ↑ (writes go back to Supabase + local array update)
User actions
```

**Key observation:** There is no real-time sync. If two workers submit simultaneously on different devices, neither sees the other's entry until page refresh. This is acceptable for this use case (each worker reports their own day's work) but is worth noting for the dashboard (manager view may be stale).

### Key Data Flows by Feature

1. **100대 소요일 logic:** `records[]` → filter `메인작업` → group by `worker|taskName` → count unique dates from related main+sub records → `total / days` → `100 / avg`. The `relatedMain` field on sub-tasks drives date counting — this is where the logic improvement milestone must focus.

2. **Modal (edit/delete):** `records[]` is the in-memory source — edit saves to Supabase then mutates the local array entry. No re-fetch needed.

3. **Admin data management:** Same `records[]` — filtered by worker/date range in-memory (no additional DB query). Works for current data volume; will degrade at ~10,000+ records.

## Component Boundaries and Build Order

### Build Order for Refactoring Phases

The file is refactored in-place, so "build order" means: which changes must precede others.

```
Phase 1 — Foundation (no functional change)
├── Restructure CSS into labeled sections
├── Restructure JS into labeled sections
└── Move row state from data-attr to JS array
    (prerequisite: any Tab 1 touch-UX changes depend on this)

Phase 2 — Viewport / Keyboard fixes
├── Update <meta> viewport tag (interactive-widget)
├── Upgrade initKeyboardHandler() with scrollIntoView
├── Add dvh-based CSS fallbacks for bottom padding
└── Test on actual KakaoTalk webview
    (prerequisite: Phase 1 section structure)

Phase 3 — Mobile UX
├── Touch target sizing (min 44px via CSS base, not only media query)
├── Task row → card layout refinement
├── Table horizontal scroll handling (touch-action: pan-x)
└── Bottom-safe-area consistency (env(safe-area-inset-bottom))
    (prerequisite: Phase 1 + 2)

Phase 4 — 100대 소요일 logic
├── Refactor renderLeadTime() / renderCapa()
├── Minimum data threshold (skip if dataDays < 3)
├── Weighted multi-worker average approach
└── Confidence band display
    (independent — can run parallel to Phase 3)

Phase 5 — PWA
├── <link rel="manifest"> + manifest.json (separate file allowed if PWA)
├── Service Worker for offline shell caching
└── theme-color / apple-touch-icon meta
    (prerequisite: Phases 1-3 stable)
```

### Component Communication Map

| Caller | Calls | Data Direction |
|--------|-------|----------------|
| DOMContentLoaded | `loadAll()` → `populateWorkerSelects()`, `buildDatalist()`, `addRow()` | Init cascade |
| Tab router click | `renderDashboard()` or `renderAdminSettings()` | Tab → renderer |
| `renderDashboard()` | `renderDailyReport()`, `renderKPI()`, `renderWeekly()`, `renderCapa()`, `renderLeadTime()`, `renderInventory()`, `renderRecent()` | Dashboard orchestrator |
| `handleSubmit()` | Supabase INSERT → `records.unshift()` → `setRows()` → `renderRows()` | Write path |
| `saveEdit()` | Supabase UPDATE → mutate `records[]` → `loadMyRecords()` or `loadAdminRecords()` | Edit write path |
| `deleteRecord()` | Supabase DELETE → filter `records[]` → re-render | Delete write path |
| Any render fn | Reads `records[]`, `workers[]`, `mainTasks[]`, `subTasks[]` | Read-only from global state |

## Anti-Patterns to Avoid

### Anti-Pattern 1: DOM as State Store

**What people do:** `document.getElementById('taskTableBody').dataset.rows = JSON.stringify(rows)` — storing application state in DOM attributes.

**Why it's wrong:** The DOM is a display layer, not a data store. This pattern requires JSON.parse on every read, causes unnecessary full re-renders, and makes testing/debugging impossible.

**Do this instead:** Keep state in a JS variable (`let inputRows = []`). Read from DOM only for user input events. Write to DOM only via render functions.

### Anti-Pattern 2: Inline Styles in innerHTML Templates

**What people do:** `h += '<div style="background:#f0f4ff;padding:10px;...">'` (seen extensively in renderWeekly, renderInventory).

**Why it's wrong:** Inline styles override media queries, can't be restyled, and make mobile-first refactoring extremely difficult. The mobile optimizations in `@media` cannot touch inline styles.

**Do this instead:** Define named CSS classes for these patterns (`.section-header`, `.day-summary-bar`, `.weekly-card-row`). The `renderWeekly()` function alone has 12+ inline style blocks that prevent mobile CSS overrides.

### Anti-Pattern 3: Single God-Function for Dashboard

**What people do:** `renderDashboard()` calls 7 sub-renderers synchronously, all running on every tab visit.

**Why it's wrong:** On mobile, this causes a visible render delay when switching to dashboard — all 6 tables rebuild at once from the full `records[]` array.

**Do this instead:** Lazy-render sections — render only what's visible in the viewport, or at minimum use `requestAnimationFrame` to batch renders. The weekly section and lead time table are the heaviest.

### Anti-Pattern 4: confirm() for Delete Confirmation

**What people do:** `if (!confirm('정말 삭제하시겠습니까?')) return;`

**Why it's wrong:** KakaoTalk webview on iOS suppresses `window.confirm()` dialogs or renders them behind the webview chrome. This is a known KakaoTalk webview restriction — native confirmation dialogs are unreliable.

**Do this instead:** Implement inline confirmation (toggle a "really delete?" button state) or a custom modal. The existing modal system can be reused for this.

### Anti-Pattern 5: Hardcoded 768px Breakpoint as Only Mobile Signal

**What people do:** All mobile logic gated on `window.innerWidth <= 768`.

**Why it's wrong:** KakaoTalk webview can open in a resized window at any size. More importantly, the user agent string (not screen width) is the reliable signal for KakaoTalk webview.

**Do this instead:** Keep 768px for CSS, but add UA detection for webview-specific behavior:

```javascript
const isKakaoWebview = /KAKAOTALK/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
```

Use these flags for behavior that differs from normal mobile (e.g., clipboard API restriction, confirm() suppression).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase JS v2 (CDN) | `supabase.createClient(URL, KEY)` — anon key in source | Anon key is public-safe for Row Level Security patterns, but current schema likely has no RLS — acceptable for internal factory tool |
| Pretendard Font (CDN) | `<link rel="preconnect">` + CSS stylesheet | Add `font-display: swap` if not already present in CDN CSS |
| KakaoTalk Webview | No SDK — pure browser | `navigator.clipboard` blocked; `confirm()` unreliable; `visualViewport` required for keyboard handling |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CSS ↔ JS | JS adds/removes classes (`active`, `show`, `error`) | Current code also uses `element.style.display` directly — standardize to class-based toggling |
| State ↔ Renderers | Renderers read global arrays directly | No abstraction layer — acceptable at this scale, document clearly |
| Supabase ↔ local state | `loadAll()` on init only; write ops update both DB and local array | No real-time subscription — intentional (no need for live dashboard) |
| Tab 1 row state ↔ DOM | Currently via `data-rows` attribute — should be `inputRows[]` JS var | Critical migration for Phase 1 |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (~10 workers, ~500 records/month) | Current architecture is sufficient. Single `loadAll()` on init works fine. |
| 50 workers, 5,000 records/month | `loadAll()` fetching all records becomes slow. Add date-range filter to initial query (last 90 days). Dashboard renderers already compute from in-memory array — the bottleneck is the initial fetch, not the computation. |
| >20,000 total records | Dashboard queries should move to server-side (Supabase RPCs or views). `renderCapa()` and `renderLeadTime()` do O(n²) passes over all records — performance degrades noticeably. |

## Sources

- Direct code inspection of `/Production/index.html` (~1,174 lines) — HIGH confidence
- [Webview Fixed Elements & Virtual Keyboard — jooonho.dev (2023)](https://jooonho.dev/web/2023-01-09-webview-issue/) — MEDIUM confidence
- [VisualViewport Fixed Elements — velog.io](https://velog.io/@th_velog/%EC%9B%B9%EB%B7%B0-Fixed-%EA%B0%80%EC%83%81-%ED%82%A4%EB%B3%B4%EB%93%9C-VisualViewport-%EC%82%AC%EC%9A%A9) — MEDIUM confidence
- [interactive-widget viewport meta — HTMHell Advent 2024](https://www.htmhell.dev/adventcalendar/2024/4/) — HIGH confidence (Chrome 108+)
- [Fix mobile keyboard overlap with VisualViewport — DEV Community](https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a) — MEDIUM confidence
- [Bram.us — interactive-widget 2024](https://www.bram.us/2024/12/04/control-the-viewport-resize-behavior-on-mobile-with-interactive-widget/) — HIGH confidence

---
*Architecture research for: Single-file HTML production management app, KakaoTalk webview mobile-first*
*Researched: 2026-03-25*
