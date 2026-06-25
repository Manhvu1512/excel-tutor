"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { DatasetRow } from "@/lib/types";

/* ─── public handle type ───────────────────────────────────────── */
export type UICheckType = "conditionalFormat" | "chart" | "filter" | "pivotTable";

export type PracticeWidgetHandle = {
  checkUIState: (type: UICheckType, params: Record<string, unknown>) => boolean;
};

/* ─── props ────────────────────────────────────────────────────── */
type Props = {
  headers: string[];
  rows: DatasetRow[];
  answerCell: string;
  exerciseLabel: string;
  onFormulaSubmit: (formula: string, value: number | null) => void;
  resetKey: number;
  allAnswerCells: string[];
  grading: boolean;
  uiCheck?: { type: UICheckType; params: Record<string, unknown> };
};

/* ─── inner component props (passed to dynamic SheetView) ─────── */
type InnerProps = {
  headers: string[];
  rows: DatasetRow[];
  answerCell: string;
  allAnswerCells: string[];
  resetKey: number;
  spreadsheetRef: React.MutableRefObject<any>;
  onActionComplete: (args: any) => void;
};

/* ─── helpers ──────────────────────────────────────────────────── */
const colLetterToIndex = (letter: string): number => {
  let idx = 0;
  for (const ch of letter) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
};

const parseCell = (cell: string) => {
  const m = cell.match(/^([A-Z]+)(\d+)$/);
  if (!m) return { col: 8, row: 1 };
  return { col: colLetterToIndex(m[1]), row: parseInt(m[2]) - 1 };
};

/* ─── browser-only spreadsheet (loaded via next/dynamic) ──────── */
const SheetView = dynamic<InnerProps>(
  async () => {
    const ej2 = await import("@syncfusion/ej2-react-spreadsheet");
    const base = await import("@syncfusion/ej2-base");

    const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE;
    if (licenseKey) base.registerLicense(licenseKey);

    const {
      SpreadsheetComponent,
      SheetsDirective, SheetDirective,
      RowsDirective, RowDirective,
      CellsDirective, CellDirective,
      ColumnsDirective, ColumnDirective,
    } = ej2;

    function SheetViewInner({
      headers,
      rows,
      answerCell,
      allAnswerCells,
      resetKey,
      spreadsheetRef,
      onActionComplete,
    }: InnerProps) {
      const applyHighlights = (sp: any, active: string) => {
        allAnswerCells.forEach((c) => sp.cellFormat({ backgroundColor: "#f0fdf4" }, c));
        sp.cellFormat({ backgroundColor: "#fef3c7" }, active);
        sp.goTo(active);
      };

      const onCreated = () => {
        const sp = spreadsheetRef.current;
        if (sp) applyHighlights(sp, answerCell);
      };

      useEffect(() => {
        const sp = spreadsheetRef.current;
        if (sp) applyHighlights(sp, answerCell);
      }, [answerCell]); // eslint-disable-line react-hooks/exhaustive-deps

      useEffect(() => {
        const sp = spreadsheetRef.current;
        if (sp) sp.updateCell({ value: "" }, answerCell);
      }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

      return (
        <SpreadsheetComponent
          ref={spreadsheetRef}
          created={onCreated}
          actionComplete={onActionComplete}
          height="100%"
          showRibbon={false}
          showFormulaBar
          showSheetTabs={false}
          allowConditionalFormat
          allowChart
          enablePersistence={false}
        >
          <SheetsDirective>
            <SheetDirective name="Q3 Transactions">
              <ColumnsDirective>
                <ColumnDirective width={105} />
                <ColumnDirective width={145} />
                <ColumnDirective width={135} />
                <ColumnDirective width={125} />
                <ColumnDirective width={85} />
                <ColumnDirective width={100} />
                <ColumnDirective width={60} />
                <ColumnDirective width={60} />
                <ColumnDirective width={160} />
              </ColumnsDirective>
              <RowsDirective>
                {/* Header row */}
                <RowDirective>
                  <CellsDirective>
                    {headers.map((h, i) => (
                      <CellDirective
                        key={i}
                        value={h}
                        style={{
                          backgroundColor: "#1e3a5f",
                          color: "#ffffff",
                          fontWeight: "bold",
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      />
                    ))}
                  </CellsDirective>
                </RowDirective>
                {/* Data rows */}
                {rows.map((row, ri) => (
                  <RowDirective key={ri}>
                    <CellsDirective>
                      {headers.map((h, ci) => {
                        const v = row[h];
                        return (
                          <CellDirective
                            key={ci}
                            value={v != null ? String(v) : ""}
                            style={
                              typeof v === "number" ? { textAlign: "right" } : undefined
                            }
                          />
                        );
                      })}
                    </CellsDirective>
                  </RowDirective>
                ))}
              </RowsDirective>
            </SheetDirective>
          </SheetsDirective>
        </SpreadsheetComponent>
      );
    }

    return SheetViewInner;
  },
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-white">
        <span className="text-slate-400 text-sm italic">Loading spreadsheet…</span>
      </div>
    ),
  }
);

/* ─── exported component ───────────────────────────────────────── */
const PracticeWidget = forwardRef<PracticeWidgetHandle, Props>(
  function PracticeWidget(
    { headers, rows, answerCell, onFormulaSubmit, resetKey, allAnswerCells, grading, uiCheck },
    ref
  ) {
    const spreadsheetRef = useRef<any>(null);
    const answerCellRef = useRef(answerCell);
    const onSubmitRef = useRef(onFormulaSubmit);
    answerCellRef.current = answerCell;
    onSubmitRef.current = onFormulaSubmit;

    const [pendingFormula, setPendingFormula] = useState("");

    /* ── checkUIState (exposed via ref + used internally) ─────── */
    const checkUIState = (type: UICheckType, params: Record<string, unknown>): boolean => {
      const sp = spreadsheetRef.current;
      if (!sp) return false;
      const sheet = sp.getActiveSheet() as any;
      if (!sheet) return false;

      if (type === "conditionalFormat") {
        const cfs: any[] = sheet.conditionalFormats ?? [];
        return cfs.some((cf) => {
          const typeOk =
            !params.ruleType ||
            cf.type?.toLowerCase() === String(params.ruleType).toLowerCase();
          const valueOk =
            params.value === undefined || String(cf.value) === String(params.value);
          return typeOk && valueOk;
        });
      }

      if (type === "chart") {
        return (sheet.charts?.length ?? 0) > 0;
      }

      if (type === "filter") {
        const filter = sheet.filterSettings;
        if (!filter?.columns?.length) return false;
        if (!params.value) return true;
        return filter.columns.some((col: any) =>
          col.predicates?.some((p: any) => String(p.value) === String(params.value))
        );
      }

      return false; // pivotTable not natively supported in Syncfusion Spreadsheet
    };

    useImperativeHandle(ref, () => ({ checkUIState }));

    /* ── track formula preview via actionComplete ─────────────── */
    const handleActionComplete = (args: any) => {
      if (args.action !== "cellSave") return;
      const sp = spreadsheetRef.current;
      if (!sp) return;
      const { col, row } = parseCell(answerCellRef.current);
      const sheet = sp.getActiveSheet() as any;
      const cell = sheet?.rows?.[row]?.cells?.[col];
      const f: string = cell?.formula || String(cell?.value ?? "");
      setPendingFormula(f);
    };

    /* ── submit ───────────────────────────────────────────────── */
    const handleSubmit = () => {
      if (grading) return;

      // UI-state exercise: check spreadsheet state instead of reading a cell
      if (uiCheck) {
        const found = checkUIState(uiCheck.type, uiCheck.params);
        onSubmitRef.current(uiCheck.type, found ? 1 : 0);
        return;
      }

      // Formula/value exercise: read cell from spreadsheet model
      const sp = spreadsheetRef.current;
      if (!sp) return;
      const { col, row } = parseCell(answerCellRef.current);
      const sheet = sp.getActiveSheet() as any;
      const cell = sheet?.rows?.[row]?.cells?.[col];
      const formula = (cell?.formula || String(cell?.value ?? "")).trim();
      if (!formula) return;
      const value = cell?.value;
      const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
      onSubmitRef.current(formula, isNaN(num) ? null : num);
    };

    const hint = uiCheck
      ? `Apply ${uiCheck.type} in the spreadsheet, then click Submit`
      : "Enter formula in highlighted cell";

    return (
      <div className="w-full h-full flex flex-col">
        {/* Spreadsheet fills remaining height */}
        <div className="flex-1 relative min-h-0">
          <SheetView
            headers={headers}
            rows={rows}
            answerCell={answerCell}
            allAnswerCells={allAnswerCells}
            resetKey={resetKey}
            spreadsheetRef={spreadsheetRef}
            onActionComplete={handleActionComplete}
          />
        </div>

        {/* Submit bar */}
        <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="text-xs font-mono truncate min-w-0 text-slate-500">
            {pendingFormula ? (
              <>
                <span className="text-slate-400 mr-1">fx</span>
                <span className="text-slate-800">{pendingFormula}</span>
              </>
            ) : (
              <span className="italic">{hint}</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={grading}
            className={`shrink-0 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
              grading
                ? "bg-slate-200 text-slate-400 cursor-wait"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {grading ? "Checking…" : "Submit Answer ✓"}
          </button>
        </div>
      </div>
    );
  }
);

export default PracticeWidget;
