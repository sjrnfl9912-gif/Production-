# Requirements: 생산 관리 시스템 리팩토링

**Defined:** 2026-03-25
**Core Value:** 현장 작업자가 카카오톡 웹뷰에서 빠르고 불편함 없이 생산 실적을 입력할 수 있어야 한다.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Viewport & Layout

- [x] **VIEW-01**: 모든 레이아웃이 `100dvh` 기반으로 카카오톡 웹뷰 주소창/하단 네비를 고려한 높이를 사용한다
- [x] **VIEW-02**: iOS 키보드 오픈 시 VisualViewport API로 레이아웃이 안정적으로 유지된다
- [x] **VIEW-03**: 입력 필드 포커스 시 해당 필드가 키보드 위로 자동 스크롤된다 (scrollIntoView)
- [x] **VIEW-04**: 모든 input/select 요소가 `font-size: 16px` 이상으로 iOS 자동 확대가 발생하지 않는다
- [x] **VIEW-05**: CSS가 mobile-first 미디어쿼리로 재구성된다 (기본 모바일 → `min-width`로 PC 확장)

### Touch UX

- [x] **TOUCH-01**: 모든 인터랙티브 요소가 최소 44x44px 터치 타겟을 보장한다
- [x] **TOUCH-02**: `touch-action: manipulation`으로 300ms 터치 지연이 제거된다
- [x] **TOUCH-03**: 버튼 탭 시 시각적 터치 피드백(press/ripple)이 제공된다
- [x] **TOUCH-04**: 탭 간 스와이프로 페이지 전환이 가능하다
- [x] **TOUCH-05**: 테이블 가로 스크롤이 CSS `scroll-snap`으로 자연스럽게 동작한다

### Code Structure

- [x] **CODE-01**: CSS가 섹션별로 정리되고 인라인 스타일이 CSS 클래스로 교체된다
- [x] **CODE-02**: JS 상태가 DOM `data-rows` 대신 JS 배열/객체로 관리된다
- [x] **CODE-03**: `window.alert()`/`window.confirm()`이 커스텀 모달로 교체된다 (카톡 웹뷰 호환)
- [x] **CODE-04**: 한글 IME `isComposing` 가드가 텍스트 입력에 적용된다
- [x] **CODE-05**: 단일 HTML 파일 구조가 유지되면서 코드가 논리적 섹션으로 정리된다

### UI Redesign

- [ ] **UI-01**: 실적 입력 폼이 모바일 카드형 레이아웃으로 재설계된다
- [ ] **UI-02**: 대시보드 KPI/테이블이 모바일 화면에 최적화된다
- [ ] **UI-03**: 하단 탭바가 카카오톡 웹뷰 safe-area를 고려하여 개선된다
- [ ] **UI-04**: 데이터 로딩 중 스켈레톤/스피너 UI가 표시된다
- [ ] **UI-05**: 내 실적 수정 화면이 모바일에서 사용하기 편하게 개선된다

### Business Logic

- [ ] **BIZ-01**: 100대 소요일 산출 시 메인작업만 필터링하여 계산한다 (서브/기타 제외)
- [ ] **BIZ-02**: 하루 복수 품목 작업 시 해당 품목 전용 작업시간 비율로 일평균을 보정한다
- [ ] **BIZ-03**: 데이터 3일 미만일 때 신뢰도 경고를 강화하고 소요일 표시를 조건부로 한다
- [ ] **BIZ-04**: 100대 소요일 산출 공식이 가중 평균 또는 중앙값 기반으로 개선된다

### PWA

- [ ] **PWA-01**: `manifest.json`이 추가되어 홈 화면 추가 시 앱처럼 표시된다
- [ ] **PWA-02**: Service Worker가 정적 자산을 캐싱하여 재방문 시 빠르게 로딩된다
- [ ] **PWA-03**: 카카오톡 웹뷰 감지 시 Service Worker 등록을 스킵하여 무한 새로고침을 방지한다
- [ ] **PWA-04**: 오프라인 상태에서 기본 UI가 표시되고 네트워크 복구 시 자동 재연결된다

## v2 Requirements

Deferred to future release.

### Advanced Features

- **ADV-01**: 푸시 알림 (실적 미입력 리마인더)
- **ADV-02**: 실시간 대시보드 자동 갱신 (폴링/SSE)
- **ADV-03**: 파일 첨부 (작업 사진 등)
- **ADV-04**: 사용자별 개별 인증 (PIN → 계정 기반)
- **ADV-05**: 다국어 지원

### Data & Analytics

- **DATA-01**: 월간/분기별 리포트 생성
- **DATA-02**: 생산성 추세 차트
- **DATA-03**: CSV/Excel 내보내기

## Out of Scope

| Feature | Reason |
|---------|--------|
| 프레임워크 전환 (React/Vue) | 단일 HTML 유지 결정, 배포 단순성 |
| 파일 분리 (HTML/CSS/JS) | 단일 파일 구조 유지 |
| 네이티브 앱 개발 | 카카오톡 웹뷰가 주 사용 환경 |
| 오프라인 완전 동기화 | 복잡도 높음, Supabase 제약 |
| PWA 인앱 설치 프롬프트 | 카카오톡 웹뷰에서 beforeinstallprompt 미지원 |
| Supabase 외 백엔드 전환 | 기존 인프라/데이터 유지 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIEW-01 | Phase 1 | Complete |
| VIEW-02 | Phase 1 | Complete |
| VIEW-03 | Phase 1 | Complete |
| VIEW-04 | Phase 1 | Complete |
| VIEW-05 | Phase 1 | Complete |
| TOUCH-01 | Phase 2 | Complete |
| TOUCH-02 | Phase 2 | Complete |
| TOUCH-03 | Phase 2 | Complete |
| TOUCH-04 | Phase 2 | Complete |
| TOUCH-05 | Phase 2 | Complete |
| CODE-01 | Phase 1 | Complete |
| CODE-02 | Phase 1 | Complete |
| CODE-03 | Phase 1 | Complete |
| CODE-04 | Phase 1 | Complete |
| CODE-05 | Phase 1 | Complete |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| BIZ-01 | Phase 4 | Pending |
| BIZ-02 | Phase 4 | Pending |
| BIZ-03 | Phase 4 | Pending |
| BIZ-04 | Phase 4 | Pending |
| PWA-01 | Phase 5 | Pending |
| PWA-02 | Phase 5 | Pending |
| PWA-03 | Phase 5 | Pending |
| PWA-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after roadmap creation — traceability filled*
