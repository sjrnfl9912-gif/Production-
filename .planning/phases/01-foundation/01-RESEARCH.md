# Phase 1: Foundation - Research

**Researched:** 2026-03-25
**Domain:** CSS mobile-first 재구성, viewport 안정화 (dvh/VisualViewport), JS 상태 마이그레이션, 카카오톡 웹뷰 호환 모달/토스트
**Confidence:** HIGH (CSS/viewport/VisualViewport), HIGH (DOM→AppState 마이그레이션), HIGH (confirm 대체)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CSS 재구성 방식**
- **D-01:** CSS를 mobile-first로 전환한다. 기본 스타일이 모바일이고 `@media (min-width: 769px)` 으로 PC 확장
- **D-02:** 현재 하나의 `@media(max-width:768px)` 블록을 해체하고, 모바일 스타일을 기본으로 올린 뒤 데스크탑 오버라이드만 미디어쿼리에 배치
- **D-03:** CSS 변수(`:root`) 체계는 유지하되, 모바일/데스크탑 간 달라지는 값은 미디어쿼리 내에서 재정의
- **D-04:** JS 렌더러 함수 내 인라인 스타일(`style="..."`)을 CSS 클래스로 교체. 인라인 스타일은 미디어쿼리로 오버라이드 불가하므로 반드시 제거

**JS 상태관리 패턴**
- **D-05:** `data-rows` DOM 속성 기반 → 전역 `AppState` 객체로 전환. `AppState.tasks = [{type, name, qty, note}]` 형태
- **D-06:** 상태 변경 시 직접 DOM 조작 대신, 상태 변경 → 렌더 함수 호출 패턴 사용 (간단한 리액티브 패턴)
- **D-07:** 프레임워크 없이 바닐라 JS로 구현. 클래스나 모듈 불필요, 단순 객체 + 함수 조합

**커스텀 모달/토스트**
- **D-08:** 기존 `.modal-bg` / `.modal` CSS를 재사용하여 confirm 대체 모달 구현
- **D-09:** 삭제 확인은 인라인 확인 버튼 패턴 사용 (모달 대신 해당 행에서 "정말 삭제?" 표시)
- **D-10:** alert() 대체는 기존 `.toast` 컴포넌트 활용 (이미 CSS 존재)
- **D-11:** 모달/토스트 모두 Promise 기반 API로 래핑 (`await confirm('삭제?')` 형태)

**한글 IME 처리**
- **D-12:** 텍스트 입력 이벤트에서 `event.isComposing` 체크 추가. keydown 229 코드 무시

**파일 내부 정리**
- **D-13:** 단일 HTML 유지. 내부를 주석 구분자로 섹션 분리: `/* ═══ SECTION: CSS Variables ═══ */`, `// ═══ SECTION: State Management ═══ //` 등
- **D-14:** 코드 순서: CSS Variables → CSS Base (mobile) → CSS Components → CSS Desktop Override → HTML → JS Utilities → JS State → JS Renderers → JS Event Handlers → JS Init

**뷰포트/키보드 대응**
- **D-15:** `<meta name="viewport">` 에 `interactive-widget=resizes-content` 추가 (Android Chrome)
- **D-16:** iOS용 `visualViewport.resize` 리스너에서 포커스된 input에 `scrollIntoView({block:'center', behavior:'smooth'})` 추가
- **D-17:** `100vh` → `100dvh` 전환. dvh 미지원 브라우저 폴백으로 `--vh` CSS 변수 + JS 계산 병행
- **D-18:** 모든 input/select에 `font-size: 16px` 이상 보장 (이미 모바일 미디어쿼리에 `16px !important` 있음 → 기본 스타일로 올림)

### Claude's Discretion
- CSS 변수 네이밍 컨벤션 (기존 `--pri`, `--grn` 등 유지 vs 정리) — 기존 유지하되 새로 추가하는 것만 풀네임
- JS 함수명/변수명 리팩토링 범위 — 기존 명칭 최대한 유지, 새 함수만 camelCase 일관
- 스켈레톤/로딩 UI의 구체적 디자인 — Phase 3에서 처리

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | 모든 레이아웃이 `100dvh` 기반으로 카카오톡 웹뷰 주소창/하단 네비를 고려한 높이를 사용한다 | D-17: dvh + --vh 폴백 패턴. `body { min-height: 100dvh }` + `--vh` JS 설정 |
| VIEW-02 | iOS 키보드 오픈 시 VisualViewport API로 레이아웃이 안정적으로 유지된다 | D-16: visualViewport resize → --vh 업데이트 + scrollIntoView 추가 |
| VIEW-03 | 입력 필드 포커스 시 해당 필드가 키보드 위로 자동 스크롤된다 (scrollIntoView) | D-16: 기존 initKeyboardHandler에 scrollIntoView 1줄 추가 |
| VIEW-04 | 모든 input/select 요소가 `font-size: 16px` 이상으로 iOS 자동 확대가 발생하지 않는다 | D-18: `!important` 제거, 기본 스타일로 16px 승격 |
| VIEW-05 | CSS가 mobile-first 미디어쿼리로 재구성된다 (기본 모바일 → `min-width`로 PC 확장) | D-01~D-04: 단일 @media(max-width:768px) 블록 해체 + 역전 |
| CODE-01 | CSS가 섹션별로 정리되고 인라인 스타일이 CSS 클래스로 교체된다 | D-04, D-13, D-14: 인라인 스타일 → 클래스 교체, 섹션 주석 삽입 |
| CODE-02 | JS 상태가 DOM `data-rows` 대신 JS 배열/객체로 관리된다 | D-05~D-07: AppState 객체 + getRows/setRows 교체 |
| CODE-03 | `window.alert()`/`window.confirm()`이 커스텀 모달로 교체된다 (카톡 웹뷰 호환) | D-08~D-11: Promise confirm + toast alert |
| CODE-04 | 한글 IME `isComposing` 가드가 텍스트 입력에 적용된다 | D-12: keydown 이벤트에 isComposing 체크 (현재 전무) |
| CODE-05 | 단일 HTML 파일 구조가 유지되면서 코드가 논리적 섹션으로 정리된다 | D-13~D-14: 섹션 주석 구분자 도입 |
</phase_requirements>

---

## Summary

Phase 1은 기능을 추가하거나 UI를 변경하지 않고, **카카오톡 웹뷰에서 레이아웃이 깨지지 않는 구조적 기반**을 만드는 것이 목표다. 크게 세 가지 작업이 맞물려 있다: (1) CSS를 mobile-first로 뒤집어 인라인 스타일을 클래스로 올리는 것, (2) `100vh`를 `100dvh`로 교체하고 VisualViewport JS 폴백을 추가하는 것, (3) DOM 속성 기반 상태(`data-rows`)를 JS 객체로 마이그레이션하고 `window.confirm/alert`를 Promise 기반 커스텀 UI로 교체하는 것.

코드 직접 감사 결과: `index.html`은 1,174줄 단일 파일이며, CSS는 14줄~241줄에 집중되어 있다. `@media(max-width:768px)` 블록이 152줄~241줄(약 90줄)로 단일 덩어리로 존재한다. JS 상태는 `getRows()`/`setRows()`가 `taskTableBody.dataset.rows`에 `JSON.stringify`로 저장한다 (560~564줄). `window.confirm()` 호출이 4곳(674, 1016, 1034, 1095줄)에 있고, `isComposing` 가드는 전혀 없다. `visualViewport` 리스너는 이미 있으나 `scrollIntoView` 호출이 빠져 있다.

**Primary recommendation:** CSS 재편과 viewport 수정을 먼저 처리하고(VIEW-*), 상태 마이그레이션(CODE-02)을 그 다음, confirm/IME 교체를 마지막에 적용한다. CSS 변경이 인라인 스타일 제거를 수반하므로, CODE-01과 VIEW-05를 동시에 처리해야 한다.

---

## Standard Stack

### Core (No New Libraries — Everything is Native)

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| CSS `100dvh` | Native CSS | 전체 높이 컨테이너 | 카카오톡 웹뷰 툴바 영역을 제외한 실제 높이 반영. Chrome 108+, Safari 15.4+ |
| `VisualViewport` API | Native JS | iOS 키보드 높이 추적 | Safari는 interactive-widget 미지원 — JS 폴백 필수. Chrome 61+, Safari 13+ |
| `interactive-widget=resizes-content` | Viewport meta | Android 키보드 레이아웃 리사이즈 | Chrome 108+/KakaoTalk Android에서 keyboard open 시 dvh 재계산 |
| `font-size: 16px` on inputs | Native CSS | iOS 자동 확대 방지 | 16px 미만 시 KakaoTalk iOS 웹뷰 자동 zoom 발생 — 유일한 안전한 방법 |
| `--vh` CSS 변수 | Native CSS | dvh 폴백 | `calc(var(--vh) * 100)` — JS로 `visualViewport.height * 0.01`을 주입 |
| Promise 기반 confirm | Vanilla JS | window.confirm 대체 | KakaoTalk iOS 웹뷰에서 window.confirm 차단 확인됨 |
| `event.isComposing` | Native JS | 한글 IME 가드 | Android Chrome keydown keyCode 229 문제 방지 |

### No External Dependencies Required

이 Phase는 외부 라이브러리 추가 없음. 모든 변경은 기존 native CSS/JS + 기존 `.toast` / `.modal-bg` 재사용.

---

## Architecture Patterns

### Target CSS Section Order (D-14 기준)

```
<style>
/* ═══ SECTION: CSS Variables ═══ */
:root { ... }

/* ═══ SECTION: Reset & Base ═══ */
*, body { ... }

/* ═══ SECTION: Layout ═══ */
.header, .main, .page { ... }

/* ═══ SECTION: Components ═══ */
.card, .btn, .badge, .toast, .modal-bg, .modal { ... }

/* ═══ SECTION: Forms ═══ */
input, select, label, .form-grid { ... }
/* 16px base (not !important) — iOS 자동 확대 방지 기본값 */

/* ═══ SECTION: Tables ═══ */
.task-table, .edit-table, .dash-table { ... }

/* ═══ SECTION: Dashboard ═══ */
.kpi-grid, .scroll-box, .dash-grid { ... }

/* ═══ SECTION: PIN ═══ */
.pin-digit, .lock-overlay { ... }

/* ═══ SECTION: Animations ═══ */
@keyframes { ... }

/* ═══ SECTION: Desktop Override ═══ */
@media (min-width: 769px) {
  /* 데스크탑에서만 다른 스타일만 배치 */
}
</style>
```

**핵심 역전 원칙:** 현재 `.tab-nav`가 데스크탑 inline flex → 모바일 fixed bottom으로 오버라이드됨. 역전 후: `.tab-nav` 기본값이 fixed bottom (모바일), `@media (min-width: 769px)`에서 static inline으로 오버라이드.

### Pattern 1: dvh + --vh 폴백 (VIEW-01, VIEW-02)

**What:** 세 줄의 CSS 스택으로 모든 환경 커버.

```css
/* Source: web.dev/blog/viewport-units, MDN VisualViewport */
body {
  min-height: 100vh;          /* 구형 브라우저 기준선 */
  min-height: 100dvh;         /* Chrome 108+, Safari 15.4+ — 카카오톡 Android/iOS 모두 해당 */
  /* JS가 --vh를 설정하면 아래 calc()가 우선 (더 구체적 selector나 !important 아님 — 단순 cascade 순서) */
}

/* JS가 --vh를 주입한 경우에만 적용 (폴백) */
.full-height {
  height: calc(var(--vh, 1vh) * 100);
}
```

```javascript
// Source: MDN VisualViewport API
// === SECTION: Viewport Handler ===
function syncViewportHeight() {
  const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncViewportHeight);
  window.visualViewport.addEventListener('scroll', syncViewportHeight);
}
syncViewportHeight(); // 초기 실행
```

**When to use:** `100vh`가 사용된 모든 곳. 현재 코드에서 `body { min-height: 100vh }` (17줄) 하나만 존재 — 교체 범위 좁음.

### Pattern 2: scrollIntoView on keyboard open (VIEW-03)

**What:** 기존 `initKeyboardHandler()` (1140~1170줄)에 단 3줄 추가.

```javascript
// Source: ARCHITECTURE.md Pattern 2 참고
window.visualViewport.addEventListener('resize', () => {
  if (!isMobile()) return;
  const isKeyboard = window.visualViewport.height < baseH * 0.75;
  tabNav.style.display = isKeyboard ? 'none' : '';

  // --- 추가할 3줄 ---
  if (isKeyboard) {
    const focused = document.activeElement;
    if (focused && ['INPUT', 'SELECT', 'TEXTAREA'].includes(focused.tagName)) {
      setTimeout(() => focused.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
    }
  }
  // --- 끝 ---

  if (!isKeyboard) baseH = window.visualViewport.height;
});
```

**When to use:** 키보드가 열릴 때(`isKeyboard === true`) 포커스된 필드가 있을 경우에만. `setTimeout 100ms`는 iOS 키보드 애니메이션이 완료된 후 스크롤하기 위한 안전 마진.

### Pattern 3: AppState 마이그레이션 (CODE-02)

**What:** `data-rows` DOM 속성 → JS 모듈 스코프 배열. 기존 API(`getRows`, `setRows`)를 내부 구현만 교체.

```javascript
// === SECTION: State Management ===
const AppState = {
  tasks: [],   // { id, type, taskName, quantity, note, relatedMain }
};

// 기존 getRows() 시그니처 유지 — 호출 측 코드 변경 없음
function getRows() {
  return AppState.tasks;
}

// 기존 setRows() 시그니처 유지
function setRows(r) {
  AppState.tasks = r;
  renderRows();
}
```

**Migration safety:** `getRows()`와 `setRows()`는 기존 시그니처를 그대로 유지한다. 내부 구현만 `dataset.rows JSON.parse/stringify` → `AppState.tasks` 직접 참조로 교체. `addRow()`, `removeRow()`, `updateRow()`, `changeType()` 등 호출 측 코드는 건드리지 않아도 된다.

**AppState 구조 (D-05 기준):**
```javascript
AppState.tasks = [
  { id: 1, type: '메인작업', taskName: '', quantity: '', note: '', relatedMain: '' }
]
```

### Pattern 4: Promise-based confirm (CODE-03)

**What:** `window.confirm()` 4곳을 `await customConfirm(message)` 로 교체. 기존 `.modal-bg` / `.modal` CSS 재사용.

```javascript
// === SECTION: UI Utilities ===
function customConfirm(message) {
  return new Promise((resolve) => {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
      <div class="modal-bg" id="confirmModal">
        <div class="modal" style="max-width:320px">
          <div class="modal-body" style="text-align:center;padding:28px 24px">
            <p style="font-size:15px;font-weight:600;margin-bottom:20px">${message}</p>
            <div style="display:flex;gap:8px;justify-content:center">
              <button class="btn btn-outline" id="confirmNo">취소</button>
              <button class="btn btn-danger" id="confirmYes">삭제</button>
            </div>
          </div>
        </div>
      </div>`;
    document.getElementById('confirmYes').onclick = () => { container.innerHTML = ''; resolve(true); };
    document.getElementById('confirmNo').onclick  = () => { container.innerHTML = ''; resolve(false); };
  });
}
```

**호출 측 변경 (4곳):**
```javascript
// 변경 전 (674줄 예시):
if (!confirm('정말 삭제하시겠습니까?')) return;

// 변경 후:
if (!await customConfirm('정말 삭제하시겠습니까?')) return;
// 주의: 해당 함수를 async로 변환 필요
```

**Note:** D-09에서 인라인 확인 버튼 패턴 언급됨. 모달 대신 행에서 "정말 삭제?" 버튼을 토글하는 방식도 유효. 둘 다 `customConfirm()` Promise API로 래핑 가능 — 구현 세부 사항은 플래너 재량.

### Pattern 5: 인라인 스타일 → CSS 클래스 교체 (CODE-01)

**현재 인라인 스타일 목록 (코드 감사 결과):**

| 줄 | 인라인 스타일 | 교체할 클래스 |
|----|---------------|---------------|
| 269 | `display:flex;justify-content:space-between;align-items:center;margin-bottom:12px` | `.section-toolbar` |
| 270 | `font-size:14px;font-weight:700;color:var(--text-sec)` | `.section-label` |
| 273 | `margin-bottom:20px;box-shadow:none;border-color:var(--border-light)` | `.card-inner` |
| 275 | `width:110px` | CSS `.task-table th:nth-child(1)` 또는 col width |
| 288 | `font-size:12px;font-weight:400;color:var(--text-muted)` | `.subtitle-note` |
| 291 | `margin-bottom:16px` | `.field-group` |
| 291 | `max-width:240px` | `.select-md` |
| 304 | `display:flex;gap:8px;align-items:center;flex-wrap:wrap` | `.header-actions` |
| 304 | `max-width:160px` | `.date-input-sm` |
| 308 | `overflow-x:auto` | `.overflow-x` |
| 315 | `font-size:14px;font-weight:700;min-width:180px;text-align:center` | `.week-label-text` |
| 316 | `overflow-x:auto` | `.overflow-x` (공통) |
| 323 | `overflow-x:auto` | `.overflow-x` (공통) |
| 327 | `overflow-x:auto` | `.overflow-x` (공통) |
| 346 | `display:none` | JS로 제어 (class 토글) |
| 359 | `max-height:300px` | 기존 `.scroll-box`에 통합 |
| 375 | `display:flex;gap:8px;max-width:300px` | `.pin-change-form` |

**대시보드 렌더러 innerHTML 인라인 스타일:** `renderWeekly()`, `renderInventory()` 등 JS 렌더러 내에서 템플릿 리터럴에 `style="..."` 삽입하는 패턴이 광범위하게 존재. 이것이 미디어쿼리 무효화의 핵심 원인.

### Pattern 6: isComposing Guard (CODE-04)

**현재 상태:** keydown/keyup 이벤트 핸들러에 `isComposing` 체크 전무.

```javascript
// Source: MDN CompositionEvent.isComposing
// 적용 대상: Enter로 폼 제출을 트리거하는 모든 keydown 핸들러
element.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return; // 한글 조합 중 무시
  if (e.key === 'Enter') {
    // 폼 제출 또는 행 추가 로직
  }
});
```

**적용 범위 확인 필요:** 현재 코드에서 `keydown` 이벤트를 사용하는 곳을 grep해서 모두 적용.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| dvh 폴백 계산 | 복잡한 JS resize 감지 시스템 | `100dvh` + `--vh` CSS 변수 2줄 | 이미 표준화. Chrome 108+ (카카오 Android)에서 native 동작 |
| iOS 키보드 높이 | `window.innerHeight` diff 추적 | `window.visualViewport.height` | 공식 API. innerHeight는 키보드 오픈 시 변경 안 됨 |
| 모달 컴포넌트 | 새 모달 시스템 구축 | 기존 `.modal-bg` / `.modal` CSS 재사용 | CSS 이미 존재, 구현 완료. 새 JS 래퍼만 추가 |
| 토스트 알림 | 새 알림 컴포넌트 | 기존 `showToast()` + `.toast` CSS | 이미 완전히 구현됨 — 재사용만 하면 됨 |
| CSS 미디어쿼리 역전 | PostCSS/SASS 도입 | 수동 CSS 재배치 | 단일 파일, 빌드 없음. 역전 작업은 복붙 + 정리 수준 |
| 상태 관리 | Redux/MobX 패턴 도입 | 단순 객체 `AppState` + 함수 | D-07 고정 결정. 1,174줄 파일에 프레임워크는 과잉 |

**Key insight:** Phase 1의 모든 요구사항은 기존 코드 재배치와 소규모 추가로 해결 가능. 새 라이브러리나 복잡한 아키텍처 변경 없음.

---

## Common Pitfalls

### Pitfall 1: CSS 역전 시 특이도 충돌

**What goes wrong:** 모바일 스타일을 기본으로 올리면서 데스크탑 미디어쿼리의 특이도가 낮아져 기존 모바일 전용 `!important`들이 데스크탑에서도 우선 적용됨.

**Why it happens:** 현재 `font-size: 16px !important` 가 모바일 미디어쿼리 안에 있음 (174줄). 이것을 기본으로 올리면 `!important` 없이도 동작하므로 `!important` 제거 가능. 그러나 다른 `!important`들은 검토 없이 기본으로 올리면 위험.

**How to avoid:** D-18에 따라 `font-size: 16px`는 `!important` 없이 기본으로 올림. 나머지 `!important` 선언은 역전 시 제거가 필요한지 하나씩 검토.

**Warning signs:** PC에서 버튼이 너무 크거나 폰트가 16px로 고정됨.

### Pitfall 2: `async`/`await` 전파 누락

**What goes wrong:** `customConfirm()`을 Promise로 만들면 호출 측 함수를 `async`로 선언해야 함. 4개의 `confirm()` 호출 함수 — `deleteRecord()`, `deleteWorker()`, `deleteMainTask()`, `deleteSubTask()` — 를 모두 `async function`으로 변환해야 하며, 이들의 호출 측(onClick 등)도 영향받을 수 있음.

**How to avoid:** `confirm()` 호출이 있는 함수를 모두 grep으로 확인하고, async 전파 체인을 미리 파악. inline onclick 핸들러(`onclick="deleteRecord(id)"`)는 async 함수 호출에 별도 처리 불필요 (Promise가 무시되어도 동작).

**Warning signs:** `await` 없이 `customConfirm()` 호출 시 모달이 표시되기 전에 함수가 계속 실행됨.

### Pitfall 3: JS 렌더러 인라인 스타일 누락

**What goes wrong:** HTML 정적 인라인 스타일만 제거하고, JS `innerHTML` 렌더러 안의 인라인 스타일을 놓치는 경우. `renderWeekly()`, `renderInventory()` 등 대시보드 렌더러들이 template literal 안에 `style="..."` 문자열을 다수 포함.

**How to avoid:** CODE-01 작업 전에 `style="` 패턴을 전체 파일에서 grep해서 목록 확정. HTML 정적 부분과 JS 동적 부분을 구분해서 처리.

**Warning signs:** 모바일에서 미디어쿼리가 적용되지 않는 대시보드 섹션.

### Pitfall 4: `data-rows` 제거 전 renderRows 호출 타이밍

**What goes wrong:** `setRows()`가 `AppState.tasks`로 교체되면서 기존에 `dataset.rows`를 직접 읽는 코드가 있으면 빈 배열 반환.

**How to avoid:** 코드 감사 결과 `data-rows`를 직접 읽는 곳은 560~565줄에 집중됨. `handleSubmit()` 546줄에서도 `JSON.parse(tbody.dataset.rows)` 사용. 이 3곳 모두 AppState 교체 시 동시에 처리.

**Warning signs:** 폼 제출 시 빈 데이터 전송.

### Pitfall 5: scrollIntoView와 iOS 키보드 애니메이션 충돌

**What goes wrong:** `scrollIntoView` 호출을 키보드 resize 이벤트 직후 즉시 호출하면 iOS 키보드 슬라이드업 애니메이션 중 스크롤이 실행되어 위치가 어긋남.

**How to avoid:** `setTimeout(..., 100)` 로 100ms 지연. 키보드 애니메이션은 iOS에서 약 250ms이지만, 100ms면 레이아웃 reflow가 시작된 이후라 안전.

**Warning signs:** 스크롤 후 input이 화면 밖에 있거나 중앙이 아닌 위치에 표시됨.

---

## Code Examples

### dvh + --vh 폴백 (VIEW-01)

```css
/* Source: web.dev/blog/viewport-units — verified HIGH confidence */
/* ═══ SECTION: Reset & Base ═══ */
body {
  font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;   /* 기준선 */
  min-height: 100dvh;  /* Chrome 108+, Safari 15.4+ — 카카오 Android/iOS 커버 */
}
```

```javascript
// Source: MDN VisualViewport — verified HIGH confidence
// ═══ SECTION: Viewport Handler ═══
function syncViewportHeight() {
  const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncViewportHeight);
  window.visualViewport.addEventListener('scroll', syncViewportHeight);
}
syncViewportHeight();
```

### viewport meta 업데이트 (D-15)

```html
<!-- 현재 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

<!-- 변경 후 — interactive-widget=resizes-content 추가 (Chrome 108+/KakaoTalk Android) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
```

### input font-size 기본값 승격 (VIEW-04)

```css
/* 변경 전 (174줄 — 모바일 미디어쿼리 안에서 !important) */
@media (max-width: 768px) {
  select, input[type=text], input[type=number], input[type=date], input[type=password] {
    font-size: 16px !important;
    ...
  }
}

/* 변경 후 — 기본 스타일로 올림, !important 제거 */
/* ═══ SECTION: Forms ═══ */
select, input[type=text], input[type=number], input[type=date], input[type=password] {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--rs);
  font-size: 16px;   /* iOS 자동 확대 방지 — 16px 미만 금지 */
  font-family: inherit;
  color: var(--text);
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
  outline: 0;
}
/* 데스크탑에서만 작은 폰트 원할 경우 @media (min-width: 769px) 에서 14px로 오버라이드 */
```

### AppState 마이그레이션 (CODE-02)

```javascript
// ═══ SECTION: State Management ═══
const AppState = {
  tasks: []  // { id, type, taskName, quantity, note, relatedMain }
};

// 기존 API 시그니처 유지 — 호출 측 코드 무변경
function getRows() { return AppState.tasks; }
function setRows(r) { AppState.tasks = r; renderRows(); }
// addRow, removeRow, updateRow, changeType — 내부 로직 변경 없음
```

### isComposing Guard (CODE-04)

```javascript
// Source: MDN CompositionEvent.isComposing — verified HIGH confidence
// keydown 이벤트 핸들러 모든 곳에 적용
element.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return;  // 한글 조합 중 무시
  if (e.key === 'Enter') { /* 폼 제출 로직 */ }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` 단독 | `100dvh` + `100vh` 폴백 스택 | Chrome 108+ / Safari 15.4+ (2022-2023) | 카카오톡 웹뷰 높이 정확도 |
| `window.innerHeight` JS 계산 | `VisualViewport.height` | Safari 13+ (2019) | 키보드 열렸을 때 실제 가시 영역 높이 |
| `@media (max-width:768px)` desktop-first | `@media (min-width:769px)` mobile-first | 업계 표준 전환 (2010년대 중반~) | 기본 스타일이 모바일이므로 override 필요량 감소 |
| `window.confirm()` | 커스텀 Promise 모달 | 카카오톡 웹뷰 iOS 차단 확인 | 삭제 확인 동작 여부 |

**Deprecated/outdated:**
- `user-scalable=no`: WCAG 위반, iOS 10+에서 무시됨 — 사용 불가
- `-webkit-text-size-adjust: none`: 접근성 침해 — `100%`로만 사용
- DOM `dataset`을 상태 저장소로 사용: 안티패턴 — JS 변수로 이동

---

## Open Questions

1. **대시보드 JS 렌더러 내 인라인 스타일 범위**
   - What we know: `renderWeekly()`, `renderInventory()` 등에 인라인 스타일이 있음 (ARCHITECTURE.md 확인)
   - What's unclear: 정확히 몇 개의 인라인 스타일 선언이 렌더러 안에 있는지 — 코드 감사 필요
   - Recommendation: 플래너가 Wave 0 태스크로 `style="` 전체 grep을 수행해 목록 확정 후 클래스 네이밍

2. **iOS 실기기 검증 불가**
   - What we know: iOS KakaoTalk 웹뷰에서 `interactive-widget` 미지원, VisualViewport 동작 확인 필요
   - What's unclear: `scrollIntoView` + VisualViewport 조합이 실제 iOS KakaoTalk에서 동작하는지 Chrome DevTools 에뮬레이션으로 재현 불가
   - Recommendation: STATE.md의 Research Flag와 동일 — Phase 1 완료 후 실기기 검증을 별도 태스크로 포함

3. **`handleSubmit()` 546줄에서 `dataset.rows` 직접 참조**
   - What we know: `JSON.parse(tbody.dataset.rows||'[]')` 패턴이 `getRows()`와 별개로 존재
   - What's unclear: 이 줄이 AppState 마이그레이션 시 자동으로 업데이트되는지, 아니면 별도로 수정해야 하는지
   - Recommendation: `getRows()` 호출로 대체 필요. `setRows()`/`getRows()` 외 직접 `dataset.rows` 참조는 모두 교체 대상

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1은 순수 코드/CSS 변경으로 외부 도구, 서비스, CLI, 런타임 설치 불필요. 기존 `index.html` 단일 파일 편집만 수행.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 없음 — 단일 HTML 파일, 빌드 없음 |
| Config file | 없음 |
| Quick run command | 브라우저에서 `index.html` 직접 열기 + Chrome DevTools 모바일 에뮬레이션 |
| Full suite command | 실제 KakaoTalk 웹뷰 (Android + iOS) 수동 검증 |

> 이 프로젝트는 JavaScript 테스트 프레임워크(Jest/Vitest 등)가 없다. 바닐라 JS + 단일 HTML 파일이므로 unit test 자동화가 구조적으로 어렵다. 검증은 브라우저 개발자 도구 + 실기기로 수행.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification Method | Automatable |
|--------|----------|-----------|---------------------|-------------|
| VIEW-01 | body min-height가 100dvh로 동작 | 시각 | Chrome DevTools → Responsive → 360×780 → 높이 오버플로 없음 확인 | 수동 |
| VIEW-02 | iOS 키보드 오픈 시 레이아웃 유지 | 시각 | DevTools → Responsive + 키보드 시뮬레이션 OR 실기기 | 수동 |
| VIEW-03 | 포커스 input이 키보드 위로 스크롤 | 시각 | DevTools 모바일 에뮬 + input 탭 시 scrollIntoView 동작 확인 | 수동 |
| VIEW-04 | input 포커스 시 iOS 확대 없음 | 시각 | 모든 input/select CSS에서 font-size >= 16px 확인 (DevTools 검사) | 수동 (CSS 확인은 빠름) |
| VIEW-05 | @media(max-width:768px) → @media(min-width:769px) | 구조 | DevTools CSS 패널에서 미디어쿼리 방향 확인 | 수동 |
| CODE-01 | style="" 속성이 HTML/JS에서 제거됨 | 코드 | `grep 'style="'` 결과 0건 (렌더러 제외) | 자동 (grep) |
| CODE-02 | `dataset.rows` 참조 없음 | 코드 | `grep 'dataset.rows'` 결과 0건 | 자동 (grep) |
| CODE-03 | `window.confirm` 참조 없음 | 코드 | `grep 'window.confirm\|window.alert\|^confirm('` 결과 0건 | 자동 (grep) |
| CODE-04 | keydown 핸들러에 isComposing 체크 존재 | 코드 | `grep 'isComposing'` 결과 > 0건 | 자동 (grep) |
| CODE-05 | 섹션 주석 구분자 존재 | 코드 | `grep '═══ SECTION'` 결과 > 0건 | 자동 (grep) |

### Sampling Rate
- **각 태스크 완료 후:** 해당 요구사항 grep 검증 (CODE-01~05는 grep으로 즉시 확인)
- **Wave 완료 후:** Chrome DevTools 360×780 모바일 에뮬레이션으로 시각 확인
- **Phase gate:** `index.html`을 실제 Android KakaoTalk 웹뷰에서 열어 VIEW-01~05 수동 확인 후 `/gsd:verify-work`

### Wave 0 Gaps

기존 테스트 인프라 없음. Phase 1은 코드 편집 태스크이므로 자동화 테스트 추가 불필요.
grep 검증은 bash에서 즉시 실행 가능 — Wave 0 태스크 불필요.

---

## Sources

### Primary (HIGH confidence)
- MDN VisualViewport API — https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- web.dev viewport units — https://web.dev/blog/viewport-units (dvh 브라우저 지원)
- MDN CompositionEvent.isComposing — https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent/isComposing
- `index.html` 직접 코드 감사 (560~565줄 data-rows, 1140~1170줄 visualViewport 핸들러, 674/1016/1034/1095줄 confirm 호출)

### Secondary (MEDIUM confidence)
- HTMHell Advent 2024 — interactive-widget — https://www.htmhell.dev/adventcalendar/2024/4/ (Chrome 108+ 확인, iOS 미지원)
- jooonho.dev webview issue — https://jooonho.dev/web/2023-01-09-webview-issue/ (scrollIntoView 패턴)
- Korean dev blog (velog): iOS Safari focus zoom — multiple corroborating sources

### Tertiary (LOW confidence)
- iOS KakaoTalk에서 scrollIntoView + VisualViewport 조합 동작 여부 — 실기기 미확인. 문서상 동작해야 하나 KakaoTalk WKWebView 특수 동작 가능성.

---

## Project Constraints (from CLAUDE.md)

| Directive | Type | Impact on Phase 1 |
|-----------|------|-------------------|
| 단일 HTML 파일 유지 | 구조 제약 | 파일 분리 금지 — 모든 CSS/JS는 index.html 내부에 유지 |
| 카카오톡 인앱 웹뷰 호환 필수 | 환경 제약 | iOS confirm 차단, VisualViewport 폴백, dvh 폴백 모두 필수 |
| Supabase 유지 | 백엔드 제약 | Phase 1 무관 (상태 마이그레이션은 클라이언트 측 data-rows → AppState만 변경) |
| 기존 4개 탭 기능 100% 유지 | 기능 제약 | 리팩토링 중 기능 회귀 금지 — 모든 변경은 동작 보존적이어야 함 |
| GSD 워크플로우 사용 | 프로세스 제약 | /gsd:execute-phase를 통해 진행 |

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 모두 native CSS/JS, 추가 라이브러리 없음
- Architecture Patterns: HIGH — 코드 직접 감사 기반, 구체적 줄 번호 확인
- Pitfalls: HIGH — 코드 감사로 실제 존재 확인된 문제들
- iOS 실기기 동작: LOW — VisualViewport + scrollIntoView 조합은 문서상 동작하나 KakaoTalk WKWebView에서 미확인

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (native CSS/JS — 안정적)
