/**
 * taskValidators.ts — precomputed expected values for every Invoice Reconciliation task.
 *
 * All computation runs ONCE at module load (not per-render).
 * Expected arrays mirror the Recon Working sheet row-by-row (26 rows, Excel rows 2–27)
 * and the Summary Report section-by-section.
 *
 * Import cost: the four JSON files total ~80 KB bundled — acceptable for a client page.
 */

import type { ExpectedCell, TaskCategory } from "./rangeValidator";
import { cell } from "./rangeValidator";

import RECON_RAW    from "@/content/scenarios/invoice-reconciliation/recon_working.json";
import VENDORS_RAW  from "@/content/scenarios/invoice-reconciliation/vendors.json";
import DEPTS_RAW    from "@/content/scenarios/invoice-reconciliation/departments.json";
import PAYMENTS_RAW from "@/content/scenarios/invoice-reconciliation/payments.json";

// ── O(1) lookup tables (built once) ──────────────────────────────────────────

const vmLookup: Record<string, string> = Object.fromEntries(
  (VENDORS_RAW as any[]).map(v => [v.vendor_id, v.vendor_name])
);
const dmLookup: Record<string, string> = Object.fromEntries(
  (DEPTS_RAW as any[]).map(d => [d.dept_id, d.dept_name])
);

// Sum payments by invoice_id (handles multiple partial payments for same invoice)
const pmLookup: Record<string, number> = {};
for (const p of PAYMENTS_RAW as any[]) {
  if (p.invoice_id && !p.invoice_id.startsWith("INV-2024-VOID")) {
    pmLookup[p.invoice_id] = parseFloat(
      ((pmLookup[p.invoice_id] ?? 0) + (p.amount_paid ?? 0)).toFixed(2)
    );
  }
}

// Count occurrences of each invoice_id in the curated working set (for dup detection)
const idCounts: Record<string, number> = {};
(RECON_RAW as any[]).forEach((inv: any) => {
  idCounts[inv.invoice_id] = (idCounts[inv.invoice_id] ?? 0) + 1;
});

const CLOSE_DATE = new Date("2024-09-01"); // AP close date used in overdue flag

// ── Column expected value arrays (one pass each, O(n)) ───────────────────────

// G: Vendor Name — XLOOKUP / VLOOKUP from Vendor Map
const EXP_G: string[] = (RECON_RAW as any[]).map((inv: any) =>
  vmLookup[inv.vendor_id] ?? "UNKNOWN"
);

// H: Department Name — XLOOKUP / VLOOKUP from Dept Map
const EXP_H: string[] = (RECON_RAW as any[]).map((inv: any) =>
  dmLookup[inv.dept_id] ?? "UNKNOWN"
);

// I: Amount Paid — SUMIF against Payments tab
const EXP_I: number[] = (RECON_RAW as any[]).map((inv: any) =>
  pmLookup[inv.invoice_id] ?? 0
);

// J: Payment Status — IF(I=F,"Paid",IF(I>0,"Partial","Unpaid"))
const EXP_J: string[] = (RECON_RAW as any[]).map((inv: any, i: number) => {
  const paid = EXP_I[i];
  if (paid >= inv.amount) return "Paid";
  if (paid > 0)           return "Partial";
  return "Unpaid";
});

// K: Outstanding Balance — F-I (Inv_Amount minus Amount_Paid)
const EXP_K: number[] = (RECON_RAW as any[]).map((inv: any, i: number) =>
  parseFloat((inv.amount - EXP_I[i]).toFixed(2))
);

// L: Overdue Flag — IF(AND(due<TODAY,outstanding>0),"OVERDUE","OK")
const EXP_L: string[] = (RECON_RAW as any[]).map((inv: any, i: number) => {
  const due = new Date(inv.due_date);
  return EXP_K[i] > 0 && due < CLOSE_DATE ? "OVERDUE" : "OK";
});

// M: Duplicate Flag — IF(COUNTIF($A$2:$A$27,A_)>1,"DUPLICATE","OK")
const EXP_M: string[] = (RECON_RAW as any[]).map((inv: any) =>
  idCounts[inv.invoice_id] > 1 ? "DUPLICATE" : "OK"
);

// ── Summary Report expected values ────────────────────────────────────────────

// Outstanding per vendor name (for SUMIFS in Summary Report B3:B22)
const outByName: Record<string, number> = {};
(RECON_RAW as any[]).forEach((_inv: any, i: number) => {
  const name = EXP_G[i];
  if (name !== "UNKNOWN") {
    outByName[name] = parseFloat(((outByName[name] ?? 0) + EXP_K[i]).toFixed(2));
  }
});

// B3:B22 — 20 vendors in alphabetical order (matches Summary Report layout)
const EXP_VENDOR_OUTSTANDING: number[] = (VENDORS_RAW as any[]).map((v: any) =>
  outByName[v.vendor_name] ?? 0
);

// B26 — Paid count across all 26 Recon Working rows (COUNTIFS on J column)
const EXP_PAID_COUNT = EXP_J.filter(s => s === "Paid").length;  // 11

// B32 — Total Invoiced including duplicate rows (SUM of F column, all 26 rows)
const EXP_TOTAL_INVOICED = (RECON_RAW as any[]).reduce(
  (sum: number, inv: any) => sum + inv.amount, 0
);  // 250327

// ── Task validator config type ─────────────────────────────────────────────────

export interface TaskValidatorConfig {
  /** Human label for error messages and tutor context. */
  label:      string;
  /** Excel-style range string, e.g. "G2:G27" or "B26". */
  answerRange: string;
  /** Univer sheet display name. */
  sheet:      string;
  /** Row count = length of expected array. */
  rowCount:   number;
  /** Precomputed expected values — one per row in answerRange. */
  expected:   ExpectedCell[];
  /** Task category for the validator registry. */
  category:   TaskCategory;
  /** Fraction of rows that must be correct to mark the task passed (default 0.8). */
  correctThreshold?: number;
  xpReward:   number;
}

// ── Validator registry ─────────────────────────────────────────────────────────

export const TASK_VALIDATORS: Record<string, TaskValidatorConfig> = {

  // ── Recon Working: G2:G27 — text_column ──────────────────────────────────
  T01: {
    label:       "Look Up Vendor Names",
    answerRange: "G2:G27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "text_column",
    expected:    EXP_G.map(v => cell.text(v)),
    xpReward:    75,
  },

  // ── Recon Working: H2:H27 — text_column ──────────────────────────────────
  T02: {
    label:       "Look Up Department Names",
    answerRange: "H2:H27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "text_column",
    expected:    EXP_H.map(v => cell.text(v)),
    xpReward:    50,
  },

  // ── Recon Working: I2:I27 — numeric_range ────────────────────────────────
  T03: {
    label:       "Match Payment Amounts",
    answerRange: "I2:I27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "numeric_range",
    expected:    EXP_I.map(v => cell.num(v, 1)),   // tolerance: ±1 for FP rounding
    xpReward:    75,
  },

  // ── Recon Working: J2:J27 — status_column ────────────────────────────────
  T04: {
    label:       "Classify Payment Status",
    answerRange: "J2:J27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "status_column",
    expected:    EXP_J.map(v => cell.text(v)),
    xpReward:    75,
  },

  // ── Recon Working: K2:K27 — numeric_range ────────────────────────────────
  T05: {
    label:       "Calculate Outstanding Balance",
    answerRange: "K2:K27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "numeric_range",
    expected:    EXP_K.map(v => cell.num(v, 1)),
    xpReward:    50,
  },

  // ── Recon Working: L2:L27 — text_column (OVERDUE / OK) ───────────────────
  T06: {
    label:       "Flag Overdue Invoices",
    answerRange: "L2:L27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "text_column",
    expected:    EXP_L.map(v => cell.text(v)),
    xpReward:    75,
  },

  // ── Recon Working: M2:M27 — text_column (DUPLICATE / OK) ─────────────────
  T07: {
    label:       "Identify Duplicate Invoice IDs",
    answerRange: "M2:M27",
    sheet:       "Recon Working",
    rowCount:    26,
    category:    "text_column",
    expected:    EXP_M.map(v => cell.text(v)),
    xpReward:    75,
  },

  // ── Summary Report: B3:B22 — numeric_range (SUMIFS per vendor) ───────────
  T08: {
    label:       "Outstanding by Vendor",
    answerRange: "B3:B22",
    sheet:       "Summary Report",
    rowCount:    20,
    category:    "numeric_range",
    expected:    EXP_VENDOR_OUTSTANDING.map(v => cell.num(v, 1)),
    xpReward:    100,
  },

  // ── Summary Report: B26 — exact_cell (COUNTIFS Paid) ─────────────────────
  T09: {
    label:       "Count Invoices by Status",
    answerRange: "B26",
    sheet:       "Summary Report",
    rowCount:    1,
    category:    "exact_cell",
    expected:    [cell.num(EXP_PAID_COUNT, 0)],
    xpReward:    75,
  },

  // ── Summary Report: B32 — exact_cell (SUM total invoiced incl. dups) ─────
  T10: {
    label:       "Grand Totals for CFO Report",
    answerRange: "B32",
    sheet:       "Summary Report",
    rowCount:    1,
    category:    "exact_cell",
    expected:    [cell.num(EXP_TOTAL_INVOICED, 1)],
    xpReward:    100,
  },
};

// Export computed constants for use in tests / grade API context
export const COMPUTED = {
  EXP_PAID_COUNT,
  EXP_TOTAL_INVOICED,
  EXP_VENDOR_OUTSTANDING,
  rowCount: (RECON_RAW as any[]).length,
} as const;
