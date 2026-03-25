<!-- GSD:project-start source:PROJECT.md -->
## Project

**생산 관리 시스템 리팩토링**

공장/현장 작업자가 카카오톡 웹뷰에서 일일 생산 실적을 입력하고, 관리자가 PC에서 주간 대시보드로 생산성을 확인하는 생산 관리 시스템. 현재 단일 index.html로 구현되어 있으며, 모바일 퍼스트 리팩토링을 통해 카카오톡 웹뷰 환경에 최적화한다.

**Core Value:** 현장 작업자가 카카오톡 웹뷰에서 빠르고 불편함 없이 생산 실적을 입력할 수 있어야 한다.

### Constraints

- **구조**: 단일 HTML 파일 유지 — 배포/관리 단순성
- **환경**: 카카오톡 인앱 웹뷰 호환 필수 — 주 사용 환경
- **백엔드**: Supabase 유지 — 기존 데이터/스키마 활용
- **기능**: 기존 4개 탭 기능 100% 유지 — 현장 운영 중
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Existing Stack (Do Not Replace)
| Technology | Version | Role |
|------------|---------|------|
| Supabase JS | v2 (CDN) | Backend, auth, realtime |
| Pretendard Variable | latest CDN | Korean UI font |
| Vanilla JS | ES2020+ | All app logic |
| Single `index.html` | — | Entire app, no build step |
## Recommended Stack (New Additions)
### Core: Viewport & Layout Fixes
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| CSS `dvh` unit | Native (no library) | Full-height containers | `100vh` overflows in KakaoTalk because the webview's chrome (top bar + bottom nav) is excluded from `vh` calculation. `100dvh` dynamically adjusts as the browser chrome shows/hides. Chrome 108+, Firefox 101+, Safari 15.4+. KakaoTalk Android uses Chrome 108+ engine — confirmed from UA string `Chrome/137`. Confidence: HIGH. |
| `env(safe-area-inset-*)` | Native CSS | Notch/home-bar padding | Required for devices with notches or bottom home indicators. Activated via `viewport-fit=cover` in the meta tag. iOS support is solid; Android support requires `viewport-fit=cover` plus the native app enabling edge-to-edge mode (KakaoTalk does this on modern Android). Confidence: MEDIUM. |
| `interactive-widget=resizes-content` | Native (viewport meta) | Prevent layout jump on keyboard open | Adding this to the viewport meta tag makes the Layout Viewport (not just Visual Viewport) resize when the soft keyboard appears. This fixes the "화면 틀어짐" (layout jump) issue when input fields receive focus. Chrome 108+ only — no Safari/iOS support yet. On iOS, fall back to `VisualViewport` API. Confidence: HIGH for Android, LOW for iOS. |
| `VisualViewport` API | Native (no library) | iOS keyboard resize fallback | When keyboard opens on iOS WebView, read `window.visualViewport.height` and write to a CSS custom property `--vh`. Use `calc(var(--vh) * 100)` for full-height sections. Required for iOS KakaoTalk because `interactive-widget` has no Safari support. Confidence: HIGH. |
### Core: Input Focus Fix
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `font-size: 16px` on all inputs | Native CSS | Prevent iOS auto-zoom on focus | iOS Safari (and KakaoTalk iOS WebView) auto-zooms when a focused input has `font-size < 16px`. Setting all inputs to `font-size: 16px` is the only reliable, accessibility-safe prevention. Scale visually with `transform: scale()` if smaller appearance is needed. Confidence: HIGH. |
| `touch-action: manipulation` | Native CSS | Remove 300ms tap delay | On older mobile WebViews, tap events have a 300ms delay because the browser waits for a double-tap. `touch-action: manipulation` disables double-tap zoom recognition, eliminating the delay. Apply to all interactive elements. Modern Chrome WebView no longer needs this on pages with `width=device-width`, but it is a safe no-cost fallback. Confidence: HIGH. |
### Core: Scroll & Touch Feel
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| CSS `scroll-snap` | Native CSS | Horizontal table snapping | KakaoTalk users report unnatural table scrolling. `scroll-snap-type: x mandatory` on table wrappers and `scroll-snap-align: start` on cells creates native snap behavior with zero JS. Full support in all modern WebKits. Confidence: HIGH. |
| CSS `overscroll-behavior: contain` | Native CSS | Prevent scroll bleed | When a scrollable inner container is at its boundary, scroll events propagate to the page body — causing the whole page to scroll unexpectedly in WebView. `overscroll-behavior: contain` on inner scroll containers stops this propagation. Confidence: HIGH. |
| `overflow: auto` + `-webkit-overflow-scrolling: touch` | Native CSS | Momentum scrolling on iOS | Inner scroll containers need this pair for inertial (physics-based) scrolling on iOS. Note: Safari 13+ applies momentum scrolling to all `overflow: scroll` elements automatically, but explicit declaration ensures compatibility with older KakaoTalk WebView versions still in the field. Confidence: MEDIUM (Safari 13+ makes `-webkit` unnecessary, but it does not hurt). |
### Supporting: PWA Layer
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Web App Manifest (`manifest.json`) | W3C spec | "Add to Home Screen" + standalone mode | A `manifest.json` linked from `index.html` enables the OS to present the app as installable. On iOS 16.4+ Safari, users can install via Share menu. On Android Chrome, the install prompt appears automatically. KakaoTalk's own WebView does NOT show install prompts — users must open in an external browser first. Still worth adding: metadata improves appearance when shared as links. Confidence: HIGH for capability, MEDIUM for KakaoTalk-specific install path. |
| Service Worker (inline `sw.js`) | Native API | Offline cache + faster repeat loads | A minimal service worker with Cache-first strategy for static assets (the single `index.html`, fonts) ensures the app shell loads instantly on repeat visits, even with poor connectivity (factory floor environments). Only Supabase API calls need Network-first. Confidence: HIGH. |
| Workbox (CDN) | 7.0.0 | Service worker helpers | Workbox abstracts cache strategy boilerplate. The CDN variant (`workbox-sw.js`) requires zero build tools — import via `importScripts()` inside `sw.js`. Official CDN: `https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js`. Confidence: HIGH. |
### Supporting: Visual / UX Polish
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| CSS Custom Properties (CSS Variables) | Native | Centralized design tokens | All spacing, colors, and touch-target sizes defined once as `--space-*`, `--color-*`, `--tap-min: 48px`. No external library needed. Makes mobile overrides via `@media (pointer: coarse)` maintainable. Confidence: HIGH. |
| `@media (pointer: coarse)` | Native CSS | Touch device detection | Detects touchscreen input. Use to increase padding, tap areas, and disable hover-only styles that break on touch. More reliable than UA sniffing. Works in KakaoTalk Android WebView (Chromium engine) and iOS WebView (WebKit). Confidence: HIGH. |
| CSS `@supports` | Native CSS | Progressive enhancement | Wrap `dvh`, `env()`, and `scroll-snap` rules in `@supports` blocks where needed so older KakaoTalk versions still get a usable fallback. Confidence: HIGH. |
## Installation
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Viewport height | `dvh` + VisualViewport JS fallback | `100vh` with JS `window.innerHeight` polyfill | `dvh` is now natively supported in KakaoTalk's engine (Chrome 108+). The old JS-only approach requires more code with no benefit for modern clients. |
| Touch gestures | Native touch events + CSS scroll-snap | Hammer.js 2.0.8 | Hammer.js last published to npm 10 years ago. The original repo is in low-maintenance mode. KakaoTalk's use case (swipe tabs, smooth scrolling) is fully covered by CSS scroll-snap + native pointer events. No external dependency needed. |
| Gesture library | None (native) | Interact.js | Interact.js is designed for drag-and-drop/resize scenarios. The production management form has no drag interactions. Unnecessary weight for a CDN-delivered single file. |
| CSS framework | None / custom properties | Tailwind CSS v4 | Tailwind v4 requires a build step or CLI. The project constraint is a single HTML file with no build. Adding Tailwind via CDN Play would produce an oversized runtime. Custom properties give the same token-based consistency with zero overhead. |
| CSS framework | None / custom properties | Bootstrap 5.3 CDN | Bootstrap adds ~30KB of components that duplicate what the existing CSS already does. The KakaoTalk WebView is a performance-sensitive environment — eliminating unused CSS weight is better than introducing a framework. |
| Service worker | Workbox 7 CDN | Raw service worker | Raw SW requires writing cache matching logic manually. Workbox CDN works via `importScripts` with no build tool, and its cache strategies (CacheFirst, NetworkFirst) are battle-tested for exactly this use case. |
| PWA install | Web manifest + service worker | Cordova / Capacitor wrapper | Out of scope per PROJECT.md. Native wrapper defeats the single-HTML constraint. KakaoTalk WebView cannot install PWAs directly anyway — it must open in external browser. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Hammer.js | Last npm release ~10 years ago; actively deprecated in Angular; open issues about scroll breaking in webviews. KakaoTalk's Chromium engine handles pointer events natively. | Native `touchstart`/`pointermove` events + CSS `scroll-snap` |
| `user-scalable=no` in viewport | Violates WCAG 1.4.4 (Resize Text) and is ignored by iOS 10+ and some Android devices anyway. Does not reliably prevent the input-focus zoom — only `font-size: 16px` does. | Set all input `font-size: 16px` instead |
| `-webkit-text-size-adjust: none` | Prevents user accessibility text-scaling. Use `-webkit-text-size-adjust: 100%` to neutralize automatic browser adjustment without disabling user control. | `-webkit-text-size-adjust: 100%` |
| `100vh` as the sole height value | KakaoTalk WebView toolbar eats into the visible area, causing overflow and scroll on what should be a full-height screen. | `100dvh` with `100vh` fallback |
| Tailwind CDN (Play) in production | The JIT CDN runtime observes the DOM and generates CSS at runtime — adds significant CPU work on low-end factory floor Android phones. | Hand-written CSS with custom properties |
| jQuery for touch events | Adds ~30KB; its touch event wrappers have known issues in Chromium WebView; actively being phased out of production in favor of native APIs. | Native `addEventListener`, `fetch`, `querySelectorAll` |
| Workbox v6 CDN | v7 released May 2024 with Node 16+ minimum for the build path. The CDN variant is version-agnostic at the client; prefer the latest stable URL to get security patches. | Workbox 7.0.0 CDN |
## Stack Patterns by Context
- `interactive-widget` meta has no effect — iOS Safari does not support it
- Must use `VisualViewport` JS listener to track keyboard height
- `env(safe-area-inset-bottom)` works reliably on iOS 11.2+ with `viewport-fit=cover`
- Input zoom prevention: `font-size: 16px` on all inputs is the only safe method
- KakaoTalk Android uses Chrome WebView (confirmed UA: `Chrome/137.0.7151.61`)
- `interactive-widget=resizes-content` works, enabling CSS viewport units to resize with keyboard
- `dvh` is fully supported
- `safe-area-inset-bottom` may not work unless the native app has enabled edge-to-edge mode (KakaoTalk modern versions do enable this)
- All mobile-specific CSS is gated behind `@media (pointer: coarse)` or `@media (max-width: 768px)`
- `dvh`, `scroll-snap`, `touch-action` are harmless on desktop but not needed
- Service worker benefits both mobile and desktop (faster repeat loads)
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Workbox 7.0.0 CDN | Chrome 108+ (KakaoTalk Android) | `importScripts` in service worker. No Node.js required for CDN variant. |
| `dvh` CSS unit | Chrome 108+, Firefox 101+, Safari 15.4+ | KakaoTalk Android confirmed on Chrome 108+. KakaoTalk iOS uses Safari engine — check iOS version of target devices. |
| `interactive-widget` meta | Chrome 108+, Firefox 132+ | No Safari/iOS support as of late 2024. Must use VisualViewport JS fallback for iOS. |
| `env(safe-area-inset-*)` | iOS 11.2+ (Safari), Android variable | Requires `viewport-fit=cover`. Android WebView support depends on the native app enabling edge-to-edge. |
| `VisualViewport` API | Chrome 61+, Firefox 91+, Safari 13+ | Universally supported in any KakaoTalk version still in field. Safe to use without feature check, but add one anyway. |
| CSS `scroll-snap` | Chrome 69+, Firefox 68+, Safari 11+ | Full support everywhere relevant. No polyfill needed. |
## KakaoTalk WebView Identity Reference
## Sources
- KakaoTalk Android UA string (2024 verified) — [UserAgents.io](https://useragents.io/uas/mozilla-5-0-linux-android-15-sm-s938n-build-ap3a-240905-015-a2-wv-applewebkit-537-36-khtml-like-gecko-version-4-0-chrome-137-0-7151-61-mobile-safari-537-36-kakaotalk-25-4-3-inapp_dffd98617879617b50a5e467952bd086) — MEDIUM confidence (UA strings change per version)
- KakaoTalk in-app browser issues (file download, clipboard, close URI) — [RYUSEULGI on Medium](https://medium.com/@fb1tmf2rl3/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1-%EC%9D%B8%EC%95%B1-%EB%B8%8C%EB%9D%BC%EC%9A%B0%EC%A0%80-89f6e86d3145) — LOW confidence (single source, no date)
- `dvh`/`svh`/`lvh` browser support — [web.dev viewport-units](https://web.dev/blog/viewport-units) — HIGH confidence (official)
- `interactive-widget` meta tag — [HTMHell Advent 2024](https://www.htmhell.dev/adventcalendar/2024/4/) — HIGH confidence for Chrome, confirmed no Safari support
- iOS input focus zoom prevention — [j-ho.dev](https://j-ho.dev/41/), [velog iOS Safari focus](https://velog.io/@jungsu/iOSSafari-input-%EC%9D%98-focus-%ED%99%95%EB%8C%80-%EB%B0%A9%EC%A7%80%ED%95%98%EA%B8%B0) — HIGH confidence (multiple Korean dev sources corroborate)
- `VisualViewport` API — [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) — HIGH confidence (official)
- Workbox 7.0.0 release — [GitHub GoogleChrome/workbox](https://github.com/GoogleChrome/workbox/releases/tag/v7.0.0) — HIGH confidence
- CSS scroll-snap — [MDN scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) — HIGH confidence
- `env(safe-area-inset-*)` Android limitations — [lightrun.com ionic issue](https://lightrun.com/answers/ionic-team-ionic-framework-safe-area-inset-is-not-respected-for-android-and-only-works-on-ios) — MEDIUM confidence (community report)
- Hammer.js maintenance status — [GitHub issue #1273](https://github.com/hammerjs/hammer.js/issues/1273) — HIGH confidence (maintainer acknowledged)
- PWA installability on iOS — [MDN Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — HIGH confidence
- Touch target sizing (WCAG 2.2) — [smart-interface-design-patterns.com](https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/) — HIGH confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
