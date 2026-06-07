/**
 * generate-tutor-context.js
 *
 * OFFLINE pipeline step — run once when a new scenario is created.
 * Reads scenario_spec.json, calls Claude, writes tutor-context.json.
 *
 * Usage:
 *   node scripts/generate-tutor-context.js <scenario-id>
 *
 * Example:
 *   node scripts/generate-tutor-context.js budget-vs-actuals-001
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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GENERATION_PROMPT = `You are building tutor metadata for an Excel learning app.
Given a scenario specification (sheet layouts, column descriptions, task definitions, sample expected values),
generate two pieces of content that will be injected into AI tutor prompts at runtime.

GENERATE:

1. "schema" (shared across all tasks in this scenario):
   - 4-8 sentences describing what each relevant column contains, data formats,
     and critical characteristics that affect formula behavior.
   - MUST include non-obvious function behaviors, e.g.:
     * "SUMIFS returns 0 — not an error — when no rows match"
     * "Revenue amounts in Actuals are negative; Budget stores them as positive"
     * "TRIM() is required because one DeptMap row has a trailing space"
   - Written so Claude can verify whether a learner's formula references the
     correct columns and returns the correct types.

2. "tasks" — for each task, "expectedBehavior":
   - 2-5 sentences describing EXACTLY what a correct formula must return.
   - Include: return type (number vs text), edge case outputs visible in
     sample_expected (e.g. "Not Budgeted" for missing rows, "N/A" for
     division errors), and any formula pattern constraints.
   - If a function returns 0 on no-match and text is required instead,
     say so explicitly — this is the most common source of tutor errors.

Return ONLY valid JSON, no markdown fences:
{
  "scenario_id": "<id>",
  "generated_at": "<ISO timestamp>",
  "schema": "<schema text>",
  "tasks": {
    "<task_id>": { "expectedBehavior": "<text>" }
  }
}`;

async function generateTutorContext(scenarioId) {
  const specPath = path.join(
    process.cwd(),
    "content/scenarios",
    scenarioId,
    "scenario_spec.json"
  );

  if (!fs.existsSync(specPath)) {
    console.error(`ERROR: scenario_spec.json not found at ${specPath}`);
    console.error(`Create it first — see content/scenarios/budget-vs-actuals-001/scenario_spec.json as a template.`);
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
  console.log(`Generating tutor context for: ${spec.title || scenarioId}`);
  console.log(`Tasks: ${spec.tasks.map(t => t.id).join(", ")}`);
  console.log("Calling Claude...");

  const userMessage = `Scenario specification:\n${JSON.stringify(spec, null, 2)}\n\nGenerate the schema and expectedBehavior for each task now.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [
      { role: "user", content: GENERATION_PROMPT + "\n\n" + userMessage }
    ],
  });

  const raw = response.content[0]?.text?.trim() ?? "";
  const jsonText = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let context;
  try {
    context = JSON.parse(jsonText);
  } catch (err) {
    console.error("ERROR: Claude returned invalid JSON. Raw output:");
    console.error(raw);
    process.exit(1);
  }

  // Validate structure
  if (!context.schema || !context.tasks) {
    console.error("ERROR: Generated JSON missing 'schema' or 'tasks' fields.");
    console.error(JSON.stringify(context, null, 2));
    process.exit(1);
  }

  const missingTasks = spec.tasks
    .map(t => t.id)
    .filter(id => !context.tasks[id]);

  if (missingTasks.length > 0) {
    console.warn(`WARNING: Missing expectedBehavior for tasks: ${missingTasks.join(", ")}`);
  }

  // Write output
  context.scenario_id  = scenarioId;
  context.generated_at = new Date().toISOString();

  const outPath = path.join(
    process.cwd(),
    "content/scenarios",
    scenarioId,
    "tutor-context.json"
  );
  fs.writeFileSync(outPath, JSON.stringify(context, null, 2));

  console.log(`\n✓ Written to ${outPath}`);
  console.log(`\nSchema preview:\n  ${context.schema.slice(0, 200)}...`);
  console.log(`\nTasks generated: ${Object.keys(context.tasks).join(", ")}`);
  console.log(`\nReview the file before deploying — especially 'expectedBehavior' for edge-case tasks.`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const scenarioId = process.argv[2];
if (!scenarioId) {
  console.log("Usage: node scripts/generate-tutor-context.js <scenario-id>");
  console.log("Example: node scripts/generate-tutor-context.js budget-vs-actuals-001");
  process.exit(1);
}

generateTutorContext(scenarioId).catch(err => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
