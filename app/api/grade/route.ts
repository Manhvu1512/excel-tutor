import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CELEBRATION_SYSTEM = `You are the CELEBRATION ENGINE for an Excel practice app.

Your job:
- Celebrate the learner's correct answer with a SHORT, EMOTIONAL response.
- If the score is NOT 100%, also add a Socratic follow-up that identifies ONE specific issue — grounded in which cells are actually wrong, not formula text comparison.

Design rules for the message:
- Max 2 short sentences.
- Tone: hype + encouraging, but not childish.
- Focus on emotion first, teaching second.
- Use simple language that a young professional or student can relate to.
- Optionally include 1–2 emoji characters (e.g. 👍🎉📈), but do NOT overload with them.

Rules for follow_up:
- If score is 100% (perfect): optional challenge ("Want to try a harder version?") or a compliment on technique. Can be empty string.
- If score is less than 100% (not perfect): identify ONE issue based on the WRONG CELL DATA provided (row numbers, pattern). Name what those wrong cells have in common (e.g., "the 5 rows returning 0 are the accounts with no budget row — your formula needs to return text there instead"). Be Socratic. Max 2 sentences.

CRITICAL — formula comparison rules (read before writing follow_up):
- Base the follow_up on wrong cells, NOT on formula text differences from the correct pattern.
- If the wrong cells clearly map to a formula issue, name it. If you cannot connect wrong cells to a specific formula flaw, do NOT invent one.
- SUMIFS criteria pair order is irrelevant: (A:A,B2,B:B,D2) and (B:B,D2,A:A,B2) produce identical results. NEVER flag different ordering of criteria pairs as a swap error.
- Differences in $ lock style or full-column vs bounded-range are NOT errors when cells are correct.

You MUST return JSON with this exact shape:
{
  "message": "string, the main celebration text for the UI",
  "tone": "hype" | "warm" | "professional",
  "follow_up": "string, cell-grounded note for non-perfect; challenge or empty for perfect",
  "tags": ["skill:SUMIFS", "difficulty:micro_drill"]
}

General guidance:
- Always assume this message appears right AFTER the answer is marked correct.
- Do NOT reveal the full correct formula in follow_up.
- Do NOT add any text outside the JSON.`;

export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    topic,
    exerciseTitle,
    controllerAsk,
    tutorFocus,
    schema,                  // generated offline — spreadsheet column descriptions for this scenario
    taskExpectedBehavior,    // generated offline — what a correct answer must return for this task
    validationResult,        // ValidationResult: { correct, score, total, correct_count, error_rows, error_summary }
    isCorrect,
    streakCount,
    relativeRefDrift,        // boolean: true when formula ranges drift by +1 row (missing $ locks)
    userFormula,             // the first formula string the learner actually entered
    isPerfect,               // true when score === 1.0
  } = await req.json();

  if (isCorrect) {
    const scoreStr = validationResult
      ? `${validationResult.correct_count}/${validationResult.total} cells correct (${Math.round(validationResult.score * 100)}%)`
      : "all cells correct";

    const errorRowStr = (!isPerfect && validationResult?.error_rows?.length)
      ? `rows ${validationResult.error_rows.slice(0, 8).join(", ")}${validationResult.error_rows.length > 8 ? "…" : ""}`
      : null;

    const userPrompt = `User context:
- skill: ${topic}
- difficulty: micro_drill
- scenario: ${exerciseTitle}. ${controllerAsk}
- Range validation: ${scoreStr}
- Perfect score: ${isPerfect ? "yes (100%)" : "no — some cells wrong"}${errorRowStr ? `\n- Wrong cell rows: ${errorRowStr}` : ""}
${taskExpectedBehavior ? `- What this task must return: ${taskExpectedBehavior}` : `- Correct pattern (context only): ${tutorFocus ?? "not provided"}`}
- Learner's formula: ${userFormula || "not provided"}
- streak: ${streakCount}${streakCount >= 3 ? `\n- They're on a ${streakCount}-answer streak — recognize it!` : ""}

Generate a celebration JSON response now.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: CELEBRATION_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    try {
      const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed   = JSON.parse(jsonText);
      return NextResponse.json({
        message:   parsed.message  ?? "Great work!",
        tone:      parsed.tone     ?? "warm",
        follow_up: parsed.follow_up ?? "",
      });
    } catch {
      return NextResponse.json({ message: raw, tone: "warm", follow_up: "" });
    }
  }

  // ── Wrong answer: Socratic nudge based on formula comparison ─────────────

  const vr    = validationResult;
  const total = vr?.total ?? 1;
  const scoreStr = vr ? `${vr.correct_count}/${total} cells correct (${Math.round(vr.score * 100)}%)` : "unknown";
  const blankCount = vr?.error_summary?.blank_rows?.length ?? 0;
  const allBlank   = blankCount >= total * 0.9;
  // Formula exists but all cells blank → the formula is throwing an error (#VALUE!, #REF!, etc.)
  const formulaErrors = allBlank && userFormula?.trim().startsWith("=");

  const fmt = (rows: number[] | undefined) =>
    rows?.length ? rows.slice(0, 8).join(", ") + (rows.length > 8 ? `… (${rows.length} total)` : "") : "none";

  const errorBreakdown = vr?.error_summary ? [
    vr.error_summary.blank_rows?.length         ? `  • Blank / formula error (cell returned null — often means #VALUE! or #REF!): rows ${fmt(vr.error_summary.blank_rows)}` : "",
    vr.error_summary.text_mismatch_rows?.length ? `  • Wrong type/text (e.g. returned a number when text like "Not Budgeted" was expected, or wrong text): rows ${fmt(vr.error_summary.text_mismatch_rows)}` : "",
    vr.error_summary.numeric_mismatch_rows?.length ? `  • Wrong number: rows ${fmt(vr.error_summary.numeric_mismatch_rows)}` : "",
    vr.error_summary.formula_missing_rows?.length  ? `  • Formula missing: rows ${fmt(vr.error_summary.formula_missing_rows)}` : "",
  ].filter(Boolean).join("\n") : `  • Error rows: ${fmt(vr?.error_rows)}`;

  const contextBlock = schema && taskExpectedBehavior
    ? `Spreadsheet context (column layout and data characteristics):
${schema}

What a correct answer must return for this specific task:
${taskExpectedBehavior}`
    : `Correct formula pattern (DO NOT reveal directly): ${tutorFocus ?? ""}`;

  const wrongPrompt = `The learner submitted a WRONG answer for a range-fill task.

Topic: ${topic}
Task: ${controllerAsk}

${contextBlock}

Learner's formula (first cell entered): ${userFormula || "(blank — no formula detected)"}

Range validation — ANSWER SHEET rows (not lookup-sheet rows):
- Score: ${scoreStr}
- Error breakdown by type:
${errorBreakdown}
${formulaErrors ? `- NOTE: Formula is present but all cells returned null — this means the formula is producing a runtime error (#VALUE!, #REF!, etc.), NOT that it was never filled down. Diagnose what causes the error.` : allBlank ? "- NOTE: All cells are blank and no formula was detected — formula was likely not filled down." : ""}
${relativeRefDrift ? "- NOTE: Range drift detected — the lookup/criteria range shifts each row instead of staying fixed." : ""}

IMPORTANT: Row numbers above refer to rows in the ANSWER SHEET, NOT in any lookup sheet (Budget, DeptMap, etc.).

Your job: identify the ROOT CAUSE and give ONE targeted Socratic hint (1–2 sentences, max 30 words).

── STEP 0 — FORMULA CORRECTNESS PRE-CHECK (do this before anything else) ──────
Read the expectedBehavior carefully. Extract the exact column references and operations it describes.
Compare them against the learner's formula.

If the formula MATCHES what expectedBehavior describes (same columns, same operation, same logic):
  → The formula is CORRECT. Do NOT criticise it.
  → The wrong cells are caused by incorrect INPUT VALUES from a previous task, not this formula.
  → Tell the learner: their formula logic is right, but one of the columns they reference may have
    been populated incorrectly by an earlier task — ask them to double-check the values in that column.
  → Example: "Your formula looks right — check whether column E has the correct NB Revenue values
    for all reps, as an error there would flow into this result."

Only proceed to the steps below if the formula does NOT match expectedBehavior.

── STEP 1 — CRITERIA TYPO CHECK (when formula errors produce blanks) ───────────
Scan every quoted string literal in the formula (text inside double-quotes).
Compare each literal against exact criteria strings in expectedBehavior.
A one-character typo ("Included" vs "Include") is the most common cause of #VALUE! or all-zero results.
If you find a mismatch, name it directly and stop.

── STEP 2 — FUNCTION USAGE ERROR ───────────────────────────────────────────────
If criteria strings are correct but the formula still errors:
- SUMPRODUCT: all conditions and values must be inside ONE SUMPRODUCT(). Multiplying separate SUMPRODUCT() calls gives scalar × scalar, not row-by-row.
- SUMIFS/COUNTIFS: sum_range comes FIRST; criteria pairs follow in matched pairs.
- VLOOKUP TRUE: lookup table first column must be sorted ascending.

── STEP 3 — RESULT TYPE OR VALUE MISMATCH ──────────────────────────────────────
"Wrong type/text" → formula returns wrong data type. Use expectedBehavior to name what should be returned.
"Wrong number" → wrong column, wrong range, or wrong criteria logic.

SUMIFS rules (always apply):
- Criteria pair ORDER is irrelevant. NEVER flag reversed ordering as a swap.
- Bounded ranges vs full-column are equivalent when data fits within those rows.

Output rules:
- If formula matches expectedBehavior → blame input values from a previous task, NOT this formula.
- If formula has a real error → name the most specific fixable issue first.
- Do NOT give the full correct formula.
- Frame as "check..." or "your formula looks right, but..." — warm colleague tone, no emojis.
- If score > 70%, say they're close.`;

  // Stream the wrong-answer nudge so the first words appear in ~300 ms.
  const streamResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    messages: [{ role: "user", content: wrongPrompt }],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamResponse) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode((event.delta as any).text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
