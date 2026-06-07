"use client";

type Props = {
  onStart: () => void;
  onNavigateHome?: () => void;
};

export default function BudgetIntroPage({ onStart, onNavigateHome }: Props) {
  return (
    <div className="h-screen overflow-y-auto bg-slate-50 flex flex-col">
      <div className="max-w-3xl mx-auto px-8 py-10 w-full">
        {onNavigateHome && (
          <button onClick={onNavigateHome} className="text-sm text-slate-500 hover:text-brand-600 font-medium mb-4 flex items-center gap-1 transition">
            ← Back to Home
          </button>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-wider">Real Scenario</span>
          <span className="text-xs text-slate-500">Finance · Advanced · ~65 min · 625 XP</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-1">Budget vs Actuals</h1>
        <p className="text-slate-500 mb-6 text-base">FP&A Month-End Variance Analysis — October 2024</p>
        <hr className="border-slate-200 mb-8" />

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-5 mb-8">
          <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">Your Brief</h2>
          <p className="text-slate-800 leading-relaxed text-sm">
            You are an <strong>FP&A analyst at Northwind SaaS Inc.</strong> It is Monday morning,
            November 4th — the third business day after October close. Two files landed in your inbox
            at 7 AM: an ERP actuals dump and the annual budget file pulled by IT overnight.
            Your manager stopped by before standup: <em>"CFO needs the October variance deck before
            the 4 PM all-hands — workings to me by 2?"</em>
          </p>
          <p className="text-slate-700 text-sm mt-3 leading-relaxed">
            The files use <strong>different department code formats</strong>, one invoice looks posted twice,
            and three accounts have no budget at all. Revenue amounts are negative in the ERP export but
            positive in the Budget. Six hours. One deliverable. <strong>This is what month-end close actually looks like.</strong>
          </p>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">What's in the Workbook</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Actuals (ERP Export)", rows: "53 journal lines", note: "Revenue negative, 2 duplicate postings, 1 trailing space", color: "bg-blue-50 border-blue-200 text-blue-800" },
            { label: "Budget", rows: "42 rows", note: "D-prefix dept codes, all amounts positive", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
            { label: "DeptMap", rows: "10 departments", note: "DEPT-NNN → D-prefix cross-reference", color: "bg-amber-50 border-amber-200 text-amber-800" },
            { label: "AccountMap", rows: "29 accounts", note: "Chart of accounts with type (Revenue/Expense)", color: "bg-purple-50 border-purple-200 text-purple-800" },
            { label: "Variance_Workings", rows: "47 analysis rows", note: "Your formula workspace — columns B-M to fill", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
            { label: "Mgmt_Summary", rows: "CFO view", note: "Company totals + dept rollup (advanced tasks)", color: "bg-rose-50 border-rose-200 text-rose-800" },
          ].map((t) => (
            <div key={t.label} className={`border rounded-xl px-4 py-3.5 ${t.color}`}>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs opacity-75 mt-0.5">{t.rows} — {t.note}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">Your 9 Tasks</h2>
        <div className="space-y-2 mb-10">
          {[
            { n: 1, t: "Spot the Duplicate Journal Entries", fn: "COUNTIFS", pts: 50,  sheet: "Actuals!H" },
            { n: 2, t: "Map ERP Dept Codes to Budget Codes", fn: "XLOOKUP + TRIM", pts: 75,  sheet: "Variance_Workings!B2:B48" },
            { n: 3, t: "Look Up Account Names", fn: "XLOOKUP", pts: 75,  sheet: "Variance_Workings!E2:E48" },
            { n: 4, t: "Pull October Actuals (SUMIFS)", fn: "SUMIFS wildcard", pts: 100, sheet: "Variance_Workings!H2:H48" },
            { n: 5, t: "Pull Budget Amounts", fn: "IF + SUMIFS", pts: 100, sheet: "Variance_Workings!I2:I48" },
            { n: 6, t: "Calculate Dollar Variance", fn: "IFERROR arithmetic", pts: 75,  sheet: "Variance_Workings!J2:J48" },
            { n: 7, t: "Calculate % Variance", fn: "IFERROR division", pts: 75,  sheet: "Variance_Workings!K2:K48" },
            { n: 8, t: "Flag Material Variances", fn: "IF + AND + ABS", pts: 75,  sheet: "Variance_Workings!L2:L48" },
            { n: 9, t: "Classify Favorable / Unfavorable", fn: "IF + Revenue logic", pts: 100, sheet: "Variance_Workings!M2:M48" },
          ].map((item) => (
            <div key={item.n} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                {item.n}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800">{item.t}</span>
                <span className="text-xs text-slate-400 ml-2">{item.fn}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mr-2 shrink-0">{item.sheet}</span>
              <span className="text-xs font-bold text-emerald-600 shrink-0">+{item.pts} XP</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10">
          <h3 className="font-semibold text-amber-800 text-sm mb-1">⚠ Data Quality Traps to Find</h3>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Two invoices each double-posted — JE-2024-10-0892 inflates G&A Legal; JE-2024-10-0711 inflates HR Salaries</li>
            <li>One Actuals row has a trailing space in Department — causes a silent SUMIFS miss</li>
            <li>Five accounts in Actuals have <strong>no Budget row</strong> — must show "Not Budgeted"</li>
            <li>Three discontinued accounts have Budget but <strong>zero October Actuals</strong></li>
            <li>Revenue in Actuals is <strong>NEGATIVE</strong> (ERP convention) but Budget is <strong>POSITIVE</strong></li>
            <li>Sub-accounts 6100-01-A and 6100-01-B must roll up to parent 6100-01 via wildcard SUMIFS</li>
          </ul>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 pt-4 pb-8">
          <button
            onClick={onStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
          >
            Start Variance Analysis →
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">All data is visible in the spreadsheet · Use any valid formula · AI Tutor available throughout</p>
        </div>
      </div>
    </div>
  );
}
