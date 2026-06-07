/**
 * univerAdapter.ts — reads a named range from a Univer workbook instance.
 *
 * Keeps all Univer API calls in one place; the validator engine stays pure TS.
 * Works around two Univer quirks:
 *   1. FWorksheet.getName() is absent from the typed interface → cast to any.
 *   2. getValues() may return the formula string for formula cells → fall back
 *      to row-by-row getValue() when the 2-D array contains a string that
 *      starts with "=".
 */

import type { CellValue } from "./rangeValidator";

export interface RangeReadResult {
  values:   CellValue[];   // flat, row-major
  formulas: string[];      // parallel — "" for plain values, "=…" for formulas
}

// ── Range string parser ───────────────────────────────────────────────────────

/**
 * Converts "G2:G27", "B26", "B3:B22" to 0-based Univer row/col indices.
 * Excel columns are 1-based letters; rows are 1-based numbers.
 */
function parseRangeStr(rangeStr: string): {
  startRow: number; startCol: number;
  rowCount: number; colCount: number;
} {
  // Normalise to "A1:B2" form (handle single-cell "B26" → "B26:B26")
  const normalised = rangeStr.includes(":") ? rangeStr : `${rangeStr}:${rangeStr}`;
  const [startRef, endRef] = normalised.toUpperCase().split(":");

  const colLetters = (ref: string) => ref.replace(/[0-9]/g, "");
  const rowNumber  = (ref: string) => parseInt(ref.replace(/[A-Z]/g, ""), 10);

  const colToIdx = (letters: string): number =>
    letters.split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;

  const sc = colToIdx(colLetters(startRef));
  const sr = rowNumber(startRef) - 1;   // 0-based
  const ec = colToIdx(colLetters(endRef));
  const er = rowNumber(endRef) - 1;

  return {
    startRow: sr,
    startCol: sc,
    rowCount: er - sr + 1,
    colCount: ec - sc + 1,
  };
}

// ── Sheet finder ──────────────────────────────────────────────────────────────

// FWorksheet.getName() is absent from Univer's typed interface (only setName() exists).
// Fall back to getSheetId() matched against this hardcoded display-name → ID map.
const DISPLAY_NAME_TO_ID: Record<string, string> = {
  "Invoices":               "invoices",
  "Payments":               "payments",
  "Vendor Map":             "vendor_map",
  "Dept Map":               "dept_map",
  "Recon Working":          "recon_working",
  "Summary Report":         "summary_report",
  "Actuals":                "actuals",
  "Budget":                 "budget",
  "DeptMap":                "deptmap",
  "AccountMap":             "accountmap",
  "Variance_Workings":      "variance_workings",
  "Mgmt_Summary":           "mgmt_summary",
  "Deals":                  "sc_deals",
  "RepMaster":              "sc_repmaster",
  "CommissionRates":        "sc_rates",
  "Commission_Calculator":  "sc_calc",
  "Payroll_Summary":        "sc_payroll",
  "Settings":               "sc_settings",
};

function findSheet(univerAPI: any, sheetName: string): any | null {
  const wb = univerAPI?.getActiveWorkbook?.();
  if (!wb) return null;

  const sheets: any[] = wb.getSheets?.() ?? [];

  // Try getName() first (available in some Univer builds)
  const byName = sheets.find((s: any) => {
    try { return s.getName?.() === sheetName; } catch { return false; }
  });
  if (byName) return byName;

  // Reliable fallback: compare internal sheet ID via getSheetId()
  const id = DISPLAY_NAME_TO_ID[sheetName];
  if (!id) return null;

  return sheets.find((s: any) => {
    try { return s.getSheetId?.() === id; } catch { return false; }
  }) ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Reads all cell values and formula strings from a named range on a named sheet.
 *
 * @param univerAPI  The FUniver instance (window-scoped or passed down as prop).
 * @param sheetName  Display name of the sheet, e.g. "Recon Working".
 * @param rangeStr   Excel-style range, e.g. "G2:G27" or "B26".
 */
export function readRange(
  univerAPI: any,
  sheetName: string,
  rangeStr:  string,
): RangeReadResult {
  const empty: RangeReadResult = { values: [], formulas: [] };

  const sheet = findSheet(univerAPI, sheetName);
  if (!sheet) return empty;

  const { startRow, startCol, rowCount, colCount } = parseRangeStr(rangeStr);

  let raw2d: (CellValue)[][];
  let fml2d: string[][];

  try {
    const range = sheet.getRange(startRow, startCol, rowCount, colCount);
    raw2d = (range?.getValues?.() ?? []) as (CellValue)[][];
    fml2d = (range?.getFormulas?.() ?? []) as string[][];
  } catch {
    return empty;
  }

  const values:   CellValue[] = [];
  const formulas: string[]    = [];

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const formula = fml2d?.[r]?.[c] ?? "";
      formulas.push(formula);

      let rawVal: CellValue = raw2d?.[r]?.[c] ?? null;

      // Univer sometimes puts the formula string into the value slot.
      // Fall back to row/col getValue() which returns the computed result.
      if (typeof rawVal === "string" && rawVal.startsWith("=")) {
        try {
          rawVal = (sheet.getRange(startRow + r, startCol + c, 1, 1) as any)
                     ?.getValue?.() ?? null;
          // If it still looks like a formula string, treat as null.
          if (typeof rawVal === "string" && rawVal.startsWith("=")) rawVal = null;
        } catch {
          rawVal = null;
        }
      }

      values.push(rawVal);
    }
  }

  return { values, formulas };
}
