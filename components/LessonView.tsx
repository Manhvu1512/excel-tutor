"use client";

type Props = {
  onStartPractice: () => void;
  onNavigateHome?: () => void;
};

export default function LessonView({ onStartPractice, onNavigateHome }: Props) {
  return (
    <div className="h-screen overflow-y-auto bg-slate-50 flex flex-col">
      <div className="max-w-3xl mx-auto px-8 py-10 w-full flex-1">
        {/* Header */}
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="text-sm text-slate-500 hover:text-brand-600 font-medium mb-4 flex items-center gap-1 transition"
          >
            ← Back to Home
          </button>
        )}
        <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
          Micro-Lesson
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Mastering the SUMIFS Function
        </h1>
        <hr className="border-slate-200 mb-8" />

        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Overview</h2>
          <p className="text-slate-700 leading-relaxed">
            In corporate finance and accounting, data rarely lives in isolation. The{" "}
            <code className="lesson-code">SUMIFS</code> function is an essential tool for conditional
            data aggregation, allowing you to sum values in a dataset only when they meet multiple
            specific financial or operational criteria.
          </p>
        </section>

        <hr className="border-slate-200 mb-8" />

        {/* Formula Anatomy */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            🛠️ The Formula Anatomy
          </h2>
          <div className="bg-slate-900 text-emerald-400 font-mono text-sm px-5 py-4 rounded-lg mb-5 overflow-x-auto whitespace-nowrap">
            =SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)
          </div>
          <ul className="space-y-2 text-slate-700 text-sm">
            <li>
              <code className="lesson-code">sum_range</code> — The continuous range of cells containing
              the numeric values you want to aggregate (e.g., Actual Spend, Revenue, Invoiced Amounts).
            </li>
            <li>
              <code className="lesson-code">criteria_range1</code> — The first financial dimension or
              attribute column you want to filter (e.g., Cost Center, GL Account, Region).
            </li>
            <li>
              <code className="lesson-code">criteria1</code> — The specific condition or value that{" "}
              <code className="lesson-code">criteria_range1</code> must match (e.g., "Marketing",
              "400010", "&gt;5000").
            </li>
          </ul>
          <div className="mt-4 flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            <span className="text-base">📌</span>
            <p>
              <strong>Key Rule:</strong> Unlike the basic{" "}
              <code className="lesson-code">SUMIF</code> function,{" "}
              <code className="lesson-code">SUMIFS</code> (plural) <em>always</em> places the{" "}
              <code className="lesson-code">sum_range</code> as the very first argument. All
              conditional ranges and criteria follow immediately after.
            </p>
          </div>
        </section>

        <hr className="border-slate-200 mb-8" />

        {/* Business Use Cases */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            🎯 Business Use Cases
          </h2>
          <p className="text-slate-700 text-sm mb-3">
            Use <code className="lesson-code">SUMIFS</code> when generating management reports,
            variance analyses, or ledger reconciliations:
          </p>
          <ul className="space-y-1.5 text-slate-700 text-sm list-disc list-inside">
            <li>
              Summing <strong>Q1 Revenue</strong> for a{" "}
              <strong>specific geographic entity</strong>.
            </li>
            <li>
              Aggregating <strong>Travel &amp; Entertainment (T&amp;E) expenses</strong> tied to a{" "}
              <strong>specific department head</strong>.
            </li>
            <li>
              Isolating <strong>accounts receivable balances</strong> that are{" "}
              <strong>past due (&gt;90 days)</strong> for{" "}
              <strong>enterprise-tier accounts</strong>.
            </li>
          </ul>
        </section>

        <hr className="border-slate-200 mb-8" />

        {/* Corporate Ledger Scenario */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            📊 Corporate Ledger Scenario
          </h2>
          <p className="text-slate-700 text-sm mb-6">
            <strong>Objective:</strong> Audit high-value operational spend. You need to calculate the
            total variance or expenditure incurred exclusively by the{" "}
            <strong>Marketing</strong> department where individual transactional amounts exceeded{" "}
            <strong>$5,000</strong>.
          </p>

          {/* General Ledger Extract */}
          <h3 className="text-base font-semibold text-slate-800 mb-3">
            General Ledger Extract
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="excel-table">
              <thead>
                <tr>
                  <th className="excel-corner" />
                  <th className="excel-col-header">A</th>
                  <th className="excel-col-header">B</th>
                  <th className="excel-col-header">C</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="excel-row-num">1</td>
                  <td className="excel-header-cell">Department</td>
                  <td className="excel-header-cell">Expense Type</td>
                  <td className="excel-header-cell">Amount</td>
                </tr>
                <tr>
                  <td className="excel-row-num">2</td>
                  <td className="excel-data-cell">Marketing</td>
                  <td className="excel-data-cell">Software SaaS</td>
                  <td className="excel-data-cell">6,000</td>
                </tr>
                <tr>
                  <td className="excel-row-num">3</td>
                  <td className="excel-data-cell">Finance</td>
                  <td className="excel-data-cell">Audit Fees</td>
                  <td className="excel-data-cell">15,000</td>
                </tr>
                <tr>
                  <td className="excel-row-num">4</td>
                  <td className="excel-data-cell">Marketing</td>
                  <td className="excel-data-cell">Travel &amp; Lodging</td>
                  <td className="excel-data-cell">1,200</td>
                </tr>
                <tr>
                  <td className="excel-row-num">5</td>
                  <td className="excel-data-cell">HR</td>
                  <td className="excel-data-cell">Recruitment</td>
                  <td className="excel-data-cell">4,500</td>
                </tr>
                <tr>
                  <td className="excel-row-num">6</td>
                  <td className="excel-data-cell">Marketing</td>
                  <td className="excel-data-cell">Agency Retainer</td>
                  <td className="excel-data-cell">8,500</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* The Formula */}
          <h3 className="text-base font-semibold text-slate-800 mb-3">The Formula</h3>
          <p className="text-slate-700 text-sm mb-3">
            Input the following formula into your summary sheet:
          </p>
          <div className="bg-slate-900 text-emerald-400 font-mono text-sm px-5 py-3 rounded-lg mb-6">
            =SUMIFS(C2:C6, A2:A6, "Marketing", C2:C6, "&gt;5000")
          </div>

          {/* How the Calculation Engine Executes */}
          <h3 className="text-base font-semibold text-slate-800 mb-3">
            How the Calculation Engine Executes:
          </h3>
          <ol className="space-y-2 text-slate-700 text-sm list-decimal list-inside">
            <li>
              <strong>Identifies the Target:</strong> Excel isolates the{" "}
              <code className="lesson-code">sum_range</code> (
              <code className="lesson-code">C2:C6</code>) to prepare for numeric aggregation.
            </li>
            <li>
              <strong>Applies Filter 1:</strong> It scans the department column (
              <code className="lesson-code">A2:A6</code>) for rows matching{" "}
              <strong>"Marketing"</strong> (Rows 2, 4, and 6).
            </li>
            <li>
              <strong>Applies Filter 2:</strong> It evaluates the amount column (
              <code className="lesson-code">C2:C6</code>) for those specific rows to check if the
              value is <code className="lesson-code">&gt;5000</code> (Row 2 and Row 6 qualify; Row 4
              is excluded because $1,200 is below the threshold).
            </li>
            <li>
              <strong>Consolidates:</strong> It sums the remaining compliant rows: Row 2 (
              <strong>$6,000</strong>) + Row 6 (<strong>$8,500</strong>).
            </li>
          </ol>

          <div className="mt-5 inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-3">
            <span className="text-slate-600 text-sm font-medium">Result:</span>
            <span className="text-2xl font-bold text-emerald-700 font-mono">14,500</span>
          </div>
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-end">
        <button
          onClick={onStartPractice}
          className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold text-base hover:bg-brand-700 active:scale-95 transition"
        >
          Start Practice →
        </button>
      </div>
    </div>
  );
}
