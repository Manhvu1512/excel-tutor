"use client";

export default function MobileGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      {/* Shown only on mobile */}
      <div className="flex md:hidden flex-col items-center justify-center flex-1 p-8 text-center bg-slate-50">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-3xl mb-5">
          💻
        </div>
        <h2 className="font-bold text-slate-900 text-xl mb-2">Best on Desktop</h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
          This scenario uses an interactive spreadsheet that needs a larger screen. Open it on your laptop or desktop for the full experience.
        </p>
        <p className="mt-6 text-xs text-slate-400">
          Copy the URL and open it on your computer.
        </p>
      </div>

      {/* Shown only on desktop */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
