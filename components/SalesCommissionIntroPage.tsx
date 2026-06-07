"use client";

type Props = {
  onStart: () => void;
  onNavigateHome?: () => void;
};

export default function SalesCommissionIntroPage({ onStart, onNavigateHome }: Props) {
  return (
    <div className="h-screen overflow-y-auto bg-slate-50 flex flex-col">
      <div className="max-w-3xl mx-auto px-8 py-10 w-full">
        {onNavigateHome && (
          <button onClick={onNavigateHome} className="text-sm text-slate-500 hover:text-brand-600 font-medium mb-4 flex items-center gap-1 transition">
            ← Back to Home
          </button>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">Real Scenario</span>
          <span className="text-xs text-slate-500">Sales Ops · Advanced · ~70 min · 825 XP</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-1">Monthly Sales Commission Calculator</h1>
        <p className="text-slate-500 mb-6 text-base">October Close — CloudPulse Inc.</p>
        <hr className="border-slate-200 mb-8" />

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-5 mb-8">
          <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">Your Brief</h2>
          <p className="text-slate-800 leading-relaxed text-sm">
            You are the <strong>RevOps analyst at CloudPulse Inc.</strong> It is November 1st.
            The VP of Sales just Slacked you: <em>"Payroll closes at noon — can you finalize the October commission
            file? 10 reps, CRM export attached."</em>
          </p>
          <p className="text-slate-700 text-sm mt-3 leading-relaxed">
            One deal has a <strong>data-entry typo</strong> in the deal type field. One rep joined <strong>mid-month</strong> and gets a prorated quota.
            A co-sell deal is <strong>split 50/50</strong> between two reps. Jennifer Walsh has a <strong>$1,200 clawback</strong> from September.
            Michael Torres is likely to <strong>hit the $25,000 commission cap</strong>. <strong>This is month-end commission close.</strong>
          </p>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">What's in the Workbook</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Deals", rows: "47 deals", note: "Cancelled deal, typo type, zero amount, 50% split", color: "bg-blue-50 border-blue-200 text-blue-800" },
            { label: "RepMaster", rows: "10 reps", note: "Double-space name trap, new hire with ProrationFactor", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
            { label: "CommissionRates", rows: "4 tiers + flat", note: "Standard vs Accelerator plan, VLOOKUP approx match", color: "bg-amber-50 border-amber-200 text-amber-800" },
            { label: "Commission_Calculator", rows: "10 rep rows", note: "Your formula workspace — columns B–M to fill", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
            { label: "Payroll_Summary", rows: "10 rows", note: "Final output — pulls from Commission_Calculator", color: "bg-purple-50 border-purple-200 text-purple-800" },
            { label: "Settings", rows: "Plan config", note: "Commission cap, flat rates reference", color: "bg-rose-50 border-rose-200 text-rose-800" },
          ].map((t) => (
            <div key={t.label} className={`border rounded-xl px-4 py-3.5 ${t.color}`}>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs opacity-75 mt-0.5">{t.rows} — {t.note}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">Your 12 Tasks</h2>
        <div className="space-y-2 mb-10">
          {[
            { n: 1,  t: "Flag Problem Deals",                  fn: "IF + OR",              pts: 75,  range: "Deals!H2:H48" },
            { n: 2,  t: "Look Up Rep Names (TRIM)",            fn: "XLOOKUP + TRIM",        pts: 50,  range: "Calc!B2:B11" },
            { n: 3,  t: "Look Up Plan Types",                  fn: "XLOOKUP",               pts: 50,  range: "Calc!C2:C11" },
            { n: 4,  t: "Calculate Adjusted Monthly Quota",    fn: "XLOOKUP × Proration",   pts: 75,  range: "Calc!D2:D11" },
            { n: 5,  t: "Sum New Business Revenue",            fn: "SUMPRODUCT (split fix)", pts: 100, range: "Calc!E2:E11" },
            { n: 6,  t: "Sum Renewal Revenue",                 fn: "SUMPRODUCT",            pts: 75,  range: "Calc!F2:F11" },
            { n: 7,  t: "Sum Expansion Revenue",               fn: "SUMPRODUCT",            pts: 75,  range: "Calc!G2:G11" },
            { n: 8,  t: "Count Closed Deals per Rep",          fn: "COUNTIFS",              pts: 50,  range: "Calc!H2:H11" },
            { n: 9,  t: "Calculate Quota Attainment",          fn: "Division + %",          pts: 75,  range: "Calc!I2:I11" },
            { n: 10, t: "Look Up Commission Rate",             fn: "VLOOKUP approx match",  pts: 100, range: "Calc!J2:J11" },
            { n: 11, t: "Calculate Base Commission",           fn: "Mixed-rate formula",     pts: 100, range: "Calc!K2:K11" },
            { n: 12, t: "Apply Cap & Clawback",                fn: "MIN + clawback adj",     pts: 100, range: "Calc!M2:M11" },
          ].map((item) => (
            <div key={item.n} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                {item.n}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800">{item.t}</span>
                <span className="text-xs text-slate-400 ml-2">{item.fn}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mr-2 shrink-0">{item.range}</span>
              <span className="text-xs font-bold text-emerald-600 shrink-0">+{item.pts} XP</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10">
          <h3 className="font-semibold text-amber-800 text-sm mb-1">⚠ Data Quality Traps</h3>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>D-1023 is Cancelled — must be flagged Exclude in AuditFlag column</li>
            <li>D-1046 has deal type <strong>"New Biz"</strong> (typo) — not a valid type, must be flagged Exclude</li>
            <li>D-1047 has <strong>Amount = $0</strong> — must be flagged Exclude</li>
            <li>D-1031 and D-1031B are the same deal split 50/50 — SUMPRODUCT must multiply Amount × SplitPct</li>
            <li>R006 Jordan Lee has a <strong>double-space</strong> in RepMaster — TRIM fixes it</li>
            <li>R010 Alex Chen hired Oct 15 — ProrationFactor = 17/31 ≈ 54.8%</li>
            <li>R003 Jennifer Walsh has a <strong>$1,200 clawback</strong> (pre-filled in col L)</li>
            <li>R008 Michael Torres earns $25,700 base — <strong>capped at $25,000</strong></li>
          </ul>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 pt-4 pb-8">
          <button
            onClick={onStart}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
          >
            Start Commission Calculator →
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">All data is visible in the workbook · Use any valid formula · AI Tutor available throughout</p>
        </div>
      </div>
    </div>
  );
}
