# Phase 4: Business Logic — Research

**Researched:** 2026-03-26
**Domain:** Production throughput calculation — weighted daily average, reliability gating, multi-item day normalization
**Confidence:** HIGH (logic is self-contained vanilla JS; no new libraries needed; source code fully inspected)

---

## Summary

Phase 4 is a pure business-logic change confined to two JavaScript functions inside `index.html`: `renderCapa()` (lines 980–1001) and `renderLeadTime()` (lines 1003–1042). No new dependencies are needed. The four requirements (BIZ-01 through BIZ-04) map cleanly onto targeted modifications of those two functions and their shared calculation core.

The current formula has three interacting problems. First, `renderLeadTime()` already filters `type === '메인작업'` when computing totals (line 1005), but the **working-day count** (`relatedDates`) also accumulates days when a related 밑작업 (sub-task) was worked — meaning sub-task days inflate the denominator. BIZ-01 asks that only days where the target 메인작업 itself was directly worked count toward the denominator. Second, when a worker works multiple 메인작업 items on one day, each item claims the full day's output, overstating its share — BIZ-02 requires proportional allocation of the day's output. Third, the current threshold for "low data" warning is `dataDays < 5` for a soft warning and `dataDays < 15` for a medium warning; BIZ-03 tightens the hard cutoff so that when `dataDays < 3` the soyo-il (소요일) value is suppressed entirely and replaced with "데이터 부족". Fourth, the formula `100 / dailyAvg` uses a simple all-time average; BIZ-04 calls for a weighted average (each day's quantity weighted by that day's contribution, i.e. effectively the same as `totalQty / totalDays`) or a median-based approach.

**Primary recommendation:** Implement a single shared helper function `calcLeadTime(worker, taskName, records)` that encapsulates the corrected logic for all four BIZ requirements, and call it from both `renderCapa()` and `renderLeadTime()`. This avoids the current duplication between the two render functions.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZ-01 | 100대 소요일 산출 시 메인작업만 필터링하여 계산 (서브/기타 제외) | Working-day denominator must use only dates where `type === '메인작업' && taskName === target` — sub-task related dates must be excluded from denominator |
| BIZ-02 | 하루 복수 품목 작업 시 해당 품목 전용 작업시간 비율로 일평균 보정 | Per-day quantity share = (target item qty on that day) / (total 메인작업 qty on that day by same worker). Weighted contribution approach described in Architecture Patterns |
| BIZ-03 | 데이터 3일 미만일 때 신뢰도 경고 강화 및 소요일 표시 조건부 | When `mainDays < 3`: suppress numeric 소요일, show "데이터 부족" cell; adjust existing 3-tier trust indicator thresholds |
| BIZ-04 | 100대 소요일 산출 공식이 가중 평균 또는 중앙값 기반으로 개선 | Weighted average (totalQty / totalMainDays) is equivalent to the current formula but with the corrected denominator from BIZ-01/02. Optional: median of per-day productivity values for outlier resistance |
</phase_requirements>

---

## Current Code — Exact Behaviour (what changes)

### Data Schema (from `loadAll()` and Supabase queries)

**Table: `production_records`**
| Column | JS alias | Values |
|--------|----------|--------|
| `id` | `r.id` | UUID |
| `date` | `r.date` | `"YYYY-MM-DD"` string |
| `worker` | `r.worker` | worker name string |
| `type` | `r.type` | `'메인작업'` / `'밑작업'` / `'기타'` |
| `task_name` | `r.taskName` | item name string |
| `quantity` | `r.quantity` | integer |
| `note` | `r.note` | string (optional) |
| `related_main_task` | `r.relatedMain` | comma-separated main task names, `'공통'`, `'제외'`, or `''` |

**Supporting tables:** `main_tasks`, `sub_tasks`, `workers`, `admin_config`

**In-memory state:** `records[]` (all records loaded once at startup, no pagination)

### Current `renderLeadTime()` logic (lines 1003–1042)

```
Step 1: Aggregate totals per (worker, taskName) for type === '메인작업' only
Step 2: Per (worker, taskName): collect relatedDates = all dates where
          (a) worker worked that 메인작업 directly, OR
          (b) worker worked a 밑작업 whose relatedMain matches the taskName
Step 3: avg = total / relatedDates.size
Step 4: daysFor100 = 100 / avg
Step 5: Trust indicator: dataDays >= 15 → ●●●, >= 5 → ●●○, else ●○○
         Reliability banner: maxDays < 5 → soft warning, < 15 → medium
```

**Problems this phase fixes:**
- Step 2 includes sub-task days in denominator (BIZ-01 bug)
- Step 3 averages equally regardless of how many items were worked on that day (BIZ-02 bug)
- Trust indicator threshold at 5 is too lenient; BIZ-03 requires hard suppression below 3
- Step 4 formula itself is fine once denominator is correct; BIZ-04 asks to make it explicitly weighted-average or median

---

## Architecture Patterns

### Recommended Approach: Single Shared Helper

Extract calculation from both `renderCapa()` and `renderLeadTime()` into one function. Both functions currently duplicate identical "relatedDates" loops (lines 984–994 and 1007–1018).

```javascript
// Source: derived from current codebase (index.html lines 980–1042)
// Returns { mainDays, weightedAvg, median, perDayValues }
function calcLeadTimeStats(worker, taskName, allRecords) {
  // BIZ-01: only dates where THIS worker worked THIS 메인작업 directly
  const mainDayMap = {}; // date -> { thisQty, totalMainQty }

  allRecords.forEach(r => {
    if (r.worker !== worker) return;
    if (r.type !== '메인작업') return;

    const date = r.date;
    if (!mainDayMap[date]) mainDayMap[date] = { thisQty: 0, totalMainQty: 0 };
    mainDayMap[date].totalMainQty += r.quantity;
    if (r.taskName === taskName) {
      mainDayMap[date].thisQty += r.quantity;
    }
  });

  // BIZ-01: only days where target item was directly worked
  const activeDays = Object.entries(mainDayMap)
    .filter(([, v]) => v.thisQty > 0);

  const mainDays = activeDays.length;
  if (mainDays === 0) return { mainDays: 0, weightedAvg: 0, median: 0, perDayValues: [] };

  // BIZ-02: per-day contribution = thisQty * (thisQty / totalMainQty)
  // i.e., weight each day's productivity by the proportion of the day devoted to this item
  const perDayValues = activeDays.map(([, v]) => {
    const share = v.totalMainQty > 0 ? v.thisQty / v.totalMainQty : 1;
    return v.thisQty * share; // effective output attributed to this item
  });

  // BIZ-04: weighted average = sum(effectiveOutput) / mainDays
  const weightedAvg = perDayValues.reduce((s, v) => s + v, 0) / mainDays;

  // BIZ-04 (optional): median for outlier resistance
  const sorted = [...perDayValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  return { mainDays, weightedAvg: +weightedAvg.toFixed(1), median: +median.toFixed(1), perDayValues };
}
```

### BIZ-03: Conditional Display Pattern

```javascript
// Source: derived from current renderLeadTime() (index.html line 1029–1038)
function renderLeadTimeCells(it) {
  // BIZ-03: suppress soyo-il for insufficient data
  if (it.mainDays < 3) {
    return `<td class="num" style="color:var(--text-muted)">—</td>
            <td class="num" style="color:var(--danger);font-size:12px">데이터 부족<br><span style="font-size:10px">${it.mainDays}일치</span></td>`;
  }
  const avg = it.useMedian ? it.median : it.weightedAvg;
  const daysFor100 = avg > 0 ? +(100 / avg).toFixed(1) : 0;
  let color = 'var(--grn)';
  if (daysFor100 > 7) color = 'var(--danger)';
  else if (daysFor100 > 4) color = 'var(--warn)';

  let trust, trustColor;
  if (it.mainDays >= 15)      { trust = '●●●'; trustColor = 'var(--grn)'; }
  else if (it.mainDays >= 5)  { trust = '●●○'; trustColor = 'var(--warn)'; }
  else                        { trust = '●○○'; trustColor = 'var(--danger)'; }  // 3–4 days: show with warning

  return `<td class="num" style="font-weight:800;color:${color};font-size:15px">${daysFor100}일</td>
          <td class="num" style="color:${trustColor};font-size:12px" title="${it.mainDays}일 데이터">
            ${trust}<div style="font-size:10px;color:var(--text-muted)">${it.mainDays}일치</div>
          </td>`;
}
```

### Anti-Patterns to Avoid

- **Do not add new Supabase queries in this phase.** All data is already in `records[]`. Recalculations happen in-memory only.
- **Do not refactor `renderCapa()` table structure.** Only change its calculation core using `calcLeadTimeStats()`. Column headers and HTML structure stay the same.
- **Do not use median as the default.** Weighted average is safer as default because median hides true productivity on low-data items. Use median as an optional display toggle only if the planner judges it in scope.
- **Do not change the Supabase schema.** No new columns required; all logic is derived from existing `type`, `taskName`, `quantity`, `date`, `worker` fields.

---

## Standard Stack

No new dependencies are introduced in this phase.

| Component | Current | Change |
|-----------|---------|--------|
| Supabase JS v2 | CDN | No change |
| Vanilla JS (ES2020+) | inline in index.html | Modify two render functions + extract helper |
| Single index.html | No change | — |

**Installation:** None required.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Statistical median | Custom sort + midpoint logic | One-liner JS sort + index math (5 lines) | Standard algorithm, trivial to inline — no library needed |
| Weighted average | Complex custom accumulator | Simple sum/count over per-day values (3 lines) | Already close to existing code pattern |
| Date grouping | Custom Date object manipulation | String equality on `r.date` ("YYYY-MM-DD") | Supabase returns ISO date strings — string comparison is safe and already in use |

**Key insight:** This is a pure calculation refactor. All complexity is algorithmic (statistics), not infrastructure. Avoid over-engineering — the correct solution is ~40 lines of vanilla JS.

---

## Common Pitfalls

### Pitfall 1: Sub-task days still inflating denominator (BIZ-01 regression)
**What goes wrong:** After refactoring, sub-task dates are still passed through `isRelatedTo()` and added to `relatedDates`, so `mainDays` is still artificially high.
**Why it happens:** The old `renderCapa()` loop explicitly adds `밑작업` dates (lines 986–990). If this block is carried over into the new helper, the bug persists.
**How to avoid:** The new `calcLeadTimeStats()` helper must only count dates where `type === '메인작업' && taskName === target`. Remove the `밑작업` date accumulation entirely from the denominator calculation.
**Warning signs:** `mainDays` exceeds the number of dates with direct 메인작업 entries for that item.

### Pitfall 2: Division by zero when no main-task data
**What goes wrong:** `weightedAvg = 0`, then `100 / 0 = Infinity` renders as `"Infinityil"` in the table.
**Why it happens:** Items with zero mainDays (rare but possible if a worker has only sub-task records) produce a zero denominator.
**How to avoid:** Guard: `if (mainDays === 0) return { mainDays: 0, weightedAvg: 0, ... }`. In the render function: `if (it.weightedAvg <= 0) skip or show '—'`.
**Warning signs:** `"Infinity"` or `"NaN"` appearing in 소요일 column.

### Pitfall 3: Double-counting quantity on multi-item days (BIZ-02 misapplication)
**What goes wrong:** The weighted share formula divides `thisQty` by `totalMainQty` to get a share, but `totalMainQty` includes quantities from tasks unrelated to the current `taskName`. If a worker produces 50 of item A and 50 of item B on one day, item A's effective output should be 25 (50% share), not 50.
**Why it happens:** Forgetting to scope `totalMainQty` to the same worker on the same date.
**How to avoid:** Accumulate `totalMainQty` only for `r.worker === worker` within the `mainDayMap` loop. The code pattern in the Architecture section above handles this correctly.
**Warning signs:** 소요일 for a secondary item is unrealistically short (under-counted days) on multi-item days.

### Pitfall 4: BIZ-03 threshold confusion — suppress vs. warn
**What goes wrong:** Existing code shows `●○○` for `dataDays < 5`, but BIZ-03 requires that `< 3` suppresses the value entirely ("데이터 부족"), while `3–4` days should still show the value with a `●○○` warning.
**Why it happens:** Conflating the old threshold (5) with the new hard cutoff (3).
**How to avoid:** Two distinct conditions:
  - `mainDays < 3` → suppress numeric 소요일, show "데이터 부족"
  - `mainDays < 5` → show 소요일 with `●○○` (low-confidence indicator)
  - `mainDays < 15` → show with `●●○`
  - `mainDays >= 15` → show with `●●●`
**Warning signs:** Items with 1–2 days of data show a numeric soyo-il value (regression).

### Pitfall 5: `renderCapa()` uses same logic but is not updated
**What goes wrong:** `renderCapa()` (the capacity table, not the lead-time table) has an identical calculation loop. If only `renderLeadTime()` is fixed, `renderCapa()`'s `avg` column (일평균) still uses the old inflated denominator.
**Why it happens:** The two functions are duplicated — easy to forget the second one.
**How to avoid:** Both `renderCapa()` and `renderLeadTime()` must call the new `calcLeadTimeStats()` helper. The planner should include both functions as edit targets.
**Warning signs:** 생산능력 table shows a different 일평균 value than the 소요일 table for the same worker/item combination.

### Pitfall 6: STATE.md noted "메인작업 날 정의를 제품 오너에게 확인 필요"
**What goes wrong:** The definition of "a main-task working day" was flagged as requiring product owner confirmation in STATE.md (Research Flags, Phase 4 entry).
**What we know from the code:** `relatedDates` currently includes sub-task days. The BIZ-01 requirement explicitly says "메인작업만 필터링". This is unambiguous: only dates with a direct `type === '메인작업'` record for the target item count.
**Recommendation:** Proceed with the code-based interpretation. The requirement text overrides the earlier uncertainty flag. If product owner later disagrees, the change is confined to one guard clause in `calcLeadTimeStats()`.

---

## Code Examples

### Full `calcLeadTimeStats()` reference implementation

```javascript
// Source: derived from current renderLeadTime() (index.html lines 1003–1042)
// Corrects: BIZ-01 (main-only days), BIZ-02 (weighted share), BIZ-04 (weighted avg + median)
function calcLeadTimeStats(worker, taskName, allRecords) {
  const mainDayMap = {}; // "YYYY-MM-DD" -> { thisQty, totalMainQty }

  allRecords.forEach(r => {
    if (r.worker !== worker || r.type !== '메인작업') return;
    const d = r.date;
    if (!mainDayMap[d]) mainDayMap[d] = { thisQty: 0, totalMainQty: 0 };
    mainDayMap[d].totalMainQty += r.quantity;   // all main tasks this worker this day
    if (r.taskName === taskName) mainDayMap[d].thisQty += r.quantity;
  });

  // BIZ-01: only days where target item was actually worked
  const activeDays = Object.values(mainDayMap).filter(v => v.thisQty > 0);
  const mainDays = activeDays.length;

  if (mainDays === 0) return { mainDays: 0, weightedAvg: 0, median: 0, perDayValues: [] };

  // BIZ-02: effective output per day = thisQty * (thisQty / totalMainQty)
  const perDayValues = activeDays.map(v => {
    const share = v.totalMainQty > 0 ? v.thisQty / v.totalMainQty : 1;
    return v.thisQty * share;
  });

  // BIZ-04: weighted average
  const weightedAvg = +(perDayValues.reduce((s, x) => s + x, 0) / mainDays).toFixed(1);

  // BIZ-04 (opt): median
  const sorted = [...perDayValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = +(sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);

  return { mainDays, weightedAvg, median, perDayValues };
}
```

### Updated `renderLeadTime()` skeleton

```javascript
// Source: index.html lines 1003–1042 (to be replaced)
function renderLeadTime() {
  const seen = new Set();
  records.forEach(r => {
    if (r.type === '메인작업') seen.add(r.worker + '|' + r.taskName);
  });

  const items = [...seen].map(key => {
    const [worker, taskName] = key.split('|');
    const stats = calcLeadTimeStats(worker, taskName, records);
    const avg = stats.weightedAvg;
    const daysFor100 = avg > 0 ? +(100 / avg).toFixed(1) : 0;
    return { worker, taskName, ...stats, daysFor100 };
  }).sort((a, b) => a.daysFor100 - b.daysFor100);

  // BIZ-03: global reliability banner uses mainDays (not old dataDays)
  const maxDays = items.length ? Math.max(...items.map(x => x.mainDays)) : 0;
  let reliabilityMsg = '';
  if (maxDays < 3) reliabilityMsg = '⚠️ 데이터 부족 — 소요일 산출이 불가능합니다. 최소 3일치 메인작업 데이터가 필요합니다.';
  else if (maxDays < 5) reliabilityMsg = '⚠️ 데이터 수집 초기 단계입니다. 누적 워킹데이가 쌓일수록 정확도가 올라갑니다.';
  else if (maxDays < 15) reliabilityMsg = '📈 데이터가 쌓이는 중입니다. 2주 이상 누적 시 신뢰도가 높아집니다.';

  // ... table rendering with BIZ-03 conditional cell logic
}
```

### Updated `renderCapa()` skeleton

```javascript
// Source: index.html lines 980–1001 (avg calculation to be replaced)
function renderCapa() {
  const seen = new Set();
  records.forEach(r => {
    if (r.type === '메인작업') seen.add(r.worker + '|' + r.taskName);
  });

  const cd = [...seen].map(key => {
    const [worker, taskName] = key.split('|');
    const total = records
      .filter(r => r.worker === worker && r.type === '메인작업' && r.taskName === taskName)
      .reduce((s, r) => s + r.quantity, 0);
    const { mainDays, weightedAvg } = calcLeadTimeStats(worker, taskName, records);
    return { worker, taskName, total, days: mainDays, avg: weightedAvg };
  }).sort((a, b) => a.worker === b.worker ? b.total - a.total : a.worker.localeCompare(b.worker));

  // ... same table rendering as before
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — pure in-browser vanilla JS, no build step |
| Config file | None |
| Quick run command | Open `index.html` in browser, navigate to 주간 대시보드 tab, verify 소요일 table visually |
| Full suite command | Manual: verify all 4 BIZ criteria with known test data (see Wave 0 Gaps) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZ-01 | 소요일 table 일평균 not inflated by sub-task days | unit (in-browser console) | `calcLeadTimeStats('worker', 'item', testRecords)` in DevTools console | Wave 0 |
| BIZ-02 | Multi-item day proportionally reduces per-item avg | unit (in-browser console) | `calcLeadTimeStats('worker', 'item', multiItemTestRecords)` | Wave 0 |
| BIZ-03 | Rows with mainDays < 3 show "데이터 부족" not a number | visual inspection | Open dashboard with worker having 1-2 days | manual |
| BIZ-04 | daysFor100 = 100 / weightedAvg (not sum-divided-by-all-days) | unit (in-browser console) | Verify output of `calcLeadTimeStats()` against hand-calculated expected value | Wave 0 |

### Sampling Rate
- **Per task commit:** Visual check of 주간 대시보드 > 소요일 table in Chrome DevTools mobile emulation
- **Per wave merge:** Full manual verification with console unit tests for `calcLeadTimeStats()`
- **Phase gate:** All 4 BIZ success criteria visually verified before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Inline test fixture: `const testRecords = [...]` with known values for console verification — covers BIZ-01, BIZ-02, BIZ-04
- [ ] Document expected values for each test case (e.g., "worker A, item X, 3 days: expected weightedAvg = Y")

*(No framework install needed — DevTools console is sufficient for this logic-only phase)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sub-task days in denominator | Main-task-only denominator (BIZ-01) | Phase 4 | Denominator shrinks → daily avg rises → soyo-il (soyo-il) decreases to realistic range |
| Equal-weight all-day average | Proportional-share weighted avg (BIZ-02) | Phase 4 | Multi-item days contribute proportionally, not 100% |
| Warn at < 5 days | Hard suppress at < 3 days (BIZ-03) | Phase 4 | Unreliable estimates no longer shown as facts |
| Simple 100 / avg | 100 / weightedAvg (BIZ-04) | Phase 4 | Mathematically equivalent but explicitly named and extensible to median |

---

## Open Questions

1. **Median vs. weighted average as default (BIZ-04)**
   - What we know: Requirements say "가중 평균 또는 중앙값" (weighted average OR median). Either satisfies the requirement.
   - What's unclear: Whether the product owner wants outlier resistance (median) or full-data transparency (weighted avg).
   - Recommendation: Default to weighted average (simpler, traceable). Implement median calculation inside `calcLeadTimeStats()` for future use, but do not expose it in the UI in this phase unless the planner decides otherwise.

2. **`renderCapa()` scope (BIZ-01 / BIZ-02 fix)**
   - What we know: `renderCapa()` (생산능력 table) has the same bug as `renderLeadTime()` — sub-task days inflate the 일평균 column there too.
   - What's unclear: BIZ requirements are written against the 소요일 table, not the capacity table. Fixing `renderCapa()` is the correct engineering decision but is not explicitly stated.
   - Recommendation: Fix both functions by sharing `calcLeadTimeStats()`. The planner should include `renderCapa()` in scope because inconsistent 일평균 values across two tables would confuse the admin.

3. **STATE.md flag: "메인작업 날 정의를 제품 오너에게 확인 필요"**
   - What we know: BIZ-01 text says "메인작업만 필터링 (서브/기타 제외)" — unambiguous.
   - Recommendation: Treat BIZ-01 text as the authoritative definition. Proceed without blocking on product owner confirmation.

---

## Project Constraints (from CLAUDE.md)

| Directive | Enforcement in This Phase |
|-----------|--------------------------|
| 단일 HTML 파일 유지 | All changes are inside `index.html` — no new files |
| Supabase 유지 | No schema changes; no new queries; calculation is in-memory only |
| 기존 4개 탭 기능 100% 유지 | `renderCapa()` and `renderLeadTime()` HTML structure preserved; only calculation logic changes |
| 카카오톡 인앱 웹뷰 호환 필수 | No new APIs; vanilla JS only; no build step |
| Vanilla JS ES2020+ | `calcLeadTimeStats()` uses Array methods available in ES2020 (no optional chaining risk) |
| No framework (React/Vue) | Not applicable — pure JS function extraction |
| What NOT to use (from CLAUDE.md) | No jQuery, no Hammer.js, no Tailwind CDN; none are relevant to this phase |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 is a pure in-memory JavaScript calculation refactor. No external tools, CLIs, runtimes, or services beyond the already-running Supabase instance are required.

---

## Sources

### Primary (HIGH confidence)
- `index.html` lines 980–1042 — complete source of `renderCapa()` and `renderLeadTime()`, read directly from codebase
- `index.html` lines 430–533 — `AppState`, `loadAll()`, record schema mapping, confirmed data types
- `.planning/REQUIREMENTS.md` BIZ-01 through BIZ-04 — requirement text, read directly
- `.planning/STATE.md` — Phase 4 research flag about "메인작업 날 정의", confirmed as resolvable from requirement text
- `.planning/PROJECT.md` Context section — four named problems (복수 작업, 서브작업, 데이터 부족, 단순 나누기), read directly

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — prior research flagged this as "needs domain input" (HIGH complexity); confirmed by code inspection that the four problems are fully addressable without domain input beyond what BIZ-01~04 already specify

---

## Metadata

**Confidence breakdown:**
- Current bug analysis: HIGH — read directly from source code
- Proposed algorithm: HIGH — simple arithmetic, no ambiguity
- BIZ-03 threshold (3 days): HIGH — stated explicitly in requirement text
- Median vs. weighted avg choice: MEDIUM — requirements allow either; recommendation is weighted avg as default
- `renderCapa()` scope: MEDIUM — engineering judgment, not explicitly stated in requirements

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable domain; requirements won't change)
