---
phase: 05-pwa
plan: 01
subsystem: pwa
tags: [pwa, manifest, service-worker, workbox, kakaotalk, offline]

# Dependency graph
requires:
  - phase: 03-ui-redesign
    provides: stable index.html layout cached by Service Worker
  - phase: 01-foundation
    provides: viewport-fit=cover meta tag for PWA standalone mode
provides:
  - manifest.json with standalone display, 192/512 icons, theme_color #1e3a5f
  - sw.js with Workbox 7.0.0 CDN (NetworkFirst pages, CacheFirst fonts, NetworkOnly Supabase)
  - KakaoTalk UA guard preventing SW registration in webview
  - offline banner UI + auto data reload on network reconnect
affects: [verifier, future-phases]

# Tech tracking
tech-stack:
  added:
    - Workbox 7.0.0 CDN (importScripts in sw.js)
    - Web App Manifest (W3C spec)
    - Service Worker (native API)
  patterns:
    - KakaoTalk UA guard: /KAKAOTALK/i.test(navigator.userAgent) before SW register
    - NetworkFirst(5s timeout) for navigation, CacheFirst(30d) for fonts, NetworkOnly for Supabase
    - initPWA() IIFE at end of script block for isolated PWA init
    - offline/online event listeners with loadAll() auto-reload on reconnect

key-files:
  created:
    - manifest.json
    - sw.js
    - icons/icon-192.png
    - icons/icon-512.png
  modified:
    - index.html

key-decisions:
  - "D-04 resolution: NetworkFirst(5s) for index.html — online delivers latest version, offline falls back to cache; CacheFirst would delay updates in single-file app"
  - "D-03 enforced: Supabase API uses NetworkOnly, not NetworkFirst — production data must never be stale"
  - "D-07 implementation: /KAKAOTALK/i UA guard skips SW registration entirely in KakaoTalk WebView"
  - "D-02 overridden by plan spec: loadAll() called on online event for automatic data reload (plan explicitly requires this)"
  - "PNG icons generated via Node.js zlib (no canvas package) — solid #1e3a5f placeholder, replace with branded icon later"

patterns-established:
  - "initPWA() IIFE at bottom of <script> block — isolated, runs after all app functions defined"
  - "KakaoTalk guard pattern: var isKakaoTalk=/KAKAOTALK/i.test(navigator.userAgent) before any SW operation"
  - "Offline banner: sticky top:0 z-index:1000 #dc2626 background, initially hidden with display:none"

requirements-completed: [PWA-01, PWA-02, PWA-03, PWA-04]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 5 Plan 01: PWA Layer Summary

**Workbox 7.0.0 CDN service worker with KakaoTalk UA guard, manifest.json, placeholder icons, and offline banner integrated into single index.html**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T03:00:50Z
- **Completed:** 2026-03-26T03:02:44Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- manifest.json with standalone display, theme_color #1e3a5f, 192/512 PNG icon entries
- sw.js using Workbox 7.0.0 CDN with NetworkFirst(pages), CacheFirst(fonts), NetworkOnly(Supabase)
- index.html integrated: manifest link, apple-touch-icon, offline banner div, initPWA() IIFE with KakaoTalk UA guard and offline/online handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: manifest.json + PWA 아이콘 생성** - `ac50e86` (feat)
2. **Task 2: sw.js Service Worker 생성** - `ae37a18` (feat)
3. **Task 3: index.html PWA 통합** - `64dc81d` (feat)

## Files Created/Modified

- `manifest.json` - PWA metadata: name, short_name, standalone display, theme_color #1e3a5f, 192/512 icons
- `sw.js` - Workbox 7.0.0 CDN service worker with three routing strategies
- `icons/icon-192.png` - 192x192 solid #1e3a5f PNG placeholder icon
- `icons/icon-512.png` - 512x512 solid #1e3a5f PNG placeholder icon
- `index.html` - Added manifest link, apple meta tags, offline-banner div, initPWA() IIFE

## Decisions Made

- **D-04 NetworkFirst for index.html:** Online delivers latest version, offline falls back to cache. CacheFirst rejected because it would serve stale single-file app after deployments.
- **D-03 enforced:** Supabase API routes use `NetworkOnly` — real-time production data must never be stale from cache.
- **loadAll() on reconnect:** Plan spec explicitly requires `loadAll()` call in online handler. This overrides D-02 context note (which said "unnecessary") — the plan is more specific and correct given Supabase realtime reconnect issues.
- **PNG generation method:** No `canvas` npm package available; used Node.js built-in `zlib.deflateSync` to construct valid PNG binary from raw RGB data.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `node-canvas` package not installed. Used Node.js built-in `zlib` + manual PNG binary construction instead. All PNG validity assertions passed (PNG signature bytes verified).

## User Setup Required

None - no external service configuration required. Icons are placeholders; replace `icons/icon-192.png` and `icons/icon-512.png` with branded artwork when available.

## Known Stubs

- `icons/icon-192.png` — solid color placeholder (#1e3a5f). Functional for PWA install, but lacks app branding. Replace with designed icon before production launch.
- `icons/icon-512.png` — same as above, 512x512 variant.

## Next Phase Readiness

- PWA layer complete. Phase 5 Plan 02 (validation) can proceed.
- KakaoTalk real-device test recommended to confirm SW skip works correctly (no infinite reload).
- Lighthouse PWA audit: `npx lighthouse [url] --only-categories=pwa` to verify installability score.

## Self-Check: PASSED

- manifest.json: FOUND
- sw.js: FOUND
- icons/icon-192.png: FOUND
- icons/icon-512.png: FOUND
- index.html: FOUND
- 05-01-SUMMARY.md: FOUND
- Commit ac50e86 (manifest + icons): FOUND
- Commit ae37a18 (sw.js): FOUND
- Commit 64dc81d (index.html PWA): FOUND

---
*Phase: 05-pwa*
*Completed: 2026-03-26*
