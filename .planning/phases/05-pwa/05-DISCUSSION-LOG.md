# Phase 5: PWA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 05-pwa
**Areas discussed:** 오프라인 UI 동작, Service Worker 캐시 전략, PWA 아이콘/브랜딩, 카카오톡 웹뷰 안전 가드

---

## 오프라인 UI 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 UI + 오프라인 배너 | 캐시된 index.html 로딩 + 상단 오프라인 배너 | |
| 최소 UI + 재연결 대기 화면 | 간단한 로고 + 재연결 메시지만 표시 | |
| Claude가 결정 | 연구 결과 기반 선택 | ✓ |

**User's choice:** Claude가 결정
**Notes:** 사용자가 "네트워크가 끊길 일이 없긴 해"라고 언급 → 오프라인 기능 최소화 결정

### 네트워크 복구 시 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 재로드 | online 이벤트 감지 시 loadAll() 자동 호출 | |
| 수동 새로고침 | 사용자가 직접 새로고침 버튼 클릭 | |
| Claude가 결정 | 연구 결과 기반 선택 | ✓ |

**User's choice:** Claude가 결정
**Notes:** 네트워크 끊김이 거의 없으므로 복잡한 재연결 로직 불필요

---

## Service Worker 캐시 전략

| Option | Description | Selected |
|--------|-------------|----------|
| Network-first | 항상 최신 우선, 실패 시 캐시 | |
| Stale-while-revalidate | 캐시 즉시 + 백그라운드 업데이트 | |
| Claude가 결정 | 연구 결과 기반 선택 | ✓ |

**User's choice:** Claude가 결정

### API 캐싱

| Option | Description | Selected |
|--------|-------------|----------|
| API 캐싱 없음 | Supabase 호출은 항상 network-only | ✓ |
| Claude가 결정 | 연구 결과 기반 선택 | |

**User's choice:** API 캐싱 없음
**Notes:** 정적 자산만 캐싱, Supabase API는 항상 네트워크

---

## PWA 아이콘/브랜딩

### 아이콘 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 플레이스홀더 | 텍스트 기반 아이콘 (192px/512px) | ✓ |
| 아이콘 직접 제공 | 사용자가 파일 제공 | |
| Claude가 결정 | 연구 결과 기반 선택 | |

**User's choice:** 기본 플레이스홀더

### 앱 이름/테마

| Option | Description | Selected |
|--------|-------------|----------|
| 생산관리 + 기존 색상 | name: '생산관리', theme_color는 기존 --pri | |
| 다른 이름/색상 지정 | 직접 지정 | |
| Claude가 결정 | 연구 결과 기반 선택 | ✓ |

**User's choice:** Claude가 결정

---

## 카카오톡 웹뷰 안전 가드

| Option | Description | Selected |
|--------|-------------|----------|
| UA 감지로 완전 스킵 | KAKAOTALK UA 감지 시 SW 등록 자체 스킵 | |
| SW 등록하되 캐시 비활성화 | SW는 등록, 캐시만 비활성화 | |
| Claude가 결정 | 연구 결과 기반 선택 | ✓ |

**User's choice:** Claude가 결정

---

## Claude's Discretion

- 오프라인 UI 표시 방식 (최소화 방향 확정)
- index.html 캐시 전략 (network-first vs stale-while-revalidate)
- 앱 이름/테마 색상
- KakaoTalk UA 감지 구현 방식

## Deferred Ideas

None — discussion stayed within phase scope
