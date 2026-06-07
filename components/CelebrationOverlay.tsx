"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

type Props = {
  show: boolean;
  xpAmount: number;
  comboMultiplier: number;
  onComplete: () => void;
};

export default function CelebrationOverlay({
  show,
  xpAmount,
  comboMultiplier,
  onComplete,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);

    // Fire confetti from the bottom-center, bursting up
    const duration = 1500;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1800);

    return () => clearTimeout(timer);
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-bounce-up flex flex-col items-center">
        <div className="text-7xl font-extrabold bg-gradient-to-br from-emerald-400 to-blue-500 bg-clip-text text-transparent drop-shadow-2xl">
          +{xpAmount} XP
        </div>
        {comboMultiplier > 1 && (
          <div className="mt-2 text-2xl font-bold text-orange-500 animate-pulse">
            {comboMultiplier}x COMBO!
          </div>
        )}
      </div>
    </div>
  );
}
