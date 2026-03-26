---
phase: 05
slug: pwa
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser DevTools + manual verification (no test framework — single HTML file, no build step) |
| **Config file** | none |
| **Quick run command** | `grep -n "serviceWorker\|manifest\|KAKAOTALK" index.html` |
| **Full suite command** | Open index.html in Chrome DevTools → Application tab → check SW registration, manifest, cache storage |
| **Estimated runtime** | ~10 seconds (grep), ~30 seconds (browser) |

---

## Sampling Rate

- **After every task commit:** Run `grep -n "serviceWorker\|manifest\|KAKAOTALK" index.html`
- **After every plan wave:** Open Chrome DevTools → Application tab → verify SW, manifest, cache
- **Before `/gsd:verify-work`:** Full browser suite must pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PWA-01 | file check | `test -f manifest.json && grep '"name"' manifest.json` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PWA-01 | file check | `test -f icons/icon-192.png && test -f icons/icon-512.png` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | PWA-02 | file check | `test -f sw.js && grep "workbox" sw.js` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | PWA-03 | grep | `grep -n "KAKAOTALK" index.html` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | PWA-02,PWA-04 | grep | `grep -n "navigator.serviceWorker.register" index.html` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `manifest.json` — PWA manifest with name, icons, display, start_url
- [ ] `icons/icon-192.png` — 192x192 placeholder icon
- [ ] `icons/icon-512.png` — 512x512 placeholder icon
- [ ] `sw.js` — Service Worker with Workbox CDN importScripts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 홈 화면 추가 후 standalone 실행 | PWA-01 | Requires real device with Chrome/Safari | Chrome → Menu → "Add to Home Screen" → verify app opens without browser chrome |
| 카카오톡 웹뷰에서 SW 미등록 | PWA-03 | Requires KakaoTalk in-app browser on real device | Open URL in KakaoTalk chat → DevTools → Application → verify no SW registered |
| 오프라인 기본 UI 표시 | PWA-04 | Requires network disconnect simulation | Chrome DevTools → Network → Offline → reload page → verify cached HTML loads |
| 재방문 시 캐시 로딩 속도 | PWA-02 | Requires page reload timing | Chrome DevTools → Network → reload → verify index.html served from SW cache |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
