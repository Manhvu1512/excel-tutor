import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const {
    topic,
    exerciseTitle,
    concept,
    scenario,
    controllerAsk,
    tutorFocus,
    schema,               // generated offline — spreadsheet column descriptions
    taskExpectedBehavior, // generated offline — what a correct answer must return
    learnerFormula,
    computedValue,
    expectedValue,
    wrongAttempts,
    sessionMistakes,
    history,
    learnerQuestion,
    requestType, // "chat" | "hint"
    mcqAnswer,   // { choice, isCorrect } when learner answered an MCQ
  } = await req.json();

  const mistakeHistory =
    sessionMistakes && sessionMistakes.length > 0
      ? sessionMistakes
          .map(
            (m: { exerciseNumber: number; title: string; formula: string }) =>
              `  • Exercise ${m.exerciseNumber} (${m.title}): tried "${m.formula}"`
          )
          .join("\n")
      : null;

  // ── MCQ / Hint path ─────────────────────────────────────────────────────────
  if (requestType === "hint") {
    const hintPrompt = `You are an Excel tutor generating a targeted multiple-choice hint.

Exercise: ${exerciseTitle}
Concept being taught: ${concept || "SUMIFS conditional summing"}
Task: ${controllerAsk}
Expected result: ${expectedValue}
${tutorFocus ? `Instructor notes on what to focus on:\n${tutorFocus}` : ""}
${learnerFormula ? `Learner's latest formula: ${learnerFormula}` : "No formula submitted yet."}
${computedValue != null ? `What it returned: ${computedValue}` : ""}
Wrong attempts so far: ${wrongAttempts}

Generate a focused MCQ that isolates the most likely error the learner is making based on the instructor notes above.
- Make it about ONE specific part of the formula (e.g., which range to sum, which criteria to use).
- The correct option should be clearly right given the exercise context.
- The three wrong options should be plausible mistakes (swapped arguments, wrong column, off-by-one row).

RESPOND WITH ONLY VALID JSON — no markdown, no explanation, just the JSON object:
{
  "reply": "Let me ask you something to narrow this down.",
  "mcq": {
    "question": "<one clear question about the formula>",
    "options": [
      { "label": "A", "value": "<option>" },
      { "label": "B", "value": "<option>" },
      { "label": "C", "value": "<option>" },
      { "label": "D", "value": "<option>" }
    ],
    "correctIndex": <0-3>
  }
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: hintPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    try {
      // Strip possible markdown fences
      const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(jsonText);
      return NextResponse.json({ reply: parsed.reply, mcq: parsed.mcq });
    } catch {
      // JSON parse failed — fall back to plain text hint
      return NextResponse.json({ reply: raw });
    }
  }

  // ── Regular chat path ────────────────────────────────────────────────────────
  const scaffoldInstruction =
    wrongAttempts <= 1
      ? `They've had ${wrongAttempts || "no"} wrong attempt(s). Ask ONE targeted clarifying question to help them identify what they're missing (e.g., "Which column contains the values you want to sum?"). Do NOT hint at the answer.`
      : wrongAttempts === 2
      ? `They've tried twice. Point to a specific concept without revealing the answer (e.g., "Remember — SUMIFS always starts with which argument?").`
      : wrongAttempts === 3
      ? `They've tried three times. Give a PARALLEL EXAMPLE using completely different data (different scenario, different column names) that illustrates the same pattern. Never use their actual data. End with "How does that map to your problem?"`
      : wrongAttempts >= 4
      ? `They've tried ${wrongAttempts} times. Give the SKELETON formula with blanks for only the parts they still need to figure out. Use ___ for blanks. You may give the full answer only if they explicitly asked for it in this message.`
      : "";

  const mcqContext = mcqAnswer
    ? `The learner just answered an MCQ. They chose "${mcqAnswer.choice}" which was ${mcqAnswer.isCorrect ? "CORRECT" : "INCORRECT"}. ${mcqAnswer.isCorrect ? "Confirm they got it right and explain why that choice is correct." : "Gently tell them that's not quite right and give a small nudge toward the correct range/value without giving it away."}`
    : "";

  const contextBlock = schema && taskExpectedBehavior
    ? `Spreadsheet context (verified — use this to answer questions about columns and data):
${schema}

What a correct answer must return for this task:
${taskExpectedBehavior}`
    : tutorFocus
    ? `Key scaffolding notes: ${tutorFocus}`
    : "";

  const systemPrompt = `You are a Socratic Excel tutor for finance and accounting professionals. The function being learned: ${topic}.

CORE RULE — NEVER give the full answer unless the learner has tried 4+ times AND explicitly asked "show me the answer" or "give me the full answer" in their current message.

${scaffoldInstruction}

${mcqContext}

${mistakeHistory ? `Session mistake history — reference relevant past mistakes naturally when it fits:\n${mistakeHistory}` : ""}

${contextBlock}

Style:
- Max 3 sentences per response unless learner asks for a deep explanation.
- Warm, like a senior colleague. Never condescending.
- No emojis unless the learner uses them first.
- Never say "I'm an AI."
- If the question is off-topic: "Good question — let's nail this exercise first and come back to that."
- When the learner gets something right (correct MCQ, correct reasoning): briefly celebrate and connect it to real finance work.
- When asked about column layout or data structure: answer from the spreadsheet context above — do NOT guess.

SUMIFS rules (always apply):
- Criteria pair order is irrelevant — (A:A,B2,B:B,D2) and (B:B,D2,A:A,B2) produce identical results.
- SUMIFS returns 0 (not an error) when no rows match — IFERROR alone cannot catch this.

Current exercise:
- Title: ${exerciseTitle}
- Concept: ${concept || "SUMIFS conditional summing"}
- Scenario: ${scenario}
- Task: ${controllerAsk}
${learnerFormula ? `- Their latest formula: ${learnerFormula}` : ""}
${computedValue != null ? `- What it returned: ${computedValue}` : ""}`;

  const messages = [
    ...(history || []),
    { role: "user" as const, content: learnerQuestion },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 350,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ reply });
}
