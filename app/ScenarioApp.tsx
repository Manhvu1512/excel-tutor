"use client";

import { useMemo, useState } from "react";
import ScenarioIntroPage from "@/components/ScenarioIntroPage";
import ScenarioWidget    from "@/components/ScenarioWidget";
import TutorPanel        from "@/components/TutorPanel";
import XPBar             from "@/components/XPBar";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import type { Exercise, SessionMistake } from "@/lib/types";
import { TASK_VALIDATORS }        from "@/lib/validators/taskValidators";
import { validateRange }          from "@/lib/validators/rangeValidator";
import type { CellValue }         from "@/lib/validators/rangeValidator";
import { detectRelativeRefDrift } from "@/lib/validators/formulaAnalyzer";

// ── Task definitions ───────────────────────────────────────────────────────────
// Only human-readable content lives here.
// answerRange, targetSheet, expected values, and xpReward live in TASK_VALIDATORS.

type ScenarioTask = {
  id:           string;
  number:       number;
  title:        string;
  scenario:     string;
  controllerAsk: string;
  concept:      string;
  tutorFocus:   string;
};

const TASKS: ScenarioTask[] = [
  {
    id: "T01", number: 1,
    title: "Look Up Vendor Names",
    scenario: "Recon Working has 26 invoice rows. Column D (Vendor_ID) is pre-filled. The Vendor Map tab has the full vendor master (20 vendors).",
    controllerAsk: "Fill column G (G2:G27) on the Recon Working sheet with a formula that resolves Vendor_Name from the Vendor Map tab using the Vendor_ID in column D. Return 'UNKNOWN' if not found. Enter in G2 and copy down to G27.",
    concept: "XLOOKUP / VLOOKUP with IFERROR",
    tutorFocus: "IFERROR(XLOOKUP(D2,'Vendor Map'!A:A,'Vendor Map'!B:B),\"UNKNOWN\"). Enter in G2, then copy or fill down through G27.",
  },
  {
    id: "T02", number: 2,
    title: "Look Up Department Names",
    scenario: "Column E (Dept_ID) is pre-filled on Recon Working. The Dept Map tab has 15 departments.",
    controllerAsk: "Fill column H (H2:H27) on the Recon Working sheet with a formula to resolve Dept_Name from the Dept Map tab using the Dept_ID in column E.",
    concept: "XLOOKUP / VLOOKUP",
    tutorFocus: "IFERROR(XLOOKUP(E2,'Dept Map'!A:A,'Dept Map'!B:B),\"UNKNOWN\"). Enter in H2, copy down to H27.",
  },
  {
    id: "T03", number: 3,
    title: "Match Payment Amounts",
    scenario: "The Payments tab has 112 payment entries. Column B of that sheet is Invoice_ID. Column D is Amount_Paid.",
    controllerAsk: "Fill column I (I2:I27) on Recon Working with a SUMIF formula that totals Amount_Paid from the Payments tab for each Invoice_ID. Return 0 if no payment exists. Enter in I2 and copy down to I27.",
    concept: "SUMIF / XLOOKUP with IFERROR",
    tutorFocus: "=SUMIF(Payments!B:B,A2,Payments!D:D). sum_range = Payments!D:D, criteria_range = Payments!B:B, criteria = A2. Copy down to I27.",
  },
  {
    id: "T04", number: 4,
    title: "Classify Payment Status",
    scenario: "Column I now has Amount_Paid. Column F has Inv_Amount. You need to flag each invoice as Paid, Partial, or Unpaid.",
    controllerAsk: "Fill column J (J2:J27) on Recon Working with an IF formula that returns 'Paid' if Amount_Paid (col I) equals Inv_Amount (col F), 'Partial' if Amount_Paid > 0, otherwise 'Unpaid'.",
    concept: "IF / IFS nested",
    tutorFocus: "=IF(I2=F2,\"Paid\",IF(I2>0,\"Partial\",\"Unpaid\")). Order matters — Paid check must come first. Copy down to J27.",
  },
  {
    id: "T05", number: 5,
    title: "Calculate Outstanding Balance",
    scenario: "With Inv_Amount in col F and Amount_Paid in col I, calculate the balance owed for every invoice.",
    controllerAsk: "Fill column K (K2:K27) on Recon Working with a formula to calculate the outstanding balance: Inv_Amount minus Amount_Paid.",
    concept: "Arithmetic formula",
    tutorFocus: "=F2-I2. Simple subtraction. Copy down K2:K27. A negative result means overpayment.",
  },
  {
    id: "T06", number: 6,
    title: "Flag Overdue Invoices",
    scenario: "Use September 1, 2024 as the AP close date. Any invoice with outstanding balance > 0 whose due date has passed is OVERDUE.",
    controllerAsk: "Fill column L (L2:L27) on Recon Working with a formula that returns 'OVERDUE' if the due date (col C) is before the close date AND the outstanding balance (col K) is greater than zero. Otherwise return 'OK'.",
    concept: "IF + AND + date comparison",
    tutorFocus: "=IF(AND(C2<DATE(2024,9,1),K2>0),\"OVERDUE\",\"OK\"). Using DATE(2024,9,1) instead of TODAY() gives reproducible results. Copy down to L27.",
  },
  {
    id: "T07", number: 7,
    title: "Identify Duplicate Invoice IDs",
    scenario: "INV-2024-0020 and INV-2024-0064 each appear twice in Recon Working. Your COUNTIF formula should catch any duplicates in the full range A2:A27.",
    controllerAsk: "Fill column M (M2:M27) on Recon Working with a COUNTIF formula that returns 'DUPLICATE' if the Invoice_ID (col A) appears more than once in A2:A27, otherwise 'OK'.",
    concept: "COUNTIF + IF",
    tutorFocus: "=IF(COUNTIF($A$2:$A$27,A2)>1,\"DUPLICATE\",\"OK\"). Lock the range with $ signs so it doesn't shift. Copy down to M27.",
  },
  {
    id: "T08", number: 8,
    title: "Outstanding by Vendor (Summary)",
    scenario: "The Summary Report tab has all 20 vendor names in column A (rows 3-22). You need to sum the outstanding balance per vendor.",
    controllerAsk: "Fill B3:B22 on the Summary Report sheet with SUMIFS formulas that total Outstanding balance ('Recon Working'!K2:K27) where Vendor_Name ('Recon Working'!G2:G27) matches the label in column A.",
    concept: "SUMIFS with cross-sheet reference",
    tutorFocus: "=SUMIFS('Recon Working'!K$2:K$27,'Recon Working'!G$2:G$27,A3). sum_range = col K, criteria_range = col G, criteria = A3. Copy down to B22.",
  },
  {
    id: "T09", number: 9,
    title: "Count Invoices by Status",
    scenario: "The Summary Report has a status count table. Row 26 is labeled 'Paid'. Count how many Recon Working rows have Pay_Status = 'Paid'.",
    controllerAsk: "In cell B26 on the Summary Report sheet, write a COUNTIFS formula counting rows in Recon Working column J (Pay_Status) that equal the label in A26.",
    concept: "COUNTIFS with cross-sheet reference",
    tutorFocus: "=COUNTIFS('Recon Working'!J$2:J$27,A26). criteria_range = col J (Pay_Status), criteria = A26 ('Paid').",
  },
  {
    id: "T10", number: 10,
    title: "Grand Totals for CFO Report",
    scenario: "The Summary Report grand totals section — row 32 is 'Total Invoiced'. This SUM intentionally includes the two duplicate rows.",
    controllerAsk: "In cell B32 on the Summary Report sheet, write a SUM formula for all Inv_Amount values in Recon Working column F (rows 2-27).",
    concept: "SUM with cross-sheet reference",
    tutorFocus: "=SUM('Recon Working'!F$2:F$27). This total ($250,327) is inflated by ~$21K due to two duplicate rows — flag this for the CFO.",
  },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200];

type Props = { scenarioId: string; onNavigateHome: () => void };

export default function ScenarioApp({ onNavigateHome }: Props) {
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

  const task       = TASKS[taskIdx];
  const totalTasks = TASKS.length;
  const taskConfig = TASK_VALIDATORS[task.id];   // validation config for current task
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
    difficulty:    2,
    concept:       task.concept,
    scenario:      task.scenario,
    controllerAsk: task.controllerAsk,
    tutorFocus:    task.tutorFocus,
    answerCell:    taskConfig.answerRange,   // pass range string for tutor context
    expectedValue: 0,
    tolerance:     0,
    xpReward:      taskConfig.xpReward,
  };

  // ── Shared streaming helper ───────────────────────────────────────────────
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

  // ── Range validation submit handler ────────────────────────────────────────
  const handleRangeSubmit = async (values: CellValue[], formulas: string[]) => {
    const alreadyCompleted = completedIds.has(task.id);

    const result           = validateRange(values, formulas, taskConfig.expected, {
      correctThreshold: taskConfig.correctThreshold ?? 0.8,
    });
    const relativeRefDrift = detectRelativeRefDrift(formulas);
    const isCorrect        = result.correct;
    const isPerfect        = result.score >= 1.0;

    // ── Instant score flash ───────────────────────────────────────────────────
    const label =
      alreadyCompleted && isPerfect ? "perfect score!"                   :
      alreadyCompleted              ? "still has errors — let's fix them" :
      isCorrect                     ? "loading your reward"              :
      result.score >= 0.7           ? "almost there"                    :
      result.score >= 0.4           ? "getting there"                   :
                                      "let's work through it";
    setStreamText(`${result.correct_count}/${result.total} correct — ${label}…`);

    // ── State updates (only for first submission) ─────────────────────────────
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

    const basePayload = {
      topic:            "Invoice Reconciliation",
      exerciseTitle:    task.title,
      controllerAsk:    task.controllerAsk,
      tutorFocus:       task.tutorFocus,
      validationResult: result,
      relativeRefDrift,
      userFormula,
    };

    // ── Re-submission on an already-completed task ────────────────────────────
    if (alreadyCompleted) {
      if (isPerfect) {
        // Hit 100% on re-submission: no API call, just a local ack.
        setTimeout(() => {
          setStreamText(null);
          setTutorGradeResult({ message: "All cells correct — your formula is now perfect!" });
        }, 600);
      } else {
        // Still has errors: stream targeted feedback the same way a wrong answer does.
        await streamGradeFeedback({ ...basePayload, isCorrect: false, streakCount: 0 });
      }
      return;
    }

    // ── First submission ──────────────────────────────────────────────────────
    if (isCorrect) {
      // Celebration path: needs structured JSON for tone + follow_up fields.
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
      // Wrong answer: stream feedback into the live bubble; fires setTutorGradeResult ONCE at end.
      await streamGradeFeedback({ ...basePayload, isCorrect: false, streakCount: 0 });
    }
  };

  const goToTask = (idx: number) => {
    if (idx < 0 || idx >= totalTasks) return;
    setTaskIdx(idx);
    setTutorGradeResult(null);
    setStreamText(null);
    setWrongAttempts(0);
    setResetKey(k => k + 1);
  };

  const allDone         = completedIds.size === totalTasks;
  const allAnswerRanges = TASKS.map(t => TASK_VALIDATORS[t.id].answerRange);
  const allTargetSheets = TASKS.map(t => TASK_VALIDATORS[t.id].sheet);

  if (phase === "intro") {
    return <ScenarioIntroPage onStart={() => setPhase("tasks")} onNavigateHome={onNavigateHome} />;
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
          <ScenarioWidget
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
                topic="Invoice Reconciliation"
                exercise={exerciseForTutor}
                lastFormula={null}
                lastComputedValue={null}
                gradeResult={tutorGradeResult}
                wrongAttempts={wrongAttempts}
                sessionMistakes={sessionMistakes}
                streamText={streamText}
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
              title={`${t.title} (${TASK_VALIDATORS[t.id].sheet}: ${TASK_VALIDATORS[t.id].answerRange})`}
            >
              {completedIds.has(t.id) && i !== taskIdx ? "✓" : t.number}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
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
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reconciliation Complete!</h2>
            <p className="text-slate-600 mb-4">You earned {xp} XP and completed a real AP month-end workflow.</p>
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
