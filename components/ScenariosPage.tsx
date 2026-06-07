"use client";

import { useState } from "react";

type Props = {
  onStartScenario: (id: string) => void;
  onNavigateHome: () => void;
};

type ScenarioStatus = "available" | "coming_soon";

const ALL_SCENARIOS = [
  {
    id: "invoice",
    label: "Invoice Reconciliation",
    icon: "≡",
    desc: "Match invoices and payments, flag duplicates, and reconcile a full vendor AP ledger.",
    role: "Finance",
    difficulty: "Intermediate",
    xp: 300,
    tasks: 10,
    minutes: 45,
    functions: ["XLOOKUP", "SUMIFS", "COUNTIFS", "IFERROR"],
    status: "available" as ScenarioStatus,
    badge: null as string | null,
  },
  {
    id: "budget",
    label: "Budget vs Actuals",
    icon: "△",
    desc: "FP&A month-end close: map cost centers, calculate variances, and flag material differences.",
    role: "Finance",
    difficulty: "Advanced",
    xp: 400,
    tasks: 8,
    minutes: 65,
    functions: ["XLOOKUP", "SUMIFS", "IFERROR", "IF/AND", "LARGE"],
    status: "available" as ScenarioStatus,
    badge: null as string | null,
  },
  {
    id: "sales-commission",
    label: "Sales Commission Calculator",
    icon: "$",
    desc: "October close: flag bad deals, prorate a new hire's quota, handle a 50/50 co-sell split, apply clawback, and cap at $25k.",
    role: "Sales",
    difficulty: "Advanced",
    xp: 825,
    tasks: 12,
    minutes: 70,
    functions: ["SUMPRODUCT", "VLOOKUP", "XLOOKUP", "COUNTIFS", "MIN"],
    status: "available" as ScenarioStatus,
    badge: "New",
  },
  {
    id: "expense",
    label: "Monthly Expense Report",
    icon: "$",
    desc: "Create and analyze expense summaries across departments and categories.",
    role: "Finance",
    difficulty: "Beginner",
    xp: 200,
    tasks: 8,
    minutes: 30,
    functions: ["SUMIF", "AVERAGEIF", "COUNTIF", "TEXT"],
    status: "coming_soon" as ScenarioStatus,
    badge: null as string | null,
  },
  {
    id: "sales",
    label: "Sales Performance Pack",
    icon: "↗",
    desc: "Analyze sales trends, calculate KPIs, and rank rep performance against targets.",
    role: "Sales",
    difficulty: "Intermediate",
    xp: 350,
    tasks: 10,
    minutes: 50,
    functions: ["SUMIFS", "XLOOKUP", "RANK", "LARGE", "IF"],
    status: "coming_soon" as ScenarioStatus,
    badge: null as string | null,
  },
  {
    id: "hr",
    label: "HR Attendance Analysis",
    icon: "⊕",
    desc: "Track attendance patterns, calculate leave balances, and flag anomalies.",
    role: "HR",
    difficulty: "Beginner",
    xp: 250,
    tasks: 8,
    minutes: 35,
    functions: ["COUNTIFS", "NETWORKDAYS", "IF", "VLOOKUP"],
    status: "coming_soon" as ScenarioStatus,
    badge: null as string | null,
  },
  {
    id: "inventory",
    label: "Inventory Reorder Analysis",
    icon: "◫",
    desc: "Calculate reorder points, safety stock levels, and flag items below threshold.",
    role: "Operations",
    difficulty: "Intermediate",
    xp: 300,
    tasks: 9,
    minutes: 40,
    functions: ["AVERAGEIFS", "SUMIFS", "IF", "XLOOKUP"],
    status: "coming_soon" as ScenarioStatus,
    badge: null as string | null,
  },
];

const FILTERS = ["All", "Finance", "Sales", "Operations", "HR", "Beginner", "Intermediate", "Advanced"];

const DIFFICULTY_STYLE: Record<string, string> = {
  Beginner:     "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-amber-50 text-amber-700",
  Advanced:     "bg-rose-50 text-rose-700",
};

export default function ScenariosPage({ onStartScenario, onNavigateHome }: Props) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = ALL_SCENARIOS.filter((sc) => {
    const matchesFilter =
      activeFilter === "All" ||
      sc.role === activeFilter ||
      sc.difficulty === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      sc.label.toLowerCase().includes(q) ||
      sc.desc.toLowerCase().includes(q) ||
      sc.role.toLowerCase().includes(q) ||
      sc.functions.some((f) => f.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const available = filtered.filter((s) => s.status === "available");
  const comingSoon = filtered.filter((s) => s.status === "coming_soon");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-6 shrink-0 shadow-sm sticky top-0 z-20">
        <button onClick={onNavigateHome} className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">⊞</span>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-slate-900 text-sm">ExcelMastery</div>
            <div className="text-[10px] text-slate-400">Learn Excel. Work Smarter.</div>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-1 ml-4">
          {["Home", "Skills", "Scenarios", "Challenges", "Leaderboard"].map((item) => (
            <button
              key={item}
              onClick={item === "Home" ? onNavigateHome : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                item === "Scenarios"
                  ? "text-brand-600 bg-brand-50 border-b-2 border-brand-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNavigateHome}
            className="px-4 py-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Dashboard
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
            U
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Scenario Library</h1>
                <p className="text-slate-500 text-sm">
                  Apply Excel to real business workflows. Each scenario is based on an actual job task.
                </p>
              </div>
              <div className="flex items-center gap-4 text-center shrink-0">
                <div>
                  <div className="text-2xl font-bold text-brand-600">{ALL_SCENARIOS.length}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Scenarios</div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{ALL_SCENARIOS.filter(s => s.status === "available").length}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Available</div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md mt-5">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, or function (e.g. XLOOKUP)…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-6">
          {/* ── Filters ──────────────────────────────────────────── */}
          <div className="flex gap-2 flex-wrap mb-6 items-center">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  activeFilter === f
                    ? "bg-brand-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => { setActiveFilter("All"); setSearch(""); }}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition"
            >
              {activeFilter !== "All" || search ? "Clear filters" : ""}
            </button>
          </div>

          {/* ── Available ────────────────────────────────────────── */}
          {available.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Available now</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{available.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {available.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => onStartScenario(sc.id)}
                    className="relative text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-300 hover:shadow-md transition flex flex-col group"
                  >
                    {sc.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold bg-brand-600 text-white px-2 py-0.5 rounded-full">
                        {sc.badge}
                      </span>
                    )}
                    <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold mb-3">
                      {sc.icon}
                    </div>
                    <div className="font-bold text-slate-900 text-sm mb-1 group-hover:text-brand-700 transition leading-snug pr-10">
                      {sc.label}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{sc.desc}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{sc.role}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLE[sc.difficulty]}`}>
                        {sc.difficulty}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap mb-3">
                      {sc.functions.slice(0, 3).map((fn) => (
                        <span key={fn} className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                          {fn}
                        </span>
                      ))}
                      {sc.functions.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">+{sc.functions.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{sc.tasks} tasks</span>
                        <span>~{sc.minutes} min</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">+{sc.xp} XP</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Coming Soon ──────────────────────────────────────── */}
          {comingSoon.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Coming soon</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">{comingSoon.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {comingSoon.map((sc) => (
                  <div
                    key={sc.id}
                    className="relative bg-white rounded-2xl border border-slate-100 p-5 flex flex-col opacity-60"
                  >
                    <span className="absolute top-3 right-3 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl font-bold mb-3">
                      {sc.icon}
                    </div>
                    <div className="font-bold text-slate-600 text-sm mb-1 leading-snug pr-10">{sc.label}</div>
                    <div className="text-xs text-slate-400 leading-relaxed mb-3 flex-1">{sc.desc}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{sc.role}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLE[sc.difficulty]}`}>
                        {sc.difficulty}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap mb-3">
                      {sc.functions.slice(0, 3).map((fn) => (
                        <span key={fn} className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-400">
                          {fn}
                        </span>
                      ))}
                      {sc.functions.length > 3 && (
                        <span className="text-[10px] text-slate-300 self-center">+{sc.functions.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-[10px] text-slate-300">
                        <span>{sc.tasks} tasks</span>
                        <span>~{sc.minutes} min</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300">+{sc.xp} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <div className="text-5xl mb-4">🔍</div>
              <div className="text-sm font-medium mb-1">No scenarios match your search.</div>
              <button
                onClick={() => { setActiveFilter("All"); setSearch(""); }}
                className="mt-2 text-xs text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
