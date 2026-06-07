"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  xp: number;
  level: number;
  streak: number;
  levelProgressPct: number;
  xpToNextLevel: number;
};

export default function XPBar({ xp, level, streak, levelProgressPct, xpToNextLevel }: Props) {
  const [displayXp, setDisplayXp] = useState(xp);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [streakPop, setStreakPop] = useState(false);
  const prevXpRef = useRef(xp);
  const prevLevelRef = useRef(level);
  const prevStreakRef = useRef(streak);

  // Animate XP counter and show floating +N badge
  useEffect(() => {
    if (xp === prevXpRef.current) return;
    const gain = xp - prevXpRef.current;
    prevXpRef.current = xp;

    if (gain > 0) {
      setXpGain(gain);
      setTimeout(() => setXpGain(null), 1600);
    }

    // Smooth counter roll
    const start = displayXp;
    const diff = xp - start;
    const steps = 24;
    let count = 0;
    const iv = setInterval(() => {
      count++;
      if (count >= steps) {
        setDisplayXp(xp);
        clearInterval(iv);
      } else {
        setDisplayXp(Math.round(start + diff * (count / steps)));
      }
    }, 28);
    return () => clearInterval(iv);
  }, [xp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Level-up pulse
  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelUp(true);
      setTimeout(() => setLevelUp(false), 700);
    }
    prevLevelRef.current = level;
  }, [level]);

  // Streak pop
  useEffect(() => {
    if (streak > prevStreakRef.current && streak > 0) {
      setStreakPop(true);
      setTimeout(() => setStreakPop(false), 500);
    }
    prevStreakRef.current = streak;
  }, [streak]);

  return (
    <div className="w-full bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-6 shadow-sm shrink-0">

      {/* Level badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-lg shadow-md transition-transform ${
            levelUp ? "scale-125 ring-4 ring-brand-300" : "scale-100"
          }`}
          style={{ transition: "transform 0.3s cubic-bezier(.36,2,.58,1), box-shadow 0.3s" }}
        >
          {level}
        </div>
        <div className="text-xs text-slate-500 font-medium leading-tight">
          LEVEL
          {levelUp && (
            <div className="text-brand-600 font-bold text-[10px] uppercase tracking-wider animate-bounce-up-sm">
              UP!
            </div>
          )}
        </div>
      </div>

      {/* XP bar */}
      <div className="flex-1 relative">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm font-semibold text-emerald-700">
            {displayXp.toLocaleString()} XP
          </span>
          <span className="text-xs text-slate-500">
            {xpToNextLevel} XP to Level {level + 1}
          </span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(levelProgressPct, 100)}%`,
              boxShadow: levelProgressPct > 5 ? "0 0 8px rgba(16,185,129,0.5)" : "none",
            }}
          />
        </div>

        {/* Floating +N XP badge */}
        {xpGain !== null && (
          <div
            key={Date.now()}
            className="absolute -top-1 left-0 text-emerald-600 font-bold text-sm pointer-events-none select-none animate-float-xp"
          >
            +{xpGain} XP
          </div>
        )}
      </div>

      {/* Streak */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
          streakPop
            ? "bg-orange-100 border-orange-400 scale-110"
            : "bg-orange-50 border-orange-200 scale-100"
        }`}
        style={{ transition: "transform 0.25s cubic-bezier(.36,2,.58,1)" }}
      >
        <span className={`text-xl leading-none ${streakPop ? "animate-spin-once" : ""}`}>
          🔥
        </span>
        <div>
          <div className="text-sm font-bold text-orange-600 leading-none">{streak}</div>
          <div className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">streak</div>
        </div>
      </div>
    </div>
  );
}
