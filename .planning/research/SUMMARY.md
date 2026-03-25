# Project Research Summary

**Project:** 카카오톡 웹뷰 모바일 최적화 생산관리 시스템
**Domain:** Single-file HTML mobile-first refactoring — KakaoTalk WebView optimization
**Researched:** 2026-03-25
**Confidence:** MEDIUM-HIGH (viewport/layout HIGH, PWA/KakaoTalk internals MEDIUM, undocumented quirks LOW)

## Executive Summary

This project is a mobile-first refactoring of an existing single-file HTML production management app (`index.html`) used by factory workers via the KakaoTalk in-app browser. The app already works on desktop and connects to Supabase for data persistence. The milestone goal is not to rebuild the app but to add optimization layers — viewport fixes, touch UX improvements, and a PWA layer — without introducing build tools or breaking the single-file constraint. Research strongly validates that all required fixes are achievable with native CSS and a small amount of vanilla JS.

The recommended approach is a phased layering strategy: first stabilize the broken layout fundamentals (viewport height, keyboard handling, touch targets, input font sizes), then polish the mobile UX (touch feedback, scroll behavior, loading states), then address the business logic improvement (100대 소요일 산출), and finally add the optional PWA layer. This order is mandatory because the viewport and keyboard fixes are prerequisites for any other mobile UX work — an input field that causes layout collapse blocks every subsequent feature from being correctly testable. KakaoTalk's Android WebView (Chrome 108+) and iOS WebView (WKWebView/Safari) have meaningfully different keyboard and viewport behaviors, requiring a dual-path implementation for keyboard handling.

The primary risk is the Service Worker / PWA layer interacting badly with KakaoTalk's non-standard WebView. Multiple confirmed community reports document infinite page refresh loops caused by Service Workers inside KakaoTalk. This risk is entirely avoidable: skip Service Worker registration when running inside KakaoTalk (detect via UA string `KAKAOTALK`), and only activate PWA features in real browser contexts. The second risk is scope creep — offline sync, push notifications, per-user auth, and rich text uploads are all anti-features for this use case and must be deferred.

---

## Key Findings

### Recommended Stack

The project requires no new framework or build tooling. All recommended additions are native browser APIs and a single CDN import (Workbox). The existing stack — Supabase JS v2, Pretendard font, vanilla JS, single `index.html` — is retained unchanged. What is added sits on top.

See full details in `.planning/research/STACK.md`.

**Core technologies:**
- `100dvh` CSS unit: Replace `100vh` for full-height containers — KakaoTalk's chrome (top bar + bottom nav) is excluded from `vh` calculation, causing overflow. `dvh` is natively supported by KakaoTalk Android (Chrome 108+).
- `VisualViewport` API (JS): iOS keyboard fallback — `interactive-widget` meta has no Safari support. Must read `visualViewport.height` and write to `--vh` CSS custom property for iOS.
- `interactive-widget=resizes-content` (viewport meta): Makes the layout viewport resize with the keyboard on Android/Chrome 108+, enabling CSS-only bottom padding adjustment.
- `font-size: 16px` on all inputs: The only reliable prevention for iOS auto-zoom on input focus. Non-negotiable.
- `touch-action: manipulation`: Removes 300ms tap delay. Apply to all interactive elements.
- `overscroll-behavior: contain`: Prevents scroll bleed from inner containers to the page body.
- CSS `scroll-snap` (x proximity): Native horizontal table scroll snapping with zero JS.
- Workbox 7.0.0 (CDN via `importScripts`): Service worker caching strategy without any build step. Register conditionally — skip inside KakaoTalk WebView.
- Web App Manifest (`manifest.json`): PWA installability for real-browser users; metadata improves link sharing. No effect inside KakaoTalk's in-app browser.

**Do not use:** `100vh` alone, Hammer.js (unmaintained), Tailwind CDN (JIT runtime is CPU-heavy on low-end Android), jQuery, `user-scalable=no`, `alert()`/`confirm()` (unreliable in KakaoTalk).

### Expected Features

The current system has layout-breaking bugs in its primary use environment (KakaoTalk WebView). The milestone MVP is defined as: fixing those blocking issues first, then adding polish.

See full details in `.planning/research/FEATURES.md`.

**Must have — system is broken without these (P1):**
- Viewport height JS fix (`--vh` custom property + `dvh`) — keyboard open collapses layout on Tab 1 (실적 입력)
- Input `font-size >= 16px` — iOS auto-zoom on every field tap causes layout distortion
- Touch targets >= 44px for all controls — one-handed use on factory floor, possibly with gloves
- Fixed bottom action area stays above keyboard — submit button hidden under keyboard = workers cannot submit
- Remove all `alert()`/`confirm()` calls — behavior is inconsistent in KakaoTalk WebView; replace with in-page toast/modal
- Smooth inertia scroll on tables and lists — core UX expectation for any mobile list interface

**Should have — significant UX improvement (P2):**
- Touch feedback on tap (CSS `active` + `transform: scale(0.96)`) — prevents rage-tapping in noisy environments
- Prevent double-submit (disable button on first tap) — poor factory floor connectivity causes duplicate submissions
- Offline indicator banner (`navigator.onLine`) — workers in dead zones need to know not to submit
- Skeleton loading screens — perceived performance improvement, CSS-only
- 100대 소요일 산출 로직 개선 — high business value but requires domain clarification on what defines a "main task" day

**Defer to v2+:**
- Swipe-to-delete rows — good pattern but adds JS complexity
- Persistent `localStorage` draft — useful edge case
- Optimistic UI — complexity not justified until performance is a confirmed problem

**Anti-features to reject if requested:**
- Full offline-first sync (IndexedDB queue + conflict resolution — over-engineering for this scale)
- PWA install prompt inside KakaoTalk (technically impossible — `beforeinstallprompt` does not fire)
- Push notifications (KakaoTalk's own messaging IS the notification channel for this user base)
- Real-time WebSocket dashboard (manual refresh or 60s polling is sufficient for admin-only view)

### Architecture Approach

The file cannot be split — the single `index.html` constraint is firm. The architecture target is logical separation within the file using section comments as module boundaries (`/* === SECTION === */`). The current codebase has the right components but wrong patterns in two critical areas: row state is stored in a DOM attribute (should be a JS array), and dashboard renderers use heavy inline styles that block mobile CSS overrides via `@media`.

See full details in `.planning/research/ARCHITECTURE.md`.

**Major components:**
1. **CSS Layer** — Design tokens (`:root` CSS vars), reset, layout, components, forms, tables, dashboard, PIN, animations, mobile overrides. Must be refactored into labeled sections mirroring the desktop structure.
2. **HTML Shell** — 4 tab pages (`#page-input`, `#page-myrecords`, `#page-dashboard`, `#page-admin`) + `#modalContainer` + `#toast`. Structure is clean — no changes needed.
3. **State Layer** — Global JS arrays (`records[]`, `workers[]`, `mainTasks[]`, `subTasks[]`, `inputRows[]`). Row state must be migrated from `data-rows` DOM attribute to `inputRows[]` JS variable before any Tab 1 UX work.
4. **Router / Keyboard Handler** — Tab switching + `VisualViewport` resize listener. Needs upgrade: add `scrollIntoView` call when keyboard opens so active input is always visible.
5. **Data Layer** — `loadAll()` parallel Supabase fetch on init. No real-time subscription (intentional). Acceptable at current scale; will degrade at 10k+ records.
6. **Render Functions** — One per tab/section, reading from global state arrays. `innerHTML` template string pattern is acceptable at this scale. Anti-pattern to fix: inline `style=""` attributes in template strings block mobile CSS overrides.

**Key patterns:**
- Keep row state in `inputRows[]` JS array, not DOM attributes
- Use `isComposing` guard on all `keydown` handlers (Korean IME produces `keyCode 229` during composition)
- UA detection (`/KAKAOTALK/i.test(navigator.userAgent)`) for behavior that differs from normal mobile — not for CSS
- Dual-path keyboard handling: `interactive-widget` for Android, `VisualViewport` JS for iOS

### Critical Pitfalls

See full details in `.planning/research/PITFALLS.md`.

1. **iOS keyboard collapses `position: fixed` layout** — iOS WebView does not resize the layout viewport when the keyboard opens; `window.innerHeight` stays fixed while `visualViewport.height` shrinks. Result: fixed bottom elements (tab bar, submit button) slide under the keyboard. Fix: `VisualViewport` resize listener that dynamically sets container height and calls `scrollIntoView` on the active input.

2. **Service Worker causes infinite refresh loop in KakaoTalk WebView** — Confirmed in multiple reports including the official Kakao Devtalk forum. KakaoTalk's cookie/cache isolation causes Service Worker install/activate lifecycle failures that produce an unrecoverable refresh loop. Fix: detect KakaoTalk UA and skip Service Worker registration entirely in that context.

3. **`100vh` produces wrong height in KakaoTalk** — KakaoTalk's UI chrome (top bar + bottom nav) is not subtracted from `vh` calculation. Containers overflow, tabs are hidden behind native navigation. Fix: replace with `100dvh` + `--app-height` JS fallback. This is the single highest-impact change in the milestone.

4. **Korean IME duplicate events on `keydown`** — Android Chrome returns `keyCode 229` for all `keydown` events during Korean character composition (조합 중). If form logic fires on `keydown`, characters are duplicated or incomplete values are saved. Fix: use `input` event for real-time value tracking; guard `keydown` Enter handlers with `if (e.isComposing || e.keyCode === 229) return`.

5. **Touch scroll/click conflict — click events suppressed after `touchmove`** — When a user's finger moves slightly before lifting, the browser classifies the gesture as a scroll and cancels the pending `click` event. Factory workers tapping tables experience silent non-response. Fix: `touch-action: manipulation` on all interactive elements; ensure touch targets are >= 44px to reduce micro-movement on tap.

---

## Implications for Roadmap

The architecture research defines a clear 5-phase build order where each phase is a prerequisite for the next. This order is non-negotiable because the viewport/keyboard foundation must be stable before any mobile UX work is testable, and the PWA layer must come after the core is verified to avoid Service Worker cache corruption.

### Phase 1: Foundation — Code Structure + Viewport
**Rationale:** Two independent but parallel tasks that must be done first. CSS restructuring removes the inline-style anti-pattern that blocks mobile overrides. Viewport/viewport-height fixes are prerequisite for every subsequent mobile UX feature.
**Delivers:** Clean labeled CSS/JS section structure; `100dvh` viewport height; updated `<meta>` viewport tag; `VisualViewport` JS listener (`--vh` custom property); `inputRows[]` migration from DOM attribute.
**Addresses:** FEATURES P1 — viewport height fix, input font-size >= 16px.
**Avoids:** Pitfalls 3 (100vh distortion) and 1 (iOS keyboard layout collapse).
**Research flag:** Standard patterns — no additional research needed.

### Phase 2: Mobile UX — Keyboard, Touch, Inputs
**Rationale:** Depends on Phase 1 viewport foundation. All touch and input fixes require the correct height baseline established in Phase 1.
**Delivers:** Upgraded `initKeyboardHandler()` with `scrollIntoView`; touch targets >= 44px as CSS base (not only media query); `touch-action: manipulation` everywhere; `font-size: 16px` on all inputs; `overscroll-behavior: contain` on scroll containers; `scroll-snap` on horizontal tables; `alert()`/`confirm()` replaced with in-page toast/modal; Korean IME `isComposing` guards.
**Addresses:** FEATURES P1 — fixed action area above keyboard, smooth scroll, touch targets, remove `alert()`.
**Avoids:** Pitfalls 4 (touch/scroll conflict) and 3 (Korean IME duplicates).
**Research flag:** Standard patterns — no additional research needed for iOS/Android keyboard handling. Actual KakaoTalk device testing required for validation (cannot be confirmed in Chrome DevTools emulation).

### Phase 3: Polish — UX Improvements
**Rationale:** Depends on Phase 2 being stable and validated on real devices. These are P2 features that require the P1+P2 foundation to be correct before they can be built on top.
**Delivers:** Touch feedback (CSS `active` state + `transform: scale(0.96)`); double-submit prevention (button disabled on first tap); offline indicator banner (`navigator.onLine`); skeleton loading screens (CSS-only); loading states on all Supabase async calls.
**Addresses:** FEATURES P2 — touch feedback, double-submit, offline indicator, skeleton loading.
**Avoids:** UX pitfall: loading indicator missing causes workers to repeat-tap and create duplicate entries.
**Research flag:** Standard patterns — no research needed.

### Phase 4: Business Logic — 100대 소요일 산출 개선
**Rationale:** Fully independent of UI phases — pure logic change in `renderLeadTime()` / `renderCapa()`. Can run in parallel with Phase 3 if resourcing allows. Blocked on domain clarification of what counts as a "main task day."
**Delivers:** Improved `renderLeadTime()` filtering to main-task-only days; weighted or rolling-window average for sparse data; minimum data threshold (skip calculation if fewer than 3 data days); confidence band display.
**Addresses:** FEATURES P2 — 100대 소요일 산출 로직 개선.
**Research flag:** Needs domain input — the definition of "main task day" vs. "sub-task day" must be confirmed with the product owner before implementation. The `relatedMain` field on sub-tasks is the join key but its correct usage requires clarification.

### Phase 5: PWA Layer
**Rationale:** Must come last, after Phases 1-3 are stable and verified in KakaoTalk WebView. Adding a Service Worker to a layout that is still broken causes cached broken states that are difficult to clear. The Service Worker must skip registration inside KakaoTalk (UA check required).
**Delivers:** `manifest.json` with icons and `theme-color`; `apple-touch-icon` and `apple-mobile-web-app-*` meta tags; Workbox 7 CDN service worker with Cache-first for app shell, Network-first for Supabase API calls; KakaoTalk UA guard to skip SW registration inside KakaoTalk WebView.
**Addresses:** FEATURES — PWA install for real-browser users; faster repeat loads; offline shell caching.
**Avoids:** Pitfall 2 — Service Worker infinite refresh loop in KakaoTalk WebView.
**Research flag:** Needs KakaoTalk device testing before declaring complete — Service Worker behavior in KakaoTalk is the highest-risk integration in the entire milestone.

### Phase Ordering Rationale

- Phases 1 and 2 are a strict prerequisite chain: viewport height must be correct before keyboard scroll-into-view can be implemented correctly; keyboard handling must work before touch UX features can be validated.
- Phase 3 is additive polish that sits cleanly on the Phase 1+2 foundation; it has no internal dependencies.
- Phase 4 is genuinely independent and its placement here is a default — it can begin as soon as domain clarification is available, even during Phase 2.
- Phase 5 is last because Service Worker cache pollution of a broken layout creates a high-cost recovery scenario; it belongs only after the base is verified stable.
- The architecture research defines this same ordering explicitly in its "Build Order for Refactoring Phases" section.

### Research Flags

**Needs real-device validation (cannot emulate):**
- Phase 2: iOS KakaoTalk keyboard scroll-into-view behavior — Chrome DevTools emulation does not replicate WKWebView keyboard behavior accurately. Must test on actual iOS device with KakaoTalk installed.
- Phase 5: Service Worker behavior in KakaoTalk WebView — must register, observe, and verify no infinite refresh before merging.

**Needs domain input before starting:**
- Phase 4: Definition of "main task day" for 100대 소요일 산출. Implementation cannot be validated without product owner input.

**Standard patterns (skip research-phase):**
- Phase 1: CSS restructuring and `dvh`/`VisualViewport` patterns are thoroughly documented and well-understood.
- Phase 3: CSS touch feedback, `navigator.onLine`, skeleton shimmer — all standard, low-risk implementations.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended technologies are native browser APIs or officially documented CDN libraries. Version compatibility verified against KakaoTalk's confirmed Chrome 108+ engine. Only gap: iOS KakaoTalk WebView version distribution unknown (affects `dvh` and `env()` support floor). |
| Features | MEDIUM | P1 features are confirmed broken and well-documented fixes exist. P2/P3 features are standard mobile patterns. LOW confidence on 100대 소요일 산출 — domain logic unclear without product owner input. |
| Architecture | HIGH | Based on direct code inspection of the actual `index.html` (~1,174 lines). Component map, anti-patterns, and build order are derived from the real file, not assumed. |
| Pitfalls | HIGH | Top 5 pitfalls are corroborated by multiple independent Korean developer sources, MDN, and in two cases the official Kakao Devtalk forum. Service Worker KakaoTalk issue is the highest-risk and most confirmed pitfall. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **iOS KakaoTalk WebView version floor:** The minimum iOS version among actual users is unknown. `dvh` requires Safari 15.4+; `env(safe-area-inset-*)` requires iOS 11.2+. The `VisualViewport` JS fallback ensures correctness regardless, but knowing the floor would clarify whether `dvh` is a primary or fallback strategy on iOS.
- **100대 소요일 산출 domain definition:** The correct algorithm depends on what the business considers "a production day for a main task" when sub-tasks are mixed in. This cannot be inferred from code — requires a question to the product owner before Phase 4 begins.
- **`env(safe-area-inset-bottom)` on Android KakaoTalk:** Android support for safe area insets depends on whether the native KakaoTalk app has enabled edge-to-edge mode. This is documented as variable; real-device testing during Phase 1 will confirm.
- **Supabase RLS status:** Current architecture note flags that Row Level Security may not be configured. PIN security relies on client-side JS. This is acceptable for an internal factory tool but should be acknowledged and a decision made during Phase 1 (set RLS or formally accept the risk).

---

## Sources

### Primary (HIGH confidence)
- MDN VisualViewport API — keyboard handling patterns
- MDN CSS scroll-snap, overscroll-behavior — scroll behavior
- web.dev viewport-units — `dvh`/`svh`/`lvh` browser support
- HTMHell Advent 2024 — `interactive-widget` meta, Chrome 108+ confirmed, Safari no-support confirmed
- Workbox GitHub releases (v7.0.0) — CDN variant confirmed
- WCAG 2.2 / Smashing Magazine — touch target size recommendations
- IME keyCode 229 issue (minjung-jeon.github.io) — Korean composition event behavior
- Channel.io iOS 15 대응기 — production service webview fixes
- Kakao Devtalk official forum — Service Worker + KakaoTalk PWA infinite refresh (confirmed)
- Direct code inspection of `/Production/index.html` (~1,174 lines)

### Secondary (MEDIUM confidence)
- KakaoTalk Android UA string (useragents.io) — Chrome/137 confirmed, but UA changes per version
- jooonho.dev webview issue (2023) — VisualViewport iOS/Android keyboard patterns
- velog.io VisualViewport fixed elements — Korean developer, verified pattern
- HTMHell / bram.us 2024 — `interactive-widget` Chrome 108+ behavior
- lightrun.com ionic issue — `env(safe-area-inset-*)` Android limitations

### Tertiary (LOW confidence)
- Medium/@fb1tmf2rl3 — KakaoTalk in-app browser issues (single source, no date, not independently verified)
- j-ho.dev iOS Safari focus zoom — corroborated by multiple other sources so treated as MEDIUM in practice

---

*Research completed: 2026-03-25*
*Ready for roadmap: yes*
