# 생산 관리 시스템 리팩토링

## What This Is

공장/현장 작업자가 카카오톡 웹뷰에서 일일 생산 실적을 입력하고, 관리자가 PC에서 주간 대시보드로 생산성을 확인하는 생산 관리 시스템. 현재 단일 index.html로 구현되어 있으며, 모바일 퍼스트 리팩토링을 통해 카카오톡 웹뷰 환경에 최적화한다.

## Core Value

현장 작업자가 카카오톡 웹뷰에서 빠르고 불편함 없이 생산 실적을 입력할 수 있어야 한다.

## Requirements

### Validated

- ✓ 실적 입력 (담당자, 진행일, 작업 항목 추가/삭제) — existing
- ✓ 내 실적 수정 (7일 이내 수정 가능) — existing
- ✓ 주간 대시보드 (KPI, 생산능력, 재고, 주간 실적) — existing
- ✓ 관리자 설정 (담당자/품목 관리, PIN 인증) — existing
- ✓ Supabase 백엔드 연동 — existing
- ✓ PIN 기반 관리자 인증 — existing

### Active

- [ ] 카카오톡 웹뷰 최적화 (입력 폼 포커스, 뷰포트 높이, 스크롤/터치)
- [ ] 모바일 퍼스트 레이아웃 재설계
- [ ] 터치 UX 개선 (버튼 크기, 스와이프, 터치 피드백)
- [ ] 성능 최적화 (로딩 속도, 렌더링)
- [ ] PWA 지원 (홈 화면 추가, 오프라인 캐시)
- [ ] 100대 기준 소요일 산출 로직 개선
- [ ] 기존 기능 UI/UX 개선
- [ ] 코드 정리 및 구조 최적화 (단일 HTML 유지)

### Out of Scope

- 프레임워크 전환 (React, Vue 등) — 단일 HTML 유지 결정
- 파일 분리 (HTML/CSS/JS) — 단일 파일 구조 유지
- 네이티브 앱 개발 — 카카오톡 웹뷰가 주 사용 환경
- Supabase 외 백엔드 전환 — 기존 인프라 유지

## Context

- **현재 구조**: 단일 `index.html` (HTML + CSS + JS 올인원, ~800줄+)
- **백엔드**: Supabase (supabase-js v2 CDN)
- **폰트**: Pretendard Variable (CDN)
- **인증**: 4자리 PIN 기반 관리자 접근
- **탭 구조**: 실적 입력 / 내 실적 수정 / 주간 대시보드 / 관리자 설정
- **주 사용 환경**: 카카오톡 웹뷰 (작업자), PC 브라우저 (관리자)
- **카카오톡 웹뷰 이슈**:
  - 입력 폼 포커스 시 화면 틀어짐
  - 웹뷰 주소창 + 하단 네비 때문에 실제 가용 영역이 좁음
  - 테이블 스크롤/터치 동작이 부자연스러움
- **100대 소요일 산출 문제**:
  - 복수 작업 혼재: 하루에 여러 품목 작업 시 일평균 왜곡
  - 서브작업 포함: 메인작업만 봐야 하는데 서브/기타가 섞임
  - 데이터 부족 시 왜곡: 2~3일치로 평균 내면 비현실적 수치
  - 단순 `100 ÷ 일평균` 공식 자체 개선 필요

## Constraints

- **구조**: 단일 HTML 파일 유지 — 배포/관리 단순성
- **환경**: 카카오톡 인앱 웹뷰 호환 필수 — 주 사용 환경
- **백엔드**: Supabase 유지 — 기존 데이터/스키마 활용
- **기능**: 기존 4개 탭 기능 100% 유지 — 현장 운영 중

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 단일 HTML 유지 | 배포 단순성, 현장 운영 안정성 | — Pending |
| 모바일 퍼스트 접근 | 작업자 대부분이 카톡 웹뷰 사용 | — Pending |
| 100대 소요일 산출 로직 재설계 | 현재 단순 나누기로 비현실적 수치 발생 | — Pending |
| PWA 도입 | 오프라인/홈화면 추가로 앱 수준 경험 제공 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after initialization*
