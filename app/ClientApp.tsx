"use client";

import { useMemo, useState } from "react";
import type { LessonConfig, DatasetRow, SessionMistake, CelebrationData } from "@/lib/types";
import LessonView from "@/components/LessonView";
import PracticeWidget from "@/components/PracticeWidget";
import TutorPanel from "@/components/TutorPanel";
import XPBar from "@/components/XPBar";
import CelebrationOverlay from "@/components/CelebrationOverlay";

type Props = {
  config: LessonConfig;
  headers: string[];
  rows: DatasetRow[];
  onNavigateHome?: () => void;
};

export default function ClientApp({ config, headers, rows, onNavigateHome }: Props) {
  const [phase, setPhase] = useState<"lesson" | "practice">("lesson");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [stripExpanded, setStripExpanded] = useState(false);
  const [tutorCollapsed, setTutorCollapsed] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [lastFormula, setLastFormula] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [tutorGradeResult, setTutorGradeResult] = useState<{
    message: string;
    celebration?: CelebrationData;
  } | null>(null);
  const [celebration, setCelebration] = useState<{
    show: boolean;
    xp: number;
    multiplier: number;
  }>({ show: false, xp: 0, multiplier: 1 });
  const [shake, setShake] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [sessionMistakes, setSessionMistakes] = useState<SessionMistake[]>([]);

  const exercise = config.exercises[exerciseIdx];
  const totalExercises = config.exercises.length;

  // Calculate level from XP
  const { level, levelProgressPct, xpToNextLevel } = useMemo(() => {
    const thresholds = config.gamification.levelThresholds;
    let lvl = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) lvl = i + 1;
    }
    const currentThreshold = thresholds[lvl - 1] || 0;
    const nextThreshold = thresholds[lvl] || thresholds[thresholds.length - 1] + 500;
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return {
      level: lvl,
      levelProgressPct: progress,
      xpToNextLevel: Math.max(0, nextThreshold - xp),
    };
  }, [xp, config.gamification.levelThresholds]);

  // Handle formula submission
  const handleFormulaSubmit = (formula: string, computedValue: number | null) => {
    setLastFormula(formula);
    setLastValue(computedValue);
    if (completedIds.has(exercise.id)) return;

    // Instant deterministic check — no await needed
    const isCorrect =
      computedValue !== null &&
      Math.abs(computedValue - exercise.expectedValue) <= exercise.tolerance;

    // Show result immediately
    if (isCorrect) {
      const newStreak = streak + 1;
      const useCombo = newStreak >= config.gamification.comboThreshold;
      const multiplier = useCombo ? config.gamification.comboMultiplier : 1;
      const xpEarned = Math.round(exercise.xpReward * multiplier);

      setStreak(newStreak);
      setWrongAttempts(0);
      setCompletedIds((prev) => new Set([...prev, exercise.id]));
      setCelebration({ show: true, xp: xpEarned, multiplier });
      setTimeout(() => setXp((prev) => prev + xpEarned), 200);
    } else {
      setStreak(0);
      setWrongAttempts((prev) => prev + 1);
      setSessionMistakes((prev) => [
        ...prev,
        { exerciseNumber: exercise.number, title: exercise.title, formula },
      ]);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }

    // Fire Claude message in background — UI is already unlocked
    fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: config.topic,
        exerciseTitle: exercise.title,
        controllerAsk: exercise.controllerAsk,
        tutorFocus: exercise.tutorFocus,
        schema: config.schema,
        taskExpectedBehavior: exercise.expectedBehavior,
        userFormula: formula,
        isCorrect,
        isPerfect: isCorrect,
        streakCount: isCorrect ? streak + 1 : 0,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.message) return;
        setTutorGradeResult(
          isCorrect && data.tone
            ? {
                message: data.message,
                celebration: { message: data.message, tone: data.tone, followUp: data.follow_up ?? "" },
              }
            : { message: data.message }
        );
      })
      .catch(() => null);
  };

  const goToExercise = (idx: number) => {
    if (idx < 0 || idx >= totalExercises) return;
    setExerciseIdx(idx);
    setLastFormula(null);
    setLastValue(null);
    setTutorGradeResult(null);
    setWrongAttempts(0);
    setResetKey((k) => k + 1);
  };

  const allDone = completedIds.size === totalExercises;

  if (phase === "lesson") {
    return <LessonView onStartPractice={() => setPhase("practice")} onNavigateHome={onNavigateHome} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <XPBar
        xp={xp}
        level={level}
        streak={streak}
        levelProgressPct={levelProgressPct}
        xpToNextLevel={xpToNextLevel}
      />

      {/* Exercise strip */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 shrink-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Always-visible title row */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider whitespace-nowrap">
                Exercise {exercise.number} / {totalExercises}
              </span>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {exercise.title}
              </span>
              <span className="text-xs text-amber-700 whitespace-nowrap ml-auto">
                Answer in{" "}
                <span className="font-bold font-mono bg-amber-100 px-1.5 py-0.5 rounded">
                  {exercise.answerCell}
                </span>
              </span>
            </div>
            {/* Collapsible body */}
            {stripExpanded && (
              <p className="text-sm text-slate-700 leading-snug mt-1.5">
                {exercise.scenario}{" "}
                <span className="font-medium italic text-slate-800">{exercise.controllerAsk}</span>
              </p>
            )}
          </div>
          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStripExpanded((v) => !v)}
              className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition whitespace-nowrap"
              title={stripExpanded ? "Collapse question" : "Expand question"}
            >
              {stripExpanded ? "▲ Hide" : "▼ Show question"}
            </button>
            <button
              onClick={() => setPhase("lesson")}
              className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap"
            >
              ← Lesson
            </button>
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline whitespace-nowrap"
              >
                ⌂ Home
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Spreadsheet */}
        <div
          className={`flex-1 overflow-hidden ${shake ? "animate-shake" : ""}`}
        >
          <PracticeWidget
            headers={headers}
            rows={rows}
            answerCell={exercise.answerCell}
            exerciseLabel={`Exercise ${exercise.number}:`}
            onFormulaSubmit={handleFormulaSubmit}
            resetKey={resetKey}
            allAnswerCells={config.exercises.map((e) => e.answerCell)}
            grading={false}
            uiCheck={exercise.uiCheck as any}
          />
        </div>

        {/* AI Tutor — collapsible */}
        {tutorCollapsed ? (
          <div className="w-9 bg-slate-100 border-l border-slate-200 flex flex-col items-center py-3 gap-3 shrink-0">
            <button
              onClick={() => setTutorCollapsed(false)}
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs shadow hover:bg-brand-700 transition"
              title="Open AI Tutor"
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
            {/* Collapse handle */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Tutor</span>
              <button
                onClick={() => setTutorCollapsed(true)}
                className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-200 transition"
                title="Collapse tutor"
              >
                ✕ Hide
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TutorPanel
                topic={config.topic}
                exercise={exercise}
                lastFormula={lastFormula}
                lastComputedValue={lastValue}
                gradeResult={tutorGradeResult}
                wrongAttempts={wrongAttempts}
                sessionMistakes={sessionMistakes}
                schema={config.schema}
                taskExpectedBehavior={exercise.expectedBehavior}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {config.exercises.map((ex, i) => (
            <button
              key={ex.id}
              onClick={() => goToExercise(i)}
              className={`w-9 h-9 rounded-full text-sm font-bold transition ${
                i === exerciseIdx
                  ? "bg-brand-600 text-white shadow-md scale-110"
                  : completedIds.has(ex.id)
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title={ex.title}
            >
              {completedIds.has(ex.id) && i !== exerciseIdx ? "✓" : ex.number}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => goToExercise(exerciseIdx - 1)}
            disabled={exerciseIdx === 0}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>
          <button
            onClick={() => goToExercise(exerciseIdx + 1)}
            disabled={exerciseIdx === totalExercises - 1}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next Exercise →
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Lesson Complete!
            </h2>
            <p className="text-slate-600 mb-4">
              You earned {xp} XP and mastered {config.topic}.
            </p>
            <button
              onClick={() => {
                setCompletedIds(new Set());
                setExerciseIdx(0);
                setXp(0);
                setStreak(0);
                setResetKey((k) => k + 1);
              }}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700"
            >
              Practice Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
