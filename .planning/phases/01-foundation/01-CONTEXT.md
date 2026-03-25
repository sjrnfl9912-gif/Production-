# Phase 1: Foundation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

카카오톡 웹뷰에서 레이아웃이 망가지지 않는 안정적인 기반을 구축한다. CSS를 mobile-first로 재구성하고, JS 상태관리를 개선하며, 웹뷰 비호환 API(alert/confirm)를 교체한다. 모든 기존 기능은 100% 유지한다.

</domain>

<decisions>
## Implementation Decisions

### CSS 재구성 방식
- **D-01:** CSS를 mobile-first로 전환한다. 기본 스타일이 모바일이고 `@media (min-width: 769px)` 으로 PC 확장
- **D-02:** 현재 하나의 `@media(max-width:768px)` 블록을 해체하고, 모바일 스타일을 기본으로 올린 뒤 데스크탑 오버라이드만 미디어쿼리에 배치
- **D-03:** CSS 변수(`:root`) 체계는 유지하되, 모바일/데스크탑 간 달라지는 값은 미디어쿼리 내에서 재정의
- **D-04:** JS 렌더러 함수 내 인라인 스타일(`style="..."`)을 CSS 클래스로 교체. 인라인 스타일은 미디어쿼리로 오버라이드 불가하므로 반드시 제거

### JS 상태관리 패턴
- **D-05:** `data-rows` DOM 속성 기반 → 전역 `AppState` 객체로 전환. `AppState.tasks = [{type, name, qty, note}]` 형태
- **D-06:** 상태 변경 시 직접 DOM 조작 대신, 상태 변경 → 렌더 함수 호출 패턴 사용 (간단한 리액티브 패턴)
- **D-07:** 프레임워크 없이 바닐라 JS로 구현. 클래스나 모듈 불필요, 단순 객체 + 함수 조합

### 커스텀 모달/토스트
- **D-08:** 기존 `.modal-bg` / `.modal` CSS를 재사용하여 confirm 대체 모달 구현
- **D-09:** 삭제 확인은 인라인 확인 버튼 패턴 사용 (모달 대신 해당 행에서 "정말 삭제?" 표시)
- **D-10:** alert() 대체는 기존 `.toast` 컴포넌트 활용 (이미 CSS 존재)
- **D-11:** 모달/토스트 모두 Promise 기반 API로 래핑 (`await confirm('삭제?')` 형태)

### 한글 IME 처리
- **D-12:** 텍스트 입력 이벤트에서 `event.isComposing` 체크 추가. keydown 229 코드 무시

### 파일 내부 정리
- **D-13:** 단일 HTML 유지. 내부를 주석 구분자로 섹션 분리: `/* ═══ SECTION: CSS Variables ═══ */`, `// ═══ SECTION: State Management ═══ //` 등
- **D-14:** 코드 순서: CSS Variables → CSS Base (mobile) → CSS Components → CSS Desktop Override → HTML → JS Utilities → JS State → JS Renderers → JS Event Handlers → JS Init

### 뷰포트/키보드 대응
- **D-15:** `<meta name="viewport">` 에 `interactive-widget=resizes-content` 추가 (Android Chrome)
- **D-16:** iOS용 `visualViewport.resize` 리스너에서 포커스된 input에 `scrollIntoView({block:'center', behavior:'smooth'})` 추가
- **D-17:** `100vh` → `100dvh` 전환. dvh 미지원 브라우저 폴백으로 `--vh` CSS 변수 + JS 계산 병행
- **D-18:** 모든 input/select에 `font-size: 16px` 이상 보장 (이미 모바일 미디어쿼리에 `16px !important` 있음 → 기본 스타일로 올림)

### Claude's Discretion
- CSS 변수 네이밍 컨벤션 (기존 `--pri`, `--grn` 등 유지 vs 정리) — 기존 유지하되 새로 추가하는 것만 풀네임
- JS 함수명/변수명 리팩토링 범위 — 기존 명칭 최대한 유지, 새 함수만 camelCase 일관
- 스켈레톤/로딩 UI의 구체적 디자인 — Phase 3에서 처리

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Core
- `.planning/PROJECT.md` — 프로젝트 비전, 제약조건, 핵심 가치
- `.planning/REQUIREMENTS.md` — VIEW-01~05, CODE-01~05 요구사항 상세
- `.planning/ROADMAP.md` — Phase 1 성공 기준 5개

### Research
- `.planning/research/STACK.md` — 뷰포트 dvh, VisualViewport, interactive-widget 기술 상세
- `.planning/research/ARCHITECTURE.md` — 현재 코드 구조 분석, 인라인 스타일 문제점, 상태관리 안티패턴
- `.planning/research/PITFALLS.md` — 카카오톡 웹뷰 함정 (Service Worker 무한 새로고침, iOS 키보드, 한글 IME)
- `.planning/research/SUMMARY.md` — 연구 종합 요약

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.modal-bg` / `.modal` CSS: confirm 대체 모달에 재사용 가능
- `.toast` CSS + `showToast()` 함수: alert 대체에 즉시 사용 가능
- `visualViewport` resize 리스너: 이미 존재 (탭바 숨김용), scrollIntoView만 추가하면 됨
- CSS 변수 시스템 (`:root`): 컬러/간격/그림자 이미 체계화

### Established Patterns
- 탭 전환: `data-tab` 속성 + `.active` 클래스 토글
- 테이블 렌더링: innerHTML 문자열 조립 → DOM 삽입 패턴
- Supabase 호출: 전역 `supabase` 클라이언트, async/await

### Integration Points
- `handleSubmit()`: 상태 마이그레이션 시 data-rows → AppState.tasks 로 변경 필요
- `addRow()` / `removeRow()`: DOM 직접 조작 → 상태 변경 + 리렌더로 전환
- `renderWeekly()`, `renderInventory()` 등: 인라인 스타일 제거 대상

</code_context>

<specifics>
## Specific Ideas

- 카카오톡 웹뷰가 주 사용 환경이므로 모든 변경은 카톡 웹뷰에서 먼저 검증해야 함
- `window.confirm()` → iOS 카톡 웹뷰에서 차단됨이 확인됨, 즉시 교체 필수
- 현장 작업자가 장갑을 끼고 사용할 수 있으므로 터치 영역은 넉넉하게 (Phase 2에서 상세 처리)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-25*
