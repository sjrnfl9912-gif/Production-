# Phase 5: PWA - Research

**Researched:** 2026-03-26
**Domain:** Progressive Web App (manifest.json, Service Worker, Workbox CDN, KakaoTalk UA guard, offline UI)
**Confidence:** HIGH (core stack verified via official CDN and MDN docs; KakaoTalk-specific loop risk is MEDIUM — no official Kakao documentation, derived from UA detection pattern)

---

## Summary

Phase 5 adds a PWA layer on top of the fully refactored single `index.html`. The work splits into three independent deliverables: (1) a `manifest.json` file that enables "Add to Home Screen" on Chrome and Safari, (2) a `sw.js` service worker file using Workbox 7.0.0 CDN that caches static assets, and (3) in-page JS that guards against registering the service worker inside KakaoTalk's WebView and that handles offline/online network state.

The KakaoTalk UA guard is the highest-risk item. The infinite-reload mechanism is not definitively documented by Kakao, but the UA string `KAKAOTALK` in `navigator.userAgent` is the confirmed detection signal. Skipping `navigator.serviceWorker.register()` when that string is present is the safe, low-cost prevention. The Supabase Realtime auto-reconnect on `window` `online` event requires explicit re-subscription because Supabase's own reconnection is unreliable after long offline gaps (confirmed by multiple open issues in supabase/realtime-js as of 2024).

**Primary recommendation:** Create `manifest.json` and `sw.js` as separate files alongside `index.html`. Register the service worker in `index.html` only when `navigator.userAgent` does NOT contain `KAKAOTALK`. Use Workbox 7.0.0 CDN via `importScripts` in `sw.js` with CacheFirst for static assets and NetworkFirst for Supabase API calls. Implement offline UI using the `window` `online`/`offline` events with an overlay banner and a data-reload call on reconnect.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | `manifest.json` 추가 — 홈 화면 추가 시 앱처럼 표시 | manifest.json 필수 필드 + icon 192/512px 확인 (MDN, web.dev) |
| PWA-02 | Service Worker 정적 자산 캐싱 — 재방문 시 빠른 로딩 | Workbox 7.0.0 CDN CacheFirst 패턴 확인 (storage.googleapis.com) |
| PWA-03 | 카카오톡 웹뷰 감지 → SW 등록 스킵 | UA 문자열 `KAKAOTALK` 감지 + 조건부 register() — GitHub juunini/detect-kakaotalk-in-app-browser |
| PWA-04 | 오프라인 기본 UI + 네트워크 복구 시 자동 재연결 | window online/offline 이벤트 + Supabase 재구독 패턴 확인 |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Workbox (CDN) | 7.0.0 | Service Worker 캐싱 전략 | `importScripts` 1줄로 CacheFirst/NetworkFirst 제공 — 빌드 불필요. CLAUDE.md 결정 사항. |
| Web App Manifest | W3C spec (native) | 홈 화면 추가 + 앱 메타데이터 | Chrome 192/512px 아이콘 + standalone display 필수. Safari iOS 16.4+ 지원. |
| VisualViewport / `navigator.onLine` | Native (no library) | 오프라인 감지 + 재연결 | window `online`/`offline` 이벤트가 표준. 추가 라이브러리 불필요. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `workbox.core` | 7.0.0 (CDN 내 포함) | skipWaiting + clientsClaim | 새 SW 즉시 활성화 — index.html이 단일 파일이므로 버전 충돌 없음 |
| `workbox.strategies.CacheFirst` | 7.0.0 CDN | index.html + 폰트 캐싱 | 재방문 즉시 로딩, 백그라운드 갱신 불필요한 정적 자산 |
| `workbox.strategies.NetworkFirst` | 7.0.0 CDN | Supabase API 요청 | 항상 최신 데이터 우선, 오프라인 시 캐시 폴백 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Workbox 7 CDN | Raw `fetch` + `cache` API | 수동 캐시 전략 관리 필요. 만료 정책, 용량 제한 등 edge case 처리 비용 높음. |
| UA 문자열 감지 | `window.Kakao` 객체 존재 감지 | Kakao SDK가 없으면 탐지 불가. UA 문자열이 더 신뢰성 높음. |
| `window online` 이벤트 | Supabase 자체 reconnect | supabase/realtime-js 이슈 #463, #274 — 오프라인 후 자동 재연결 신뢰 불가. 수동 재구독 필요. |

**Installation:** 별도 설치 없음. Workbox는 `sw.js` 내 `importScripts`로 CDN에서 로드. manifest.json과 sw.js는 `index.html` 옆에 새 파일로 생성.

**Version verification:**
Workbox 7.0.0 CDN URL `https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js` 접근 확인 — 파일 내부에 `"workbox:sw:7.0.0"` 문자열 포함. 최신 workbox-sw npm 버전은 7.4.0이지만, CLAUDE.md가 7.0.0을 명시하므로 7.0.0 사용.

---

## Architecture Patterns

### Recommended File Structure

```
/                        # 프로젝트 루트 (index.html이 있는 위치)
├── index.html           # 기존 단일 파일 (manifest 링크 + SW 등록 JS 추가)
├── manifest.json        # 신규 — PWA 메타데이터
├── sw.js                # 신규 — Workbox CDN 서비스 워커
└── icons/               # 신규 — PWA 아이콘
    ├── icon-192.png     # Chrome 설치 필수
    └── icon-512.png     # Chrome 설치 필수
```

### Pattern 1: Workbox CacheFirst for Static Assets (CDN mode)

**What:** sw.js 파일에서 `importScripts`로 Workbox를 로드하고, index.html + 폰트를 CacheFirst로 캐싱.
**When to use:** 재방문 시 네트워크 없이도 앱 셸이 즉시 로딩되어야 할 때.

```javascript
// sw.js
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-sw
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.core.skipWaiting();
workbox.core.clientsClaim();

// 정적 자산 (index.html 포함) — CacheFirst
workbox.routing.registerRoute(
  ({request}) => request.destination === 'document',
  new workbox.strategies.CacheFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7일
      }),
    ],
  })
);

// 폰트 — CacheFirst (CDN 폰트 포함)
workbox.routing.registerRoute(
  ({request}) => request.destination === 'font',
  new workbox.strategies.CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
      }),
    ],
  })
);

// Supabase API — NetworkFirst (항상 최신 데이터)
workbox.routing.registerRoute(
  ({url}) => url.hostname.includes('supabase.co'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'supabase-cache',
    networkTimeoutSeconds: 5,
  })
);
```

### Pattern 2: KakaoTalk UA Guard (index.html 내 인라인 JS)

**What:** `navigator.userAgent`에 `KAKAOTALK` 문자열이 있으면 SW 등록을 완전히 스킵.
**When to use:** 카카오톡 웹뷰에서 SW 등록 → 무한 새로고침 방지.

```javascript
// index.html — SW 등록 블록 (</body> 직전)
// Source: https://github.com/juunini/detect-kakaotalk-in-app-browser
//         https://talksafety.kakao.com/en/measure/detection (UA 패턴 확인)
(function() {
  const isKakaoTalk = /KAKAOTALK/i.test(navigator.userAgent);
  if ('serviceWorker' in navigator && !isKakaoTalk) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(reg) {
          console.log('[SW] Registered:', reg.scope);
        })
        .catch(function(err) {
          console.warn('[SW] Registration failed:', err);
        });
    });
  }
})();
```

### Pattern 3: Offline UI + Network Reconnect (index.html 내 인라인 JS)

**What:** `window` `online`/`offline` 이벤트로 오프라인 배너 표시. `online` 이벤트 시 데이터 재로딩 + 오프라인 배너 숨김.
**When to use:** 네트워크 없는 공장 바닥 환경에서 앱이 흰 화면 대신 유용한 UI 표시.

```javascript
// index.html — 오프라인 처리 (AppState 초기화 이후 배치)
function initOfflineHandling() {
  const banner = document.getElementById('offline-banner');

  function setOffline() {
    if (banner) banner.style.display = 'block';
    // 데이터 입력 버튼 비활성화 (선택적)
  }

  function setOnline() {
    if (banner) banner.style.display = 'none';
    // Supabase 데이터 재로딩
    loadAll().catch(console.error);
  }

  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);

  // 초기 상태 확인
  if (!navigator.onLine) setOffline();
}
```

```html
<!-- index.html — 오프라인 배너 (body 상단) -->
<div id="offline-banner" style="display:none; background:#f44336; color:#fff;
  padding:8px 16px; text-align:center; font-size:14px; position:sticky; top:0; z-index:1000;">
  오프라인 상태입니다. 네트워크 연결을 확인해 주세요.
</div>
```

### Pattern 4: manifest.json (최소 요건)

```json
{
  "name": "생산 관리 시스템",
  "short_name": "생산관리",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976D2",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icons/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}
```

```html
<!-- index.html <head> 내 -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1976D2">
```

### Anti-Patterns to Avoid

- **SW를 조건 없이 무조건 등록:** KakaoTalk 웹뷰에서 SW 등록이 무한 새로고침 트리거가 될 수 있음. UA 가드 필수.
- **`skipWaiting()` 없이 배포:** 기존 SW가 활성화된 상태에서 새 SW가 대기(waiting)에 머물면 캐시 갱신이 안 됨. `skipWaiting()` + `clientsClaim()` 쌍으로 즉시 활성화.
- **Supabase API 요청을 CacheFirst로 캐싱:** 생산 데이터가 오래된 값을 반환. Supabase URL은 반드시 NetworkFirst.
- **opaque response를 CacheFirst로 캐싱:** CORS 없는 CDN 리소스는 opaque response → 캐시 용량 과다 점유 가능. CacheFirst 대신 StaleWhileRevalidate 사용하거나, `crossorigin="anonymous"` 헤더 필요.
- **`window.online` 이벤트만으로 Supabase 재연결 신뢰:** supabase/realtime-js 는 오프라인 후 자동 재구독이 불안정(이슈 #463). `online` 이벤트 시 `loadAll()` 수동 호출 필수.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 캐시 만료 정책 | 직접 cache.put/delete + 타임스탬프 | `workbox.expiration.ExpirationPlugin` | LRU, maxAge, maxEntries 엣지케이스가 복잡. Workbox가 검증된 구현 제공. |
| 캐시 용량 초과 처리 | 직접 quota 감지 로직 | `purgeOnQuotaError: true` in ExpirationPlugin | 브라우저 storage quota 정책이 플랫폼마다 다름. Workbox 자동 처리. |
| 오프라인 HTML 폴백 | fetch event에서 직접 response 생성 | `workbox.strategies.CacheFirst` on document | Workbox가 cache miss + network fail 조합을 정확히 처리. |
| SW 버전 관리 | 직접 CACHE_VERSION 상수 + 수동 삭제 | `workbox.core.skipWaiting()` + `clientsClaim()` | Workbox가 activate 단계에서 구버전 캐시 자동 정리. |

**Key insight:** Workbox CDN 모드에서 `importScripts` 1줄이면 CacheFirst/NetworkFirst/ExpirationPlugin 전부 사용 가능. 빌드 도구 없이 동일한 신뢰성 확보.

---

## Common Pitfalls

### Pitfall 1: KakaoTalk 웹뷰 무한 새로고침

**What goes wrong:** `navigator.serviceWorker.register('/sw.js')`를 조건 없이 호출하면 카카오톡 웹뷰에서 페이지가 무한 새로고침 루프에 진입할 수 있음.
**Why it happens:** KakaoTalk Android WebView는 Chromium 기반이지만 SW lifecycle 이벤트(activate, install) 처리 시 일부 WebView 구현체에서 페이지를 다시 로드하는 버그가 보고됨. `clients.claim()`이 활성화되면 이미 열린 페이지가 SW 제어 하에 다시 로드될 수 있음.
**How to avoid:** `navigator.userAgent`에 `KAKAOTALK` 포함 시 SW 등록 완전 스킵. `/i` 플래그로 대소문자 무관 매칭.
**Warning signs:** 실기기에서 앱 로드 직후 화면 깜빡임 또는 URL 바 주소 갱신 반복.

### Pitfall 2: Workbox CDN의 opaque response 캐싱

**What goes wrong:** `https://cdn.jsdelivr.net/npm/supabase-js@2/...` 같은 CDN 스크립트를 CacheFirst로 등록하면 opaque response가 캐시에 들어가 Storage Quota를 과다 점유.
**Why it happens:** CORS 미지원 응답은 opaque response로 처리되며, 브라우저가 안전을 위해 실제 크기보다 훨씬 큰 저장 공간을 예약.
**How to avoid:** CDN 스크립트 캐싱은 `request.destination === 'script'` 조건을 피하거나 `StaleWhileRevalidate` + `cacheableResponsePlugin` (`{statuses:[0,200]}`와 함께)으로만 처리. Supabase CDN과 Pretendard 폰트 CDN은 CORS 헤더를 제공하므로 실제 opaque 위험은 낮지만 확인 권장.
**Warning signs:** `console.warn: Response served by service worker has unsupported MIME type`.

### Pitfall 3: Service Worker scope 불일치

**What goes wrong:** `sw.js`가 하위 디렉토리에 있으면 scope가 해당 경로로 제한되어 root URL(`/`) 캐싱 불가.
**Why it happens:** SW의 기본 scope는 SW 파일이 위치한 디렉토리. `/static/sw.js`는 `/static/` 이하만 제어 가능.
**How to avoid:** `sw.js`를 `index.html`과 동일한 루트에 배치. `navigator.serviceWorker.register('/sw.js')` — 루트 슬래시 명시.
**Warning signs:** `SecurityError: Failed to register a ServiceWorker: The path of the provided scope ('/') is not under the max scope allowed`.

### Pitfall 4: Supabase 오프라인 후 재연결 미작동

**What goes wrong:** `window` `online` 이벤트를 받아도 Supabase client가 이전 요청을 재시도하지 않음.
**Why it happens:** supabase/realtime-js는 WebSocket reconnect 로직이 있지만 오프라인 기간 중 access_token 만료 시 재인증 없이 재연결 시도 → 데이터 갱신 없음. (GitHub issues #463, #274 — confirmed 2024).
**How to avoid:** `online` 이벤트 핸들러에서 `loadAll()` (데이터 전체 재로딩 함수) 직접 호출. Realtime 채널이 있다면 채널 재구독 코드 추가.
**Warning signs:** 오프라인 후 온라인 복구 시 데이터가 오프라인 이전 값으로 그대로 표시됨.

### Pitfall 5: manifest.json theme_color / background_color 미설정

**What goes wrong:** Chrome의 Add to Home Screen 시 스플래시 화면이 흰 배경에 텍스트만 표시됨.
**Why it happens:** `theme_color`와 `background_color`가 없으면 기본값(흰색)으로 폴백.
**How to avoid:** `theme_color`와 `background_color`를 앱 기본 색상으로 명시. 기존 CSS 변수 `--color-primary` 값과 일치시킬 것.
**Warning signs:** Lighthouse PWA 심사에서 `manifest does not have a theme_color` 경고.

---

## Code Examples

### sw.js 전체 (Workbox 7.0.0 CDN)

```javascript
// sw.js
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-sw
//         https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js (확인됨)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// 새 SW 즉시 활성화
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// index.html (navigation request) — CacheFirst
workbox.routing.registerRoute(
  ({request}) => request.mode === 'navigate',
  new workbox.strategies.CacheFirst({
    cacheName: 'pages-v1',
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// 폰트 (Pretendard CDN) — CacheFirst 30일
workbox.routing.registerRoute(
  ({request}) => request.destination === 'font',
  new workbox.strategies.CacheFirst({
    cacheName: 'fonts-v1',
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Supabase API — NetworkFirst 5초 타임아웃
workbox.routing.registerRoute(
  ({url}) => url.hostname.includes('supabase.co'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'supabase-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxAgeSeconds: 60 * 60 }),
    ],
  })
);
```

### manifest.json

```json
{
  "name": "생산 관리 시스템",
  "short_name": "생산관리",
  "description": "공장 일일 생산 실적 입력 및 대시보드",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1976D2",
  "lang": "ko",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    }
  ]
}
```

### index.html 추가 항목 요약

```html
<!-- <head> 내 추가 -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1976D2">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="생산관리">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

```javascript
// <body> 말미 추가 — SW 등록 + 오프라인 핸들러
(function initPWA() {
  // KakaoTalk UA 가드
  const isKakaoTalk = /KAKAOTALK/i.test(navigator.userAgent);
  if ('serviceWorker' in navigator && !isKakaoTalk) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(console.warn);
    });
  }

  // 오프라인 배너
  const banner = document.getElementById('offline-banner');
  function handleOffline() { if (banner) banner.style.display = 'block'; }
  function handleOnline() {
    if (banner) banner.style.display = 'none';
    if (typeof loadAll === 'function') loadAll().catch(console.error);
  }
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  if (!navigator.onLine) handleOffline();
})();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `fetch` + `caches` API in SW | Workbox CDN CacheFirst/NetworkFirst | Workbox v4+ (2018-) | 수동 캐시 전략 코드 불필요 |
| `manifest.json` 링크만 추가 | 192+512px 아이콘 + `purpose: maskable` | Chrome 79+ (2019-) | Adaptive icon (원형 아이콘) 렌더링 |
| Supabase 자체 reconnect 신뢰 | `window online` 이벤트 → 수동 loadAll() | 2024 (realtime-js 이슈 확인) | 오프라인 복구 후 데이터 최신화 보장 |
| UA 스니핑 없이 SW 무조건 등록 | KakaoTalk UA 감지 후 스킵 | 프로젝트 요구사항 | 웹뷰 무한 새로고침 방지 |

**Deprecated/outdated:**
- `workbox-build` CLI 방식: 빌드 도구 필요 — 이 프로젝트에서 사용 불가 (단일 HTML 구조)
- `Cache-Control` 헤더만으로 PWA 캐싱: SW 없이는 오프라인 폴백 불가
- `workbox.precaching.precacheAndRoute([])`: 빌드 시 파일 목록 주입 방식 — CDN 모드에서 부적합

---

## Open Questions

1. **KakaoTalk UA 무한 새로고침 실기기 검증**
   - What we know: UA `KAKAOTALK` 감지로 SW 등록 스킵이 표준 방어책. Kakao 공식 문서에 SW 관련 경고 없음.
   - What's unclear: 어떤 조건에서 정확히 무한 새로고침이 발생하는지 (SW 등록 자체인지, `clients.claim()` 인지) 공식 미확인.
   - Recommendation: 계획에 "실기기 검증 체크포인트" 포함. SW 등록 스킵으로 구현 후 KakaoTalk Android/iOS 기기에서 수동 확인.

2. **icon 파일 생성 방법**
   - What we know: 192x192, 512x512 PNG 필요. `purpose: maskable` 권장 (Android adaptive icon).
   - What's unclear: 현재 프로젝트에 brand icon/logo 파일이 있는지.
   - Recommendation: 계획에 "임시 아이콘 생성 또는 기존 로고 리사이즈" 태스크 포함. Maskable icon은 중앙 72% 영역에 로고 배치 필요.

3. **Supabase CDN 스크립트 opaque response 여부**
   - What we know: `https://cdn.jsdelivr.net` 는 CORS 헤더 제공. Pretendard 폰트 CDN도 CORS 지원.
   - What's unclear: 배포 환경 도메인에서 실제 CORS 헤더 응답 여부.
   - Recommendation: SW 등록 후 DevTools > Application > Cache Storage 에서 opaque response 없음 확인.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Workbox 7.0.0 CDN | sw.js | ✓ (CDN) | 7.0.0 | 7.4.0 사용 가능 (하위 호환) |
| `navigator.serviceWorker` | PWA-02, PWA-03 | ✓ Chrome 40+, Safari 11.1+ | — | KakaoTalk WebView: 스킵으로 처리 |
| `window.addEventListener('online')` | PWA-04 | ✓ 모든 현대 브라우저 | — | — |
| PNG 아이콘 파일 (192/512px) | PWA-01 | ✗ 미생성 | — | 빌드 중 생성 필요 |
| HTTPS 서빙 | SW 등록 필수 | ✓ (배포 환경 가정) | — | localhost도 동작 |

**Missing dependencies with no fallback:**
- `icons/icon-192.png`, `icons/icon-512.png` — 계획에서 생성 태스크 필요.

**Missing dependencies with fallback:**
- Workbox 7.0.0 CDN: 7.4.0으로 대체 가능 (하위 호환, CLAUDE.md는 7.0.0 명시).

---

## Validation Architecture

nyquist_validation이 활성화되어 있으나 이 Phase는 브라우저 런타임 기능(SW 등록, manifest 설치 프롬프트, 오프라인 이벤트)으로 구성되어 자동화 단위 테스트로 검증하기 어려운 항목이 대부분이다. 가능한 범위에서 검증 방법을 정의한다.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 없음 (브라우저 런타임 검증 — Lighthouse PWA audit + 수동 체크리스트) |
| Config file | 없음 |
| Quick run command | Lighthouse CLI: `npx lighthouse http://localhost:PORT --only-categories=pwa --output=json` |
| Full suite command | Chrome DevTools > Application > Manifest + Service Workers + Cache Storage 수동 검사 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWA-01 | manifest.json 파싱 + 설치 가능 | Lighthouse PWA audit | `npx lighthouse ... --only-categories=pwa` | ❌ Wave 0 |
| PWA-02 | 재방문 시 캐시 히트 (index.html) | manual-only (DevTools) | 수동: Network tab > Throttle offline > reload | N/A |
| PWA-03 | KakaoTalk UA → SW 미등록 | unit (inline JS 테스트) | `node -e "const ua='...KAKAOTALK...'; console.assert(/KAKAOTALK/i.test(ua))"` | ❌ Wave 0 |
| PWA-04 | offline 배너 표시 + online 후 loadAll 호출 | manual-only (DevTools) | 수동: Network tab > Offline 토글 | N/A |

### Sampling Rate

- **Per task commit:** `node -e "..."` UA 감지 로직 유닛 테스트 (PWA-03)
- **Per wave merge:** Lighthouse PWA audit 실행 (PWA-01)
- **Phase gate:** Lighthouse PWA score + 수동 기기 검증 (`/gsd:verify-work` 전)

### Wave 0 Gaps

- [ ] Lighthouse CLI: `npm install -g lighthouse` 또는 `npx lighthouse` — PWA-01 검증용
- [ ] `icons/icon-192.png`, `icons/icon-512.png` — PWA-01 실패 방지용 (manifest 필수 자산)
- [ ] manifest.json 파일 — Wave 0에서 함께 생성

---

## Sources

### Primary (HIGH confidence)

- `https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js` — 파일 직접 확인, `"workbox:sw:7.0.0"` 포함
- MDN [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — manifest 필수 필드 (name/short_name, icons 192+512, start_url, display)
- Chrome Developers [workbox-sw module](https://developer.chrome.com/docs/workbox/modules/workbox-sw) — importScripts CDN 패턴
- web.dev [Add a web app manifest](https://web.dev/articles/add-manifest) — manifest.json 전체 예시
- MDN [Window: offline event](https://developer.mozilla.org/en-US/docs/Web/API/Window/offline_event) — 오프라인 이벤트 API

### Secondary (MEDIUM confidence)

- Kakao TalkSafety [detection docs](https://talksafety.kakao.com/en/measure/detection) — UA `KAKAOTALK` 포함 여부 감지 방법 (카카오 공식 문서지만 보안 감지 목적 문서)
- GitHub [juunini/detect-kakaotalk-in-app-browser](https://github.com/juunini/detect-kakaotalk-in-app-browser) — UA 기반 KakaoTalk WebView 감지 패키지 (커뮤니티)
- supabase/realtime-js issues [#463](https://github.com/supabase/realtime-js/issues/463), [#274](https://github.com/supabase/realtime-js/issues/274) — 오프라인 후 Realtime 자동 재연결 불신뢰 (2024 오픈 이슈)

### Tertiary (LOW confidence)

- Workbox Service Worker Infinite Loop — Framework7 Forum 보고: KakaoTalk 특정 무한 새로고침 메커니즘은 공식 미확인. 실기기 검증 필요.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Workbox 7.0.0 CDN URL 직접 확인. manifest 필드 MDN 공식 확인.
- Architecture: HIGH — importScripts + UA guard 패턴은 표준 기법. 코드 패턴은 공식 Workbox 예시 기반.
- Pitfalls: MEDIUM — KakaoTalk 무한 새로고침은 커뮤니티 보고 수준. Supabase reconnect 이슈는 GitHub 오픈 이슈로 확인됨.

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (Workbox 버전 변경 가능성 낮음; KakaoTalk UA 패턴은 버전별로 변할 수 있음)
