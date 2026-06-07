/**
 * budgetValidators.ts — precomputed expected values for Budget vs Actuals tasks.
 * All computation runs once at module load.
 */

import type { ExpectedCell, TaskCategory } from "./rangeValidator";
import { cell } from "./rangeValidator";

import ACTUALS_RAW  from "@/content/scenarios/budget-vs-actuals-001/actuals.json";
import BUDGET_RAW   from "@/content/scenarios/budget-vs-actuals-001/budget.json";
import DEPTMAP_RAW  from "@/content/scenarios/budget-vs-actuals-001/deptmap.json";
import ACCTMAP_RAW  from "@/content/scenarios/budget-vs-actuals-001/accountmap.json";

// ── Lookup tables ─────────────────────────────────────────────────────────────

const deptLookup: Record<string, { budgetCode: string; deptName: string }> = Object.fromEntries(
  (DEPTMAP_RAW as any[]).map(d => [d.erp_code, { budgetCode: d.budget_code, deptName: d.dept_name }])
);

const acctLookup: Record<string, { accountName: string; accountType: string }> = Object.fromEntries(
  (ACCTMAP_RAW as any[]).map(a => [a.account_code, { accountName: a.account_name, accountType: a.account_type }])
);

const budgetLookup: Record<string, number> = {};
for (const b of BUDGET_RAW as any[]) {
  budgetLookup[`${b.dept_code}|${b.account_code}`] = b.budget_amount;
}

// ── Variance_Workings pre-filled rows (47 rows, rows 2-48) ────────────────────
// [ERPDeptCode, AccountCode]
const VW_ROWS: [string, string][] = [
  // Sales (DEPT-101)
  ["DEPT-101","6100-01"],["DEPT-101","7100-01"],["DEPT-101","9200-02"],
  // Marketing (DEPT-102)
  ["DEPT-102","6100-01"],["DEPT-102","7200-01"],["DEPT-102","7200-02"],["DEPT-102","7200-03"],
  // Engineering (DEPT-201)
  ["DEPT-201","6100-01"],["DEPT-201","8100-01"],["DEPT-201","8100-02"],["DEPT-201","8100-03"],
  // Customer Success (DEPT-301)
  ["DEPT-301","6100-01"],["DEPT-301","6100-03"],["DEPT-301","8100-01"],
  // G&A (DEPT-401)
  ["DEPT-401","6100-01"],["DEPT-401","9100-01"],["DEPT-401","9100-02"],
  ["DEPT-401","9100-03"],["DEPT-401","9100-04"],["DEPT-401","9200-01"],
  ["DEPT-401","4000-01"],["DEPT-401","4000-02"],
  // Operations (DEPT-501)
  ["DEPT-501","5000-01"],["DEPT-501","5000-02"],["DEPT-501","5500-01"],["DEPT-501","5500-02"],
  // Product (DEPT-601)
  ["DEPT-601","6100-01"],["DEPT-601","6200-01"],["DEPT-601","8200-01"],
  // Human Resources (DEPT-701)
  ["DEPT-701","6100-01"],["DEPT-701","6300-01"],["DEPT-701","8300-01"],["DEPT-701","8300-02"],
  // Legal (DEPT-801)
  ["DEPT-801","6100-01"],["DEPT-801","7300-01"],["DEPT-801","7300-02"],
  // Finance (DEPT-901)
  ["DEPT-901","6100-01"],["DEPT-901","9400-01"],["DEPT-901","9400-02"],
  // Edge rows — no budget (actuals exist but no budget row)
  ["DEPT-201","8100-04"],  // AI/ML Tooling — not in budget (trailing-space trap hides actuals)
  ["DEPT-401","9300-01"],  // Recruiting Fees — not budgeted in G&A
  ["DEPT-102","7200-04"],  // Influencer Mktg — not budgeted
  ["DEPT-601","8200-02"],  // User Research — not budgeted
  ["DEPT-801","7300-03"],  // Contract Review — not budgeted
  // Edge rows — discontinued (budget exists, zero Oct actuals)
  ["DEPT-501","5000-03"],  // Legacy Support — discontinued
  ["DEPT-401","9100-05"],  // Legacy Depreciation — discontinued
  ["DEPT-901","9400-03"],  // Tax Advisory — discontinued
];

// ── T01: COUNTIFS — Actuals!H2:H54 (53 rows) ─────────────────────────────────

const journalIdCounts: Record<string, number> = {};
for (const a of ACTUALS_RAW as any[]) {
  journalIdCounts[a.journal_id] = (journalIdCounts[a.journal_id] ?? 0) + 1;
}
const EXP_T01: ExpectedCell[] = (ACTUALS_RAW as any[]).map(a =>
  cell.num(journalIdCounts[a.journal_id], 0)
);

// ── T02: XLOOKUP — Variance_Workings!B2:B48 (BudgetDeptCode) ─────────────────

const EXP_T02: ExpectedCell[] = VW_ROWS.map(([erp]) =>
  cell.text(deptLookup[erp]?.budgetCode ?? "#N/A")
);

// ── T03: XLOOKUP — Variance_Workings!E2:E48 (AccountName) ────────────────────

const EXP_T03: ExpectedCell[] = VW_ROWS.map(([, acct]) =>
  cell.text(acctLookup[acct]?.accountName ?? "#N/A")
);

// ── T04: SUMIFS — Variance_Workings!H2:H48 (October Actuals by dept+acct) ────
// Uses wildcard match on AccountCode (captures sub-accounts like 6100-01-A/B).
// "DEPT-201 " (trailing space) does NOT match "DEPT-201" → row for 8100-04 returns 0.
// "DEPT-701" + "6100-01" catches both duplicate rows → inflated to 102000.

const actualsSum: Record<string, number> = {};
for (const a of ACTUALS_RAW as any[]) {
  const dept = a.department as string;
  const acct = a.account as string;
  for (const [erpCode, acctParent] of VW_ROWS) {
    if (dept === erpCode && acct.startsWith(acctParent)) {
      const key = `${erpCode}|${acctParent}`;
      actualsSum[key] = parseFloat(((actualsSum[key] ?? 0) + a.amount).toFixed(2));
    }
  }
}
export const EXP_T04: ExpectedCell[] = VW_ROWS.map(([erp, acct]) =>
  cell.num(actualsSum[`${erp}|${acct}`] ?? 0, 1)
);

// ── T05: Budget or "Not Budgeted" — Variance_Workings!I2:I48 ─────────────────

const EXP_T05: ExpectedCell[] = VW_ROWS.map(([erp, acct]) => {
  const budgetCode = deptLookup[erp]?.budgetCode;
  if (!budgetCode) return cell.text("Not Budgeted");
  const key = `${budgetCode}|${acct}`;
  return key in budgetLookup ? cell.num(budgetLookup[key], 1) : cell.text("Not Budgeted");
});

// ── T06: Dollar Variance — Variance_Workings!J2:J48  (IFERROR(H-I, H)) ───────

const EXP_T06: ExpectedCell[] = VW_ROWS.map(([erp, acct]) => {
  const actual = actualsSum[`${erp}|${acct}`] ?? 0;
  const budgetCode = deptLookup[erp]?.budgetCode;
  const key = budgetCode ? `${budgetCode}|${acct}` : null;
  const hasBudget = key !== null && key in budgetLookup;
  const variance = hasBudget ? parseFloat((actual - budgetLookup[key!]).toFixed(2)) : actual;
  return cell.num(variance, 1);
});

// ── T07: % Variance — Variance_Workings!K2:K48  (IFERROR(J/I, "N/A")) ────────

const EXP_T07: ExpectedCell[] = VW_ROWS.map(([erp, acct]) => {
  const budgetCode = deptLookup[erp]?.budgetCode;
  const key = budgetCode ? `${budgetCode}|${acct}` : null;
  const hasBudget = key !== null && key in budgetLookup;
  if (!hasBudget) return cell.text("N/A");
  const actual = actualsSum[`${erp}|${acct}`] ?? 0;
  const budget = budgetLookup[key!];
  return cell.num(parseFloat(((actual - budget) / budget).toFixed(4)), 0.01);
});

// ── T08: IsMaterial — Variance_Workings!L2:L48 ───────────────────────────────
// =IF(AND(ABS(J)>=25000, ISNUMBER(K), ABS(K)>=0.1), "Yes", "No")

const EXP_T08: ExpectedCell[] = EXP_T06.map((jCell, i) => {
  const j = (jCell as any).value ?? 0;
  const kCell = EXP_T07[i];
  const isNum = typeof (kCell as any).value === "number";
  const k = isNum ? (kCell as any).value : 0;
  const material = Math.abs(j) >= 25000 && isNum && Math.abs(k) >= 0.1;
  return cell.text(material ? "Yes" : "No");
});

// ── T09: F/U Flag — Variance_Workings!M2:M48 ─────────────────────────────────
// =IF(L<>"Yes","", IF(F="Revenue", IF(ABS(H)>I,"F","U"), IF(H<I,"F","U")))

const EXP_T09: ExpectedCell[] = VW_ROWS.map(([erp, acct], i) => {
  const isMaterial = (EXP_T08[i] as any).value === "Yes";
  if (!isMaterial) return cell.textOrBlank("");
  const actual = actualsSum[`${erp}|${acct}`] ?? 0;
  const budgetCode = deptLookup[erp]?.budgetCode ?? "";
  const bKey = `${budgetCode}|${acct}`;
  const budget = budgetLookup[bKey] ?? 0;
  const acctType = acctLookup[acct]?.accountType ?? "Expense";
  let flag: string;
  if (acctType === "Revenue") {
    flag = Math.abs(actual) > budget ? "F" : "U";
  } else {
    flag = actual < budget ? "F" : "U";
  }
  return cell.text(flag);
});

// ── TaskValidatorConfig type ───────────────────────────────────────────────────

export interface BudgetTaskConfig {
  label:      string;
  answerRange: string;
  sheet:      string;
  rowCount:   number;
  expected:   ExpectedCell[];
  category:   TaskCategory;
  correctThreshold?: number;
  xpReward:   number;
}

// ── Validator registry ─────────────────────────────────────────────────────────

export const BUDGET_VALIDATORS: Record<string, BudgetTaskConfig> = {
  T01: {
    label:       "Spot the Duplicates",
    answerRange: `H3:H${2 + (ACTUALS_RAW as any[]).length}`,
    sheet:       "Actuals",
    rowCount:    (ACTUALS_RAW as any[]).length,
    category:    "numeric_range",
    expected:    EXP_T01,
    xpReward:    50,
  },
  T02: {
    label:       "Map Department Codes",
    answerRange: "B2:B48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "text_column",
    expected:    EXP_T02,
    xpReward:    75,
  },
  T03: {
    label:       "Look Up Account Names",
    answerRange: "E2:E48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "text_column",
    expected:    EXP_T03,
    xpReward:    75,
  },
  T05: {
    label:       "Pull Budget Amounts",
    answerRange: "I2:I48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "mixed_column",
    expected:    EXP_T05,
    correctThreshold: 0.85,
    xpReward:    100,
  },
  T06: {
    label:       "Calculate Dollar Variance",
    answerRange: "J2:J48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "numeric_range",
    expected:    EXP_T06,
    xpReward:    75,
  },
  T07: {
    label:       "Calculate % Variance",
    answerRange: "K2:K48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "mixed_column",
    expected:    EXP_T07,
    correctThreshold: 0.85,
    xpReward:    75,
  },
  T08: {
    label:       "Flag Material Variances",
    answerRange: "L2:L48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "text_column",
    expected:    EXP_T08,
    xpReward:    75,
  },
  T09: {
    label:       "Classify Favorable / Unfavorable",
    answerRange: "M2:M48",
    sheet:       "Variance_Workings",
    rowCount:    47,
    category:    "text_column",
    expected:    EXP_T09,
    correctThreshold: 0.85,
    xpReward:    100,
  },
};

export const BUDGET_ACTUALS_COUNT = (ACTUALS_RAW as any[]).length;
