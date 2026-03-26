# Roadmap: 생산 관리 시스템 리팩토링

**Milestone:** 카카오톡 웹뷰 모바일 최적화
**Created:** 2026-03-25
**Granularity:** Standard (5 phases)
**Coverage:** 28/28 requirements mapped

---

## Phases

- [x] **Phase 1: Foundation** — CSS 구조 재편 + 뷰포트 안정화 (viewport height, dvh, VisualViewport, JS 상태 마이그레이션) (completed 2026-03-25)
- [ ] **Phase 2: Touch UX** — 터치 대상 크기, 탭 지연 제거, 터치 피드백, 스와이프 전환, 테이블 스크롤
- [ ] **Phase 3: UI Redesign** — 모바일 카드형 폼, 대시보드 최적화, 하단 탭바, 스켈레톤/스피너, 내 실적 수정 화면
- [ ] **Phase 4: Business Logic** — 100대 소요일 산출 로직 개선 (메인작업 필터, 가중 평균, 신뢰도 경고)
- [ ] **Phase 5: PWA** — manifest.json, Service Worker 캐싱, KakaoTalk UA 가드, 오프라인 UI

---

## Phase Details

### Phase 1: Foundation
**Goal**: 카카오톡 웹뷰에서 레이아웃이 망가지지 않는 안정적인 기반을 갖춘다
**Depends on**: Nothing (first phase)
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, CODE-01, CODE-02, CODE-03, CODE-04, CODE-05
**Success Criteria** (what must be TRUE):
  1. 카카오톡 웹뷰에서 앱을 열면 전체 UI가 주소창/하단 네비에 가리지 않고 온전히 표시된다
  2. iOS에서 입력 필드를 탭하면 키보드가 올라와도 레이아웃이 무너지지 않고 폼이 그대로 유지된다
  3. 입력 필드를 탭할 때 iOS 자동 확대(zoom)가 발생하지 않는다
  4. window.alert()/confirm() 대신 커스텀 모달/토스트가 표시되어 카카오톡 웹뷰에서도 정상 동작한다
  5. 한글 입력 중 키보드 Enter를 눌러도 조합 중인 글자가 중복 제출되지 않는다
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — CSS mobile-first 전환 + 섹션 주석 + dvh + 인라인 스타일 교체
- [x] 01-02-PLAN.md — AppState JS 상태관리 마이그레이션 + customConfirm 모달
- [x] 01-03-PLAN.md — VisualViewport scrollIntoView + --vh 주입 + IME isComposing 가드
**UI hint**: yes

### Phase 2: Touch UX
**Goal**: 현장 작업자가 손가락(또는 장갑 낀 손)으로 불편 없이 앱을 조작할 수 있다
**Depends on**: Phase 1
**Requirements**: TOUCH-01, TOUCH-02, TOUCH-03, TOUCH-04, TOUCH-05
**Success Criteria** (what must be TRUE):
  1. 모든 버튼/탭/셀렉트를 손가락으로 한 번 탭하면 300ms 지연 없이 즉시 반응한다
  2. 버튼을 탭하면 눈에 보이는 시각적 피드백(눌림 효과)이 표시된다
  3. 화면을 좌우로 스와이프하면 탭이 전환된다
  4. 가로 스크롤이 필요한 테이블에서 손가락으로 좌우 스와이프하면 자연스럽게 스크롤된다
  5. 모든 인터랙티브 요소의 터치 영역이 44x44px 이상이어서 작은 버튼도 정확히 눌린다
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — SECTION:Touch UX CSS 블록 (44px 타겟 + touch-action + :active 피드백 + ripple)
- [x] 02-02-PLAN.md — scroll-snap 테이블 스냅 + initSwipeNav() 스와이프 탭 전환
- [ ] 02-03-PLAN.md — 전체 TOUCH UX 검증 (human-verify checkpoint)
**UI hint**: yes

### Phase 3: UI Redesign
**Goal**: 모바일 화면에서 작업자가 실적을 입력하고 확인하는 모든 화면이 사용하기 편하다
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. 실적 입력 화면에서 작업 항목이 카드 형태로 표시되어 모바일에서 읽고 입력하기 편하다
  2. 대시보드 KPI 수치와 테이블이 모바일 화면 너비 안에 잘려나가지 않고 표시된다
  3. 화면 하단 탭바가 안전 영역(safe-area) 아래로 숨지 않고 홈 버튼/네비 바 위에 표시된다
  4. 데이터를 불러오는 동안 빈 화면 대신 스켈레톤/스피너가 표시된다
  5. 내 실적 수정 화면에서 7일 이내 실적을 모바일에서 쉽게 선택하고 수정할 수 있다
**Plans**: 3 plans
Plans:
- [x] 03-01-PLAN.md — KPI 2열 + 탭바 액티브 인디케이터 + 토스트 위치 + 스켈레톤 CSS 기반
- [ ] 03-02-PLAN.md — showInitSkeletons() + loadMyRecords() 날짜 그룹화 + sticky selector
- [ ] 03-03-PLAN.md — Phase 3 전체 UI 인수 검증 (human-verify checkpoint)
**UI hint**: yes

### Phase 4: Business Logic
**Goal**: 100대 소요일 산출 수치가 현장에서 신뢰할 수 있는 값을 표시한다
**Depends on**: Phase 1
**Requirements**: BIZ-01, BIZ-02, BIZ-03, BIZ-04
**Success Criteria** (what must be TRUE):
  1. 대시보드 100대 소요일 수치가 서브/기타 작업이 아닌 메인작업 데이터만 반영한다
  2. 하루에 여러 품목을 작업한 날도 품목별 소요일 계산이 왜곡 없이 표시된다
  3. 데이터가 3일 미만일 때 소요일 수치 대신 "데이터 부족" 경고가 명확하게 표시된다
  4. 소요일 계산 공식이 단순 나누기가 아닌 가중 평균 또는 중앙값 기반으로 동작한다
**Plans**: TBD

### Phase 5: PWA
**Goal**: 카카오톡 외 브라우저 사용자는 앱을 홈 화면에 추가할 수 있고, 재방문 시 빠르게 로딩된다
**Depends on**: Phase 3
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04
**Success Criteria** (what must be TRUE):
  1. Chrome/Safari 브라우저에서 앱을 열면 홈 화면에 추가할 수 있고, 추가 후 전체 화면 앱처럼 실행된다
  2. 한 번 방문한 뒤 재방문 시 정적 자산(HTML/CSS/JS)이 캐시에서 즉시 로딩된다
  3. 카카오톡 웹뷰 안에서 앱을 열 때 Service Worker가 등록되지 않아 무한 새로고침이 발생하지 않는다
  4. 네트워크가 끊긴 상태에서 앱을 열면 기본 UI가 표시되고 네트워크 복구 시 자동으로 재연결된다
**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-25 |
| 2. Touch UX | 2/3 | In Progress|  |
| 3. UI Redesign | 1/3 | In Progress|  |
| 4. Business Logic | 0/0 | Not started | - |
| 5. PWA | 0/0 | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| VIEW-01 | Phase 1 |
| VIEW-02 | Phase 1 |
| VIEW-03 | Phase 1 |
| VIEW-04 | Phase 1 |
| VIEW-05 | Phase 1 |
| CODE-01 | Phase 1 |
| CODE-02 | Phase 1 |
| CODE-03 | Phase 1 |
| CODE-04 | Phase 1 |
| CODE-05 | Phase 1 |
| TOUCH-01 | Phase 2 |
| TOUCH-02 | Phase 2 |
| TOUCH-03 | Phase 2 |
| TOUCH-04 | Phase 2 |
| TOUCH-05 | Phase 2 |
| UI-01 | Phase 3 |
| UI-02 | Phase 3 |
| UI-03 | Phase 3 |
| UI-04 | Phase 3 |
| UI-05 | Phase 3 |
| BIZ-01 | Phase 4 |
| BIZ-02 | Phase 4 |
| BIZ-03 | Phase 4 |
| BIZ-04 | Phase 4 |
| PWA-01 | Phase 5 |
| PWA-02 | Phase 5 |
| PWA-03 | Phase 5 |
| PWA-04 | Phase 5 |

**Total mapped:** 28/28 ✓

---

*Roadmap created: 2026-03-25*
*Last updated: 2026-03-26 Phase 3 planned (3 plans)*
