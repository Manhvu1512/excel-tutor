"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import SalesCommissionIntroPage    from "@/components/SalesCommissionIntroPage";
import SalesCommissionScenarioWidget, { type WidgetHandle } from "@/components/SalesCommissionScenarioWidget";
import TutorPanel                  from "@/components/TutorPanel";
import XPBar                       from "@/components/XPBar";
import CelebrationOverlay          from "@/components/CelebrationOverlay";
import type { Exercise, SessionMistake } from "@/lib/types";
import { SALES_COMMISSION_VALIDATORS } from "@/lib/validators/salesCommissionValidators";
import { validateRange }           from "@/lib/validators/rangeValidator";
import type { CellValue }          from "@/lib/validators/rangeValidator";
import { detectRelativeRefDrift }  from "@/lib/validators/formulaAnalyzer";
import TUTOR_CONTEXT from "@/content/scenarios/real-sales-commission-001/tutor-context.json";

type SCTask = {
  id:            string;
  number:        number;
  title:         string;
  scenario:      string;
  controllerAsk: string;
  concept:       string;
  tutorFocus:    string;
};

const TASKS: SCTask[] = [
  {
    id: "T01", number: 1,
    title: "Flag Problem Deals",
    scenario: "The Deals tab has 47 rows exported from the CRM. Three need to be excluded before commission is calculated: one cancelled deal, one with a $0 amount, and one with a deal-type typo. Column H (AuditFlag) is highlighted.",
    controllerAsk: "Fill H2:H48 in the Deals sheet with 'Include' or 'Exclude'. Exclude a deal if its Status is 'Cancelled', its Amount is $0, or its DealType is not one of the three valid types (New Business, Renewal, Expansion). All other deals should be 'Include'.",
    concept: "IF + OR for data validation",
    tutorFocus: "=IF(OR(G2=\"Cancelled\",E2=0,AND(D2<>\"New Business\",D2<>\"Renewal\",D2<>\"Expansion\")),\"Exclude\",\"Include\"). Three-condition OR: cancelled status, zero amount, unrecognized deal type. Copy down H2:H48.",
  },
  {
    id: "T02", number: 2,
    title: "Look Up Rep Names (with TRIM)",
    scenario: "Commission_Calculator col B needs each rep's display name, looked up from RepMaster by Rep ID. One rep's name in RepMaster has an invisible double-space that will cause mismatches downstream if not cleaned.",
    controllerAsk: "Fill B2:B11 in Commission_Calculator with each rep's name from RepMaster, using their Rep ID (col A) as the lookup key. One name in RepMaster contains a hidden double-space — apply TRIM so all names are clean.",
    concept: "XLOOKUP + TRIM for name cleanup",
    tutorFocus: "=TRIM(XLOOKUP(A2,RepMaster!$A:$A,RepMaster!$B:$B)). TRIM removes the double-space in 'Jordan  Lee'. Copy to B11.",
  },
  {
    id: "T03", number: 3,
    title: "Look Up Plan Types",
    scenario: "Each rep is on either the 'Standard' or 'Accelerator' commission plan. The plan type is stored in RepMaster and determines which commission rate tier applies.",
    controllerAsk: "Fill C2:C11 in Commission_Calculator with each rep's plan type, looked up from RepMaster by Rep ID. Returns either 'Standard' or 'Accelerator'.",
    concept: "XLOOKUP for plan type lookup",
    tutorFocus: "=XLOOKUP(A2,RepMaster!$A:$A,RepMaster!$C:$C). Returns 'Standard' or 'Accelerator'. Copy to C11.",
  },
  {
    id: "T04", number: 4,
    title: "Calculate Adjusted Monthly Quota",
    scenario: "Monthly quota = annual quota / 12. One rep joined October 15th and gets only 17/31 of a full month. RepMaster has a ProrationFactor column (1.0 for full months, 17/31 ≈ 0.548 for the new hire).",
    controllerAsk: "Fill D2:D11 in Commission_Calculator with each rep's adjusted monthly quota. Look up their annual quota from RepMaster, divide by 12, then multiply by the ProrationFactor (also in RepMaster column G). One rep's result will be significantly lower than the others.",
    concept: "Chained XLOOKUP with arithmetic for proration",
    tutorFocus: "=XLOOKUP(A2,RepMaster!$A:$A,RepMaster!$D:$D)/12*XLOOKUP(A2,RepMaster!$A:$A,RepMaster!$G:$G). AnnualQuota/12 × ProrationFactor. Copy to D11.",
  },
  {
    id: "T05", number: 5,
    title: "Sum New Business Revenue (SUMPRODUCT)",
    scenario: "One deal (D-1031 / D-1031B) is split 50/50 between two reps — both appear in the Deals tab for the same $40,000 contract at SplitPct=0.5. A plain SUMIFS on Amount would double-count. Column H (AuditFlag) must also be checked so excluded deals are not counted.",
    controllerAsk: "Fill E2:E11 in Commission_Calculator with each rep's total New Business revenue from included deals only. Your formula must multiply Amount × SplitPct for each deal, so split deals contribute only their partial amount. Use SUMPRODUCT to handle the multiplication.",
    concept: "SUMPRODUCT for split-commission aggregation",
    tutorFocus: "=SUMPRODUCT((Deals!$B$2:$B$48=A2)*(Deals!$D$2:$D$48=\"New Business\")*(Deals!$H$2:$H$48=\"Include\")*Deals!$E$2:$E$48*Deals!$F$2:$F$48). Boolean arrays × Amount × SplitPct. Copy to E11.",
  },
  {
    id: "T06", number: 6,
    title: "Sum Renewal Revenue",
    scenario: "Same SUMPRODUCT pattern as New Business, but filtered to Renewal deals only. Renewal commission is paid at a flat rate regardless of quota attainment.",
    controllerAsk: "Fill F2:F11 in Commission_Calculator with each rep's total Renewal revenue from included deals, using the same SUMPRODUCT approach as New Business.",
    concept: "SUMPRODUCT — Renewal revenue aggregation",
    tutorFocus: "=SUMPRODUCT((Deals!$B$2:$B$48=A2)*(Deals!$D$2:$D$48=\"Renewal\")*(Deals!$H$2:$H$48=\"Include\")*Deals!$E$2:$E$48*Deals!$F$2:$F$48). Same pattern, different deal type filter. Copy to F11.",
  },
  {
    id: "T07", number: 7,
    title: "Sum Expansion Revenue",
    scenario: "Expansion deals also use a flat commission rate. One rep has no Expansion deals this month — their cell should return 0.",
    controllerAsk: "Fill G2:G11 in Commission_Calculator with each rep's total Expansion revenue from included deals.",
    concept: "SUMPRODUCT — Expansion revenue aggregation",
    tutorFocus: "=SUMPRODUCT((Deals!$B$2:$B$48=A2)*(Deals!$D$2:$D$48=\"Expansion\")*(Deals!$H$2:$H$48=\"Include\")*Deals!$E$2:$E$48*Deals!$F$2:$F$48). Returns 0 when no Expansion deals — this is correct, not an error. Copy to G11.",
  },
  {
    id: "T08", number: 8,
    title: "Count Closed Deals per Rep",
    scenario: "The CFO wants a deal-count column alongside revenue — useful for spotting reps who closed many small deals vs. few large ones. Excluded deals (AuditFlag = 'Exclude') must not be counted.",
    controllerAsk: "Fill H2:H11 in Commission_Calculator with the count of included deals per rep — any deal type. Use COUNTIFS to filter by Rep ID and AuditFlag = 'Include'.",
    concept: "COUNTIFS for deal counting",
    tutorFocus: "=COUNTIFS(Deals!$B$2:$B$48,A2,Deals!$H$2:$H$48,\"Include\"). Two criteria: Rep ID match + AuditFlag = Include. Copy to H11.",
  },
  {
    id: "T09", number: 9,
    title: "Calculate Quota Attainment",
    scenario: "Quota attainment = New Business revenue / Adjusted Monthly Quota. This percentage drives which commission rate tier applies in the next task. The new hire's attainment is measured against the prorated quota, not the full monthly quota.",
    controllerAsk: "Fill I2:I11 in Commission_Calculator with each rep's New Business quota attainment as a decimal (e.g. 0.80 for 80%). Divide NB Revenue (col E) by Adjusted Quota (col D). Format the column as percentage.",
    concept: "Division for quota attainment %",
    tutorFocus: "=E2/D2. NB Revenue / Adjusted Quota. Format col I as %. Copy to I11.",
  },
  {
    id: "T10", number: 10,
    title: "Look Up Commission Rate (Approx Match)",
    scenario: "The CommissionRates sheet has a 4-row NB tier table sorted by TierMin (0, 0.5, 0.8, 1.0). The correct rate is the highest tier whose TierMin does not exceed the rep's attainment. Standard and Accelerator plan reps use different rate columns.",
    controllerAsk: "Fill J2:J11 in Commission_Calculator with each rep's New Business commission rate. Use VLOOKUP with approximate match (TRUE) on the CommissionRates tier table. The rate column to return depends on whether the rep is on the Standard or Accelerator plan.",
    concept: "VLOOKUP approximate match for tiered rates",
    tutorFocus: "=IF(C2=\"Accelerator\",VLOOKUP(I2,CommissionRates!$A$2:$C$5,3,TRUE),VLOOKUP(I2,CommissionRates!$A$2:$B$5,2,TRUE)). Approx match finds the largest TierMin ≤ attainment. Copy to J11.",
  },
  {
    id: "T11", number: 11,
    title: "Calculate Base Commission",
    scenario: "Base commission = (NB × NB rate) + (Renewal × flat Renewal rate) + (Expansion × flat Expansion rate). Flat rates differ by plan: Standard 5%/8%, Accelerator 7%/10% for Renewal/Expansion.",
    controllerAsk: "Fill K2:K11 in Commission_Calculator with each rep's total base commission. Multiply NB revenue (col E) by the NB rate (col J), then add Renewal revenue (col F) at the flat Renewal rate and Expansion revenue (col G) at the flat Expansion rate — both rates depend on the plan type (col C).",
    concept: "Mixed-rate commission formula with IF for plan type",
    tutorFocus: "=E2*J2+F2*IF(C2=\"Accelerator\",0.07,0.05)+G2*IF(C2=\"Accelerator\",0.10,0.08). NB×rate + Renewal×flat + Expansion×flat, rate by plan. Copy to K11.",
  },
  {
    id: "T12", number: 12,
    title: "Apply Cap and Clawback for Final Commission",
    scenario: "ClawbackAdj (col L) is pre-filled: –$1,200 for Jennifer Walsh, $0 for all others. FinalCommission = MIN(BaseCommission + ClawbackAdj, $25,000 cap). Michael Torres's base exceeds the cap and will be capped.",
    controllerAsk: "Fill M2:M11 in Commission_Calculator with each rep's final commission. Add the Clawback Adj (col L) to Base Commission (col K), then cap the result at $25,000 using MIN. One rep will hit the cap.",
    concept: "MIN for commission cap with clawback adjustment",
    tutorFocus: "=MIN(K2+L2,25000). ClawbackAdj is pre-filled in L (–1200 for Jennifer Walsh). MIN caps Michael Torres at 25000. Copy to M11.",
  },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200];

type Props = { onNavigateHome: () => void };

export default function SalesCommissionScenarioApp({ onNavigateHome }: Props) {
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
  const taskConfig = SALES_COMMISSION_VALIDATORS[task.id];
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
      alreadyCompleted && isPerfect ? "perfect score!"
      : alreadyCompleted            ? "still has errors — let's fix them"
      : isCorrect                   ? "loading your reward"
      : result.score >= 0.7         ? "almost there"
      : result.score >= 0.4         ? "getting there"
      :                               "let's work through it";
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
      topic:                "Sales Commission",
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
  const allAnswerRanges = TASKS.map(t => SALES_COMMISSION_VALIDATORS[t.id].answerRange);
  const allTargetSheets = TASKS.map(t => SALES_COMMISSION_VALIDATORS[t.id].sheet);

  if (phase === "intro") {
    return <SalesCommissionIntroPage onStart={() => setPhase("tasks")} onNavigateHome={onNavigateHome} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <XPBar xp={xp} level={level} streak={streak} levelProgressPct={levelProgressPct} xpToNextLevel={xpToNextLevel} />

      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 shrink-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider whitespace-nowrap">
                Task {task.number} / {totalTasks}
              </span>
              <span className="text-sm font-semibold text-slate-900 truncate">{task.title}</span>
              <span className="text-xs text-emerald-700 whitespace-nowrap ml-auto">
                <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded mr-1">{targetSheet}</span>
                → range{" "}
                <span className="font-bold font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{answerRange}</span>
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
              className="text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition"
            >
              {stripExpanded ? "▲ Hide" : "▼ Show task"}
            </button>
            <button onClick={onNavigateHome} className="text-xs font-medium text-slate-500 hover:underline whitespace-nowrap">
              ⌂ Home
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-hidden ${shake ? "animate-shake" : ""}`}>
          <SalesCommissionScenarioWidget
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
              className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shadow hover:bg-emerald-700 transition"
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
                topic="Sales Commission"
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

      <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {TASKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goToTask(i)}
              className={`w-9 h-9 rounded-full text-sm font-bold transition ${
                i === taskIdx
                  ? "bg-emerald-600 text-white shadow-md scale-110"
                  : completedIds.has(t.id)
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title={`${t.title} (${SALES_COMMISSION_VALIDATORS[t.id].sheet}: ${SALES_COMMISSION_VALIDATORS[t.id].answerRange})`}
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
          <button onClick={() => goToTask(taskIdx + 1)} disabled={taskIdx === totalTasks - 1} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40 transition">
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Commission Run Complete!</h2>
            <p className="text-slate-600 mb-4">You earned {xp} XP closing October commissions for 10 reps at CloudPulse Inc.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setCompletedIds(new Set()); setTaskIdx(0); setXp(0); setStreak(0); setResetKey(k => k + 1); }}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
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
