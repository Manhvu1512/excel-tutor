# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # serve production build
npx tsc --noEmit # type-check without emitting (no lint script configured)
```

There is no test runner configured. Type-check is the primary correctness gate.

## Architecture

### Routing model — no page-level routes

The app has a **single server-rendered entry point** (`app/page.tsx`) that loads `LessonConfig` and CSV data from the filesystem, then mounts `AppRoot`. All view changes happen client-side via a `useState` view discriminator in `app/AppRoot.tsx`:

```
"home" → HomePage
"practice" → ClientApp (free-practice mode)
"scenarios" → ScenariosPage
"scenario" + scenarioId === "invoice" → ScenarioApp
"scenario" + scenarioId === "budget"  → BudgetScenarioApp
```

Adding a new scenario means: (1) creating a `*ScenarioApp.tsx` under `app/`, (2) a `*ScenarioWidget.tsx` and `*IntroPage.tsx` under `components/`, (3) a validators file under `lib/validators/`, and (4) adding the routing branch in `AppRoot.tsx`.

### Scenario exercise flow

Each `*ScenarioApp` owns the full exercise lifecycle:
- A `TASKS` array holds human-readable content (title, scenario, controllerAsk, tutorFocus).
- A parallel `*_VALIDATORS` registry (from `lib/validators/`) holds answer ranges, expected values, and XP rewards.
- `validateRange()` from `lib/validators/rangeValidator.ts` runs client-side O(n) — no server round-trip for grading.
- A correct submission calls `POST /api/grade` for a celebration JSON response; a wrong submission streams a Socratic nudge from the same route.
- The spreadsheet is rendered by the matching `*ScenarioWidget`, which wraps **Univer** (`@univerjs/preset-sheets-core` 0.5.4). Cell data is built programmatically at init time from imported JSON files — the workbook is not fetched from a server.

### Validator pattern

`lib/validators/rangeValidator.ts` defines the core engine:
- `ExpectedCell` = `{ value, rule: ValidationRule }` — discriminated union covering `exact_text`, `numeric_tolerance`, `status_enum`, `formula_presence`, `any_non_blank`, `exact_text_or_blank`.
- `cell.*` helpers build `ExpectedCell` instances: `cell.text()`, `cell.num()`, `cell.status()`, `cell.textOrBlank()`.
- `validateRange(userValues, userFormulas, expected, opts)` returns a `ValidationResult` with `score`, `correct`, `error_rows`, and a typed `error_summary`.

Each scenario has its own validator file (e.g., `lib/validators/budgetValidators.ts`) that imports the raw JSON data, precomputes all expected values at module load, and exports a `Record<string, TaskConfig>` registry keyed by task ID (`T01`…`Tn`).

### Univer spreadsheet integration

- `lib/validators/univerAdapter.ts` — `readRange()` extracts cell values and formula strings from a live Univer workbook instance.
- Each widget builds `cellData` objects in the shape `Record<row, Record<col, { v, s }>>` where `s` is a Univer style object.
- Named style constants (`HDR`, `WARN`, `MINT`, `AMBER`, etc.) are defined at the top of each widget file.
- The `resetKey` prop triggers clearing the answer range without re-initialising Univer.
- `SHEET_IDS` maps display names → Univer sheet IDs for `setActiveSheet` calls.

#### CRITICAL layout rule — answer ranges always start at row 2

**Answer sheets must never have a banner row.** The only permitted layout is:

```
Univer row 0  →  Excel row 1  →  Header row  (HDR style)
Univer row 1  →  Excel row 2  →  First data row  ← answer range starts here
Univer row 2  →  Excel row 3  →  Second data row
...
```

Answer range always: `X2:X{1 + nRows}` (e.g. `H2:H48` for 47 rows).

If you add a banner/note row above the header, data shifts to Excel row 3 and the answer range must start at row 3 — but this is error-prone and forbidden. Put notes in:
- The task `scenario` or `controllerAsk` text in the ScenarioApp TASKS array
- The intro page bullet list
- A separate read-only reference sheet that has no answer range

Violating this rule causes the validator to read from the wrong rows, producing false failures and hallucinated tutor hints.

### AI API routes

All three routes in `app/api/` use `claude-sonnet-4-6` via `@anthropic-ai/sdk`:

| Route | Correct answer | Wrong answer |
|---|---|---|
| `/api/grade` | Returns JSON `{ message, tone, follow_up }` (celebration) | Streams a ≤30-word Socratic nudge |
| `/api/tutor` | Chat + MCQ generation | Streaming Socratic hints |
| `/api/lesson` | Dynamic lesson content generation | — |

The grade route receives the full `ValidationResult` struct and uses `relativeRefDrift` (from `lib/validators/formulaAnalyzer.ts`) to detect missing `$` locks in copied formulas.

### Content / data

- `content/lesson-config.json` — exercise definitions for the free-practice mode (`ClientApp`).
- `content/dataset.csv` — loaded server-side in `app/page.tsx`; passed as props to `ClientApp`.
- `content/scenarios/budget-vs-actuals-001/*.json` — four data files (`actuals`, `budget`, `deptmap`, `accountmap`) imported directly into the validator and widget via `@/` alias.

### Tutor context — offline AI pipeline

Both scenarios and skill drills use an offline pipeline to ground the AI tutor and eliminate hallucinations.

#### Scenarios

Each scenario ships two extra files:

| File | Written by | Purpose |
|------|-----------|---------|
| `content/scenarios/<id>/scenario_spec.json` | Claude (at creation time) | Structured description of sheets, columns, data characteristics, and task definitions — input to the generator |
| `content/scenarios/<id>/tutor-context.json` | `generate-tutor-context.js` | Claude-generated schema + per-task `expectedBehavior` — consumed at runtime by `/api/grade` and `/api/tutor` |

These are **offline** artifacts: generated once when the scenario is created, committed to the repo, and read at runtime with zero additional AI calls.

#### Skill drills (free-practice mode)

`content/lesson-config.json` contains two generated fields that serve the same purpose:

| Field | Location | Purpose |
|-------|----------|---------|
| `schema` | Top-level field in lesson-config.json | Shared dataset description (columns, formats, non-obvious behaviors) |
| `expectedBehavior` | Per-exercise field in each exercise object | Exact return values + what common wrong answers indicate |

Run once after writing new exercises (before deploy):
```bash
node scripts/generate-lesson-context.js          # only fills missing fields
node scripts/generate-lesson-context.js --force  # regenerates everything
```

The script reads the exercises (title, concept, tutorFocus, expectedValue, _expected_formula), calls Claude once, and patches `schema` + `expectedBehavior` back into `lesson-config.json` in-place.

---

The grade and tutor routes receive `schema` (shared, describes column layout) and `taskExpectedBehavior` (per-task, describes exact return values including edge cases). This gives Claude the same context a user provides when pasting a formula into chat — column meanings, data quirks, and expected output — eliminating text-comparison hallucinations.

## Scenario creation checklist

**Follow this checklist every time a new scenario is created.** All steps must be complete before the scenario is considered deployment-ready.

### Step 1 — Generate data files
Create all JSON data files under `content/scenarios/<scenario-id>/`:
- One file per sheet (e.g. `actuals.json`, `budget.json`, `deptmap.json`, `accountmap.json`)
- Each file is an array of row objects with consistent camelCase or snake_case keys

### Step 2 — Create `scenario_spec.json`
Write `content/scenarios/<scenario-id>/scenario_spec.json` following the exact structure of `content/scenarios/budget-vs-actuals-001/scenario_spec.json`. Required fields:
- `scenario_id`, `title`, `description`
- `sheets[]` — for each sheet: `name`, `role`, `columns[]` (name, col letter, format, notes), `data_characteristics[]`
- `tasks[]` — for each task: `id`, `number`, `title`, `answer_sheet`, `answer_range`, `controllerAsk`, `tutorFocus`, `sample_expected` (first 8–10 values including any edge-case outputs like `"Not Budgeted"` or `"N/A"`)

**Critical content for `scenario_spec.json`:**
- In `data_characteristics`, explicitly note any non-obvious function behaviors, e.g.:
  - "SUMIFS returns 0 (not an error) when no rows match"
  - "Revenue amounts are stored as negative numbers"
  - "One row has a trailing space causing a silent miss"
- In `sample_expected`, include edge-case values (missing-row fallbacks, text returns) — Claude uses these to infer `expectedBehavior` for the tutor

### Step 3 — Create validator and app files
- `lib/validators/<name>Validators.ts` — precomputed expected values, `TaskConfig` registry
- `app/<Name>ScenarioApp.tsx` — task definitions (`TASKS` array), imports `tutor-context.json`
- `components/<Name>ScenarioWidget.tsx` — Univer workbook builder
- `components/<Name>IntroPage.tsx` — intro screen
- Add routing branch in `app/AppRoot.tsx`

**In the `*ScenarioApp.tsx`**, import the tutor context and pass it to API calls:
```typescript
import TUTOR_CONTEXT from "@/content/scenarios/<id>/tutor-context.json";

// In handleRangeSubmit basePayload:
schema:               TUTOR_CONTEXT.schema,
taskExpectedBehavior: (TUTOR_CONTEXT.tasks as Record<string, { expectedBehavior: string }>)[task.id]?.expectedBehavior ?? "",

// In TutorPanel props:
schema={TUTOR_CONTEXT.schema}
taskExpectedBehavior={(TUTOR_CONTEXT.tasks as Record<string, { expectedBehavior: string }>)[task.id]?.expectedBehavior}
```

### Step 4 — Generate tutor context (required before deploy)
Run once after `scenario_spec.json` is complete:
```bash
node scripts/generate-tutor-context.js <scenario-id>
```
This calls Claude once (offline), reads the spec, and writes `tutor-context.json`. Commit both `scenario_spec.json` and `tutor-context.json`.

To regenerate after editing the spec or tasks:
```bash
node scripts/generate-tutor-context.js <scenario-id>
```

### Step 5 — Type-check
```bash
npx tsc --noEmit
```
Must pass before considering the scenario complete.

## Drill / skill lesson creation checklist

**Follow this checklist every time a new skill lesson is added to `lesson-config.json`.**

### Step 1 — Write exercises
Add exercises to `content/lesson-config.json`:
- Each exercise needs: `id`, `number`, `title`, `difficulty`, `concept`, `scenario`, `controllerAsk`, `tutorFocus`, `answerCell`, `expectedValue`, `tolerance`, `xpReward`
- Add `_expected_formula` for each exercise — the script uses it to generate precise `expectedBehavior`
- Do NOT manually write `schema` or `expectedBehavior` — the script generates them

### Step 2 — Generate tutor context (required before deploy)
```bash
node scripts/generate-lesson-context.js
```
This calls Claude once, reads the exercises, and patches `schema` + `expectedBehavior` directly into `lesson-config.json`.

To regenerate after editing exercises or tutorFocus:
```bash
node scripts/generate-lesson-context.js --force
```

### Step 3 — Type-check
```bash
npx tsc --noEmit
```

### Environment

Requires `ANTHROPIC_API_KEY` in `.env.local`. No database; no other external services.

### TypeScript config note

`strict` is **false** in `tsconfig.json`. Type assertions via `as any[]` on JSON imports are intentional throughout the validators.
