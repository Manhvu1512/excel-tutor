"use client";

type Props = {
  onStart: () => void;
  onNavigateHome?: () => void;
};

export default function ScenarioIntroPage({ onStart, onNavigateHome }: Props) {
  return (
    <div className="h-screen overflow-y-auto bg-slate-50 flex flex-col">
      <div className="max-w-3xl mx-auto px-8 py-10 w-full">
        {onNavigateHome && (
          <button onClick={onNavigateHome} className="text-sm text-slate-500 hover:text-brand-600 font-medium mb-4 flex items-center gap-1 transition">
            ← Back to Home
          </button>
        )}

        {/* Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-wider">Real Scenario</span>
          <span className="text-xs text-slate-500">Finance · Intermediate · ~45 min · 500 XP</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-1">Invoice Reconciliation</h1>
        <p className="text-slate-500 mb-6 text-base">Month-End AP Reconciliation — July–August 2024</p>
        <hr className="border-slate-200 mb-8" />

        {/* Business story */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-5 mb-8">
          <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">Your Brief</h2>
          <p className="text-slate-800 leading-relaxed text-sm">
            You are an <strong>Accounts Payable analyst at Meridian Group</strong>, a mid-size professional services firm.
            It is September 1, 2024 — the close of the August reporting period. Your controller has asked you to
            reconcile all vendor invoices issued in July and August against the payment ledger, identify outstanding
            balances, flag overdue and problematic records, and produce a clean summary for the <strong>CFO review meeting tomorrow morning</strong>.
          </p>
          <p className="text-slate-700 text-sm mt-3 leading-relaxed">
            The raw invoice export has <strong>152 rows</strong> spanning July–August. The payment ledger has <strong>112 entries</strong>.
            There are duplicate invoice IDs, missing vendor codes, and partial payments hiding in the data. Your job
            is to find them, quantify them, and present a clean AP position across <strong>6 workbook tabs</strong>.
          </p>
        </div>

        {/* Data overview */}
        <h2 className="text-lg font-bold text-slate-900 mb-4">What's in the Workbook</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Invoices (raw)", rows: "152 rows", note: "2 duplicate IDs, 2 missing vendor codes", color: "bg-blue-50 border-blue-200 text-blue-800" },
            { label: "Payments", rows: "112 entries", note: "12 partial payments, 43 unpaid invoices", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
            { label: "Vendor Map", rows: "20 vendors", note: "Reference lookup table", color: "bg-amber-50 border-amber-200 text-amber-800" },
            { label: "Dept Map", rows: "15 departments", note: "Reference lookup table", color: "bg-purple-50 border-purple-200 text-purple-800" },
            { label: "Recon Working", rows: "26 curated rows", note: "Your formula workspace (tasks T01–T07)", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
            { label: "Summary Report", rows: "CFO view", note: "SUMIFS / COUNTIFS / SUM (tasks T08–T10)", color: "bg-rose-50 border-rose-200 text-rose-800" },
          ].map((t) => (
            <div key={t.label} className={`border rounded-xl px-4 py-3.5 ${t.color}`}>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs opacity-75 mt-0.5">{t.rows} — {t.note}</div>
            </div>
          ))}
        </div>

        {/* 10 tasks preview */}
        <h2 className="text-lg font-bold text-slate-900 mb-4">Your 10 Tasks</h2>
        <div className="space-y-2 mb-10">
          {[
            { n: 1, t: "Look Up Vendor Names", fn: "XLOOKUP cross-sheet", pts: 75 },
            { n: 2, t: "Look Up Department Names", fn: "XLOOKUP cross-sheet", pts: 50 },
            { n: 3, t: "Match Payment Amounts", fn: "SUMIF cross-sheet", pts: 75 },
            { n: 4, t: "Classify Payment Status", fn: "IF / IFS nested", pts: 75 },
            { n: 5, t: "Calculate Outstanding Balance", fn: "Arithmetic", pts: 50 },
            { n: 6, t: "Flag Overdue Invoices", fn: "IF + AND + TODAY", pts: 75 },
            { n: 7, t: "Identify Duplicate Invoice IDs", fn: "COUNTIF + IF", pts: 75 },
            { n: 8, t: "Outstanding by Vendor (Summary Report)", fn: "SUMIFS cross-sheet", pts: 100 },
            { n: 9, t: "Count Invoices by Status (Summary Report)", fn: "COUNTIFS cross-sheet", pts: 75 },
            { n: 10, t: "Grand Totals for CFO Report", fn: "SUM cross-sheet", pts: 100 },
          ].map((item) => (
            <div key={item.n} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                {item.n}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800">{item.t}</span>
                <span className="text-xs text-slate-400 ml-2">{item.fn}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 shrink-0">+{item.pts} XP</span>
            </div>
          ))}
        </div>

        {/* Data quality callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10">
          <h3 className="font-semibold text-amber-800 text-sm mb-1">⚠ Data Quality Flags to Find</h3>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Two invoice IDs entered twice each — will inflate the grand total by $21,084</li>
            <li>Two invoices with missing Vendor ID — cannot be matched to the Vendor Map</li>
            <li>12 invoices only partially paid — balance still owed</li>
            <li>43 invoices with no payment at all — $524,826 total outstanding</li>
            <li>23 invoices are overdue as of the September 1 close date</li>
          </ul>
        </div>

        {/* Start button */}
        <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 pt-4 pb-8">
          <button
            onClick={onStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
          >
            Start Reconciliation →
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">All data is visible in the spreadsheet · Use any valid formula · AI Tutor available throughout</p>
        </div>
      </div>
    </div>
  );
}
