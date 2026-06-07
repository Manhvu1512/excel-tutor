"use client";

import { useEffect, useRef, useState } from "react";
import type { DatasetRow } from "@/lib/types";
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import "@univerjs/preset-sheets-core/lib/index.css";

type Props = {
  headers: string[];
  rows: DatasetRow[];
  answerCell: string;
  exerciseLabel: string;
  onFormulaSubmit: (formula: string, value: number | null) => void;
  resetKey: number;
  allAnswerCells: string[];
  grading: boolean;
};

const colLetterToIndex = (letter: string) => {
  let idx = 0;
  for (let i = 0; i < letter.length; i++) {
    idx = idx * 26 + (letter.charCodeAt(i) - 64);
  }
  return idx - 1;
};

const parseCell = (cell: string) => {
  const m = cell.match(/^([A-Z]+)(\d+)$/);
  if (!m) return { col: 8, row: 1 };
  return { col: colLetterToIndex(m[1]), row: parseInt(m[2]) - 1 };
};

const ACTIVE_STYLE = {
  bg: { rgb: "#fef3c7" },
  bd: {
    t: { s: 5, cl: { rgb: "#f59e0b" } },
    b: { s: 5, cl: { rgb: "#f59e0b" } },
    l: { s: 5, cl: { rgb: "#f59e0b" } },
    r: { s: 5, cl: { rgb: "#f59e0b" } },
  },
};

const INACTIVE_STYLE = {
  bg: { rgb: "#f0fdf4" },
  bd: {
    t: { s: 1, cl: { rgb: "#86efac" } },
    b: { s: 1, cl: { rgb: "#86efac" } },
    l: { s: 1, cl: { rgb: "#86efac" } },
    r: { s: 1, cl: { rgb: "#86efac" } },
  },
};

export default function PracticeWidget({
  headers,
  rows,
  answerCell,
  onFormulaSubmit,
  resetKey,
  allAnswerCells,
  grading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<any>(null);
  const answerCellRef = useRef(answerCell);
  const onSubmitRef = useRef(onFormulaSubmit);
  const [ready, setReady] = useState(false);
  const [pendingFormula, setPendingFormula] = useState("");
  const [pendingValue, setPendingValue] = useState<number | null>(null);

  // Keep refs current on every render so event listeners always use fresh values
  answerCellRef.current = answerCell;
  onSubmitRef.current = onFormulaSubmit;

  // ── One-time Univer initialisation ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const init = async () => {
      // Univer is browser-only — dynamic import required
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

      // ── Build cell data ─────────────────────────────────────────────────────
      const cellData: Record<number, Record<number, any>> = {};

      // Header row (row 0)
      headers.forEach((h, i) => {
        if (!cellData[0]) cellData[0] = {};
        cellData[0][i] = {
          v: h,
          s: { bg: { rgb: "#1e3a5f" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2 },
        };
      });

      // Data rows (rows 1…n)
      rows.forEach((row, rIdx) => {
        const r = rIdx + 1;
        if (!cellData[r]) cellData[r] = {};
        headers.forEach((h, cIdx) => {
          const v = row[h];
          cellData[r][cIdx] = {
            v,
            // Right-align numeric Amount column
            s: typeof v === "number" ? { ht: 3 } : undefined,
          };
        });
      });

      // Pre-stamp all answer cells (inactive style for non-active ones)
      allAnswerCells.forEach((cell) => {
        const { col, row } = parseCell(cell);
        if (!cellData[row]) cellData[row] = {};
        cellData[row][col] = { v: "", s: INACTIVE_STYLE };
      });

      // Active answer cell gets the strong amber highlight
      const { col: initCol, row: initRow } = parseCell(answerCellRef.current);
      if (!cellData[initRow]) cellData[initRow] = {};
      cellData[initRow][initCol] = { v: "", s: ACTIVE_STYLE };

      univerAPI.createWorkbook({
        id: "wb-1",
        name: "Practice",
        sheets: {
          "sheet-1": {
            id: "sheet-1",
            name: "Q3 Transactions",
            rowCount: Math.max(rows.length + 10, 60),
            columnCount: 20,
            cellData,
            columnData: {
              0: { w: 105 }, // A – Date
              1: { w: 145 }, // B – Vendor
              2: { w: 135 }, // C – Category
              3: { w: 125 }, // D – Department
              4: { w: 85 },  // E – GL_Account
              5: { w: 100 }, // F – Amount
              8: { w: 160 }, // I – Answer column
            },
          },
        },
      });

      // ── Event listener — track pending answer, do NOT auto-submit ─────────────
      univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params: any) => {
        try {
          const { row, column } = params;
          const { col: targetCol, row: targetRow } = parseCell(answerCellRef.current);
          if (row !== targetRow || column !== targetCol) return;

          const sheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
          if (!sheet) return;

          const range = sheet.getRange(targetRow, targetCol);
          const formulas: string[][] = range.getFormulas?.() ?? [[""]];
          const formula = formulas?.[0]?.[0] ?? "";
          const raw = range.getValue();
          const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));

          setPendingFormula(formula || String(raw ?? ""));
          setPendingValue(isNaN(num) ? null : num);
        } catch (e) {
          console.error("SheetEditEnded error:", e);
        }
      });

      setReady(true);
    };

    init().catch((e) => console.error("Univer init error:", e));

    return () => {
      disposed = true;
      try { univerRef.current?.dispose(); } catch (_) {}
      univerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update highlight when active exercise changes ────────────────────────────
  useEffect(() => {
    if (!ready || !univerRef.current) return;
    try {
      const sheet = univerRef.current.getActiveWorkbook()?.getActiveSheet();
      if (!sheet) return;

      // Dim all answer cells
      allAnswerCells.forEach((cell) => {
        const { col, row } = parseCell(cell);
        sheet.getRange(row, col)?.setBackground?.(INACTIVE_STYLE.bg.rgb);
      });

      // Highlight active cell
      const { col, row } = parseCell(answerCell);
      sheet.getRange(row, col)?.setBackground?.(ACTIVE_STYLE.bg.rgb);
    } catch (e) {
      // setBackground may not exist in all Univer versions — fail silently
    }
  }, [answerCell, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear answer cell + pending state on exercise reset ─────────────────────
  useEffect(() => {
    setPendingFormula("");
    setPendingValue(null);
    if (!ready || !univerRef.current) return;
    try {
      const { col, row } = parseCell(answerCell);
      univerRef.current
        .getActiveWorkbook()
        ?.getActiveSheet()
        ?.getRange(row, col)
        ?.setValue("");
    } catch (_) {}
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Read cell directly from Univer on every submit click ────────────────────
  const handleSubmit = () => {
    if (grading || !ready) return;
    try {
      const { col, row } = parseCell(answerCellRef.current);
      const sheet = univerRef.current?.getActiveWorkbook()?.getActiveSheet();
      const range = sheet?.getRange(row, col);

      const formulas: string[][] = range?.getFormulas?.() ?? [[""]];
      const formula = (formulas?.[0]?.[0] ?? "").trim();
      const raw = range?.getValue();
      const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));

      // Prefer formula string; fall back to raw value; fall back to pending state
      const finalFormula = formula || pendingFormula || (raw != null ? String(raw) : "");
      const finalValue = isNaN(num) ? pendingValue : num;

      if (!finalFormula) return;
      onSubmitRef.current(finalFormula, finalValue);
    } catch (e) {
      // If Univer read fails, use whatever was captured by the event listener
      if (pendingFormula) onSubmitRef.current(pendingFormula, pendingValue);
    }
  };

  const previewText = pendingFormula
    || (ready ? "Enter formula in highlighted cell" : "Loading spreadsheet…");

  return (
    <div className="w-full h-full flex flex-col">
      {/* Spreadsheet fills available space */}
      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {/* Submit bar — enabled whenever Univer is ready */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="text-xs font-mono truncate min-w-0 text-slate-500">
          {pendingFormula ? (
            <>
              <span className="text-slate-400 mr-1">fx</span>
              <span className="text-slate-800">{pendingFormula}</span>
            </>
          ) : (
            <span className="italic">{previewText}</span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={grading || !ready}
          className={`shrink-0 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            grading
              ? "bg-slate-200 text-slate-400 cursor-wait"
              : ready
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {grading ? "Checking…" : "Submit Answer ✓"}
        </button>
      </div>
    </div>
  );
}
