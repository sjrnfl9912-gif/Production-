# Feature Research

**Domain:** Mobile-first production management web app (KakaoTalk webview)
**Researched:** 2026-03-25
**Confidence:** MEDIUM — KakaoTalk webview specifics verified through developer community sources; production management UX from industry analysis; PWA limitations in webview context LOW confidence due to no official Kakao documentation

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a production management app in KakaoTalk webview must have. Missing these = workers can't use it or give up.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Viewport stability during keyboard input | Input focus on any field must not shift or distort the screen layout | MEDIUM | KakaoTalk webview resizes visual viewport on keyboard open. Fix: JS-based `window.innerHeight` custom property (`--vh`) updated on `resize` event. `100dvh` is the modern CSS alternative but verify KakaoTalk's WebView version support. |
| Minimum 44px touch targets for all interactive controls | Workers use phones one-handed, often with gloves or under pressure. Tapping wrong target causes frustration | LOW | WCAG 2.5.8 minimum is 24px but Apple/Google recommend 44–48px. Buttons, selects, row delete icons must all meet this. Current codebase likely has small targets. |
| Smooth native-feeling scroll in tables and lists | Webview tables feel "sticky" without `-webkit-overflow-scrolling: touch` equivalent; inertia scroll missing | LOW | Add `overflow-y: auto` with `-webkit-overflow-scrolling: touch` on scrollable containers. Note: deprecated in Safari 13+ but still needed for older KakaoTalk embedded WebViews. |
| Form inputs that open correct keyboard type | Number fields must trigger numeric keyboard. Text fields must not trigger numeric keyboard. | LOW | Use `inputmode="numeric"` and `type="number"` or `type="tel"` appropriately. Critical for speed of entry. |
| Fixed bottom action area that stays above keyboard | Submit buttons must remain visible when keyboard is open | MEDIUM | Common failure in webviews: fixed elements slide under keyboard. Requires viewport height JS fix plus `env(keyboard-inset-height)` where supported. |
| Tab navigation that works reliably in webview | The 4-tab structure (실적입력 / 내 실적 수정 / 대시보드 / 관리자설정) must switch without full page reload or scroll reset | LOW | Already exists; but ensure tab switch does not trigger unexpected scroll or layout shift in webview. |
| Loading states on async Supabase operations | Workers submit data and need confirmation. Blank screen or no feedback causes duplicate submission | LOW | Spinner or disabled-state button during Supabase calls. |
| Error feedback for failed submissions | Supabase calls can fail on poor factory floor connectivity | LOW | Toast or inline message. Must not use `alert()` — KakaoTalk webview may handle native alerts inconsistently. |
| Prevent double-submit on slow networks | Factory workers tap "submit" multiple times if response is slow | LOW | Disable submit button immediately on first tap, re-enable on response. |
| Readable font size without zoom | Workers must not need to pinch-zoom to read content | LOW | 16px minimum body text. Smaller sizes cause iOS Safari/KakaoTalk to auto-zoom on input focus. If font-size on inputs is below 16px, iOS auto-zooms — this is a known KakaoTalk webview distortion cause. |

---

### Differentiators (Competitive Advantage)

Features that improve the experience beyond baseline. Align with core value: "빠르고 불편함 없이 실적 입력."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 100대 소요일 산출 로직 개선 | Current simple `100 ÷ daily average` produces unrealistic numbers when multi-item days, sub-tasks, or sparse data skew the average. Accurate forecasting has direct operational value. | HIGH | Requires: (1) filter to main-task only days, (2) weighted average or rolling window for sparse data, (3) multi-item day normalization. Cannot be validated without domain input on what "accurate" looks like. |
| Haptic/visual touch feedback on tap | Workers in noisy, physical environments need clear confirmation that a tap registered | LOW | CSS `active` state with scale transform (`transform: scale(0.96)`) and `transition`. No JS required. Prevents rage-tapping. |
| Swipe-to-delete for work item rows | Faster than tapping a small delete icon. Standard mobile pattern for list item removal | MEDIUM | Implement with `touchstart`/`touchmove`/`touchend` listeners. Single-finger swipe left reveals delete. Alternative: long-press to reveal delete. Either is more touch-native than a small icon button. |
| Persistent form state across accidental navigation | Worker accidentally closes webview; re-opening loses partially entered data | MEDIUM | `localStorage` draft save on every field change. Clear on successful submit. Works in KakaoTalk webview. |
| Skeleton loading screens instead of blank | Dashboard feels faster because content structure appears before data loads | LOW | CSS-only skeleton shimmer via `@keyframes` animation. No library needed in a single HTML file. |
| Optimistic UI for row adds/removes | Adding a work item row appears instantly without waiting for network round-trip | MEDIUM | Add row to DOM immediately, then sync to Supabase. Rollback on failure. Requires careful state management in vanilla JS. |
| PWA-style offline indicator | Worker in basement or dead zone — show "오프라인" banner so they know to wait before submitting | LOW | `navigator.onLine` + `window.addEventListener('offline'/'online')`. Visual banner only — no offline data queue needed at this scale. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full offline / offline-first data sync | "What if network drops while submitting?" | IndexedDB sync queue in a single HTML file with Supabase real-time is complex to implement correctly. Conflict resolution on reconnect is a rabbit hole. Factory floor connectivity is generally adequate — offline sync is over-engineering for this use case. | Offline indicator banner (see differentiators) + disable submit button when offline is sufficient. |
| PWA install prompt / "홈 화면 추가" from within KakaoTalk webview | "App-like experience" | KakaoTalk's in-app webview does NOT fire `beforeinstallprompt`. PWA install only works in a real browser context (Chrome/Safari). Implementing a fake install banner in webview is misleading. PWA manifest + service worker still beneficial for when users open via real browser, but cannot be triggered from inside KakaoTalk. | Add PWA manifest for real-browser users. Do NOT implement custom install UI for the webview path. |
| Push notifications | "Alert workers when task assignments change" | Requires notification permission, which KakaoTalk webview does not reliably expose. KakaoTalk itself is the notification channel for this user base — use KakaoTalk messages to trigger workers to open the link. | Use KakaoTalk's own messaging as the notification mechanism. |
| Real-time live dashboard updates (WebSocket polling) | "Dashboard should refresh automatically" | Supabase real-time subscription adds persistent connection overhead. Dashboard is used by one admin on PC — manual refresh or a simple 30-second polling interval is sufficient without the complexity of WebSocket lifecycle management in a single HTML file. | Manual refresh button or `setInterval` fetch every 60s with a "last updated" timestamp. |
| Rich text / attachment in work log entries | "Add photos of defects" | Binary/file upload does not work reliably in KakaoTalk in-app webview (documented limitation). Adds S3/storage complexity to the backend. Outside scope of daily production logging. | Keep entries as text + numeric quantities only. |
| Per-user login / account system | "Each worker should have their own account" | Full auth system requires email/OAuth, session management, and a user table. Current PIN-based system with per-worker name selection is the right level of friction for a factory floor tool. | Keep name-selection + PIN-admin pattern. Add worker ID to entries if traceability is needed. |
| Complex filtering and reporting UI in mobile view | "Workers want to see their own stats" | Filtering UI on mobile is a known UX complexity trap. Workers need one thing: submit today's work. Stats are an admin/manager concern best left to the PC dashboard. | "내 실적 수정" tab (7-day view) is sufficient worker-facing history. Keep the dashboard PC-optimized. |

---

## Feature Dependencies

```
[Viewport height fix (--vh JS)]
    └──required by──> [Fixed bottom action area above keyboard]
    └──required by──> [Stable form layout on input focus]

[Touch target size >= 44px]
    └──enhances──> [Swipe-to-delete rows]
    └──required by──> [All form controls usable one-handed]

[Input font-size >= 16px]
    └──required by──> [No iOS auto-zoom on input focus]
                          └──required by──> [Viewport stability during keyboard input]

[Disable submit on tap]
    └──required by──> [Prevent double-submit]

[localStorage draft state]
    └──enhances──> [Persistent form state across accidental navigation]
    └──conflicts with──> [Optimistic UI] (state model must be consistent — implement one at a time)

[100대 소요일 산출 로직 개선]
    └──requires──> [Domain clarification: definition of "main task" vs "sub-task"]
    └──independent of──> All UX features (logic-only change)
```

### Dependency Notes

- **Viewport height fix requires font-size >= 16px:** iOS/KakaoTalk will auto-zoom when tapping an input with font-size < 16px, causing a viewport shift that the JS height fix cannot fully compensate. Both must be fixed together.
- **localStorage draft conflicts with optimistic UI:** Both manage "pending" form state. If implementing both, define a single source of truth (e.g., localStorage IS the state) before building. Do not build both independently.
- **100대 소요일 산출 is independent:** This is a pure logic change with no UX coupling. Can be done in any phase without blocking UI work.

---

## MVP Definition

This is a subsequent milestone on an existing working system. "MVP" here means: minimum changes to make the system fully usable in KakaoTalk webview without layout breakage.

### Launch With (Milestone MVP)

These are blocking issues — the system is currently broken in the primary use environment without them.

- [ ] **Viewport height JS fix** — without this, keyboard open breaks layout for the primary user flow (실적 입력)
- [ ] **Input font-size >= 16px** — without this, iOS auto-zoom on every input focus causes layout distortion
- [ ] **Touch targets >= 44px for all controls** — unusable one-handed otherwise
- [ ] **Fixed action area stays above keyboard** — submit button hidden under keyboard = users cannot submit
- [ ] **No `alert()` calls** — replace with in-page feedback; webview alert behavior is inconsistent
- [ ] **Smooth table/list scroll** — core UX expectation in any mobile list

### Add After Core Stability (v1.x)

- [ ] **Touch feedback on tap** — quick win, improves perceived responsiveness
- [ ] **Prevent double-submit** — important but not blocking if loading states are added first
- [ ] **Offline indicator banner** — helpful in factory context, low effort
- [ ] **Skeleton loading screens** — polish, non-blocking
- [ ] **100대 소요일 산출 로직 개선** — high value but needs domain input before implementation

### Future Consideration (v2+)

- [ ] **Swipe-to-delete rows** — nice UX improvement but adds JS complexity; defer until core is stable
- [ ] **Persistent draft in localStorage** — useful but edge case for this workflow
- [ ] **Optimistic UI** — complexity not justified until performance is confirmed to be an issue

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Viewport height JS fix | HIGH | LOW | P1 |
| Input font-size >= 16px | HIGH | LOW | P1 |
| Touch targets >= 44px | HIGH | LOW | P1 |
| Fixed area above keyboard | HIGH | MEDIUM | P1 |
| Remove alert() calls | HIGH | LOW | P1 |
| Smooth scroll on tables/lists | HIGH | LOW | P1 |
| Touch feedback (active states) | MEDIUM | LOW | P2 |
| Prevent double-submit | HIGH | LOW | P2 |
| Offline indicator banner | MEDIUM | LOW | P2 |
| Skeleton loading | MEDIUM | LOW | P2 |
| 100대 소요일 산출 로직 개선 | HIGH | HIGH | P2 |
| Swipe-to-delete | MEDIUM | MEDIUM | P3 |
| Persistent localStorage draft | LOW | MEDIUM | P3 |
| Optimistic UI | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have — current system is broken in KakaoTalk webview without these
- P2: Should have — significant UX improvement, justified effort
- P3: Nice to have — defer until P1+P2 complete and validated

---

## KakaoTalk Webview Constraint Summary

This section documents confirmed behavioral differences in KakaoTalk's in-app browser that directly affect feature decisions.

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Visual viewport resizes on keyboard open | Fixed-position elements shift; `100vh` becomes wrong | JS `--vh` custom property updated on `resize` event |
| Input font-size < 16px triggers auto-zoom | Layout jumps on every input tap | Set all input font-size to >= 16px |
| File download via Blob URL does not work | N/A for this app (no downloads needed) | N/A |
| `beforeinstallprompt` does not fire | PWA install cannot be triggered in-app | PWA manifest still useful for real browser access; no in-app install UI |
| Clipboard API restricted | N/A for this app | N/A |
| `alert()` / `confirm()` behavior inconsistent | Native dialogs may not render correctly | Replace all with custom in-page UI (toast, modal) |
| `-webkit-overflow-scrolling: touch` deprecated but relevant | Older KakaoTalk versions use older WebView; inertia scroll may be missing | Include for legacy compatibility; harmless on modern versions |

---

## Sources

- KakaoTalk in-app browser issues: [카카오톡 인앱 브라우저 이슈 정리 (Medium)](https://medium.com/@fb1tmf2rl3/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1-%EC%9D%B8%EC%95%B1-%EB%B8%8C%EB%9D%BC%EC%9A%B0%EC%A0%80-89f6e86d3145)
- Viewport height mobile fix: [모바일 100vh 이슈 해결 (velog)](https://velog.io/@day_1226/CSS-%EC%98%A4%EB%A5%98-%ED%95%B4%EA%B2%B0-%EB%AA%A8%EB%B0%94%EC%9D%BC-%EB%B8%8C%EB%9D%BC%EC%9A%B0%EC%A0%80%EC%97%90%EC%84%9C-100vh-%EC%A0%81%EC%9A%A9-%EC%95%88%EB%90%A8)
- `interactive-widget` viewport meta: [HTMHell Advent 2024](https://www.htmhell.dev/adventcalendar/2024/4/)
- VirtualKeyboard API: [MDN VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- Touch target sizes: [WCAG 2.5.8 Target Size (Minimum)](https://www.allaccessible.org/blog/wcag-258-target-size-minimum-implementation-guide), [Smashing Magazine accessible tap targets](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- Mobile production monitoring features: [Shoplogix Mobile Production Monitoring](https://shoplogix.com/mobile-production-monitoring-apps/)
- iOS 100vh / dvh solutions: [iOS viewport height problem (velog)](https://velog.io/@freejak5520/iOS-%EB%B8%8C%EB%9D%BC%EC%9A%B0%EC%A0%80%EC%97%90%EC%84%9C%EC%9D%98-%EB%B7%B0%ED%8F%AC%ED%8A%B8-%EB%86%92%EC%9D%B4-%EB%AC%B8%EC%A0%9C%EC%99%80-%ED%95%B4%EA%B2%B0-%EB%B0%A9%EB%B2%95)
- PWA install in webview: [PWA vs WebView (AppBox)](https://www.appboxapp.com/blog/pwa-webview-differences), [A2HS 카카오엔터테인먼트 테크블로그](https://tech.kakaoent.com/front-end/2023/230202-a2hs/)
- WebView keyboard viewport (Cordova iOS): [GitHub ionic-framework issue #19065](https://github.com/ionic-team/ionic-framework/issues/19065)

---

*Feature research for: 카카오톡 웹뷰 모바일 최적화 생산관리 시스템*
*Researched: 2026-03-25*
