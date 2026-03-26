# Phase 5: PWA - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

카카오톡 외 브라우저(Chrome, Safari)에서 앱을 홈 화면에 추가할 수 있고, Service Worker 캐싱으로 재방문 시 빠르게 로딩되며, 카카오톡 웹뷰에서는 SW를 안전하게 스킵한다. 오프라인 완전 동기화는 Out of Scope — 네트워크가 끊길 일이 거의 없는 환경이므로 최소한의 오프라인 처리만 한다.

</domain>

<decisions>
## Implementation Decisions

### 오프라인 UI 동작
- **D-01:** 오프라인 전용 화면 불필요. 네트워크 끊김이 거의 없는 환경이므로 캐시된 index.html 로드 + Supabase 호출 실패 시 기존 에러 처리 그대로 사용
- **D-02:** 네트워크 복구 시 별도 재연결 로직 불필요. 사용자가 직접 새로고침하거나 탭 전환으로 자연스럽게 데이터 재로드

### Service Worker 캐시 전략
- **D-03:** Supabase API 호출은 캐싱하지 않음 (항상 network-only). 정적 자산(index.html, 폰트)만 캐싱
- **D-04:** index.html 캐시 전략은 Claude 재량 (network-first vs stale-while-revalidate)

### PWA 아이콘/브랜딩
- **D-05:** 텍스트 기반 플레이스홀더 아이콘 생성 (192px, 512px). 나중에 디자이너 아이콘으로 교체 가능
- **D-06:** 앱 이름/테마 색상은 Claude 재량 (기존 CSS 변수 참고)

### 카카오톡 웹뷰 안전 가드
- **D-07:** 카카오톡 웹뷰 감지 시 SW 등록 방식은 Claude 재량 (UA 감지 스킵이 연구에서 권장됨)

### Claude's Discretion
- index.html 캐시 전략 (network-first vs stale-while-revalidate) — 연구 결과 기반으로 결정
- 앱 이름 (name, short_name), 테마 색상 (theme_color, background_color) — 기존 CSS 변수 참조
- KakaoTalk UA 감지 구현 방식 — 연구에서 KAKAOTALK UA 문자열 감지 권장
- 오프라인 시 기본 UI 표시 방식 — PWA-04 최소 충족 수준으로

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Core
- `.planning/PROJECT.md` — 프로젝트 비전, 제약조건 (단일 HTML 유지, 카카오톡 웹뷰 호환)
- `.planning/REQUIREMENTS.md` — PWA-01~04 요구사항 상세
- `.planning/ROADMAP.md` — Phase 5 성공 기준 4개
- `./CLAUDE.md` — Workbox 7.0.0 CDN, manifest.json, 카카오톡 UA 가드 기술 스택 결정

### Research
- `.planning/phases/05-pwa/05-RESEARCH.md` — PWA 구현 연구 (Workbox 패턴, KakaoTalk 가드, 오프라인 전략)

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-15 (viewport-fit=cover), D-17 (dvh/vh 전환) 결정

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- viewport meta 이미 `viewport-fit=cover` 포함 (Phase 1 D-15) — PWA standalone 모드에서도 안전
- `loadAll()` 함수 (line 473) — Supabase에서 전체 데이터 로드. 재연결 시 호출 가능
- `.toast` CSS + `showToast()` 함수 — 오프라인/온라인 상태 알림에 재사용 가능
- CSS 변수 시스템 (`:root`) — theme_color 등에 기존 --pri 색상 활용 가능

### Established Patterns
- 단일 index.html에 모든 CSS/JS 포함 — SW와 manifest.json은 별도 파일로 생성 필요
- CDN 의존성: Supabase JS, Pretendard 폰트 — 이들의 캐싱도 고려 필요

### Integration Points
- `<head>` 태그: `<link rel="manifest">` 추가 위치
- `<script>` 영역 끝부분: SW 등록 코드 삽입 위치
- `DOMContentLoaded` 또는 `loadAll()` 완료 후: SW 등록 타이밍

</code_context>

<specifics>
## Specific Ideas

- 네트워크가 끊길 일이 거의 없는 공장 환경 — 오프라인 기능은 최소한으로
- 아이콘은 플레이스홀더로 시작, 나중에 교체

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-pwa*
*Context gathered: 2026-03-26*
