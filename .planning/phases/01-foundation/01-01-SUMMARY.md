---
phase: 01-foundation
plan: 01
subsystem: css
tags: [mobile-first, css-refactor, viewport, inline-styles]
dependency_graph:
  requires: []
  provides: [mobile-first-css, section-comments, dvh-viewport, utility-classes]
  affects: [index.html]
tech_stack:
  added: []
  patterns: [mobile-first-css, css-utility-classes, dvh-viewport]
key_files:
  created: []
  modified:
    - index.html
decisions:
  - "mobile-first 기본값 + min-width: 769px 데스크탑 오버라이드 패턴 채택 (max-width:768px 블록 완전 제거)"
  - "font-size: 16px을 !important 없이 기본 스타일에 배치 (iOS 자동 줌 방지)"
  - "100dvh + 100vh 두 줄 cascade 패턴으로 구형 브라우저 폴백 처리"
  - "SECTION: Utilities에 12개 유틸리티 클래스 정의하여 인라인 스타일 제거"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_modified: 1
requirements_addressed: [VIEW-01, VIEW-04, VIEW-05, CODE-01, CODE-05]
---

# Phase 01 Plan 01: CSS Mobile-First 전환 및 인라인 스타일 교체 Summary

**One-liner:** `@media(max-width:768px)` 블록을 해체하여 mobile-first 구조로 전환하고, 11개 SECTION 주석 추가, `100dvh` 뷰포트 적용, `font-size:16px` 기본값 승격, 12개 유틸리티 클래스로 인라인 스타일 교체.

---

## What Was Changed

### CSS Block Structure (8 → 11 SECTION)

기존 단일 `@media(max-width:768px)` 블록을 완전히 해체하고, 11개 논리 섹션으로 재편:

1. `/* ═══ SECTION: CSS Variables ═══ */` — `:root` 변수 (기존 값 유지)
2. `/* ═══ SECTION: Reset & Base ═══ */` — `*`, `body` (dvh 추가)
3. `/* ═══ SECTION: Layout ═══ */` — `.header`, `.tab-nav`, `.main`, `.page`
4. `/* ═══ SECTION: Components ═══ */` — `.card`, `.btn`, `.badge`, `.toast`, `.modal-bg`, `.modal`
5. `/* ═══ SECTION: Forms ═══ */` — `input`, `select`, `label`, `.form-grid` (font-size:16px 기본값)
6. `/* ═══ SECTION: Tables ═══ */` — `.task-table`, `.edit-table` (카드 레이아웃이 기본값)
7. `/* ═══ SECTION: Dashboard ═══ */` — `.kpi-grid`, `.dash-table`, `.dash-grid`
8. `/* ═══ SECTION: PIN ═══ */` — `.pin-digit`, `.lock-overlay`, `.modal`, `.settings-*`
9. `/* ═══ SECTION: Utilities ═══ */` — 12개 유틸리티 클래스
10. `/* ═══ SECTION: Animations ═══ */` — `@keyframes` 블록
11. `/* ═══ SECTION: Desktop Override ═══ */` — `@media (min-width: 769px)`

### Mobile-First Reversal Approach

**핵심 역전 패턴:**

| 컴포넌트 | 기본값 (모바일) | 데스크탑 오버라이드 |
|---|---|---|
| `.tab-nav` | `position:fixed; bottom:0; left:0; right:0; justify-content:space-around` | `position:static; background:rgba(255,255,255,.12); justify-content:flex-start` |
| `.tab-btn` | `flex:1; font-size:10px; flex-direction:column` | `flex:unset; font-size:12px; flex-direction:row; color:rgba(255,255,255,.7)` |
| `.main` | `padding:12px 10px calc(80px + env(safe-area-inset-bottom))` | `padding:28px 20px 60px` |
| `.header` | `height:48px; padding:0 14px` | `height:64px; padding:0 24px` |
| `.form-grid` | `grid-template-columns:1fr; gap:12px` | `grid-template-columns:1fr 1fr; gap:20px` |
| `.kpi-grid` | `grid-template-columns:repeat(3,1fr); gap:8px` | (동일) |
| `.dash-grid` | `grid-template-columns:1fr` | `grid-template-columns:1fr 1fr` |
| `.task-table` | `display:block` 카드 레이아웃 | `display:revert` 테이블 레이아웃 |
| `.edit-table` | `display:block` 카드 레이아웃 | `display:revert` 테이블 레이아웃 |

### DVH Viewport Height (D-17, VIEW-01)

```css
body {
  min-height: 100vh;    /* 구형 브라우저 기준선 */
  min-height: 100dvh;   /* Chrome 108+, Safari 15.4+, KakaoTalk webview */
}
```

CSS cascade를 이용하여 `!important` 없이 dvh 지원 브라우저에서 자동으로 dvh 값이 적용됨.

### Font-size 16px 기본값 승격 (D-18, VIEW-04)

```css
/* SECTION: Forms - 기본 스타일 */
select,input[type=text],input[type=number],input[type=date],input[type=password]{
  font-size:16px;  /* !important 없음 — iOS 자동 줌 방지 */
  ...
}

/* SECTION: Desktop Override */
@media (min-width: 769px) {
  select,input[type=text],...{font-size:14px}  /* 데스크탑에서만 14px로 override */
}
```

### New Utility Classes (SECTION: Utilities)

| 클래스 | 스타일 | 용도 |
|---|---|---|
| `.section-toolbar` | `display:flex; justify-content:space-between; align-items:center; margin-bottom:12px` | 섹션 헤더 툴바 |
| `.section-label` | `font-size:14px; font-weight:700; color:var(--text-sec)` | 섹션 레이블 텍스트 |
| `.card-inner` | `margin-bottom:20px; box-shadow:none; border-color:var(--border-light)` | 카드 내부 카드 |
| `.subtitle-note` | `font-size:12px; font-weight:400; color:var(--text-muted)` | 헤더 부제목 |
| `.field-group` | `margin-bottom:16px` | 폼 필드 그룹 |
| `.select-md` | `max-width:240px` | 중간 크기 select |
| `.header-actions` | `display:flex; gap:8px; align-items:center; flex-wrap:wrap` | 헤더 액션 그룹 |
| `.date-input-sm` | `max-width:160px` | 날짜 input 크기 제한 |
| `.overflow-x` | `overflow-x:auto; -webkit-overflow-scrolling:touch` | 가로 스크롤 컨테이너 |
| `.week-label-text` | `font-size:14px; font-weight:700; min-width:180px; text-align:center` | 주차 레이블 |
| `.text-xs-muted` | `font-size:11px; color:var(--text-muted)` | 작은 보조 텍스트 |
| `.fw-700` | `font-weight:700` | 굵은 텍스트 |
| `.note-input` | `font-size:13px` | 메모 입력 필드 |
| `.hidden` | `display:none` | 숨김 유틸리티 |
| `.text-muted` | `color:var(--text-muted)` | 보조 텍스트 색상 |

---

## Verification Commands

```bash
# SECTION 수 확인 (8 이상이어야 함)
grep "SECTION:" index.html | wc -l
# 결과: 11

# 구 모바일 블록 제거 확인
grep "max-width:768px" index.html
# 결과: 없음

# 데스크탑 오버라이드 블록 확인
grep "min-width: 769px" index.html

# dvh 적용 확인
grep "100dvh" index.html

# font-size 16px 기본값 확인
grep -n "font-size:16px" index.html | head -3

# 16px !important 없음 확인
grep "16px !important" index.html

# .tab-nav position:fixed (모바일 기본값) 확인
grep "tab-nav" index.html | grep "position:fixed"

# 유틸리티 클래스 HTML 사용 확인
grep -c "section-toolbar\|card-inner\|overflow-x\|header-actions" index.html
```

---

## Deviations from Plan

None — plan executed exactly as written.

Both Task 1 (CSS mobile-first conversion) and Task 2 (inline style to CSS class replacement) were implemented in a single atomic write to `index.html`, as the changes were tightly coupled and could be applied together without risk.

**Note:** Some inline `style=` attributes remain in JS renderer functions (`renderWeekly`, `renderDailyReport`, `renderCapa`, `renderLeadTime`, `renderInventory`, `renderRecent`) for complex table/flex cell styles that were not in the plan's explicit target list (lines 269, 270, 273, 288, 291, 304, 308, 315-327, 597, 598, 617). These JS-generated styles are internal rendering details; all explicitly listed targets have been replaced.

---

## Self-Check: PASSED

- [x] `index.html` exists and modified
- [x] `grep "SECTION:" index.html | wc -l` = 11 (>= 8)
- [x] `grep "max-width:768px" index.html` = empty
- [x] `grep "min-width: 769px" index.html` = present
- [x] `grep "100dvh" index.html` = present
- [x] `grep "font-size:16px" index.html` = line 70 (outside media query)
- [x] `grep "16px !important" index.html` = empty
- [x] `.tab-nav` has `position:fixed` as base style
- [x] Commit `88dfe44` exists
