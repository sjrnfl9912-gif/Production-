# Project State: 생산 관리 시스템 리팩토링

**Last updated:** 2026-03-25
**Session:** Roadmap creation

---

## Project Reference

**Core value:** 현장 작업자가 카카오톡 웹뷰에서 빠르고 불편함 없이 생산 실적을 입력할 수 있어야 한다

**What this is:** 단일 index.html 파일 기반 생산 관리 시스템의 카카오톡 웹뷰 모바일 최적화 리팩토링. 기존 4개 탭(실적 입력 / 내 실적 수정 / 주간 대시보드 / 관리자 설정) 기능을 100% 유지하면서 뷰포트, 터치, UI, 비즈니스 로직, PWA를 순서대로 개선한다.

---

## Current Position

**Phase:** Not started
**Plan:** None
**Status:** Roadmap created, ready to begin Phase 1

```
[          ] Phase 1: Foundation
[          ] Phase 2: Touch UX
[          ] Phase 3: UI Redesign
[          ] Phase 4: Business Logic
[          ] Phase 5: PWA

Overall: 0% complete
```

---

## Phase Summary

| Phase | Goal | Key Requirements |
|-------|------|-----------------|
| 1. Foundation | 뷰포트 안정화 + CSS/JS 구조 재편 | VIEW-01~05, CODE-01~05 |
| 2. Touch UX | 터치 조작 전반 개선 | TOUCH-01~05 |
| 3. UI Redesign | 모바일 화면 UI 재설계 | UI-01~05 |
| 4. Business Logic | 100대 소요일 산출 로직 개선 | BIZ-01~04 |
| 5. PWA | PWA 레이어 추가 | PWA-01~04 |

---

## Performance Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Requirements mapped | 0/28 | 28/28 |
| Phases complete | 0/5 | 5/5 |
| Plans complete | 0 | TBD |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Phase 1 = VIEW + CODE together | CSS 구조 정리 없이는 뷰포트 수정이 inline-style에 막힘; 동시 진행이 필수 |
| Phase 4 depends on Phase 1 only | 비즈니스 로직은 UI 독립적이나 JS 상태 마이그레이션(CODE-02) 완료 후 시작 |
| Phase 5 depends on Phase 3 | Service Worker를 깨진 레이아웃에 캐싱하면 복구 비용이 높음; 안정화 후 마지막에 추가 |
| Phase 2 depends on Phase 1 | 터치 타겟/스크롤 수정은 dvh 뷰포트 기반이 정확해야 검증 가능 |

### Research Flags (carry forward)

- **Phase 2**: iOS KakaoTalk에서 scrollIntoView + VisualViewport 동작을 실제 기기로 검증 필요 (Chrome DevTools로 재현 불가)
- **Phase 4**: "메인작업 날" 정의를 제품 오너에게 확인 필요 (relatedMain 필드 활용 방식)
- **Phase 5**: KakaoTalk 웹뷰에서 Service Worker 무한 새로고침 미발생 여부 실기기 검증 필요

### Known Risks

- iOS KakaoTalk 웹뷰 버전 하한선 불명확 → dvh 지원 여부 불확실 (VisualViewport JS 폴백으로 커버)
- KakaoTalk Android safe-area-inset 지원 여부 → Phase 1 실기기 테스트에서 확인
- Supabase RLS 미설정 가능성 → PIN 기반 클라이언트 인증 위험 인지하고 Phase 1에서 결정

### Todos

- [ ] Phase 1 plan 생성 후 시작
- [ ] Phase 2 전 iOS 실기기 준비
- [ ] Phase 4 전 100대 소요일 "메인작업" 정의 확인

### Blockers

None currently.

---

## Session Continuity

**To resume this project:**
1. `cat .planning/ROADMAP.md` — 현재 페이즈 및 계획 확인
2. `cat .planning/STATE.md` — 이 파일로 컨텍스트 복원
3. `/gsd:plan-phase 1` — Phase 1 계획 시작

**Files to know:**
- `index.html` — 리팩토링 대상 단일 파일 (~1,174줄)
- `.planning/ROADMAP.md` — 로드맵
- `.planning/REQUIREMENTS.md` — 요구사항 28개
- `.planning/research/SUMMARY.md` — 연구 요약 (피트폴, 권장 스택 포함)

---

*State initialized: 2026-03-25*
