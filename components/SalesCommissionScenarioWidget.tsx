"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import "@univerjs/preset-sheets-core/lib/index.css";

import DEALS_RAW  from "@/content/scenarios/real-sales-commission-001/deals.json";
import REPS_RAW   from "@/content/scenarios/real-sales-commission-001/rep_master.json";
import RATES_RAW  from "@/content/scenarios/real-sales-commission-001/commission_rates.json";
import { readRange } from "@/lib/validators/univerAdapter";
import type { CellValue } from "@/lib/validators/rangeValidator";

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

const SHEET_IDS: Record<string, string> = {
  "Deals":                 "sc_deals",
  "RepMaster":             "sc_repmaster",
  "CommissionRates":       "sc_rates",
  "Commission_Calculator": "sc_calc",
  "Payroll_Summary":       "sc_payroll",
  "Settings":              "sc_settings",
};

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
const GREEN_DIM = { bg: { rgb: "#f0fdf4" } };
const PREFILL = { bg: { rgb: "#f1f5f9" }, cl: { rgb: "#64748b" } };

function s(cd: CD, r: number, c: number, v: any, style?: any) {
  if (!cd[r]) cd[r] = {};
  cd[r][c] = style ? { v, s: style } : { v };
}

function parseRangeCoords(rangeStr: string) {
  const norm = rangeStr.includes(":") ? rangeStr : `${rangeStr}:${rangeStr}`;
  const [st, en] = norm.toUpperCase().split(":");
  const colIdx = (l: string) => l.split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const colStr = (r: string) => r.replace(/\d/g, "");
  const rowNum = (r: string) => parseInt(r.replace(/[A-Z]/g, ""), 10) - 1;
  return {
    startRow: rowNum(st), startCol: colIdx(colStr(st)),
    rowCount: rowNum(en) - rowNum(st) + 1, colCount: colIdx(colStr(en)) - colIdx(colStr(st)) + 1,
  };
}

const DEALS  = DEALS_RAW  as { deal_id: string; rep_id: string; close_date: string; deal_type: string; amount: number; split_pct: number; status: string }[];
const REPS   = REPS_RAW   as { rep_id: string; rep_name: string; plan_type: string; annual_quota: number; hire_date: string; region: string; proration_factor: number }[];
const RATES  = RATES_RAW  as { tier_min: number | null; standard_rate: number; accelerator_rate: number; label: string; deal_type: string }[];

const CLAWBACK: Record<string, number> = { "R003": -1200 };

function buildDealsSheet(answerRange: string, allRanges: string[], allSheets: string[], mySheet: string): CD {
  const cd: CD = {};
  // No banner row — headers at row 0, data at row 1+ so answer ranges start at row 2
  ["Deal ID","Rep ID","Close Date","Deal Type","Amount ($)","Split Pct","Status","AuditFlag ← fill me"]
    .forEach((h, c) => s(cd, 0, c, h, c === 7 ? HDRHINT : HDR));

  DEALS.forEach((d, ri) => {
    const row = ri + 1;
    const isCancel = d.status === "Cancelled";
    const isZero   = d.amount === 0;
    const isBadType = !["New Business","Renewal","Expansion"].includes(d.deal_type);
    const isSplit  = d.split_pct < 1;
    const rowStyle = isCancel ? WARN : isZero ? WARN : isBadType ? WARN : isSplit ? GREEN_DIM : ri % 2 === 1 ? ALT : undefined;
    [d.deal_id, d.rep_id, d.close_date, d.deal_type, d.amount, d.split_pct, d.status]
      .forEach((v, c) => s(cd, row, c, v, rowStyle));
    s(cd, row, 7, "", MINT);
  });

  allRanges.forEach((rng, i) => {
    if (allSheets[i] !== mySheet) return;
    const { startRow, startCol, rowCount, colCount } = parseRangeCoords(rng);
    const style = rng === answerRange && allSheets[i] === mySheet ? AMBER : MINT;
    for (let r = 0; r < rowCount; r++)
      for (let c = 0; c < colCount; c++) {
        if (!cd[startRow + r]) cd[startRow + r] = {};
        cd[startRow + r][startCol + c] = { v: cd[startRow + r]?.[startCol + c]?.v ?? "", s: style };
      }
  });
  return cd;
}

function buildRepMasterSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Rep Master — R006 Jordan  Lee has a double-space in the name (intentional data quality issue). R010 Alex Chen hired 2024-10-15 — ProrationFactor = 17/31.", NOTE);
  ["Rep ID","Rep Name","Plan Type","Annual Quota","Hire Date","Region","ProrationFactor"]
    .forEach((h, c) => s(cd, 1, c, h, HDR2));
  REPS.forEach((r, ri) => {
    const row = ri + 2;
    const isDouble = r.rep_id === "R006";
    const isNew    = r.rep_id === "R010";
    const style    = isNew ? GREEN_DIM : isDouble ? NOTE : ri % 2 === 1 ? ALT : undefined;
    [r.rep_id, r.rep_name, r.plan_type, r.annual_quota, r.hire_date, r.region, r.proration_factor]
      .forEach((v, c) => s(cd, row, c, v, style));
  });
  return cd;
}

function buildCommissionRatesSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "NB tiers (rows 2-5) are sorted ascending by TierMin — use VLOOKUP with TRUE (approx match). Flat rates for Renewal and Expansion (rows 8-9) don't use tiers.", NOTE);
  ["TierMin","Standard Rate","Accelerator Rate","Label","Deal Type"]
    .forEach((h, c) => s(cd, 1, c, h, HDR));
  const nbTiers = RATES.filter(r => r.deal_type === "New Business");
  nbTiers.forEach((r, ri) => {
    const row = ri + 2;
    [r.tier_min, r.standard_rate, r.accelerator_rate, r.label, r.deal_type]
      .forEach((v, c) => s(cd, row, c, v, ri % 2 === 1 ? ALT : undefined));
  });
  s(cd, 6, 0, "FLAT RATES", SECT);
  ["Deal Type","Standard Rate","Accelerator Rate"]
    .forEach((h, c) => s(cd, 7, c, h, HDR2));
  const flatRates = RATES.filter(r => r.tier_min === null);
  flatRates.forEach((r, ri) => {
    [r.deal_type, r.standard_rate, r.accelerator_rate]
      .forEach((v, c) => s(cd, 8 + ri, c, v));
  });
  return cd;
}

function buildCommissionCalcSheet(
  answerRange: string, allRanges: string[], allSheets: string[], mySheet: string,
): CD {
  const cd: CD = {};
  ["Rep ID","Rep Name","Plan Type","Adj. Monthly Quota","NB Revenue","Renewal Revenue",
   "Expansion Revenue","Deal Count","Quota Attainment","NB Comm. Rate","Base Commission",
   "Clawback Adj","Final Commission"]
    .forEach((h, c) => {
      const isLearner = c >= 1 && c !== 11;
      s(cd, 0, c, h, isLearner ? HDRHINT : HDR);
    });

  REPS.forEach((r, ri) => {
    const row = ri + 1;
    const clawback = CLAWBACK[r.rep_id] ?? 0;
    s(cd, row, 0, r.rep_id, PREFILL);
    s(cd, row, 11, clawback, clawback !== 0 ? WARN : PREFILL);
    [1,2,3,4,5,6,7,8,9,10,12].forEach(c => {
      if (!cd[row]) cd[row] = {};
      if (!cd[row][c]) cd[row][c] = { v: "", s: MINT };
    });
  });

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

function buildPayrollSummarySheet(): CD {
  const cd: CD = {};
  const purple = { bg: { rgb: "#4c1d95" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2 };
  s(cd, 0, 0, "CLOUDPULSE INC — OCTOBER 2024 COMMISSION PAYROLL", purple);
  ["Rep ID","Rep Name","Final Commission ($)","Notes"]
    .forEach((h, c) => s(cd, 1, c, h, HDR));
  REPS.forEach((r, ri) => {
    const row = ri + 2;
    const clawback = CLAWBACK[r.rep_id] ?? 0;
    s(cd, row, 0, r.rep_id, ri % 2 === 1 ? ALT : undefined);
    s(cd, row, 1, "", MINT);
    s(cd, row, 2, "", MINT);
    if (clawback !== 0) s(cd, row, 3, "Clawback applied", NOTE);
  });
  return cd;
}

function buildSettingsSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Plan Settings — October 2024", SECT);
  ["Setting","Value"].forEach((h, c) => s(cd, 1, c, h, HDR2));
  [["CommissionCap",25000],["ClawbackMonth","2024-10"],["StandardRenewalRate",0.05],
   ["AcceleratorRenewalRate",0.07],["StandardExpansionRate",0.08],["AcceleratorExpansionRate",0.10]]
    .forEach(([k, v], ri) => {
      s(cd, ri + 2, 0, k);
      s(cd, ri + 2, 1, v);
    });
  return cd;
}

const SalesCommissionScenarioWidget = forwardRef<WidgetHandle, Props>(function SalesCommissionScenarioWidget({
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
      const sheet = sheets.find((sh: any) => {
        try { return sh.getName?.() === sheetName || sh.getSheetId?.() === SHEET_IDS[sheetName]; }
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
    } catch {}
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

      const calcCD = buildCommissionCalcSheet(answerRef.current, allAnswerRanges, allTargetSheets, "Commission_Calculator");
      const dealsCD = buildDealsSheet(answerRef.current, allAnswerRanges, allTargetSheets, "Deals");

      univerAPI.createWorkbook({
        id: "wb-sales-commission", name: "Sales Commission Calculator — October 2024",
        sheets: {
          sc_calc: {
            id: "sc_calc", name: "Commission_Calculator",
            rowCount: 15, columnCount: 13,
            cellData: calcCD,
            columnData: {0:{w:70},1:{w:130},2:{w:100},3:{w:120},4:{w:110},5:{w:120},
                        6:{w:120},7:{w:90},8:{w:110},9:{w:110},10:{w:120},11:{w:100},12:{w:120}},
          },
          sc_deals: {
            id: "sc_deals", name: "Deals",
            rowCount: 55, columnCount: 8,
            cellData: dealsCD,
            columnData: {0:{w:80},1:{w:65},2:{w:90},3:{w:120},4:{w:90},5:{w:75},6:{w:80},7:{w:140}},
          },
          sc_repmaster: {
            id: "sc_repmaster", name: "RepMaster",
            rowCount: 15, columnCount: 7,
            cellData: buildRepMasterSheet(),
            columnData: {0:{w:65},1:{w:145},2:{w:100},3:{w:110},4:{w:90},5:{w:80},6:{w:120}},
          },
          sc_rates: {
            id: "sc_rates", name: "CommissionRates",
            rowCount: 15, columnCount: 5,
            cellData: buildCommissionRatesSheet(),
            columnData: {0:{w:80},1:{w:110},2:{w:120},3:{w:70},4:{w:120}},
          },
          sc_payroll: {
            id: "sc_payroll", name: "Payroll_Summary",
            rowCount: 15, columnCount: 4,
            cellData: buildPayrollSummarySheet(),
            columnData: {0:{w:70},1:{w:150},2:{w:140},3:{w:160}},
          },
          sc_settings: {
            id: "sc_settings", name: "Settings",
            rowCount: 12, columnCount: 2,
            cellData: buildSettingsSheet(),
            columnData: {0:{w:200},1:{w:120}},
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
        } catch {}
      });

      setReady(true);
      setTimeout(() => activateSheet(sheetRef.current || "Commission_Calculator"), 300);
    };
    init().catch(e => console.error("Univer init:", e));
    return () => {
      disposed = true;
      try { univerRef.current?.dispose?.(); } catch {}
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
          try { sh.getRange?.(startRow, startCol, rowCount, colCount)?.setBackground?.(bg); } catch {}
        });
      } catch {}
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
    } catch {}
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (grading || !ready) return;
    try {
      const { values, formulas } = readRange(univerRef.current, sheetRef.current, answerRef.current);
      const hasData = values.some(v => v !== null && v !== undefined && String(v).trim() !== "");
      if (!hasData) return;
      onSubmitRef.current(values, formulas);
    } catch {}
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

export default SalesCommissionScenarioWidget;
