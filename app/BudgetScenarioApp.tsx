"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import BudgetIntroPage    from "@/components/BudgetIntroPage";
import BudgetScenarioWidget, { type WidgetHandle } from "@/components/BudgetScenarioWidget";
import TutorPanel         from "@/components/TutorPanel";
import XPBar              from "@/components/XPBar";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import type { Exercise, SessionMistake } from "@/lib/types";
import { BUDGET_VALIDATORS }  from "@/lib/validators/budgetValidators";
import { validateRange }      from "@/lib/validators/rangeValidator";
import type { CellValue }     from "@/lib/validators/rangeValidator";
import { detectRelativeRefDrift } from "@/lib/validators/formulaAnalyzer";
import TUTOR_CONTEXT from "@/content/scenarios/budget-vs-actuals-001/tutor-context.json";

type BudgetTask = {
  id:            string;
  number:        number;
  title:         string;
  scenario:      string;
  controllerAsk: string;
  concept:       string;
  tutorFocus:    string;
};

const TASKS: BudgetTask[] = [
  {
    id: "T01", number: 1,
    title: "Spot the Duplicate Journal Entry",
    scenario: "The Actuals sheet has 53 journal lines exported from the ERP. Two different vendor invoices were each posted twice — same JournalID, same amount. Column H (DupFlag) is highlighted in green and waiting for your formula.",
    controllerAsk: "In H3:H55 on the Actuals sheet, enter a COUNTIFS formula that counts how many times each JournalID (column A) appears in A3:A55. Cells with count > 1 are duplicates.",
    concept: "COUNTIFS for duplicate detection",
    tutorFocus: "=COUNTIFS($A$3:$A$55,A3). Lock the range with $. Any cell showing 2 is a duplicate. Copy down H3:H55.",
  },
  {
    id: "T02", number: 2,
    title: "Map ERP Dept Codes to Budget Codes",
    scenario: "The Variance_Workings sheet has ERP dept codes in column A (DEPT-101 format). The Budget uses D-prefix codes (D-SALES, D-MKTG…). The DeptMap tab is the cross-reference.",
    controllerAsk: "Fill B2:B48 on Variance_Workings with an XLOOKUP (or VLOOKUP) that maps each ERP dept code (col A) to its Budget dept code using the DeptMap tab. Use TRIM() to handle potential trailing spaces.",
    concept: "XLOOKUP + TRIM for code mapping",
    tutorFocus: "=XLOOKUP(TRIM(A2),DeptMap!A:A,DeptMap!B:B,\"#N/A\"). TRIM protects against the trailing-space trap on row 16. Copy down to B48.",
  },
  {
    id: "T03", number: 3,
    title: "Look Up Account Names",
    scenario: "Column D on Variance_Workings has account codes (6100-01, 7200-01…). The AccountMap tab maps each code to a human-readable name.",
    controllerAsk: "Fill E2:E48 on Variance_Workings with an XLOOKUP that returns the Account_Name from AccountMap for each account code in column D.",
    concept: "XLOOKUP for account name lookup",
    tutorFocus: "=XLOOKUP(D2,AccountMap!A:A,AccountMap!B:B,\"#N/A\"). Copy down to E48.",
  },
  {
    id: "T05", number: 4,
    title: "Pull Budget Amounts",
    scenario: "The Budget tab uses D-prefix dept codes (col B on Variance_Workings) and the same account codes. Three accounts have NO budget row at all — those should show 'Not Budgeted'.",
    controllerAsk: "Fill I2:I48 on Variance_Workings with a formula that looks up the budget amount from the Budget tab matching dept code (col B) AND account code (col D). Return 'Not Budgeted' with IFERROR if no match exists.",
    concept: "IF + SUMIFS with text fallback",
    tutorFocus: "=IFERROR(IF(SUMIFS(Budget!D:D,Budget!A:A,B2,Budget!B:B,D2)=0,\"Not Budgeted\",SUMIFS(Budget!D:D,Budget!A:A,B2,Budget!B:B,D2)),\"Not Budgeted\"). sum_range=Budget col D (BudgetAmount), criteria1=DeptCode (col A) matches B2, criteria2=AccountCode (col B) matches D2. Copy down to I48.",
  },
  {
    id: "T06", number: 5,
    title: "Calculate Dollar Variance",
    scenario: "Column H holds October Actuals, column I holds Budget — or the text 'Not Budgeted' for accounts with no budget row. Dollar Variance = Actuals minus Budget. For 'Not Budgeted' rows, the entire Actual amount is the variance.",
    controllerAsk: "Fill J2:J48 on Variance_Workings with a formula that subtracts Budget (col I) from Actuals (col H). Handle the case where col I contains 'Not Budgeted' text — subtracting text produces an error, so you need a way to fall back to showing the Actual amount instead.",
    concept: "IFERROR for mixed text/number columns",
    tutorFocus: "=IFERROR(H2-I2,H2). If I2 is 'Not Budgeted' (text), H2-I2 errors → IFERROR returns H2. Copy down to J48.",
  },
  {
    id: "T07", number: 6,
    title: "Calculate % Variance",
    scenario: "% Variance = Dollar Variance (col J) divided by Budget (col I), expressed as a percentage. Rows with 'Not Budgeted' in col I cannot be divided — those should show 'N/A' instead of an error.",
    controllerAsk: "Fill K2:K48 on Variance_Workings with a formula that divides Dollar Variance (col J) by Budget (col I). Any row where division is impossible — because col I is text or zero — should display the text 'N/A'. Format the column as a percentage.",
    concept: "IFERROR division for percentage variance",
    tutorFocus: "=IFERROR(J2/I2,\"N/A\"). Division by text ('Not Budgeted') or zero errors → returns 'N/A'. Format col K as percentage. Copy down to K48.",
  },
  {
    id: "T08", number: 7,
    title: "Flag Material Variances",
    scenario: "A variance is 'material' if the absolute dollar variance (col J) is ≥ $25,000 AND the absolute % variance (col K) is ≥ 10%. Both thresholds must be met. Rows with 'N/A' in col K are never material.",
    controllerAsk: "Fill L2:L48 on Variance_Workings with 'Yes' or 'No' — 'Yes' only when both materiality thresholds are exceeded simultaneously: ABS(DollarVariance) ≥ 25,000 AND ABS(PctVariance) ≥ 10%. Rows where col K is 'N/A' must always return 'No'.",
    concept: "IF + AND + ABS + ISNUMBER",
    tutorFocus: "=IF(AND(ABS(J2)>=25000,ISNUMBER(K2),ABS(K2)>=0.1),\"Yes\",\"No\"). ISNUMBER(K2) filters out 'N/A' rows automatically. Copy down to L48.",
  },
  {
    id: "T09", number: 8,
    title: "Classify Favorable / Unfavorable",
    scenario: "For material variances only (col L = 'Yes'): Revenue is favorable when actuals exceed budget in absolute terms (ERP actuals are stored as negative). Expenses are favorable when actuals are below budget. Non-material rows stay blank.",
    controllerAsk: "Fill M2:M48 on Variance_Workings with 'F' (Favorable), 'U' (Unfavorable), or blank. Only material rows (col L = 'Yes') get a label. Use col F (AccountType) to apply the right sign logic — Revenue actuals are negative in this ERP export, so compare ABS(Actual) against Budget for Revenue rows.",
    concept: "IF + Revenue sign convention logic",
    tutorFocus: "=IF(L2<>\"Yes\",\"\",IF(F2=\"Revenue\",IF(ABS(H2)>I2,\"F\",\"U\"),IF(H2<I2,\"F\",\"U\"))). Revenue: ABS(actuals) vs budget because ERP stores revenue as negative. Expenses: direct comparison. Copy to M48.",
  },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200];

type Props = { onNavigateHome: () => void };

export default function BudgetScenarioApp({ onNavigateHome }: Props) {
  const [phase, setPhase]       = useState<"intro" | "tasks">("intro");
  const [taskIdx, setTaskIdx]   = useState(0);
  const [xp, setXp]             = useState(0);
  const [streak, setStreak]     = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [shake, setShake]       = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [tutorGradeResult, setTutorGradeResult] = useState<{ message: string; celebration?: any } | null>(null);
  const [streamText, setStreamText]             = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts]       = useState(0);
  const [sessionMistakes, setSessionMistakes]   = useState<SessionMistake[]>([]);
  const [celebration, setCelebration] = useState<{ show: boolean; xp: number; multiplier: number }>({ show: false, xp: 0, multiplier: 1 });
  const [tutorCollapsed, setTutorCollapsed] = useState(false);
  const [stripExpanded, setStripExpanded]   = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const widgetRef = useRef<WidgetHandle>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsAdmin(window.location.hostname === "localhost" || params.get("admin") === "1");
  }, []);

  const task       = TASKS[taskIdx];
  const totalTasks = TASKS.length;
  const taskConfig = BUDGET_VALIDATORS[task.id];
  const answerRange = taskConfig.answerRange;
  const targetSheet = taskConfig.sheet;

  const { level, levelProgressPct, xpToNextLevel } = useMemo(() => {
    let lvl = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
    }
    const cur = LEVEL_THRESHOLDS[lvl - 1] || 0;
    const nxt = LEVEL_THRESHOLDS[lvl] || cur + 500;
    return { level: lvl, levelProgressPct: ((xp - cur) / (nxt - cur)) * 100, xpToNextLevel: Math.max(0, nxt - xp) };
  }, [xp]);

  const exerciseForTutor: Exercise = {
    id:            task.id,
    number:        task.number,
    title:         task.title,
    difficulty:    3,
    concept:       task.concept,
    scenario:      task.scenario,
    controllerAsk: task.controllerAsk,
    tutorFocus:    task.tutorFocus,
    answerCell:    taskConfig.answerRange,
    expectedValue: 0,
    tolerance:     0,
    xpReward:      taskConfig.xpReward,
  };

  const streamGradeFeedback = async (payload: object) => {
    try {
      const response = await fetch("/api/grade", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!response.ok || !response.body) { setStreamText(null); return; }
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setStreamText(text);
      }
      setStreamText(null);
      if (text) setTutorGradeResult({ message: text });
    } catch {
      setStreamText(null);
    }
  };

  const handleRangeSubmit = async (values: CellValue[], formulas: string[]) => {
    const alreadyCompleted = completedIds.has(task.id);

    const result           = validateRange(values, formulas, taskConfig.expected, {
      correctThreshold: taskConfig.correctThreshold ?? 0.8,
    });
    const relativeRefDrift = detectRelativeRefDrift(formulas);
    const isCorrect        = result.correct;
    const isPerfect        = result.score >= 1.0;

    const label =
      alreadyCompleted && isPerfect ? "perfect score!"                   :
      alreadyCompleted              ? "still has errors — let's fix them" :
      isCorrect                     ? "loading your reward"              :
      result.score >= 0.7           ? "almost there"                    :
      result.score >= 0.4           ? "getting there"                   :
                                      "let's work through it";
    setStreamText(`${result.correct_count}/${result.total} correct — ${label}…`);

    if (!alreadyCompleted) {
      if (isCorrect) {
        const newStreak  = streak + 1;
        const multiplier = newStreak >= 3 ? 1.5 : 1;
        const xpEarned   = Math.round(taskConfig.xpReward * multiplier);
        setStreak(newStreak);
        setWrongAttempts(0);
        setCompletedIds(prev => new Set([...prev, task.id]));
        setCelebration({ show: true, xp: xpEarned, multiplier });
        setTimeout(() => setXp(prev => prev + xpEarned), 200);
      } else {
        setStreak(0);
        setWrongAttempts(prev => prev + 1);
        const errSummary = `${result.correct_count}/${result.total} correct` +
          (result.error_rows.length
            ? ` — errors at rows ${result.error_rows.slice(0, 6).join(", ")}${result.error_rows.length > 6 ? "…" : ""}`
            : "");
        setSessionMistakes(prev => [
          ...prev,
          { exerciseNumber: task.number, title: task.title, formula: errSummary },
        ]);
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    }

    const userFormula = formulas.find(f => f?.trim().startsWith("=")) ?? "";

    const taskCtx = (TUTOR_CONTEXT.tasks as Record<string, { expectedBehavior: string }>)[task.id];
    const basePayload = {
      topic:                "Budget vs Actuals",
      exerciseTitle:        task.title,
      controllerAsk:        task.controllerAsk,
      tutorFocus:           task.tutorFocus,
      schema:               TUTOR_CONTEXT.schema,
      taskExpectedBehavior: taskCtx?.expectedBehavior ?? "",
      validationResult:     result,
      relativeRefDrift,
      userFormula,
    };

    if (alreadyCompleted) {
      if (isPerfect) {
        setTimeout(() => {
          setStreamText(null);
          setTutorGradeResult({ message: "All cells correct — your formula is now perfect!" });
        }, 600);
      } else {
        await streamGradeFeedback({ ...basePayload, isCorrect: false, streakCount: 0 });
      }
      return;
    }

    if (isCorrect) {
      fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, isCorrect: true, isPerfect, streakCount: streak + 1 }),
      })
        .then(r => r.json())
        .then(data => {
          setStreamText(null);
          if (!data?.message) return;
          setTutorGradeResult(
            data.tone
              ? { message: data.message, celebration: { message: data.message, tone: data.tone, followUp: data.follow_up ?? "" } }
              : { message: data.message }
          );
        })
        .catch(() => setStreamText(null));
    } else {
      await streamGradeFeedback({ ...basePayload, isCorrect: false, streakCount: 0 });
    }
  };

  const goToTask = (idx: number) => {
    if (idx < 0 || idx >= totalTasks) return;
    setTaskIdx(idx);
    setTutorGradeResult(null);
    setStreamText(null);
    setWrongAttempts(0);
  };

  const handlePassTask = () => {
    if (completedIds.has(task.id)) { goToTask(taskIdx + 1); return; }
    const values = taskConfig.expected.map((ec: any) => ec.value ?? "");
    widgetRef.current?.fillRange(values, targetSheet, answerRange);
    setCompletedIds(prev => new Set([...prev, task.id]));
    setXp(prev => prev + taskConfig.xpReward);
    setTutorGradeResult({ message: `[Dev] Task ${task.number} passed — answer range filled.` });
    setTimeout(() => goToTask(taskIdx + 1), 800);
  };

  const allDone         = completedIds.size === totalTasks;
  const allAnswerRanges = TASKS.map(t => BUDGET_VALIDATORS[t.id].answerRange);
  const allTargetSheets = TASKS.map(t => BUDGET_VALIDATORS[t.id].sheet);

  if (phase === "intro") {
    return <BudgetIntroPage onStart={() => setPhase("tasks")} onNavigateHome={onNavigateHome} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <XPBar xp={xp} level={level} streak={streak} levelProgressPct={levelProgressPct} xpToNextLevel={xpToNextLevel} />

      {/* Task strip */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 shrink-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider whitespace-nowrap">
                Task {task.number} / {totalTasks}
              </span>
              <span className="text-sm font-semibold text-slate-900 truncate">{task.title}</span>
              <span className="text-xs text-blue-700 whitespace-nowrap ml-auto">
                <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded mr-1">{targetSheet}</span>
                → range{" "}
                <span className="font-bold font-mono bg-blue-100 px-1.5 py-0.5 rounded">{answerRange}</span>
              </span>
            </div>
            {stripExpanded && (
              <p className="text-sm text-slate-700 leading-snug mt-1.5">
                {task.scenario}{" "}
                <span className="font-medium italic text-slate-800">{task.controllerAsk}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStripExpanded(v => !v)}
              className="text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition"
            >
              {stripExpanded ? "▲ Hide" : "▼ Show task"}
            </button>
            <button onClick={onNavigateHome} className="text-xs font-medium text-slate-500 hover:underline whitespace-nowrap">
              ⌂ Home
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-hidden ${shake ? "animate-shake" : ""}`}>
          <BudgetScenarioWidget
            ref={widgetRef}
            answerRange={answerRange}
            targetSheet={targetSheet}
            allAnswerRanges={allAnswerRanges}
            allTargetSheets={allTargetSheets}
            onRangeSubmit={handleRangeSubmit}
            resetKey={resetKey}
            grading={false}
          />
        </div>

        {tutorCollapsed ? (
          <div className="w-9 bg-slate-100 border-l border-slate-200 flex flex-col items-center py-3 gap-3 shrink-0">
            <button
              onClick={() => setTutorCollapsed(false)}
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs shadow hover:bg-brand-700 transition"
            >
              AI
            </button>
            <div
              className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Tutor
            </div>
          </div>
        ) : (
          <div className="w-[340px] shrink-0 overflow-hidden border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Tutor</span>
              <button onClick={() => setTutorCollapsed(true)} className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-200 transition">
                ✕ Hide
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TutorPanel
                topic="Budget vs Actuals"
                exercise={exerciseForTutor}
                lastFormula={null}
                lastComputedValue={null}
                gradeResult={tutorGradeResult}
                wrongAttempts={wrongAttempts}
                sessionMistakes={sessionMistakes}
                streamText={streamText}
                schema={TUTOR_CONTEXT.schema}
                taskExpectedBehavior={(TUTOR_CONTEXT.tasks as Record<string, { expectedBehavior: string }>)[task.id]?.expectedBehavior}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {TASKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goToTask(i)}
              className={`w-9 h-9 rounded-full text-sm font-bold transition ${
                i === taskIdx
                  ? "bg-brand-600 text-white shadow-md scale-110"
                  : completedIds.has(t.id)
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title={`${t.title} (${BUDGET_VALIDATORS[t.id].sheet}: ${BUDGET_VALIDATORS[t.id].answerRange})`}
            >
              {completedIds.has(t.id) && i !== taskIdx ? "✓" : t.number}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {isAdmin && (
            <button
              onClick={handlePassTask}
              disabled={completedIds.has(task.id) && taskIdx === totalTasks - 1}
              className="px-3 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-40 transition border border-orange-700"
              title="Dev only — fills answer range with expected values and marks task complete"
            >
              Dev: Pass ✓
            </button>
          )}
          <button onClick={() => goToTask(taskIdx - 1)} disabled={taskIdx === 0} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition">
            ← Previous
          </button>
          <button onClick={() => goToTask(taskIdx + 1)} disabled={taskIdx === totalTasks - 1} className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-40 transition">
            Next Task →
          </button>
        </div>
      </div>

      <CelebrationOverlay
        show={celebration.show}
        xpAmount={celebration.xp}
        comboMultiplier={celebration.multiplier}
        onComplete={() => setCelebration({ show: false, xp: 0, multiplier: 1 })}
      />

      {allDone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Variance Analysis Complete!</h2>
            <p className="text-slate-600 mb-4">You earned {xp} XP completing a real FP&A month-end close workflow.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setCompletedIds(new Set()); setTaskIdx(0); setXp(0); setStreak(0); setResetKey(k => k + 1); }}
                className="px-5 py-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700"
              >
                Retry
              </button>
              <button onClick={onNavigateHome} className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200">
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
