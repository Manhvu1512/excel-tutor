/**
 * generate-lesson-context.js
 *
 * OFFLINE pipeline step — run once after writing a new lesson-config.json.
 * Reads the lesson config, calls Claude once, then patches schema and
 * expectedBehavior directly back into lesson-config.json.
 *
 * Usage:
 *   node scripts/generate-lesson-context.js          # only missing fields
 *   node scripts/generate-lesson-context.js --force  # regenerate everything
 *
 * Requires ANTHROPIC_API_KEY in environment (or .env.local).
 */

const Anthropic = require("@anthropic-ai/sdk").default;
const fs   = require("fs");
const path = require("path");

// Load .env.local if present
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  }
} catch {}

const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FORCE    = process.argv.includes("--force");
const CONFIG_PATH = path.join(process.cwd(), "content", "lesson-config.json");

const GENERATION_PROMPT = `You are building tutor metadata for an Excel learning app.
Given a lesson config (topic, dataset description, exercises with expected values and tutor hints),
generate two pieces of content that eliminate AI tutor hallucination at runtime.

GENERATE:

1. "schema" (shared across all exercises in this lesson):
   - 4-8 sentences describing the dataset columns, data formats, and critical behaviors.
   - MUST include non-obvious behaviors, e.g.:
     * "SUMIFS returns 0 — not an error — when no rows match"
     * "Column A dates are stored as text YYYY-MM-DD — string comparison works for >= and <="
     * "Column C (Category) and Column D (Department) are independent columns"
   - Written so Claude can verify whether a learner's formula references the correct columns
     and returns the correct type, without guessing about the data.

2. "exercises" — for each exercise id, "expectedBehavior":
   - 3-5 sentences describing EXACTLY what a correct formula returns.
   - Include: the exact numeric answer, what the most common wrong answers indicate
     (e.g. "a result of X means criterion Y is missing"), and any formula pattern
     requirements the learner might miss.
   - If the function returns 0 on no-match (SUMIFS, COUNTIFS), say so explicitly
     so the tutor can distinguish a missing criterion from a genuine zero result.

Return ONLY valid JSON with no markdown fences:
{
  "schema": "<schema text>",
  "exercises": {
    "<exercise_id>": { "expectedBehavior": "<text>" }
  }
}`;

async function generateLessonContext() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("ERROR: content/lesson-config.json not found.");
    process.exit(1);
  }

  const config    = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  const exercises = config.exercises || [];

  const needsWork = FORCE
    ? exercises
    : exercises.filter(e => !e.expectedBehavior);

  if (!FORCE && config.schema && needsWork.length === 0) {
    console.log(`Topic: ${config.topic}`);
    console.log("All exercises already have expectedBehavior and schema exists.");
    console.log("Run with --force to regenerate everything.");
    process.exit(0);
  }

  console.log(`Topic: ${config.topic}`);
  if (FORCE) {
    console.log(`Exercises: all ${exercises.length} (--force)`);
  } else {
    const missing = needsWork.map(e => e.id).join(", ");
    console.log(`Schema missing: ${!config.schema}`);
    console.log(`Exercises missing expectedBehavior: ${missing || "none"}`);
  }
  console.log("Calling Claude...");

  // Send only the fields Claude needs — strip internal _comment_ keys and existing generated fields
  const inputForClaude = {
    topic:               config.topic,
    dataset_description: config._comment_DATASET || "",
    exercises: exercises.map(e => ({
      id:             e.id,
      number:         e.number,
      title:          e.title,
      concept:        e.concept        || "",
      scenario:       e.scenario       || "",
      controllerAsk:  e.controllerAsk  || "",
      tutorFocus:     e.tutorFocus     || "",
      expectedValue:  e.expectedValue,
      answerCell:     e.answerCell,
      expected_formula: e._expected_formula || "",
    })),
  };

  const userMessage = `Lesson config:\n${JSON.stringify(inputForClaude, null, 2)}\n\nGenerate the schema and expectedBehavior for each exercise now.`;

  const response = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 4000,
    messages:   [{ role: "user", content: GENERATION_PROMPT + "\n\n" + userMessage }],
  });

  const raw      = response.content[0]?.text?.trim() ?? "";
  const jsonText = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let generated;
  try {
    generated = JSON.parse(jsonText);
  } catch {
    console.error("ERROR: Claude returned invalid JSON. Raw output:");
    console.error(raw);
    process.exit(1);
  }

  if (!generated.schema || !generated.exercises) {
    console.error("ERROR: Generated JSON missing 'schema' or 'exercises'.");
    console.error(JSON.stringify(generated, null, 2));
    process.exit(1);
  }

  // Patch schema (always update if --force or missing)
  if (FORCE || !config.schema) {
    config.schema = generated.schema;
  }

  // Patch each exercise
  let patched = 0;
  const missing = [];
  for (const exercise of config.exercises) {
    const gen = generated.exercises[exercise.id];
    if (gen?.expectedBehavior) {
      if (FORCE || !exercise.expectedBehavior) {
        exercise.expectedBehavior = gen.expectedBehavior;
        patched++;
      }
    } else {
      missing.push(exercise.id);
    }
  }

  if (missing.length > 0) {
    console.warn(`WARNING: No expectedBehavior generated for: ${missing.join(", ")}`);
  }

  // Write back in-place preserving key order as much as possible
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log(`\n✓ Schema updated`);
  console.log(`✓ Patched ${patched} exercise(s)`);
  console.log(`✓ Saved content/lesson-config.json`);
  console.log(`\nSchema preview:\n  ${config.schema.slice(0, 220)}...`);
  console.log(`\nReview lesson-config.json before deploying.`);
}

generateLessonContext().catch(err => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
