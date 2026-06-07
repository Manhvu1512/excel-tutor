"use client";

import { useEffect, useRef, useState } from "react";
import type { TutorMessage, TutorMCQ, Exercise, SessionMistake, CelebrationData } from "@/lib/types";
import { detectFormulas, formatTemplate, FORMULA_TEMPLATES } from "@/lib/formulaTemplates";

type Props = {
  topic: string;
  exercise: Exercise;
  lastFormula: string | null;
  lastComputedValue: number | null;
  gradeResult: { message: string; celebration?: CelebrationData } | null;
  wrongAttempts: number;
  sessionMistakes: SessionMistake[];
  /** Live streaming text shown as a typing bubble; does not add to the conversation history. */
  streamText?: string | null;
  /** Generated offline — spreadsheet column descriptions for this scenario. */
  schema?: string;
  /** Generated offline — what a correct answer must return for this specific task. */
  taskExpectedBehavior?: string;
};

export default function TutorPanel({
  topic,
  exercise,
  lastFormula,
  lastComputedValue,
  gradeResult,
  wrongAttempts,
  sessionMistakes,
  streamText,
  schema,
  taskExpectedBehavior,
}: Props) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      role: "assistant",
      content: `Exercise ${exercise.number}: ${exercise.title}. Type your formula in the highlighted cell — ask me anything if you get stuck.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [answeredMcqs, setAnsweredMcqs] = useState<Set<number>>(new Set());
  const [showFormulaPicker, setShowFormulaPicker] = useState(false);
  const [showAllFormulas, setShowAllFormulas] = useState(false);
  const autoHintFiredRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect formulas from formula strings in the task — scan tutorFocus which contains =FORMULA(...) syntax
  const taskFormulas = detectFormulas([
    topic,
    exercise.concept ?? "",
    exercise.tutorFocus ?? "",
    taskExpectedBehavior ?? "",
  ]);
  const allTemplateKeys = Object.keys(FORMULA_TEMPLATES);
  const otherFormulas = allTemplateKeys.filter(k => !taskFormulas.includes(k));

  // Reset on exercise change
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Exercise ${exercise.number}: ${exercise.title}. Ready when you are.`,
      },
    ]);
    setAnsweredMcqs(new Set());
    setShowFormulaPicker(false);
    setShowAllFormulas(false);
    autoHintFiredRef.current = false;
  }, [exercise.id]);

  // Auto-inject grade messages
  useEffect(() => {
    if (gradeResult?.message) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: gradeResult.message,
          tone: gradeResult.celebration?.tone,
          followUp: gradeResult.celebration?.followUp,
        },
      ]);
    }
  }, [gradeResult]);

  // Auto-scroll — also triggered by streamText updates so the live bubble stays in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamText]);

  // Auto-trigger hint at attempt 3
  useEffect(() => {
    if (wrongAttempts === 3 && !autoHintFiredRef.current) {
      autoHintFiredRef.current = true;
      fireHintRequest(true);
    }
  }, [wrongAttempts]);

  const buildPayload = (extra: Record<string, unknown>) => ({
    topic,
    exerciseTitle: exercise.title,
    concept: exercise.concept,
    scenario: exercise.scenario,
    controllerAsk: exercise.controllerAsk,
    tutorFocus: exercise.tutorFocus,
    schema,
    taskExpectedBehavior,
    learnerFormula: lastFormula,
    computedValue: lastComputedValue,
    expectedValue: exercise.expectedValue,
    wrongAttempts,
    sessionMistakes,
    history: messages
      .slice(1) // skip the initial greeting
      .map((m) => ({ role: m.role, content: m.content })),
    ...extra,
  });

  const appendAssistant = (content: string, mcq?: TutorMCQ) => {
    setMessages((prev) => [...prev, { role: "assistant", content, mcq }]);
  };

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload({ learnerQuestion: question, requestType: "chat" })),
      });
      const data = await res.json();
      appendAssistant(data.reply || "...");
    } catch {
      appendAssistant("Sorry, I hit a hiccup. Try asking again.");
    } finally {
      setSending(false);
    }
  };

  const fireHintRequest = async (auto = false) => {
    if (sending) return;
    setSending(true);
    if (!auto) {
      setMessages((prev) => [...prev, { role: "user", content: "Give me a hint" }]);
    }

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPayload({ learnerQuestion: auto ? "" : "Give me a hint", requestType: "hint" })
        ),
      });
      const data = await res.json();
      appendAssistant(data.reply || "Let me ask you something...", data.mcq ?? undefined);
    } catch {
      appendAssistant("Couldn't load the hint. Ask me a question instead.");
    } finally {
      setSending(false);
    }
  };

  const handleMcqChoice = async (
    msgIndex: number,
    choice: { label: string; value: string },
    isCorrect: boolean
  ) => {
    if (answeredMcqs.has(msgIndex) || sending) return;
    setAnsweredMcqs((prev) => new Set([...prev, msgIndex]));
    setSending(true);

    const userText = `${choice.label}) ${choice.value}`;
    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPayload({
            learnerQuestion: `I chose ${choice.label}: ${choice.value}`,
            requestType: "chat",
            mcqAnswer: { choice: choice.value, isCorrect },
          })
        ),
      });
      const data = await res.json();
      appendAssistant(data.reply || "...");
    } catch {
      appendAssistant("Good thinking — keep working through it.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full bg-slate-50 border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            AI
          </div>
          <div>
            <div className="font-semibold text-sm">Excel Tutor</div>
            <div className="text-xs text-blue-100">
              {wrongAttempts === 0
                ? "Here to help"
                : wrongAttempts < 3
                ? `Attempt ${wrongAttempts} — keep going`
                : "Let's work through this together"}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => {
          const isCelebration = m.role === "assistant" && !!m.tone;
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-600 text-white rounded-br-sm"
                    : isCelebration
                    ? "bg-emerald-50 text-emerald-900 rounded-bl-sm border border-emerald-200 shadow-sm"
                    : "bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-200"
                }`}
              >
                {isCelebration && (
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                    {m.tone === "hype" ? "🎉 Correct!" : m.tone === "professional" ? "✓ Well done" : "✓ Nice work"}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Follow-up challenge button */}
                {isCelebration && m.followUp && (
                  <button
                    onClick={() => send(m.followUp)}
                    disabled={sending}
                    className="mt-2.5 w-full text-left px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs rounded-lg border border-emerald-200 transition font-medium disabled:opacity-50"
                  >
                    {m.followUp} →
                  </button>
                )}

                {/* MCQ choices */}
                {m.mcq && (
                  <div className="mt-3 space-y-1.5">
                    {m.mcq.question && (
                      <p className="text-sm font-semibold text-slate-700 mb-2">{m.mcq.question}</p>
                    )}
                    {answeredMcqs.has(i) ? (
                      <p className="text-xs text-slate-400 italic">Answered</p>
                    ) : (
                      m.mcq.options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => handleMcqChoice(i, opt, oi === m.mcq!.correctIndex)}
                          disabled={sending}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-400 transition font-mono disabled:opacity-50"
                        >
                          <span className="font-bold text-brand-600 mr-1.5">{opt.label})</span>
                          {opt.value}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live streaming bubble — updates in-place, never pushed to messages array */}
        {streamText && (
          <div className="flex justify-start">
            <div className="max-w-[90%] px-3 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-white text-slate-800 shadow-sm border border-slate-200">
              <p className="whitespace-pre-wrap">
                {streamText}
                <span className="inline-block w-0.5 h-[1em] bg-slate-400 ml-0.5 animate-pulse align-middle rounded-sm" />
              </p>
            </div>
          </div>
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-3 py-2.5 border-t border-slate-200 bg-white shrink-0">

        {/* Formula picker panel */}
        {showFormulaPicker && (
          <div className="mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Formula Reference</span>
              <button onClick={() => { setShowFormulaPicker(false); setShowAllFormulas(false); }} className="text-indigo-400 hover:text-indigo-700 text-sm leading-none">✕</button>
            </div>

            {/* Task-relevant formulas */}
            {taskFormulas.length > 0 ? (
              <>
                <p className="text-[10px] text-indigo-500 mb-1.5">Detected from this task — click for syntax + generic example:</p>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {taskFormulas.map(key => (
                    <button
                      key={key}
                      onClick={() => { appendAssistant(formatTemplate(key)); setShowFormulaPicker(false); setShowAllFormulas(false); }}
                      className="text-xs px-2.5 py-1 rounded-full font-mono font-semibold bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 transition"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-indigo-400 mb-2 italic">No specific formula detected — browse all below.</p>
            )}

            {/* Browse all toggle */}
            <button
              onClick={() => setShowAllFormulas(v => !v)}
              className="text-[10px] text-indigo-500 hover:text-indigo-700 underline transition"
            >
              {showAllFormulas ? "▲ Hide other formulas" : "▼ Browse all formulas"}
            </button>
            {showAllFormulas && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {otherFormulas.map(key => (
                  <button
                    key={key}
                    onClick={() => { appendAssistant(formatTemplate(key)); setShowFormulaPicker(false); setShowAllFormulas(false); }}
                    className="text-xs px-2.5 py-1 rounded-full font-mono text-indigo-600 border border-indigo-200 bg-white hover:bg-indigo-50 transition"
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap mb-2">
          <button
            onClick={() => fireHintRequest(false)}
            disabled={sending}
            className="text-xs px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-full transition disabled:opacity-50 font-medium"
          >
            Give me a hint
          </button>
          <button
            onClick={() => send("What's wrong with my formula?")}
            disabled={sending}
            className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition disabled:opacity-50"
          >
            What's wrong?
          </button>
          <button
            onClick={() => setShowFormulaPicker(v => !v)}
            className={`text-xs px-2.5 py-1 border rounded-full transition font-medium ${
              showFormulaPicker
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
            }`}
          >
            <span className="font-mono mr-0.5">fx</span> Formula guide
          </button>
          {wrongAttempts >= 4 && exercise.tutorFocus && (
            <button
              onClick={() => {
                const formula = exercise.tutorFocus.split(".")[0].trim();
                const rest    = exercise.tutorFocus.slice(formula.length).replace(/^\.?\s*/, "");
                appendAssistant(
                  `Here's the formula:\n\n\`${formula}\`${rest ? `\n\n${rest}` : ""}`
                );
              }}
              disabled={sending}
              className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-full transition disabled:opacity-50 font-semibold"
            >
              Show formula
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask anything..."
            disabled={sending}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
