# Pitfalls Research

**Domain:** 카카오톡 웹뷰 모바일 최적화 생산관리 시스템 (KakaoTalk in-app webview, single-file HTML, mobile-first refactoring)
**Researched:** 2026-03-25
**Confidence:** HIGH (viewport/keyboard issues), MEDIUM (PWA in webview, IME events), HIGH (touch UX patterns)

---

## Critical Pitfalls

### Pitfall 1: iOS 키보드 팝업 시 position:fixed 레이아웃 붕괴

**What goes wrong:**
iOS 웹뷰에서 input 포커스 시 소프트 키보드가 열리면, `position: fixed` 요소들이 화면 하단에서 키보드 뒤쪽으로 숨어버린다. iOS는 키보드가 열려도 viewport 높이를 줄이지 않고 document를 키보드 높이만큼 위로 밀어 올리기만 하기 때문이다. `window.innerHeight`는 고정인 채로 `visualViewport.height`만 줄어들어, 두 값 사이에 불일치가 발생한다.

Android는 키보드 높이를 제외한 영역으로 viewport를 재계산해주므로 이 문제가 없다. 카카오톡 웹뷰(iOS WKWebView 기반)에서 특히 두드러지게 나타난다.

**Why it happens:**
`100vh`, `position: fixed; bottom: 0` 같은 데스크톱 스타일을 모바일에 그대로 적용하고 테스트를 PC 브라우저에서만 했을 때 발생한다. 데스크톱 Chrome에서는 키보드가 없으므로 이 버그가 보이지 않는다.

**How to avoid:**
`visualViewport` API를 사용해 키보드 감지 및 레이아웃 동적 조정:

```javascript
window.visualViewport.addEventListener('resize', () => {
  const isKeyboardOpen = window.innerHeight > window.visualViewport.height;
  if (isKeyboardOpen) {
    document.querySelector('.layout-wrapper').style.height =
      `${window.visualViewport.height}px`;
  } else {
    document.querySelector('.layout-wrapper').style.height = '';
  }
});
```

`100vh` 대신 `100dvh` (dynamic viewport height) 사용. `position: fixed; bottom: 0` 패턴 대신 flex 레이아웃으로 대체.

**Warning signs:**
- 입력 폼 터치 후 하단 버튼이 안 보임
- 키보드를 닫아도 레이아웃이 원래대로 돌아오지 않음
- `window.innerHeight !== visualViewport.height` 조건이 true인 시점에 UI가 어긋남

**Phase to address:** 모바일 퍼스트 레이아웃 재설계 단계 (Phase 1 또는 초기 단계)

---

### Pitfall 2: 카카오톡 웹뷰에서 PWA Service Worker 미동작

**What goes wrong:**
카카오톡 인앱 브라우저에서 Service Worker가 정상 등록되지 않거나 등록 후 오동작한다. Kakao Devtalk에 실제 사례가 보고됨 — Service Worker 등록 이후 페이지가 새로고침만 반복되거나 간편 로그인이 동작하지 않는 문제. Service Worker를 제거하면 정상 동작이 확인된 사례 다수.

카카오톡 내장 브라우저는 국제 웹 표준을 완전히 따르지 않으며, 쿠키 영역이 외부 브라우저와 분리되어 있어 캐시/스토리지 동작이 예측 불가능하다.

**Why it happens:**
PWA 오프라인 캐시의 이점을 얻으려고 Service Worker를 도입하지만, 카카오톡 웹뷰의 제한된 브라우저 엔진이 Service Worker의 install/activate 라이프사이클을 올바르게 처리하지 못하거나 캐시된 리소스를 우선 서빙해버려 최신 업데이트가 반영되지 않는 문제가 생긴다.

**How to avoid:**
- PWA 구현 전 카카오톡 웹뷰에서 Service Worker 등록 가능 여부를 반드시 먼저 테스트
- Service Worker는 "실제 카카오톡 웹뷰"에서 단독 테스트 후 나머지 기능에 통합
- 오프라인 지원보다는 빠른 초기 로딩 최적화 (이미지 없애기, CDN 리소스 최소화)에 집중
- PWA 홈 화면 추가 기능(manifest)은 Service Worker 없이 `<link rel="manifest">` 단독으로도 동작하므로 분리 구현
- 만약 Service Worker를 사용한다면 `navigator.userAgent`로 카카오톡 웹뷰를 감지해 등록을 건너뛰는 fallback 구현

**Warning signs:**
- Service Worker 등록 후 앱이 무한 새로고침
- Supabase 호출이 캐시에 막혀 데이터가 갱신되지 않음
- 카카오톡 웹뷰에서만 로딩이 멈추는 현상

**Phase to address:** PWA 도입 단계 (Service Worker 도입 전 webview 환경 검증을 필수 선행 조건으로 설정)

---

### Pitfall 3: 한글 IME 조합 중 이벤트 중복 실행

**What goes wrong:**
모바일 웹뷰에서 한글 입력 시 `keydown` 이벤트의 `keyCode`가 229로 반환되며, 조합 중인 글자가 확정되기 전에 이벤트 핸들러가 실행되어 중복 입력이나 잘못된 값이 저장된다. 예: "가"를 입력 중에 `ㄱ`, `가` 두 번 이벤트가 발생.

**Why it happens:**
`keydown`/`keyup` 이벤트는 IME 조합 중에도 발생하며, Android Chrome 계열 환경에서 keyCode가 항상 229를 반환한다. 개발자가 `input` 이벤트 대신 `keydown` 이벤트로 실시간 값 변경을 처리할 때 발생.

**How to avoid:**
- 실시간 입력 감지는 `keydown`/`keyup` 대신 `input` 이벤트 사용
- Enter 키 감지가 필요할 때는 `isComposing` 속성 확인:

```javascript
input.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return; // 조합 중 무시
  if (e.key === 'Enter') handleSubmit();
});
```

- 엔터로 폼 제출 시 `compositionend` 이후에 처리되도록 보장

**Warning signs:**
- 한글 마지막 글자가 두 번 저장됨
- Enter 입력이 글자 확정 전에 실행되어 미완성 단어가 저장
- 작업 항목 추가 시 빈 값이 함께 추가되는 현상

**Phase to address:** 입력 폼 UX 개선 단계

---

### Pitfall 4: 100vh 사용으로 인한 가용 영역 왜곡

**What goes wrong:**
카카오톡 웹뷰는 상단 주소창 + 하단 네비게이션 바로 인해 실제 가용 영역이 `100vh`보다 훨씬 좁다. `100vh`로 설정한 컨테이너가 화면을 넘쳐 스크롤이 발생하거나, 탭 UI가 네비게이션 바에 가려진다.

**Why it happens:**
`100vh`는 브라우저 UI가 숨겨진 상태의 viewport 높이를 기준으로 계산되지만, 카카오톡 웹뷰에서는 UI가 항상 표시된 채로 고정되어 실제 높이가 더 작다. 이 차이를 고려하지 않고 전체 화면 레이아웃을 잡으면 발생한다.

**How to avoid:**
- `100vh` 대신 `100dvh` (동적 뷰포트 단위) 사용 — 현재 표시 중인 UI를 제외한 실제 높이 반영
- CSS custom property로 실제 높이 주입:

```javascript
document.documentElement.style.setProperty(
  '--app-height',
  `${window.visualViewport.height}px`
);
```

```css
.full-screen { height: var(--app-height, 100dvh); }
```

- 전체 화면 고정 레이아웃보다 컨텐츠 중심 자연스러운 스크롤 레이아웃 권장

**Warning signs:**
- 탭 바가 카카오톡 하단 네비게이션에 가려짐
- 페이지 최하단에 빈 공간이 생기거나 스크롤 불필요하게 발생
- 첫 진입 시 화면이 약간 잘린 것처럼 보임

**Phase to address:** 모바일 퍼스트 레이아웃 재설계 단계 (가장 먼저 처리)

---

### Pitfall 5: 터치 이벤트와 스크롤 충돌로 클릭 미반응

**What goes wrong:**
테이블 내부나 스크롤 가능한 영역에서 터치해도 클릭 이벤트가 발생하지 않거나 늦게 반응한다. 스크롤 의도로 판단된 touchmove 후 touchend가 실행되면 click은 발생하지 않는다. 또한 모바일 웹의 기본 click 이벤트는 300ms 지연(탭 더블클릭 방지 로직)이 있다.

**Why it happens:**
이벤트 처리 우선순위: touchstart → touchmove → touchend → click. touchmove가 발생하면 브라우저는 이를 스크롤 제스처로 인식해 click을 취소한다. 현장 작업자가 화면을 살짝 움직이며 탭하면 스크롤로 잘못 인식된다.

**How to avoid:**
- `touch-action: manipulation` CSS 속성으로 300ms 지연 제거:

```css
button, .clickable { touch-action: manipulation; }
```

- 테이블/목록의 행 선택은 click 대신 `touchend` + 일정 시간 내 이동 거리 체크로 구현
- 터치 타겟 최소 44x44px 보장으로 미스터치 감소
- `-webkit-overflow-scrolling: touch` 대신 `overscroll-behavior: contain`으로 스크롤 성능 개선

**Warning signs:**
- 버튼 누름 반응이 느리거나 가끔 무반응
- 테이블 행 터치 시 선택이 안 되고 스크롤만 됨
- 같은 코드가 PC에서는 잘 되고 카카오톡 웹뷰에서만 미동작

**Phase to address:** 터치 UX 개선 단계

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `100vh` 그대로 유지 | 레이아웃 코드 단순 | 카카오톡 웹뷰에서 UI 가려짐, 지속적인 레이아웃 버그 | never (모바일 타겟 시) |
| `keydown`으로 한글 입력 처리 | 빠른 구현 | IME 조합 중 이벤트 중복, 데이터 오염 | never |
| position fixed 하단 버튼 | 구현 빠름 | iOS 키보드 팝업 시 버튼 사라짐 | never (iOS 대상 시) |
| Service Worker 전체 캐시 | 오프라인 동작 | 카카오톡 웹뷰에서 페이지 무한 새로고침, 데이터 갱신 안 됨 | never (카카오톡 webview 메인 타겟 시) |
| PC 브라우저에서만 테스트 | 개발 편의 | 카카오톡 웹뷰 실제 버그 발견 지연, 대량 수정 필요 | never |
| 테이블 수평 스크롤 가로 overflow | 데스크톱 UI 유지 | 모바일에서 터치 스크롤 방향 충돌, 가로 스크롤 불편 | MVP 단계에서만 |
| Supabase CDN 초기화 스크립트를 `<head>`에 동기 로드 | 빠른 구현 | 초기 렌더 차단, 카카오톡 웹뷰에서 흰 화면 시간 증가 | never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase JS v2 (CDN) | `supabase.from()` 호출을 DOM ready 이전에 실행 | DOMContentLoaded 이후 또는 async 패턴으로 초기화 분리 |
| Supabase CDN | CDN 스크립트를 `<head>` 동기 로드 → 렌더 차단 | `<script defer>` 또는 `<body>` 마지막에 배치 |
| Supabase Realtime | 불필요한 Realtime 구독을 매 탭 전환마다 생성 | 구독은 한 번만 생성하고 탭 전환 시 unsubscribe |
| Pretendard CDN | 폰트 로드 전 텍스트가 FOUT 발생 | `font-display: swap` 설정, 또는 시스템 폰트 fallback 먼저 적용 |
| 카카오톡 웹뷰 UserAgent | UA 문자열에 의존한 기능 분기 (fragile) | 기능 감지(feature detection)로 대체, UA는 로깅 목적으로만 사용 |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 800줄 단일 HTML 전체를 파싱 후 렌더 시작 | 첫 화면 표시까지 흰 화면 2초 이상 | Critical path CSS를 `<style>` 최상단에 인라인, 비핵심 JS는 `defer` | 저사양 안드로이드 기기, 3G 환경 |
| 모든 탭의 DOM을 초기에 렌더 | DOM 노드 수 증가, 초기 페인트 지연 | 활성 탭만 렌더, 비활성 탭은 `display:none` → lazy render | 탭 4개 모두 복잡한 테이블/차트 포함 시 |
| Supabase 쿼리를 탭 전환마다 재실행 | 네트워크 요청 폭증, 느린 탭 전환 | 탭별 데이터 캐싱 (메모리 변수), TTL 기반 재검색 | 현장에서 탭을 자주 오가는 작업자 패턴 |
| `visualViewport` 이벤트에서 매 resize마다 DOM 조작 | 스크롤/키보드 애니메이션 끊김 | debounce (16ms) 또는 requestAnimationFrame으로 쓰로틀 | 키보드 애니메이션 중 |
| CSS 미디어 쿼리 없이 고정 픽셀 레이아웃 | 소형 화면(세로 670px 이하)에서 UI 잘림 | min-height, flex-wrap, 상대 단위(rem/%) 사용 | 구형 안드로이드 기기 |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| 4자리 PIN을 클라이언트 JS에 하드코딩 | 소스 보기로 즉시 노출, 관리자 기능 무단 접근 | PIN은 Supabase row에 bcrypt hash로 저장, 서버사이드 비교 |
| 카카오톡 웹뷰 UserAgent 감지 없이 관리자 기능 노출 | 외부 브라우저에서 관리자 화면 접근 가능 | PIN 인증 자체가 방어선이므로 UA 기반 숨김은 보조 수단으로만 사용 |
| Supabase anon key를 HTML 소스에 그대로 노출 | anon key는 RLS(Row Level Security)로 제어되므로 직접적 위험 낮음 | RLS 정책 반드시 설정, anon key로 읽기/쓰기 범위 제한 |
| 작업자 이름을 직접 입력받아 DB 저장 시 검증 없음 | XSS, 빈 값 저장, 중복 항목 오염 | 입력 길이 제한 + 공백 trim + 특수문자 필터링 후 저장 |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 버튼 터치 타겟이 32px 이하 | 현장 작업자(장갑 착용 가능)의 미스터치 급증, 생산성 저하 | 최소 44x44px 터치 영역 보장, 버튼 간 여백 8px 이상 |
| 작업 항목 삭제 버튼이 행 내부에 작은 X 아이콘 | 스크롤 중 실수로 삭제, 복구 불가 | 확인 다이얼로그 또는 swipe-to-delete 패턴 사용 |
| 입력 폼 포커스 시 화면이 확대됨 | 레이아웃 이탈, 사용자 혼란 | input에 `font-size: 16px` 이상 설정 (iOS 자동 줌 방지) |
| 가로 스크롤 테이블에서 세로 스크롤 의도가 가로로 잡힘 | 데이터 확인 불편, 터치 정확도 저하 | `touch-action: pan-y` 또는 고정 열 + 가로 스크롤 영역을 명확히 분리 |
| 데이터 로딩 중 스피너 없이 빈 화면 | 작업자가 앱이 멈춘 것으로 오인, 반복 탭 | 로딩 스켈레톤 또는 "불러오는 중..." 인디케이터 필수 |
| 성공/실패 토스트가 화면 상단에 표시 | 키보드가 열린 상태에서 안 보임 | 토스트를 화면 중앙 또는 키보드 위에 표시, 또는 vibrate API 활용 |

---

## "Looks Done But Isn't" Checklist

- [ ] **키보드 팝업 테스트:** PC Chrome 개발자 도구 에뮬레이션이 아닌 실제 iOS 카카오톡 웹뷰에서 input 포커스 시 레이아웃 확인
- [ ] **Android/iOS 동시 테스트:** 키보드 동작이 플랫폼마다 다름 — 두 플랫폼 모두 테스트해야 완료
- [ ] **한글 입력 테스트:** 영문/숫자뿐 아니라 한글 조합 입력 시 이벤트 중복/누락 확인
- [ ] **오프라인/느린 네트워크 테스트:** Supabase 연결 지연 시 UI 상태(로딩 표시, 오류 메시지) 확인
- [ ] **PWA manifest 테스트:** 홈 화면 추가 기능이 카카오톡 외부(Safari, Chrome)에서 동작하는지 확인
- [ ] **PIN 인증 보안:** 4자리 PIN이 소스코드에 하드코딩되지 않았는지 확인
- [ ] **100대 소요일 산출 로직:** 데이터 2-3일치만 있을 때 비현실적 수치가 나오지 않는지 엣지케이스 확인
- [ ] **터치 타겟 크기:** Chrome DevTools의 Mobile > Touch 모드에서 작은 버튼 확인, 실제 기기로 재확인
- [ ] **화면 회전 처리:** 가로 모드 전환 시 레이아웃이 망가지지 않는지 확인 (또는 세로 고정 명시적 설정)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| iOS 키보드 레이아웃 붕괴 (position fixed) | MEDIUM | `visualViewport` API로 키보드 감지 후 높이 동적 조정 코드 추가. flex 레이아웃으로 전환. 1-2일 작업. |
| Service Worker가 카카오톡 웹뷰 캐시 오염 | HIGH | Service Worker 즉시 unregister, 모든 캐시 삭제, UA 기반 등록 우회 로직 추가. 사용자에게 앱 재실행 안내. |
| 한글 IME 이벤트 중복으로 데이터 오염 | MEDIUM | `isComposing` 체크 추가, DB에서 중복/이상 데이터 정리. 사전 예방이 훨씬 저렴. |
| 100vh 레이아웃 전체 수정 필요 | LOW | `100vh` → `100dvh` 전역 교체, CSS custom property `--app-height` 도입. 1일 이내. |
| 터치 이벤트 미반응으로 입력 불가 | MEDIUM | `touch-action: manipulation` 추가, 이벤트 핸들러를 `click` → `input`/`touchend`로 교체. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| iOS 키보드 레이아웃 붕괴 | Phase 1: 모바일 레이아웃 기반 작업 | 실제 iOS 카카오톡 웹뷰에서 input 포커스 테스트 |
| 100vh 가용 영역 왜곡 | Phase 1: 모바일 레이아웃 기반 작업 | 다양한 기기(소형 안드로이드 포함) 스크린샷 비교 |
| PWA Service Worker 미동작 | Phase 3: PWA 도입 단계 (카카오톡 웹뷰 검증 먼저) | Service Worker 등록 후 카카오톡 웹뷰에서 새로고침 루프 없는지 확인 |
| 한글 IME 조합 이벤트 중복 | Phase 2: 입력 폼/터치 UX 개선 단계 | 작업 항목 추가 시 한글 조합 입력 후 Enter 테스트 |
| 터치 이벤트 스크롤 충돌 | Phase 2: 터치 UX 개선 단계 | 테이블 내 행 터치 선택 + 스크롤 동시 동작 테스트 |
| PIN 하드코딩 보안 | Phase 0: 기존 코드 감사 또는 Phase 1 초기 | 소스코드에 PIN 문자열 grep 검색으로 확인 |
| Supabase 초기화 렌더 차단 | Phase 1: 성능 최적화 기반 작업 | Chrome DevTools Performance 탭에서 FCP(First Contentful Paint) 측정 |

---

## Sources

- [채팅 서비스 Webview 이슈 — visualViewport iOS/Android keyboard](https://jooonho.dev/web/2023-01-09-webview-issue/) — MEDIUM confidence
- [웹뷰 Fixed, 가상 키보드, VisualViewport 사용](https://velog.io/@th_velog/%EC%9B%B9%EB%B7%B0-Fixed-%EA%B0%80%EC%83%81-%ED%82%A4%EB%B3%B4%EB%93%9C-VisualViewport-%EC%82%AC%EC%9A%A9) — HIGH confidence (Korean developer, verified pattern)
- [iOS15 대응기 (feat. 크로스 브라우징) — Channel.io](https://channel.io/ko/blog/articles/12bccbc3) — HIGH confidence (production service)
- [Fix mobile viewport 100vh bug — dynamic viewport units](https://medium.com/@alekswebnet/fix-mobile-100vh-bug-in-one-line-of-css-dynamic-viewport-units-in-action-102231e2ed56) — HIGH confidence
- [카카오톡 내장 브라우저 문제 — Medium](https://medium.com/@sunyi233/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1%EC%9D%98-%EB%82%B4%EC%9E%A5-%EB%B8%8C%EB%9D%BC%EC%9A%B0%EC%A0%80-%EB%AC%B8%EC%A0%9C-e6d6a424853) — MEDIUM confidence
- [React + PWA 적용 시 간편 로그인 안 되는 문제 — Kakao Devtalk](https://devtalk.kakao.com/t/react-pwa/125765) — HIGH confidence (official Kakao developer forum)
- [IME keyCode 229 Issue — Android Chrome](https://minjung-jeon.github.io/IME-keyCode-229-issue/) — HIGH confidence
- [한글 이벤트 중복 입력 — IME composition](https://velog.io/@wjd489898/%ED%95%9C%EA%B8%80-%EC%9D%B4%EB%B2%A4%ED%8A%B8-%EC%A4%91%EB%B3%B5-%EC%9E%85%EB%A0%A5-IME-composition) — HIGH confidence
- [Accessible Tap Target Sizes — Smashing Magazine](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) — HIGH confidence
- [overscroll-behavior — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior) — HIGH confidence (official spec)
- [모바일 애플리케이션 웹뷰 터치 이벤트 팁](https://falsy.me/%EB%AA%A8%EB%B0%94%EC%9D%BC-%EC%95%A0%ED%94%8C%EB%A6%AC%EC%BC%80%EC%9D%B4%EC%85%98-%EC%9B%B9%EB%B7%B0%EC%97%90-%EC%82%AC%EC%9A%A9%EB%90%98%EB%8A%94-%EC%9B%B9-%EC%BD%98%ED%85%90%EC%B8%A0%EC%9D%98/) — MEDIUM confidence

---

*Pitfalls research for: 카카오톡 웹뷰 모바일 최적화 생산관리 시스템*
*Researched: 2026-03-25*
