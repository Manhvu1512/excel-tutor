"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import "@univerjs/preset-sheets-core/lib/index.css";

import ACTUALS_RAW  from "@/content/scenarios/budget-vs-actuals-001/actuals.json";
import BUDGET_RAW   from "@/content/scenarios/budget-vs-actuals-001/budget.json";
import DEPTMAP_RAW  from "@/content/scenarios/budget-vs-actuals-001/deptmap.json";
import ACCTMAP_RAW  from "@/content/scenarios/budget-vs-actuals-001/accountmap.json";
import { readRange } from "@/lib/validators/univerAdapter";
import type { CellValue } from "@/lib/validators/rangeValidator";
import { EXP_T04 } from "@/lib/validators/budgetValidators";

export interface WidgetHandle {
  fillRange: (values: (string | number | null)[], sheetName: string, rangeStr: string) => void;
}

type Props = {
  answerRange:     string;
  targetSheet:     string;
  allAnswerRanges: string[];
  allTargetSheets: string[];
  onRangeSubmit:   (values: CellValue[], formulas: string[]) => void;
  resetKey:        number;
  grading:         boolean;
};

// Variance_Workings pre-filled rows — 47 rows
const VW_ROWS: [string, string, string][] = [
  // Sales
  ["DEPT-101","6100-01","2024-10"],["DEPT-101","7100-01","2024-10"],["DEPT-101","9200-02","2024-10"],
  // Marketing
  ["DEPT-102","6100-01","2024-10"],["DEPT-102","7200-01","2024-10"],["DEPT-102","7200-02","2024-10"],["DEPT-102","7200-03","2024-10"],
  // Engineering
  ["DEPT-201","6100-01","2024-10"],["DEPT-201","8100-01","2024-10"],["DEPT-201","8100-02","2024-10"],["DEPT-201","8100-03","2024-10"],
  // Customer Success
  ["DEPT-301","6100-01","2024-10"],["DEPT-301","6100-03","2024-10"],["DEPT-301","8100-01","2024-10"],
  // G&A
  ["DEPT-401","6100-01","2024-10"],["DEPT-401","9100-01","2024-10"],["DEPT-401","9100-02","2024-10"],
  ["DEPT-401","9100-03","2024-10"],["DEPT-401","9100-04","2024-10"],["DEPT-401","9200-01","2024-10"],
  ["DEPT-401","4000-01","2024-10"],["DEPT-401","4000-02","2024-10"],
  // Operations
  ["DEPT-501","5000-01","2024-10"],["DEPT-501","5000-02","2024-10"],["DEPT-501","5500-01","2024-10"],["DEPT-501","5500-02","2024-10"],
  // Product
  ["DEPT-601","6100-01","2024-10"],["DEPT-601","6200-01","2024-10"],["DEPT-601","8200-01","2024-10"],
  // Human Resources
  ["DEPT-701","6100-01","2024-10"],["DEPT-701","6300-01","2024-10"],["DEPT-701","8300-01","2024-10"],["DEPT-701","8300-02","2024-10"],
  // Legal
  ["DEPT-801","6100-01","2024-10"],["DEPT-801","7300-01","2024-10"],["DEPT-801","7300-02","2024-10"],
  // Finance
  ["DEPT-901","6100-01","2024-10"],["DEPT-901","9400-01","2024-10"],["DEPT-901","9400-02","2024-10"],
  // No-budget rows
  ["DEPT-201","8100-04","2024-10"],
  ["DEPT-401","9300-01","2024-10"],
  ["DEPT-102","7200-04","2024-10"],
  ["DEPT-601","8200-02","2024-10"],
  ["DEPT-801","7300-03","2024-10"],
  // Discontinued rows
  ["DEPT-501","5000-03","2024-10"],
  ["DEPT-401","9100-05","2024-10"],
  ["DEPT-901","9400-03","2024-10"],
];

// No-budget and discontinued account codes for styling
const NO_BUDGET_ACCTS  = new Set(["8100-04","9300-01","7200-04","8200-02","7300-03"]);
const DISC_ACCTS       = new Set(["5000-03","9100-05","9400-03"]);
// Duplicate journal IDs
const DUP_JE_IDS       = new Set(["JE-2024-10-0892","JE-2024-10-0711"]);

function parseRangeCoords(rangeStr: string) {
  const norm = rangeStr.includes(":") ? rangeStr : `${rangeStr}:${rangeStr}`;
  const [s, e] = norm.toUpperCase().split(":");
  const colIdx = (l: string) => l.split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const colStr = (r: string) => r.replace(/\d/g, "");
  const rowNum = (r: string) => parseInt(r.replace(/[A-Z]/g, ""), 10) - 1;
  return {
    startRow: rowNum(s), startCol: colIdx(colStr(s)),
    rowCount: rowNum(e) - rowNum(s) + 1, colCount: colIdx(colStr(e)) - colIdx(colStr(s)) + 1,
  };
}

type CD = Record<number, Record<number, any>>;
const HDR   = { bg: { rgb: "#1e3a5f" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2 };
const HDR2  = { bg: { rgb: "#334155" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2 };
const HDRHINT = { bg: { rgb: "#2563eb" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2, it: 1 };
const SECT  = { bg: { rgb: "#e2e8f0" }, cl: { rgb: "#334155" }, bl: 1, ht: 2 };
const ALT   = { bg: { rgb: "#f8fafc" } };
const WARN  = { bg: { rgb: "#fff7ed" }, cl: { rgb: "#c2410c" } };
const NOTE  = { bg: { rgb: "#fef9c3" }, cl: { rgb: "#713f12" } };
const AMBER = { bg: { rgb: "#fef3c7" }, bd: { t:{s:5,cl:{rgb:"#f59e0b"}},b:{s:5,cl:{rgb:"#f59e0b"}},l:{s:5,cl:{rgb:"#f59e0b"}},r:{s:5,cl:{rgb:"#f59e0b"}} } };
const MINT  = { bg: { rgb: "#f0fdf4" }, bd: { t:{s:1,cl:{rgb:"#86efac"}},b:{s:1,cl:{rgb:"#86efac"}},l:{s:1,cl:{rgb:"#86efac"}},r:{s:1,cl:{rgb:"#86efac"}} } };

function s(cd: CD, r: number, c: number, v: any, style?: any) {
  if (!cd[r]) cd[r] = {};
  cd[r][c] = style ? { v, s: style } : { v };
}

function buildActualsSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "⚠ Revenue accounts (4xxx) are NEGATIVE in this ERP export. Expense accounts are POSITIVE. Column H → enter COUNTIFS in H3:H55 to flag duplicate JournalIDs.", NOTE);
  // Headers A-H
  ["JournalID","PostingDate","Department","Account","Amount","Description","Vendor","DupFlag ← fill me"]
    .forEach((h, c) => s(cd, 1, c, h, c === 7 ? HDRHINT : HDR));

  (ACTUALS_RAW as any[]).forEach((a, ri) => {
    const row = ri + 2;
    const isDup      = DUP_JE_IDS.has(a.journal_id);
    const isTrailing = (a.department as string).endsWith(" ");
    const isNeg      = a.amount < 0;
    const rowStyle   = isDup ? WARN : isNeg ? { bg: { rgb: "#f0fdf4" } } : ri % 2 === 1 ? ALT : undefined;
    [a.journal_id, a.posting_date, a.department, a.account, a.amount, a.description, a.vendor]
      .forEach((v, c) => {
        let cs = rowStyle;
        if (isTrailing && c === 2) cs = WARN;
        s(cd, row, c, v, cs);
      });
    // Column H (index 7) — MINT placeholder, learner fills COUNTIFS here
    s(cd, row, 7, "", MINT);
  });
  return cd;
}

function buildBudgetSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Budget amounts are POSITIVE for both Revenue and Expense accounts (planning tool convention).", NOTE);
  ["DeptCode","AccountCode","Month","BudgetAmount"]
    .forEach((h, c) => s(cd, 1, c, h, HDR));
  (BUDGET_RAW as any[]).forEach((b, ri) => {
    const row = ri + 2;
    [b.dept_code, b.account_code, b.month, b.budget_amount]
      .forEach((v, c) => s(cd, row, c, v, ri % 2 === 1 ? ALT : undefined));
  });
  return cd;
}

function buildDeptMapSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Department cross-reference — ERP codes (DEPT-NNN) ↔ Budget codes (D-prefix). 10 active departments.", SECT);
  ["ERPCode","BudgetCode","DepartmentName","Owner","PLGroup"]
    .forEach((h, c) => s(cd, 1, c, h, HDR2));
  (DEPTMAP_RAW as any[]).forEach((d, ri) => {
    const row = ri + 2;
    [d.erp_code, d.budget_code, d.dept_name, d.owner, d.pl_group]
      .forEach((v, c) => s(cd, row, c, v, ri % 2 === 1 ? ALT : undefined));
  });
  return cd;
}

function buildAccountMapSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Chart of accounts — sub-accounts 6100-01-A/B roll up to parent 6100-01 via wildcard SUMIFS.", SECT);
  ["AccountCode","AccountName","Category","AccountType","ParentAccount"]
    .forEach((h, c) => s(cd, 1, c, h, HDR2));
  (ACCTMAP_RAW as any[]).forEach((a, ri) => {
    const row = ri + 2;
    const isNew  = NO_BUDGET_ACCTS.has(a.account_code);
    const isDisc = DISC_ACCTS.has(a.account_code);
    const rowStyle = isNew ? { bg: { rgb: "#f0fdf4" } } : isDisc ? WARN : ri % 2 === 1 ? ALT : undefined;
    [a.account_code, a.account_name, a.category, a.account_type, a.parent]
      .forEach((v, c) => s(cd, row, c, v, rowStyle));
  });
  return cd;
}

function buildVarianceWorkingsSheet(
  answerRange: string, allRanges: string[], allSheets: string[], mySheet: string,
): CD {
  const cd: CD = {};
  ["ERPDeptCode","BudgetDeptCode","DepartmentName","AccountCode","AccountName","AccountType","Month",
   "Actual","Budget","DollarVariance","PctVariance","IsMaterial","FavUnfav","Commentary"]
    .forEach((h, c) => s(cd, 0, c, h, HDR));

  VW_ROWS.forEach(([dept, acct, month], ri) => {
    const row = ri + 1;
    const isNew  = NO_BUDGET_ACCTS.has(acct);
    const isDisc = DISC_ACCTS.has(acct);
    const rowBg  = isNew ? { bg: { rgb: "#f0fdf4" } } : isDisc ? WARN : ri % 2 === 1 ? ALT : undefined;
    s(cd, row, 0, dept,  rowBg);
    s(cd, row, 3, acct,  rowBg);
    s(cd, row, 6, month, rowBg);
    // H (col 7) — pre-populated with computed Actuals (SUMIFS wildcard not supported in-browser)
    s(cd, row, 7, (EXP_T04[ri] as any)?.value ?? 0, ri % 2 === 1 ? ALT : undefined);
    // Learner columns B, C, E, F, I-M (H is pre-filled above)
    [1, 2, 4, 5, 8, 9, 10, 11, 12].forEach(c => {
      if (!cd[row]) cd[row] = {};
      if (!cd[row][c]) cd[row][c] = { v: "", s: MINT };
    });
  });

  // Override active / other-task ranges
  allRanges.forEach((rng, i) => {
    if (allSheets[i] !== mySheet) return;
    const { startRow, startCol, rowCount, colCount } = parseRangeCoords(rng);
    const style = rng === answerRange ? AMBER : MINT;
    for (let r = 0; r < rowCount; r++)
      for (let c = 0; c < colCount; c++) {
        if (!cd[startRow + r]) cd[startRow + r] = {};
        cd[startRow + r][startCol + c] = { v: cd[startRow + r]?.[startCol + c]?.v ?? "", s: style };
      }
  });
  return cd;
}

function buildMgmtSummarySheet(): CD {
  const cd: CD = {};
  const purple = { bg: { rgb: "#4c1d95" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2 };
  const labels: [number, number, string][] = [
    [0,0,"COMPANY TOTALS — OCTOBER 2024"],[1,0,"Total Actual ($)"],[2,0,"Total Budget ($)"],
    [3,0,"Total Dollar Variance ($)"],[4,0,"Total % Variance"],[5,0,"Count of Material Variances"],
    [7,0,"VARIANCE BY DEPARTMENT"],
    [8,0,"Department"],[8,1,"Total Actual ($)"],[8,2,"Total Budget ($)"],[8,3,"Dollar Variance ($)"],[8,4,"Material Count"],
    [9,0,"Sales"],[10,0,"Marketing"],[11,0,"Engineering"],[12,0,"Customer Success"],[13,0,"G&A"],
    [14,0,"Operations"],[15,0,"Product"],[16,0,"Human Resources"],[17,0,"Legal"],[18,0,"Finance"],
    [20,0,"TOP 5 MATERIAL VARIANCES — by absolute dollar"],
    [21,0,"Department"],[21,1,"Account"],[21,2,"Dollar Variance ($)"],[21,3,"F/U"],
  ];
  labels.forEach(([r, c, v]) => {
    const isPurple = [0, 7, 20].includes(r);
    const isHdr    = [8, 21].includes(r);
    s(cd, r, c, v, isPurple ? purple : isHdr ? HDR2 : undefined);
  });
  [[1,1],[2,1],[3,1],[4,1],[5,1]].forEach(([r,c]) => s(cd,r,c,"",MINT));
  for (let r = 9; r <= 18; r++) [1,2,3,4].forEach(c => s(cd,r,c,"",MINT));
  for (let r = 22; r <= 26; r++) [0,1,2,3].forEach(c => s(cd,r,c,"",MINT));
  return cd;
}

const SHEET_IDS: Record<string, string> = {
  "Actuals": "actuals", "Budget": "budget", "DeptMap": "deptmap",
  "AccountMap": "accountmap", "Variance_Workings": "variance_workings", "Mgmt_Summary": "mgmt_summary",
};

const BudgetScenarioWidget = forwardRef<WidgetHandle, Props>(function BudgetScenarioWidget({
  answerRange, targetSheet, allAnswerRanges, allTargetSheets,
  onRangeSubmit, resetKey, grading,
}: Props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef    = useRef<any>(null);
  const answerRef    = useRef(answerRange);
  const sheetRef     = useRef(targetSheet);
  const onSubmitRef  = useRef(onRangeSubmit);
  const [ready, setReady]   = useState(false);
  const [pendingFormula, setPF] = useState("");

  useImperativeHandle(ref, () => ({
    fillRange(values, sheetName, rangeStr) {
      if (!univerRef.current) return;
      const wb = univerRef.current?.getActiveWorkbook?.();
      if (!wb) return;
      const sheets: any[] = wb.getSheets?.() ?? [];
      const sheet = sheets.find((s: any) => {
        try { return s.getName?.() === sheetName || s.getSheetId?.() === SHEET_IDS[sheetName]; }
        catch { return false; }
      });
      if (!sheet) return;
      const norm = rangeStr.includes(":") ? rangeStr : `${rangeStr}:${rangeStr}`;
      const [start] = norm.toUpperCase().split(":");
      const colIdx = (l: string) => l.split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
      const startCol = colIdx(start.replace(/[0-9]/g, ""));
      const startRow = parseInt(start.replace(/[A-Z]/g, ""), 10) - 1;
      values.forEach((v, i) => {
        try { sheet.getRange(startRow + i, startCol, 1, 1)?.setValue?.(v ?? ""); } catch {}
      });
    },
  }));

  answerRef.current   = answerRange;
  sheetRef.current    = targetSheet;
  onSubmitRef.current = onRangeSubmit;

  const activateSheet = (name: string) => {
    try {
      const wb = univerRef.current?.getActiveWorkbook?.();
      const sh = wb?.getSheets?.()?.find((s: any) =>
        s.getName?.() === name || s.getSheetId?.() === SHEET_IDS[name]
      );
      if (sh) wb.setActiveSheet?.(sh) ?? sh.activate?.();
    } catch (_) {}
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const init = async () => {
      const { createUniver, LocaleType, defaultTheme } = await import("@univerjs/presets");
      const { UniverSheetsCorePreset } = await import("@univerjs/preset-sheets-core");
      const enUS = (await import("@univerjs/preset-sheets-core/locales/en-US")).default;
      if (disposed) return;

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US, locales: { [LocaleType.EN_US]: enUS },
        theme: defaultTheme,
        presets: [UniverSheetsCorePreset({ container: containerRef.current! })],
      });
      univerRef.current = univerAPI;

      const vwCD = buildVarianceWorkingsSheet(answerRef.current, allAnswerRanges, allTargetSheets, "Variance_Workings");

      univerAPI.createWorkbook({
        id: "wb-budget-actuals", name: "Budget vs Actuals — Northwind SaaS Inc.",
        sheets: {
          variance_workings: {
            id: "variance_workings", name: "Variance_Workings",
            rowCount: 52, columnCount: 14,
            cellData: vwCD,
            columnData: {0:{w:80},1:{w:80},2:{w:140},3:{w:90},4:{w:200},5:{w:75},
                        6:{w:75},7:{w:90},8:{w:90},9:{w:110},10:{w:90},11:{w:85},12:{w:80},13:{w:150}},
          },
          actuals: {
            id: "actuals", name: "Actuals",
            rowCount: 60, columnCount: 8,
            cellData: buildActualsSheet(),
            columnData: {0:{w:145},1:{w:90},2:{w:100},3:{w:90},4:{w:90},5:{w:260},6:{w:180},7:{w:130}},
          },
          budget: {
            id: "budget", name: "Budget",
            rowCount: 48, columnCount: 4,
            cellData: buildBudgetSheet(),
            columnData: {0:{w:80},1:{w:90},2:{w:80},3:{w:110}},
          },
          deptmap: {
            id: "deptmap", name: "DeptMap",
            rowCount: 15, columnCount: 5,
            cellData: buildDeptMapSheet(),
            columnData: {0:{w:80},1:{w:80},2:{w:145},3:{w:175},4:{w:70}},
          },
          accountmap: {
            id: "accountmap", name: "AccountMap",
            rowCount: 48, columnCount: 5,
            cellData: buildAccountMapSheet(),
            columnData: {0:{w:90},1:{w:240},2:{w:100},3:{w:80},4:{w:90}},
          },
          mgmt_summary: {
            id: "mgmt_summary", name: "Mgmt_Summary",
            rowCount: 30, columnCount: 5,
            cellData: buildMgmtSummarySheet(),
            columnData: {0:{w:220},1:{w:130},2:{w:130},3:{w:130},4:{w:90}},
          },
        },
      });

      univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params: any) => {
        try {
          const { row, column, subUnitId } = params;
          const expectedId = SHEET_IDS[sheetRef.current];
          if (subUnitId && expectedId && subUnitId !== expectedId) return;
          const { startRow, startCol, rowCount, colCount } = parseRangeCoords(answerRef.current);
          if (row < startRow || row >= startRow + rowCount) return;
          if (column < startCol || column >= startCol + colCount) return;
          const sheet = univerAPI.getActiveWorkbook?.()?.getActiveSheet?.();
          if (!sheet) return;
          const formulas: string[][] = sheet.getRange(row, column).getFormulas?.() ?? [[""]];
          const formula = (formulas?.[0]?.[0] ?? "").trim();
          if (formula) setPF(formula);
        } catch (_) {}
      });

      setReady(true);
      setTimeout(() => activateSheet(sheetRef.current || "Variance_Workings"), 300);
    };
    init().catch(e => console.error("Univer init:", e));
    return () => {
      disposed = true;
      try { univerRef.current?.dispose?.(); } catch (_) {}
      univerRef.current = null;
      setReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    setPF("");
    activateSheet(targetSheet);
    setTimeout(() => {
      try {
        const wb = univerRef.current.getActiveWorkbook?.();
        allAnswerRanges.forEach((rng, i) => {
          const sName = allTargetSheets[i];
          const sh = wb?.getSheets?.()?.find((s: any) =>
            s.getName?.() === sName || s.getSheetId?.() === SHEET_IDS[sName]
          );
          if (!sh) return;
          const { startRow, startCol, rowCount, colCount } = parseRangeCoords(rng);
          const bg = rng === answerRange && sName === targetSheet ? "#fef3c7" : "#f0fdf4";
          try { sh.getRange?.(startRow, startCol, rowCount, colCount)?.setBackground?.(bg); } catch (_) {}
        });
      } catch (_) {}
    }, 400);
  }, [answerRange, targetSheet, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPF("");
    if (!ready) return;
    try {
      const wb = univerRef.current.getActiveWorkbook?.();
      const sh = wb?.getSheets?.()?.find((s: any) =>
        s.getName?.() === targetSheet || s.getSheetId?.() === SHEET_IDS[targetSheet]
      );
      if (!sh) return;
      const { startRow, startCol, rowCount, colCount } = parseRangeCoords(answerRange);
      const empty = Array.from({ length: rowCount }, () => Array(colCount).fill(""));
      sh.getRange?.(startRow, startCol, rowCount, colCount)?.setValues?.(empty);
    } catch (_) {}
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (grading || !ready) return;
    try {
      const { values, formulas } = readRange(univerRef.current, sheetRef.current, answerRef.current);
      const hasData = values.some(v => v !== null && v !== undefined && String(v).trim() !== "");
      if (!hasData) return;
      onSubmitRef.current(values, formulas);
    } catch (_) {}
  };

  return (
    <div className="w-full h-full flex flex-col">
      {ready && (
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-3 py-1 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Sheet</span>
          <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">{targetSheet}</span>
          <span className="text-[10px] text-slate-400">Answer range: <strong className="font-mono text-slate-600">{answerRange}</strong></span>
        </div>
      )}
      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="text-xs font-mono truncate min-w-0 text-slate-500">
          {pendingFormula
            ? <><span className="text-slate-400 mr-1">fx</span><span className="text-slate-800">{pendingFormula}</span></>
            : <span className="italic text-slate-400">{ready ? `Navigate to ${targetSheet} → fill ${answerRange}` : "Loading workbook…"}</span>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={grading || !ready}
          className={`shrink-0 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            grading ? "bg-slate-200 text-slate-400 cursor-wait"
              : ready ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {grading ? "Checking…" : "Submit Answer ✓"}
        </button>
      </div>
    </div>
  );
});

export default BudgetScenarioWidget;
