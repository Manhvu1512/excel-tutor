/**
 * rangeValidator.ts — browser-side, O(n) range validation engine.
 *
 * Architecture:
 *   ScenarioWidget reads raw cell values + formula strings from Univer.
 *   ScenarioApp calls validateRange() with precomputed expected values.
 *   Only the compact ValidationResult is sent to the AI tutor API.
 *
 * No Univer dependency here — pure TypeScript, fully testable in isolation.
 */

// ── Public types ──────────────────────────────────────────────────────────────

export type CellValue = string | number | null;

/**
 * One rule per expected cell.
 * Union-discriminated so the validator can switch() with no runtime cost.
 */
export type ValidationRule =
  | { type: "exact_text";           caseSensitive?: boolean }
  | { type: "numeric_tolerance";    tolerance: number }
  | { type: "status_enum";          allowed: string[]; caseSensitive?: boolean }
  | { type: "formula_presence" }   // cell must contain a formula (starts with "=")
  | { type: "any_non_blank" }      // cell must not be empty
  | { type: "exact_text_or_blank" ; value: string; caseSensitive?: boolean }; // blank OR exact text

export interface ExpectedCell {
  value: CellValue;        // ignored for formula_presence / any_non_blank
  rule:  ValidationRule;
}

/** Compact result — small enough to embed in the AI tutor API request body. */
export interface ValidationResult {
  correct:       boolean;    // score >= correctThreshold
  score:         number;     // 0–1, rounded to 4 dp
  total:         number;     // cells evaluated
  correct_count: number;
  error_rows:    number[];   // 1-indexed display row numbers (e.g. [3, 7, 14])
  error_summary: {
    blank_rows:           number[];
    text_mismatch_rows:   number[];
    numeric_mismatch_rows: number[];
    formula_missing_rows: number[];
  };
}

export interface ValidateOptions {
  /** Row number of the first data cell — used for human-readable error_rows (default 2). */
  startDisplayRow?: number;
  /** Fraction of correct cells required to mark the task correct (default 0.8). */
  correctThreshold?: number;
}

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * Single-pass O(n) validator.
 *
 * @param userValues   Flat array of computed cell values read from Univer.
 * @param userFormulas Parallel array of formula strings ("" for plain values).
 * @param expected     Parallel array of ExpectedCell configs (precomputed by taskValidators).
 * @param opts         Optional overrides.
 */
export function validateRange(
  userValues:   CellValue[],
  userFormulas: string[],
  expected:     ExpectedCell[],
  opts:         ValidateOptions = {},
): ValidationResult {
  const { startDisplayRow = 2, correctThreshold = 0.8 } = opts;
  const n = expected.length;

  let correct_count = 0;

  const error_rows:           number[] = [];
  const blank_rows:           number[] = [];
  const text_mismatch_rows:   number[] = [];
  const numeric_mismatch_rows: number[] = [];
  const formula_missing_rows: number[] = [];

  for (let i = 0; i < n; i++) {
    const displayRow = startDisplayRow + i;
    const raw     = i < userValues.length   ? userValues[i]   : null;
    const formula = i < userFormulas.length ? userFormulas[i] : "";
    const { value: exp, rule } = expected[i];

    const isEmpty =
      raw === null || raw === undefined || String(raw).trim() === "";

    // Blanks always fail (except rules that handle blank explicitly)
    if (isEmpty && rule.type !== "any_non_blank" && rule.type !== "formula_presence" && rule.type !== "exact_text_or_blank") {
      blank_rows.push(displayRow);
      error_rows.push(displayRow);
      continue;
    }

    let cellOk = false;

    switch (rule.type) {

      case "exact_text": {
        const userStr = String(raw ?? "").trim();
        const expStr  = String(exp ?? "").trim();
        cellOk = rule.caseSensitive
          ? userStr === expStr
          : userStr.toLowerCase() === expStr.toLowerCase();
        if (!cellOk) text_mismatch_rows.push(displayRow);
        break;
      }

      case "numeric_tolerance": {
        const userNum = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
        const expNum  = typeof exp === "number" ? exp : parseFloat(String(exp ?? "0"));
        if (isNaN(userNum)) {
          numeric_mismatch_rows.push(displayRow);
        } else {
          cellOk = Math.abs(userNum - expNum) <= rule.tolerance;
          if (!cellOk) numeric_mismatch_rows.push(displayRow);
        }
        break;
      }

      case "status_enum": {
        const userStr = String(raw ?? "").trim();
        const allowed = rule.caseSensitive
          ? rule.allowed
          : rule.allowed.map(s => s.toLowerCase());
        const compare = rule.caseSensitive ? userStr : userStr.toLowerCase();
        cellOk = allowed.includes(compare);
        if (!cellOk) text_mismatch_rows.push(displayRow);
        break;
      }

      case "formula_presence": {
        // Cell must have a formula AND it must not be blank
        cellOk = formula.startsWith("=") && !isEmpty;
        if (!cellOk) formula_missing_rows.push(displayRow);
        break;
      }

      case "any_non_blank": {
        cellOk = !isEmpty;
        if (!cellOk) blank_rows.push(displayRow);
        break;
      }

      case "exact_text_or_blank": {
        if (isEmpty) {
          cellOk = true; // blank is acceptable
        } else {
          const userStr = String(raw ?? "").trim();
          cellOk = rule.caseSensitive
            ? userStr === rule.value
            : userStr.toLowerCase() === rule.value.toLowerCase();
          if (!cellOk) text_mismatch_rows.push(displayRow);
        }
        break;
      }
    }

    if (cellOk) {
      correct_count++;
    } else if (!error_rows.includes(displayRow)) {
      error_rows.push(displayRow);
    }
  }

  error_rows.sort((a, b) => a - b);

  const score = n > 0 ? correct_count / n : 0;

  return {
    correct:       score >= correctThreshold,
    score:         parseFloat(score.toFixed(4)),
    total:         n,
    correct_count,
    error_rows,
    error_summary: {
      blank_rows,
      text_mismatch_rows,
      numeric_mismatch_rows,
      formula_missing_rows,
    },
  };
}

// ── Convenience builders (used by taskValidators) ─────────────────────────────

export const cell = {
  text:    (v: string, caseSensitive = false): ExpectedCell =>
    ({ value: v, rule: { type: "exact_text", caseSensitive } }),

  num:     (v: number, tolerance = 1): ExpectedCell =>
    ({ value: v, rule: { type: "numeric_tolerance", tolerance } }),

  status:  (...allowed: string[]): ExpectedCell =>
    ({ value: null, rule: { type: "status_enum", allowed, caseSensitive: false } }),

  formula: (): ExpectedCell =>
    ({ value: null, rule: { type: "formula_presence" } }),

  nonBlank: (): ExpectedCell =>
    ({ value: null, rule: { type: "any_non_blank" } }),

  textOrBlank: (v: string, caseSensitive = false): ExpectedCell =>
    ({ value: v, rule: { type: "exact_text_or_blank", value: v, caseSensitive } }),
};

// ── Validator type registry (task categories) ─────────────────────────────────

/**
 * Canonical task categories for the validator registry.
 * Each maps to which rules are appropriate for that column type.
 *
 * exact_cell      — single-cell text or numeric comparison
 * text_column     — column of text lookups (XLOOKUP / VLOOKUP)
 * numeric_range   — column of numeric results (SUMIF / arithmetic)
 * status_column   — column of status strings from a fixed set
 * formula_column  — column must contain formulas (any value accepted)
 * mixed_range     — multi-column block, each cell may have its own rule
 */
export type TaskCategory =
  | "exact_cell"
  | "text_column"
  | "numeric_range"
  | "status_column"
  | "formula_column"
  | "mixed_range"
  | "mixed_column";
