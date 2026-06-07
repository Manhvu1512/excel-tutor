"use client";

import { useEffect, useRef, useState } from "react";
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import "@univerjs/preset-sheets-core/lib/index.css";

import INVOICES_RAW from "@/content/scenarios/invoice-reconciliation/invoices.json";
import PAYMENTS_RAW from "@/content/scenarios/invoice-reconciliation/payments.json";
import VENDORS_RAW  from "@/content/scenarios/invoice-reconciliation/vendors.json";
import DEPTS_RAW    from "@/content/scenarios/invoice-reconciliation/departments.json";
import RECON_RAW    from "@/content/scenarios/invoice-reconciliation/recon_working.json";
import { readRange } from "@/lib/validators/univerAdapter";
import type { CellValue } from "@/lib/validators/rangeValidator";

type Props = {
  answerRange:     string;        // e.g. "G2:G27" or "B26"
  targetSheet:     string;
  allAnswerRanges: string[];      // all task ranges for multi-highlight
  allTargetSheets: string[];      // parallel to allAnswerRanges
  onRangeSubmit:   (values: CellValue[], formulas: string[]) => void;
  resetKey:        number;
  grading:         boolean;
};

// ── Range coordinate helper ───────────────────────────────────────────────────
function parseRangeCoords(rangeStr: string) {
  const norm = rangeStr.includes(":") ? rangeStr : `${rangeStr}:${rangeStr}`;
  const [s, e] = norm.toUpperCase().split(":");
  const colStr = (r: string) => r.replace(/\d/g, "");
  const rowNum = (r: string) => parseInt(r.replace(/[A-Z]/g, ""), 10) - 1;
  const colIdx = (l: string) =>
    l.split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const sc = colIdx(colStr(s)), sr = rowNum(s);
  const ec = colIdx(colStr(e)), er = rowNum(e);
  return { startRow: sr, startCol: sc, rowCount: er - sr + 1, colCount: ec - sc + 1 };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const HDR  = { bg: { rgb: "#1e3a5f" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2 };
const HDR2 = { bg: { rgb: "#334155" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2 };
const SECT = { bg: { rgb: "#e2e8f0" }, cl: { rgb: "#334155" }, bl: 1, ht: 2 };
const SMRY = { bg: { rgb: "#7c3aed" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2 };
const ALT  = { bg: { rgb: "#f8fafc" } };
const WARN = { bg: { rgb: "#fff7ed" }, cl: { rgb: "#c2410c" } };
const AMBER = {
  bg: { rgb: "#fef3c7" },
  bd: { t: { s: 5, cl: { rgb: "#f59e0b" } }, b: { s: 5, cl: { rgb: "#f59e0b" } },
        l: { s: 5, cl: { rgb: "#f59e0b" } }, r: { s: 5, cl: { rgb: "#f59e0b" } } },
};
const MINT = {
  bg: { rgb: "#f0fdf4" },
  bd: { t: { s: 1, cl: { rgb: "#86efac" } }, b: { s: 1, cl: { rgb: "#86efac" } },
        l: { s: 1, cl: { rgb: "#86efac" } }, r: { s: 1, cl: { rgb: "#86efac" } } },
};

type CD = Record<number, Record<number, any>>;
function s(cd: CD, r: number, c: number, v: any, style?: any) {
  if (!cd[r]) cd[r] = {};
  cd[r][c] = style ? { v, s: style } : { v };
}

// ── Sheet builders ────────────────────────────────────────────────────────────

function buildInvoicesSheet(): CD {
  const cd: CD = {};
  ["Invoice_ID","Inv_Date","Due_Date","Vendor_ID","Dept_ID","Amount","Description","PO_Number"]
    .forEach((h, c) => s(cd, 0, c, h, HDR));
  (INVOICES_RAW as any[]).forEach((inv, ri) => {
    const style = ri % 2 === 1 ? ALT : undefined;
    [inv.invoice_id, inv.invoice_date, inv.due_date, inv.vendor_id, inv.dept_id,
     inv.amount, inv.description, inv.po_number].forEach((v, c) => {
      const cs = (c === 3 && !inv.vendor_id) ? WARN : style;
      s(cd, ri + 1, c, v, cs);
    });
  });
  return cd;
}

function buildPaymentsSheet(): CD {
  const cd: CD = {};
  ["Payment_ID","Invoice_ID","Pmt_Date","Amount_Paid","Method","Reference","Status"]
    .forEach((h, c) => s(cd, 0, c, h, HDR));
  (PAYMENTS_RAW as any[]).forEach((p, ri) => {
    const style = ri % 2 === 1 ? ALT : undefined;
    const isVoid = p.invoice_id?.startsWith("INV-2024-VOID");
    [p.payment_id, p.invoice_id, p.payment_date, p.amount_paid,
     p.payment_method, p.reference, p.status].forEach((v, c) =>
      s(cd, ri + 1, c, v, isVoid ? WARN : style));
  });
  return cd;
}

function buildVendorMapSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Vendor Master — 20 vendors", SECT);
  ["Vendor_ID","Vendor_Name","Category","Payment_Terms"].forEach((h, c) => s(cd, 1, c, h, HDR2));
  (VENDORS_RAW as any[]).forEach((v, ri) => {
    const style = ri % 2 === 1 ? ALT : undefined;
    [v.vendor_id, v.vendor_name, v.category, v.payment_terms]
      .forEach((val, c) => s(cd, ri + 2, c, val, style));
  });
  return cd;
}

function buildDeptMapSheet(): CD {
  const cd: CD = {};
  s(cd, 0, 0, "Department Master — 15 departments", SECT);
  ["Dept_ID","Dept_Name","Cost_Center","Manager"].forEach((h, c) => s(cd, 1, c, h, HDR2));
  (DEPTS_RAW as any[]).forEach((d, ri) => {
    const style = ri % 2 === 1 ? ALT : undefined;
    [d.dept_id, d.dept_name, d.cost_center, d.manager]
      .forEach((val, c) => s(cd, ri + 2, c, val, style));
  });
  return cd;
}

function buildReconWorkingSheet(
  answerRange: string, allRanges: string[], allSheets: string[], mySheetName: string,
): CD {
  const cd: CD = {};
  ["Invoice_ID","Inv_Date","Due_Date","Vendor_ID","Dept_ID","Inv_Amount",
   "Vendor_Name","Dept_Name","Amount_Paid","Pay_Status","Outstanding","Overdue_Flag","Dup_Flag"]
    .forEach((h, c) => s(cd, 0, c, h, HDR));

  const idCounts: Record<string, number> = {};
  (RECON_RAW as any[]).forEach(inv => { idCounts[inv.invoice_id] = (idCounts[inv.invoice_id] || 0) + 1; });
  const dupIds = new Set(Object.entries(idCounts).filter(([, n]) => n > 1).map(([id]) => id));

  (RECON_RAW as any[]).forEach((inv, ri) => {
    const row = ri + 1;
    const isDup     = dupIds.has(inv.invoice_id);
    const isMissing = !inv.vendor_id;
    [inv.invoice_id, inv.invoice_date, inv.due_date, inv.vendor_id, inv.dept_id, inv.amount]
      .forEach((v, c) => {
        let cellStyle: any = ri % 2 === 1 ? ALT : undefined;
        if (isDup && c === 0)     cellStyle = { bg: { rgb: "#fef3c7" }, cl: { rgb: "#b45309" } };
        if (isMissing && c === 3) cellStyle = WARN;
        s(cd, row, c, v, cellStyle);
      });
    // Pre-fill learner answer columns G-M (6-12) as MINT placeholders
    for (let c = 6; c <= 12; c++) {
      if (!cd[row]) cd[row] = {};
      if (!cd[row][c]) cd[row][c] = { v: "", s: MINT };
    }
  });

  // Override with AMBER (active) or MINT (other task) for each task range on this sheet
  allRanges.forEach((rng, i) => {
    if (allSheets[i] !== mySheetName) return;
    const { startRow, startCol, rowCount, colCount } = parseRangeCoords(rng);
    const style = rng === answerRange ? AMBER : MINT;
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        if (!cd[startRow + r]) cd[startRow + r] = {};
        cd[startRow + r][startCol + c] = { v: "", s: style };
      }
    }
  });

  return cd;
}

function buildSummaryReportSheet(
  answerRange: string, allRanges: string[], allSheets: string[], mySheetName: string,
): CD {
  const cd: CD = {};

  // Outstanding by Vendor section
  s(cd, 0, 0, "═══ OUTSTANDING BY VENDOR (use SUMIFS on Recon Working!K:K) ═══", SMRY);
  s(cd, 1, 0, "Vendor", HDR2);
  s(cd, 1, 1, "Outstanding ($)", HDR2);
  (VENDORS_RAW as any[]).forEach((v, i) => {
    const row = i + 2;
    s(cd, row, 0, v.vendor_name, row % 2 === 0 ? ALT : undefined);
    if (!cd[row]) cd[row] = {};
    if (!cd[row][1]) cd[row][1] = { v: "", s: MINT };
  });

  // Count by Status section (row 23 = 20 vendors + 2 header rows + 1 gap)
  const statusStart = 23;
  s(cd, statusStart, 0, "═══ COUNT BY STATUS (use COUNTIFS on Recon Working!J:J) ═══", SMRY);
  s(cd, statusStart + 1, 0, "Status", HDR2);
  s(cd, statusStart + 1, 1, "Count", HDR2);
  (["Paid", "Partial", "Unpaid"] as const).forEach((label, i) => {
    const row = statusStart + 2 + i;
    s(cd, row, 0, label);
    if (!cd[row]) cd[row] = {};
    if (!cd[row][1]) cd[row][1] = { v: "", s: MINT };
  });

  // Grand Totals section
  const totalsStart = 29;
  s(cd, totalsStart, 0, "═══ GRAND TOTALS (use SUM on Recon Working!F:F / K:K) ═══", SMRY);
  s(cd, totalsStart + 1, 0, "Metric", HDR2);
  s(cd, totalsStart + 1, 1, "Amount ($)", HDR2);
  ["Total Invoiced (all rows incl. duplicates)", "Total Paid", "Total Outstanding", "Collection Rate (%)"]
    .forEach((label, i) => {
      const row = totalsStart + 2 + i;
      s(cd, row, 0, label);
      if (!cd[row]) cd[row] = {};
      if (!cd[row][1]) cd[row][1] = { v: "", s: MINT };
    });

  // Override with AMBER / MINT for task ranges on this sheet
  allRanges.forEach((rng, i) => {
    if (allSheets[i] !== mySheetName) return;
    const { startRow, startCol, rowCount, colCount } = parseRangeCoords(rng);
    const style = rng === answerRange ? AMBER : MINT;
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const row = startRow + r, col = startCol + c;
        if (!cd[row]) cd[row] = {};
        // Preserve existing text value (vendor names, labels) but update style
        cd[row][col] = { v: cd[row]?.[col]?.v ?? "", s: style };
      }
    }
  });

  return cd;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScenarioWidget({
  answerRange, targetSheet, allAnswerRanges, allTargetSheets,
  onRangeSubmit, resetKey, grading,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const univerRef     = useRef<any>(null);
  const answerRef     = useRef(answerRange);
  const sheetRef      = useRef(targetSheet);
  const onSubmitRef   = useRef(onRangeSubmit);
  const [ready, setReady]     = useState(false);
  const [pendingFormula, setPF] = useState("");  // formula preview (last edited cell in range)

  answerRef.current   = answerRange;
  sheetRef.current    = targetSheet;
  onSubmitRef.current = onRangeSubmit;

  const SHEET_IDS: Record<string, string> = {
    "Invoices":       "invoices",
    "Payments":       "payments",
    "Vendor Map":     "vendor_map",
    "Dept Map":       "dept_map",
    "Recon Working":  "recon_working",
    "Summary Report": "summary_report",
  };

  const activateSheet = (sheetName: string) => {
    const api = univerRef.current;
    if (!api) return;
    try {
      const wb     = api.getActiveWorkbook?.();
      const sheets = wb?.getSheets?.() as any[];
      const target = sheets?.find((sh: any) =>
        sh.getName?.() === sheetName || sh.getSheetId?.() === SHEET_IDS[sheetName]
      );
      if (target) wb.setActiveSheet?.(target) ?? target.activate?.();
    } catch (_) {}
  };

  // ── Initialise Univer once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const init = async () => {
      const { createUniver, LocaleType, defaultTheme } = await import("@univerjs/presets");
      const { UniverSheetsCorePreset } = await import("@univerjs/preset-sheets-core");
      const enUS = (await import("@univerjs/preset-sheets-core/locales/en-US")).default;
      if (disposed) return;

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: enUS },
        theme: defaultTheme,
        presets: [UniverSheetsCorePreset({ container: containerRef.current! })],
      });

      univerRef.current = univerAPI;

      const reconCD   = buildReconWorkingSheet(answerRef.current,  allAnswerRanges, allTargetSheets, "Recon Working");
      const summaryCD = buildSummaryReportSheet(answerRef.current, allAnswerRanges, allTargetSheets, "Summary Report");

      univerAPI.createWorkbook({
        id: "wb-invoice-recon",
        name: "Invoice Reconciliation — Meridian Group",
        sheets: {
          recon_working: {
            id: "recon_working", name: "Recon Working",
            rowCount: 30, columnCount: 13,
            cellData: reconCD,
            columnData: {
              0: { w: 130 }, 1: { w: 90 }, 2: { w: 90 }, 3: { w: 65 }, 4: { w: 55 }, 5: { w: 95 },
              6: { w: 160 }, 7: { w: 140 }, 8: { w: 110 }, 9: { w: 110 }, 10: { w: 110 },
              11: { w: 100 }, 12: { w: 100 },
            },
          },
          summary_report: {
            id: "summary_report", name: "Summary Report",
            rowCount: 40, columnCount: 3,
            cellData: summaryCD,
            columnData: { 0: { w: 360 }, 1: { w: 150 }, 2: { w: 120 } },
          },
          invoices: {
            id: "invoices", name: "Invoices",
            rowCount: 155, columnCount: 8,
            cellData: buildInvoicesSheet(),
            columnData: { 0: { w: 130 }, 1: { w: 90 }, 2: { w: 90 }, 3: { w: 65 }, 4: { w: 55 }, 5: { w: 90 }, 6: { w: 220 }, 7: { w: 80 } },
          },
          payments: {
            id: "payments", name: "Payments",
            rowCount: 115, columnCount: 7,
            cellData: buildPaymentsSheet(),
            columnData: { 0: { w: 90 }, 1: { w: 130 }, 2: { w: 90 }, 3: { w: 110 }, 4: { w: 80 }, 5: { w: 110 }, 6: { w: 75 } },
          },
          vendor_map: {
            id: "vendor_map", name: "Vendor Map",
            rowCount: 25, columnCount: 4,
            cellData: buildVendorMapSheet(),
            columnData: { 0: { w: 70 }, 1: { w: 200 }, 2: { w: 130 }, 3: { w: 100 } },
          },
          dept_map: {
            id: "dept_map", name: "Dept Map",
            rowCount: 20, columnCount: 4,
            cellData: buildDeptMapSheet(),
            columnData: { 0: { w: 70 }, 1: { w: 200 }, 2: { w: 110 }, 3: { w: 160 } },
          },
        },
      });

      // Listen for cell edits. Update formula preview if the edit lands inside the active range.
      univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params: any) => {
        try {
          const { row, column, subUnitId } = params;

          // Verify sheet via subUnitId
          const expectedId = SHEET_IDS[sheetRef.current];
          if (subUnitId && expectedId && subUnitId !== expectedId) return;

          // Check if the edited cell is within the active answer range
          const { startRow, startCol, rowCount, colCount } = parseRangeCoords(answerRef.current);
          if (row < startRow || row >= startRow + rowCount)   return;
          if (column < startCol || column >= startCol + colCount) return;

          // Capture formula for preview bar
          const sheet = univerAPI.getActiveWorkbook?.()?.getActiveSheet?.();
          if (!sheet) return;
          const rng      = sheet.getRange(row, column);
          const formulas: string[][] = rng.getFormulas?.() ?? [[""]];
          const formula  = (formulas?.[0]?.[0] ?? "").trim();
          if (formula) setPF(formula);
        } catch (_) {}
      });

      setReady(true);
      setTimeout(() => activateSheet(sheetRef.current || "Recon Working"), 300);
    };

    init().catch(e => console.error("Univer init:", e));
    return () => {
      disposed = true;
      try { univerRef.current?.dispose?.(); } catch (_) {}
      univerRef.current = null;
      setReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate + re-highlight when task changes ─────────────────────────────
  useEffect(() => {
    if (!ready || !univerRef.current) return;
    setPF("");
    activateSheet(targetSheet);

    setTimeout(() => {
      try {
        const wb = univerRef.current.getActiveWorkbook?.();
        allAnswerRanges.forEach((rng, i) => {
          const sheet = allTargetSheets[i];
          const sh    = wb?.getSheets?.()?.find((s: any) =>
            s.getName?.() === sheet || s.getSheetId?.() === SHEET_IDS[sheet]
          );
          if (!sh) return;
          const { startRow, startCol, rowCount, colCount } = parseRangeCoords(rng);
          const bg = (rng === answerRange && sheet === targetSheet) ? "#fef3c7" : "#f0fdf4";
          try {
            sh.getRange?.(startRow, startCol, rowCount, colCount)?.setBackground?.(bg);
          } catch (_) {}
        });
      } catch (_) {}
    }, 400);
  }, [answerRange, targetSheet, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear answer range on task reset ─────────────────────────────────────
  useEffect(() => {
    setPF("");
    if (!ready || !univerRef.current) return;
    try {
      const wb     = univerRef.current.getActiveWorkbook?.();
      const sheets = wb?.getSheets?.() as any[];
      const sh     = sheets?.find((s: any) =>
        s.getName?.() === targetSheet || s.getSheetId?.() === SHEET_IDS[targetSheet]
      );
      if (!sh) return;
      const { startRow, startCol, rowCount, colCount } = parseRangeCoords(answerRange);
      // Build a 2-D array of empty strings to clear the range
      const empty = Array.from({ length: rowCount }, () => Array(colCount).fill(""));
      sh.getRange?.(startRow, startCol, rowCount, colCount)?.setValues?.(empty);
    } catch (_) {}
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit: read the full answer range and fire callback ─────────────────
  const handleSubmit = () => {
    if (grading || !ready) return;
    try {
      const { values, formulas } = readRange(univerRef.current, sheetRef.current, answerRef.current);
      const hasData = values.some(v => v !== null && v !== undefined && String(v).trim() !== "");
      if (!hasData) return;
      onSubmitRef.current(values, formulas);
    } catch (_) {}
  };

  const previewText = pendingFormula
    ? pendingFormula
    : ready
    ? `Navigate to ${targetSheet} → fill ${answerRange}`
    : "Loading workbook…";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Sheet / range badge */}
      {ready && (
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-3 py-1 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Sheet</span>
          <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
            {targetSheet}
          </span>
          <span className="text-[10px] text-slate-400">
            Answer range:{" "}
            <strong className="font-mono text-slate-600">{answerRange}</strong>
          </span>
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="text-xs font-mono truncate min-w-0 text-slate-500">
          {pendingFormula ? (
            <><span className="text-slate-400 mr-1">fx</span><span className="text-slate-800">{pendingFormula}</span></>
          ) : (
            <span className="italic text-slate-400">{previewText}</span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={grading || !ready}
          className={`shrink-0 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            grading
              ? "bg-slate-200 text-slate-400 cursor-wait"
              : ready
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {grading ? "Checking…" : "Submit Answer ✓"}
        </button>
      </div>
    </div>
  );
}
