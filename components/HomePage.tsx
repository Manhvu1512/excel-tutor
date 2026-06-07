"use client";

import { useState } from "react";

type Props = {
  onStartSkill: (skill: string) => void;
  onStartScenario: (scenario: string) => void;
  onShowScenarios: () => void;
};

const SKILLS = [
  { id: "sumifs",   label: "SUMIFS",       icon: "Σ",  desc: "Sum values with multiple conditions", progress: 60, color: "bg-brand-100 text-brand-700",   available: true  },
  { id: "xlookup",  label: "XLOOKUP",      icon: "⊙",  desc: "Look up anything anywhere",           progress: 40, color: "bg-purple-100 text-purple-700", available: false },
  { id: "edate",    label: "EDATE",         icon: "⊞",  desc: "Work with dates efficiently",         progress: 30, color: "bg-amber-100 text-amber-700",   available: false },
  { id: "cleaning", label: "Data Cleaning", icon: "⊘",  desc: "Clean and prepare your data",         progress: 20, color: "bg-emerald-100 text-emerald-700", available: false },
];

const SCENARIOS = [
  { id: "invoice",        label: "Invoice Reconciliation",    icon: "≡", desc: "Match invoices and payments",                    difficulty: "Intermediate", role: "Finance", xp: 300,  available: true,  isNew: false },
  { id: "budget",         label: "Budget vs Actuals",         icon: "△", desc: "FP&A month-end close analysis",                  difficulty: "Advanced",     role: "Finance", xp: 400,  available: true,  isNew: false },
  { id: "sales-commission",label: "Sales Commission Calculator",icon: "$", desc: "October close: splits, proration, clawback & cap", difficulty: "Advanced",  role: "Sales",   xp: 825,  available: true,  isNew: true  },
  { id: "expense",        label: "Monthly Expense Report",    icon: "≈", desc: "Create and analyze expense summaries",            difficulty: "Beginner",     role: "Finance", xp: 200,  available: false, isNew: false },
  { id: "sales-perf",     label: "Sales Performance Pack",   icon: "↗", desc: "Analyze sales trends and KPIs",                  difficulty: "Intermediate", role: "Sales",   xp: 350,  available: false, isNew: false },
  { id: "hr",             label: "HR Attendance Analysis",   icon: "⊕", desc: "Track attendance and insights",                  difficulty: "Beginner",     role: "HR",      xp: 250,  available: false, isNew: false },
];

const CONTINUE = [
  { label: "Advanced SUMIFS Techniques",    progress: 60, icon: "fx" },
  { label: "XLOOKUP with Multiple Criteria", progress: 49, icon: "⊙" },
  { label: "Date Functions Deep Dive",      progress: 20, icon: "⊞" },
];

const QUICK_QUESTIONS = [
  "How does XLOOKUP work?",
  "What's the difference between COUNTIF and COUNTIFS?",
  "Show me an example of data cleaning in Excel.",
];

const STREAK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const STREAK_DONE = [true, true, true, true, true, true, false];

const NAV_ITEMS = [
  { label: "Home",        available: true  },
  { label: "Skills",      available: true  },
  { label: "Scenarios",   available: true  },
  { label: "Challenges",  available: false },
  { label: "Leaderboard", available: false },
];

export default function HomePage({ onStartSkill, onStartScenario, onShowScenarios }: Props) {
  const [tutorInput, setTutorInput] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Finance", "Sales", "Operations", "HR", "Beginner", "Advanced"];

  const filteredScenarios = activeFilter === "All"
    ? SCENARIOS
    : SCENARIOS.filter((sc) => sc.role === activeFilter || sc.difficulty === activeFilter);

  const availableScenarios = filteredScenarios.filter(s => s.available);
  const unavailableScenarios = filteredScenarios.filter(s => !s.available);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-6 shrink-0 shadow-sm sticky top-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">⊞</span>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-slate-900 text-sm">ExcelMastery</div>
            <div className="text-[10px] text-slate-400">Learn Excel. Work Smarter.</div>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 flex-1 ml-4">
          {NAV_ITEMS.map((item) => (
            item.available ? (
              <button
                key={item.label}
                onClick={
                  item.label === "Scenarios" ? onShowScenarios :
                  item.label === "Skills"    ? () => onStartSkill("sumifs") :
                  undefined
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  item.label === "Home"
                    ? "text-brand-600 bg-brand-50 border-b-2 border-brand-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ) : (
              <div key={item.label} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-not-allowed" title="Coming soon">
                <span className="text-sm font-medium text-slate-300">{item.label}</span>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full leading-none">Beta</span>
              </div>
            )
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="px-4 py-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
            Dashboard
          </button>
          <button
            onClick={() => onStartSkill("sumifs")}
            className="px-4 py-1.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition shadow-sm"
          >
            Start Learning
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
            U
          </div>
        </div>
      </nav>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left + Center content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Row 1: Learn by Skill + Real Scenarios */}
          <div className="grid grid-cols-2 gap-4">

            {/* Learn by Skill */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">🎓</div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Learn by Skill</h2>
                    <p className="text-xs text-slate-500">Master Excel functions and techniques</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition">›</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SKILLS.map((skill) =>
                  skill.available ? (
                    <button
                      key={skill.id}
                      onClick={() => onStartSkill(skill.id)}
                      className="text-left p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition group"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold mb-2 ${skill.color}`}>
                        {skill.icon}
                      </div>
                      <div className="font-semibold text-slate-800 text-sm group-hover:text-brand-700">{skill.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-tight">{skill.desc}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${skill.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{skill.progress}%</span>
                      </div>
                    </button>
                  ) : (
                    <div
                      key={skill.id}
                      className="relative text-left p-3 rounded-xl border border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                    >
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full leading-none">Beta</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold mb-2 bg-slate-100 text-slate-400">
                        {skill.icon}
                      </div>
                      <div className="font-semibold text-slate-500 text-sm">{skill.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-tight">{skill.desc}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full" />
                        <span className="text-[10px] text-slate-300 font-medium">{skill.progress}%</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Real Scenarios */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">💼</div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Real Scenarios</h2>
                    <p className="text-xs text-slate-500">Apply Excel in real-world business situations</p>
                  </div>
                </div>
                <button onClick={onShowScenarios} className="text-xs text-brand-600 hover:underline font-medium">View all ›</button>
              </div>
              {/* Filter chips */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition ${
                      activeFilter === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-0.5">
                {/* Available scenarios — clickable */}
                {availableScenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => onStartScenario(sc.id)}
                    className="relative text-left p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition group"
                  >
                    {sc.isNew && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-full leading-none">NEW</span>
                    )}
                    <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 text-base font-bold mb-2">
                      {sc.icon}
                    </div>
                    <div className="font-semibold text-slate-800 text-sm group-hover:text-brand-700 leading-tight pr-4">{sc.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-tight">{sc.desc}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{sc.role}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">+{sc.xp} XP</span>
                    </div>
                  </button>
                ))}
                {/* Unavailable scenarios — greyed out */}
                {unavailableScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    className="relative text-left p-3 rounded-xl border border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                  >
                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full leading-none">Beta</span>
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-base font-bold mb-2">
                      {sc.icon}
                    </div>
                    <div className="font-semibold text-slate-500 text-sm leading-tight pr-4">{sc.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-tight">{sc.desc}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">{sc.role}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">+{sc.xp} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Continue Learning + Daily Challenge */}
          <div className="grid grid-cols-2 gap-4">

            {/* Continue Learning */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-lg">📖</div>
                  <h2 className="font-bold text-slate-900 text-base">Continue Learning</h2>
                </div>
                <button className="text-xs text-brand-600 hover:underline font-medium">View all ›</button>
              </div>
              <div className="space-y-3">
                {CONTINUE.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => onStartSkill("sumifs")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 truncate">{c.label}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{c.progress}%</span>
                      </div>
                    </div>
                    <span className="text-slate-300 group-hover:text-brand-500 text-lg">▶</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Challenge */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 shadow-sm text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🎯</div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base">Daily Challenge</h2>
                    <span className="text-[9px] font-bold bg-white/20 text-blue-200 px-1.5 py-0.5 rounded-full">Beta</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  14h 32m left
                </div>
              </div>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">📊</div>
                <div>
                  <div className="font-bold text-base mb-1">Sales Summary Challenge</div>
                  <div className="text-sm text-blue-200 leading-snug">
                    Analyze the given dataset and create a summary report with key metrics and insights.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-yellow-300">
                  <span className="text-base">⭐</span>
                  <span className="text-sm font-bold">+100 XP</span>
                </div>
                <button
                  disabled
                  className="px-5 py-2 bg-white/30 text-white/60 text-sm font-bold rounded-xl cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Progress + Streak + Achievements */}
          <div className="grid grid-cols-3 gap-4">

            {/* Your Progress */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl shrink-0">📈</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 font-medium mb-0.5">Your Progress</div>
                <div className="font-bold text-brand-600 text-lg leading-tight">Level 7</div>
                <div className="text-[10px] text-slate-400 mb-1.5">830 / 1200 XP</div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full" style={{ width: "69%" }} />
                </div>
              </div>
            </div>

            {/* Current Streak */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">🔥</div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Current Streak</div>
                  <div className="font-bold text-orange-500 text-lg leading-tight">7 days</div>
                  <div className="text-[10px] text-slate-400">Best: 15 days</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 justify-between">
                {STREAK_DAYS.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="text-[9px] text-slate-400 font-medium">{d}</div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${STREAK_DONE[i] ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-300"}`}>
                      {STREAK_DONE[i] ? "✓" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl shrink-0">🏅</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 font-medium mb-1">Achievements</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-slate-900 text-2xl">12</span>
                  <span className="text-slate-400 text-sm">/ 30</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Keep going!</div>
                <div className="flex gap-1 mt-2">
                  {["🎯", "⚡", "🔥", "📊"].map((e, i) => (
                    <span key={i} className="text-base">{e}</span>
                  ))}
                </div>
              </div>
              <button className="text-slate-300 hover:text-slate-500 transition text-lg shrink-0">›</button>
            </div>
          </div>
        </div>

        {/* ── Right sidebar: AI Tutor ──────────────────────────────────── */}
        <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">AI Tutor</span>
              <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">Beta</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600 text-lg leading-none">−</button>
          </div>

          {/* Greeting */}
          <div className="px-4 pt-5 pb-3 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow flex items-center justify-center text-xl shrink-0">
                🤖
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2.5">
                <div className="text-sm font-semibold text-slate-800 mb-0.5">Hi there! 👋</div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  I'm your AI Tutor. Ask me anything about Excel.
                </div>
              </div>
            </div>
          </div>

          {/* Quick questions */}
          <div className="flex-1 px-4 space-y-2 overflow-y-auto">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => onStartSkill("sumifs")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-brand-50 hover:border-brand-200 transition text-left group"
              >
                <div className="w-6 h-6 rounded-full border border-slate-200 group-hover:border-brand-300 flex items-center justify-center text-slate-300 group-hover:text-brand-400 shrink-0 transition">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-700 group-hover:text-brand-700 leading-snug">{q}</span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pt-3 pb-4 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <input
                type="text"
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
              />
              <button className="text-brand-500 hover:text-brand-700 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">AI responses may not always be accurate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
