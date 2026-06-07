// Generic dataset used in ALL examples — deliberately different from any actual task data.
// Orders sheet: Date(A) | Customer(B) | Category(C) | Country(D) | Revenue(E) | Units(F) | Status(G)

export type FormulaArg = { name: string; desc: string };

export type FormulaTemplate = {
  name:    string;
  oneLiner: string;
  syntax:  string;
  args:    FormulaArg[];
  example: string;
  result:  string;
  note?:   string;
};

export const FORMULA_TEMPLATES: Record<string, FormulaTemplate> = {

  SUMIFS: {
    name:     "SUMIFS",
    oneLiner: "Add up numbers that match one or more conditions",
    syntax:   "=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2, ...])",
    args: [
      { name: "sum_range",              desc: "The column of numbers to add — e.g. E:E (Revenue)" },
      { name: "criteria_range1",        desc: "The column to filter by — e.g. C:C (Category)" },
      { name: "criteria1",              desc: "The value that must match — e.g. \"Electronics\"" },
      { name: "criteria_range2, criteria2", desc: "(Optional, repeatable) Additional filter — ALL pairs must match on the same row" },
    ],
    example: '=SUMIFS(E2:E200, C2:C200, "Electronics", D2:D200, "France")',
    result:  "Totals Revenue only for rows where Category = Electronics AND Country = France.",
    note:    "Returns 0 — not an error — when no row matches. Date ranges need the same column twice: ...,A2:A200,\">=2024-01-01\",A2:A200,\"<=2024-03-31\"",
  },

  SUMPRODUCT: {
    name:     "SUMPRODUCT",
    oneLiner: "Multiply arrays element-by-element then sum — handles split amounts and complex filters",
    syntax:   "=SUMPRODUCT((filter1) * (filter2) * values_column)",
    args: [
      { name: "(filter1)",        desc: "Boolean condition per row — e.g. (B2:B200=B2) returns TRUE/FALSE for each row" },
      { name: "(filter2)",        desc: "Another boolean filter — e.g. (G2:G200=\"Active\")" },
      { name: "values_column",    desc: "The numbers (or expression) to multiply in — e.g. E2:E200 * F2:F200 for Revenue × Units" },
    ],
    example: '=SUMPRODUCT((B2:B200="Acme Corp") * (C2:C200="Software") * (G2:G200="Active") * E2:E200)',
    result:  "Sums Revenue where Customer = Acme Corp AND Category = Software AND Status = Active.",
    note:    "Unlike SUMIFS, SUMPRODUCT can multiply two columns before summing — use it when you need Amount × Qty or Amount × SplitFraction. Boolean arrays (TRUE/FALSE) automatically become 1/0 when multiplied.",
  },

  XLOOKUP: {
    name:     "XLOOKUP",
    oneLiner: "Find a value in one column and return a value from another column",
    syntax:   "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])",
    args: [
      { name: "lookup_value",  desc: "The value to search for — e.g. B2 (Customer ID)" },
      { name: "lookup_array",  desc: "The column to search in — e.g. Customers!A:A" },
      { name: "return_array",  desc: "The column to return — e.g. Customers!B:B (Customer Name)" },
      { name: "if_not_found",  desc: "(Optional) What to show when nothing matches — e.g. \"Unknown\"" },
    ],
    example: '=XLOOKUP(B2, Customers!A:A, Customers!C:C, "Not found")',
    result:  "Returns the Country for the Customer ID in B2 from the Customers reference sheet.",
    note:    "XLOOKUP can return from any column — not restricted to columns to the right like VLOOKUP. Wrap with TRIM() when source data may have extra spaces: =TRIM(XLOOKUP(...))",
  },

  VLOOKUP: {
    name:     "VLOOKUP",
    oneLiner: "Look up a value in a sorted table — exact or approximate match",
    syntax:   "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
    args: [
      { name: "lookup_value",  desc: "The value to find — e.g. E2 (attainment % as a decimal like 0.85)" },
      { name: "table_array",   desc: "The lookup table — first column must contain the values to match against" },
      { name: "col_index_num", desc: "Which column of the table to return (1 = first column, 2 = second, …)" },
      { name: "range_lookup",  desc: "TRUE = approximate match on ascending-sorted table; FALSE = exact match only" },
    ],
    example: "=VLOOKUP(E2, RateTable!$A$2:$C$5, 3, TRUE)",
    result:  "Finds the largest rate-tier key ≤ E2 and returns the value from column 3 of RateTable.",
    note:    "Approximate match (TRUE) requires the first column sorted smallest → largest. It returns the last row whose key does not exceed your lookup value — ideal for tiered ranges like commission rates or tax brackets.",
  },

  COUNTIFS: {
    name:     "COUNTIFS",
    oneLiner: "Count rows that match one or more conditions",
    syntax:   "=COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2, ...])",
    args: [
      { name: "criteria_range1", desc: "Column to filter — e.g. D:D (Country)" },
      { name: "criteria1",       desc: "Value that must match — e.g. \"Germany\"" },
      { name: "criteria_range2, criteria2", desc: "(Optional) Extra filter pairs — all must match on the same row" },
    ],
    example: '=COUNTIFS(D2:D200, "Germany", G2:G200, "Active")',
    result:  "Counts rows where Country = Germany AND Status = Active.",
    note:    "Returns 0 on no match, never an error. Use COUNTIF (singular) when you only need one condition.",
  },

  IF: {
    name:     "IF",
    oneLiner: "Return one value when a condition is true, another when it is false",
    syntax:   "=IF(logical_test, value_if_true, value_if_false)",
    args: [
      { name: "logical_test",   desc: "The condition to check — e.g. E2>10000, G2=\"Active\", OR(…), AND(…)" },
      { name: "value_if_true",  desc: "What to return when the condition is TRUE — text, number, or another formula" },
      { name: "value_if_false", desc: "What to return when FALSE — can be another IF() for branching logic" },
    ],
    example: '=IF(E2>=10000, "Large deal", IF(E2>=1000, "Mid deal", "Small deal"))',
    result:  'Returns "Large deal", "Mid deal", or "Small deal" based on Revenue.',
    note:    "Nesting IF inside IF creates multi-branch logic. For two simultaneous conditions use AND() inside logical_test. For either-or use OR().",
  },

  IFERROR: {
    name:     "IFERROR",
    oneLiner: "Trap formula errors and replace them with a safe value",
    syntax:   "=IFERROR(value, value_if_error)",
    args: [
      { name: "value",          desc: "The formula to attempt — e.g. E2/F2 or XLOOKUP(…)" },
      { name: "value_if_error", desc: "What to show when value produces an error — e.g. 0, \"N/A\", or E2" },
    ],
    example: '=IFERROR(E2/F2, "N/A")',
    result:  'Returns Revenue ÷ Units when Units > 0; returns "N/A" when Units is 0 or text (avoids #DIV/0!).',
    note:    "IFERROR cannot catch a SUMIFS returning 0 — 0 is a valid result, not an error. If you need to handle a legitimate zero differently, use IF(SUMIFS(...)=0, 'fallback', SUMIFS(...)) instead.",
  },

  AND: {
    name:     "AND / OR",
    oneLiner: "Combine multiple conditions — AND requires all true; OR requires any true",
    syntax:   "=AND(logical1, logical2, …)  |  =OR(logical1, logical2, …)",
    args: [
      { name: "AND(…)", desc: "TRUE only when every argument is TRUE — use inside IF() for multi-condition tests" },
      { name: "OR(…)",  desc: "TRUE when at least one argument is TRUE — use inside IF() for exclusion or fallback logic" },
    ],
    example: '=IF(AND(E2>=5000, D2="France"), "Priority", "Standard")',
    result:  'Returns "Priority" only when Revenue ≥ 5000 AND Country = France; "Standard" otherwise.',
    note:    "Combine both: =IF(OR(G2=\"Cancelled\", E2=0, AND(C2<>\"A\", C2<>\"B\")), \"Exclude\", \"Include\"). ISNUMBER() is a safe guard when a cell might contain text — ABS(text) would error.",
  },

  MIN: {
    name:     "MIN / MAX",
    oneLiner: "Return the smallest (MIN) or largest (MAX) value from a set",
    syntax:   "=MIN(value1, value2, …)  |  =MAX(value1, value2, …)",
    args: [
      { name: "value1", desc: "First number or formula — e.g. E2 (calculated commission)" },
      { name: "value2", desc: "Second number — e.g. 50000 (a cap or floor)" },
    ],
    example: "=MIN(E2 * 0.15, 25000)",
    result:  "Returns 15% of Revenue, but never more than 25,000 — caps the result at the ceiling.",
    note:    "MIN caps at a ceiling. MAX sets a floor. Combine them: =MAX(0, MIN(E2*0.15, 25000)) ensures the result stays between 0 and 25,000.",
  },

  TRIM: {
    name:     "TRIM",
    oneLiner: "Remove leading, trailing, and extra internal spaces from text",
    syntax:   "=TRIM(text)",
    args: [
      { name: "text", desc: "Any text value or formula that returns text — TRIM collapses multiple spaces to one" },
    ],
    example: '=TRIM(B2)',
    result:  'Turns "  Acme  Corp  " → "Acme Corp" — removes all extra spaces.',
    note:    "Apply TRIM to the value returned by a lookup, not just the key: =TRIM(XLOOKUP(…)). If the source data has trailing spaces, the lookup key itself may also need TRIM to find a match.",
  },

  INDEX: {
    name:     "INDEX / MATCH",
    oneLiner: "Classic two-function lookup — MATCH finds the position, INDEX returns the value",
    syntax:   "=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))",
    args: [
      { name: "return_range",  desc: "The column you want to return a value from — e.g. C:C (Category)" },
      { name: "lookup_value",  desc: "The value to search for — e.g. B2 (Customer ID)" },
      { name: "lookup_range",  desc: "The column to search in — e.g. A:A (ID column)" },
      { name: "0",             desc: "Match type 0 = exact match (almost always use 0)" },
    ],
    example: "=INDEX(C2:C200, MATCH(B2, A2:A200, 0))",
    result:  "Returns the Category for the row where column A matches B2.",
    note:    "MATCH returns a row number; INDEX uses that row number to fetch the value. Advantage over VLOOKUP: return column can be to the LEFT of the lookup column.",
  },

  AVERAGEIFS: {
    name:     "AVERAGEIFS",
    oneLiner: "Average values that match one or more conditions",
    syntax:   "=AVERAGEIFS(average_range, criteria_range1, criteria1, [criteria_range2, criteria2, ...])",
    args: [
      { name: "average_range",  desc: "The column of numbers to average — e.g. E:E (Revenue)" },
      { name: "criteria_range1", desc: "Column to filter — e.g. D:D (Country)" },
      { name: "criteria1",      desc: "Value that must match — e.g. \"UK\"" },
    ],
    example: '=AVERAGEIFS(E2:E200, D2:D200, "UK", G2:G200, "Active")',
    result:  "Average Revenue for active orders from the UK.",
    note:    "Returns a #DIV/0! error when no rows match — wrap with IFERROR if that is possible.",
  },

  ABS: {
    name:     "ABS",
    oneLiner: "Return the absolute (positive) value of a number",
    syntax:   "=ABS(number)",
    args: [
      { name: "number", desc: "Any number or cell — e.g. E2 (which may be negative for returns/credits)" },
    ],
    example: "=ABS(E2)",
    result:  "Returns 5000 whether E2 is 5000 or -5000.",
    note:    "Useful when comparing magnitudes regardless of sign — e.g. ABS(variance) >= threshold. Also needed when ERP systems store revenue as negative numbers.",
  },

  ROUND: {
    name:     "ROUND / ROUNDUP / ROUNDDOWN",
    oneLiner: "Round a number to a specified number of decimal places",
    syntax:   "=ROUND(number, num_digits)",
    args: [
      { name: "number",     desc: "The value to round — e.g. E2/F2 (revenue per unit)" },
      { name: "num_digits", desc: "Decimal places: 2 = cents, 0 = whole number, -3 = round to nearest 1000" },
    ],
    example: "=ROUND(E2/F2, 2)",
    result:  "Revenue ÷ Units, rounded to 2 decimal places.",
    note:    "ROUNDUP always rounds away from zero. ROUNDDOWN always rounds toward zero. ROUND uses standard 'round half up' rules.",
  },

  TEXT: {
    name:     "TEXT",
    oneLiner: "Convert a number or date to a formatted text string",
    syntax:   "=TEXT(value, format_text)",
    args: [
      { name: "value",       desc: "Number or date to format — e.g. A2 (a date), E2 (a revenue number)" },
      { name: "format_text", desc: "Excel format code in quotes — e.g. \"YYYY-MM\", \"$#,##0.00\", \"0.0%\"" },
    ],
    example: '=TEXT(A2, "YYYY-MM")',
    result:  'Converts a date like 2024-08-15 → "2024-08" for month-level grouping.',
    note:    "TEXT returns a text string — you cannot do arithmetic on it afterward. Use it for display or grouping only, not for further calculations.",
  },

  COUNTA: {
    name:     "COUNTA / COUNTBLANK",
    oneLiner: "Count non-empty cells (COUNTA) or empty cells (COUNTBLANK)",
    syntax:   "=COUNTA(range)  |  =COUNTBLANK(range)",
    args: [
      { name: "range", desc: "The cells to count — e.g. B2:B200 (Customer column)" },
    ],
    example: "=COUNTA(B2:B200)",
    result:  "Returns how many cells in B2:B200 contain any value (text, number, or formula result).",
    note:    "COUNT (no A) counts only numeric cells. COUNTA counts everything non-blank including text. COUNTBLANK counts cells that are empty or contain only empty-string formulas.",
  },

  ISNUMBER: {
    name:     "ISNUMBER / ISTEXT / ISBLANK",
    oneLiner: "Test what type of value a cell contains — returns TRUE or FALSE",
    syntax:   "=ISNUMBER(value)  |  =ISTEXT(value)  |  =ISBLANK(value)",
    args: [
      { name: "value", desc: "A cell reference or formula result to test — e.g. E2, VLOOKUP(…)" },
    ],
    example: '=IF(ISNUMBER(E2), E2 * 0.1, "N/A")',
    result:  'Multiplies E2 by 10% when E2 is numeric; returns "N/A" when E2 contains text or is blank.',
    note:    "ISNUMBER is the safest guard before doing arithmetic — if E2 contains text like \"Not Budgeted\", trying E2*0.1 would error without the guard.",
  },

  LEFT: {
    name:     "LEFT / RIGHT / MID",
    oneLiner: "Extract a portion of text from the start, end, or middle of a string",
    syntax:   "=LEFT(text, num_chars)  |  =RIGHT(text, num_chars)  |  =MID(text, start_num, num_chars)",
    args: [
      { name: "text",      desc: "The text string or cell — e.g. A2 (containing \"ORD-2024-001\")" },
      { name: "num_chars", desc: "How many characters to extract" },
      { name: "start_num", desc: "(MID only) Position to start from — 1 = first character" },
    ],
    example: '=LEFT(A2, 3)',
    result:  'Extracts "ORD" from "ORD-2024-001".',
    note:    "Combine with FIND() to locate a delimiter first: =LEFT(A2, FIND(\"-\",A2)-1) extracts everything before the first dash.",
  },

  TODAY: {
    name:     "TODAY / NOW / DATE",
    oneLiner: "Return the current date (TODAY), current date+time (NOW), or build a date from parts (DATE)",
    syntax:   "=TODAY()  |  =NOW()  |  =DATE(year, month, day)",
    args: [
      { name: "TODAY()", desc: "No arguments — returns today's date as a date serial number" },
      { name: "DATE(year, month, day)", desc: "Build a date — e.g. DATE(2024, 10, 1) = October 1, 2024" },
    ],
    example: "=SUMIFS(E2:E200, A2:A200, \">=\"&DATE(2024,10,1), A2:A200, \"<=\"&DATE(2024,10,31))",
    result:  "Totals Revenue for all orders in October 2024.",
    note:    "To use TODAY() as a SUMIFS criterion: \">=\"&TODAY() or \">=\"&(TODAY()-30) for the last 30 days. Dates stored as text (\"2024-10-15\") can be compared with string operators >= and <= without DATE().",
  },

};

// ── Detection: extract formula names from formula strings ─────────────────────

// Maps every Excel function name (and aliases) to a template key
const FUNCTION_TO_TEMPLATE: Record<string, string> = {
  SUMIFS:      "SUMIFS",  SUMIF:       "SUMIFS",
  SUMPRODUCT:  "SUMPRODUCT",
  XLOOKUP:     "XLOOKUP",
  VLOOKUP:     "VLOOKUP",
  HLOOKUP:     "VLOOKUP",
  COUNTIFS:    "COUNTIFS", COUNTIF:    "COUNTIFS",
  IF:          "IF",
  IFS:         "IF",
  IFERROR:     "IFERROR", IFNA:       "IFERROR",
  AND:         "AND",     OR:         "AND",
  MIN:         "MIN",     MAX:        "MIN",
  TRIM:        "TRIM",
  INDEX:       "INDEX",   MATCH:      "INDEX",
  AVERAGEIFS:  "AVERAGEIFS", AVERAGEIF: "AVERAGEIFS", AVERAGE: "AVERAGEIFS",
  ABS:         "ABS",
  ROUND:       "ROUND",   ROUNDUP:    "ROUND",  ROUNDDOWN: "ROUND",
  TEXT:        "TEXT",
  COUNTA:      "COUNTA",  COUNT:      "COUNTA", COUNTBLANK: "COUNTA",
  ISNUMBER:    "ISNUMBER", ISTEXT:    "ISNUMBER", ISBLANK:  "ISNUMBER",
  LEFT:        "LEFT",    RIGHT:      "LEFT",   MID:       "LEFT",
  TODAY:       "TODAY",   NOW:        "TODAY",  DATE:      "TODAY",
  DATEVALUE:   "TODAY",   YEAR:       "TODAY",  MONTH:     "TODAY", DAY: "TODAY",
};

/**
 * Extracts Excel function names from formula strings and maps them to template keys.
 * Scans for patterns like FUNCNAME( in the provided text strings.
 * Returns template keys in order of first appearance, deduplicated.
 */
export function detectFormulas(texts: string[]): string[] {
  const combined = texts.filter(Boolean).join(" ").toUpperCase();
  // Match function calls: word characters followed by an opening parenthesis
  const regex = /\b([A-Z][A-Z0-9]*)\s*\(/g;
  const result: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(combined)) !== null) {
    const templateKey = FUNCTION_TO_TEMPLATE[m[1]];
    if (templateKey && !seen.has(templateKey)) {
      seen.add(templateKey);
      result.push(templateKey);
    }
  }
  return result;
}

/**
 * Formats a template as a plain-text chat message.
 * Uses generic examples — never reveals the actual task answer.
 */
export function formatTemplate(key: string): string {
  const t = FORMULA_TEMPLATES[key];
  if (!t) return `No guide found for "${key}".`;

  const lines: string[] = [
    `${t.name} — ${t.oneLiner}`,
    "",
    `Syntax`,
    `  ${t.syntax}`,
    "",
    `Arguments`,
    ...t.args.map(a => `  ${a.name}\n    → ${a.desc}`),
    "",
    `Example  (generic dataset — not your task data)`,
    `  ${t.example}`,
    `  Result: ${t.result}`,
  ];
  if (t.note) {
    lines.push("", `Keep in mind`, `  ${t.note}`);
  }
  return lines.join("\n");
}
