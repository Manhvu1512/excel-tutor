"use client";

import { useState } from "react";

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSend() {
    if (!email) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, url: window.location.href }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile gate — only visible on small screens */}
      <div className="flex md:hidden flex-col items-center justify-center flex-1 px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center text-2xl mb-5 mx-auto">
            📊
          </div>

          {/* Heading */}
          <h2 className="font-bold text-slate-900 text-xl text-center mb-2">
            This scenario needs a bigger screen
          </h2>
          <p className="text-slate-500 text-sm text-center leading-relaxed mb-7">
            But don&apos;t lose your spot — send the link to your email and pick it up on your laptop.
          </p>

          {status === "sent" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 text-center">
              <div className="text-2xl mb-1">✅</div>
              <p className="text-emerald-800 font-semibold text-sm">Link sent!</p>
              <p className="text-emerald-600 text-xs mt-0.5">Check your inbox and open it on desktop.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="your@email.com"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!email || status === "sending"}
                  className="px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition whitespace-nowrap"
                >
                  {status === "sending" ? "Sending…" : "Send link"}
                </button>
              </div>
              {status === "error" && (
                <p className="text-red-500 text-xs mt-2 text-center">Something went wrong. Try again.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Desktop content — only visible on md+ */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
