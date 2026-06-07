/**
 * formulaAnalyzer.ts — detects systematic relative-reference drift in formula arrays.
 *
 * Drift happens when a formula is copied down without locking the lookup/sum
 * range with $ signs. Example:
 *   G2: =XLOOKUP(D2,'Vendor Map'!A2:A21,'Vendor Map'!B2:B21,"UNKNOWN")
 *   G3: =XLOOKUP(D3,'Vendor Map'!A3:A22,'Vendor Map'!B3:B22,"UNKNOWN") ← shifted!
 *   G4: =XLOOKUP(D4,'Vendor Map'!A4:A23,'Vendor Map'!B4:B23,"UNKNOWN") ← shifted!
 *
 * The fix is $A$2:$A$21 (or full-column A:A).
 *
 * Detection relies on the regex NOT matching absolute references:
 *   - $A$2:$A$21  → "$" between col letter and row digit breaks [A-Z]+\d+ → no match ✓
 *   - $A2:$A21    → "$" before second [A-Z]+ group → no match ✓
 *   - A$2:A$21    → "$" before \d+ on each side → no match ✓
 *   - A:A         → no row digits at all → no match ✓  (full-column refs are safe)
 */

// Matches ONLY fully-relative range references — no $ anywhere.
const RELATIVE_RANGE = /[A-Z]+(\d+):[A-Z]+(\d+)/g;

function extractRelativeRanges(formula: string): Array<{ s: number; e: number }> {
  if (!formula.startsWith("=")) return [];
  const out: Array<{ s: number; e: number }> = [];
  RELATIVE_RANGE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RELATIVE_RANGE.exec(formula)) !== null) {
    out.push({ s: parseInt(m[1], 10), e: parseInt(m[2], 10) });
  }
  return out;
}

/**
 * Returns true when 2+ consecutive formula pairs show range references that
 * each shift by exactly +1 row — the hallmark of a missing $ lock.
 *
 * @param formulas  Flat array of formula strings from readRange(), one per cell.
 */
export function detectRelativeRefDrift(formulas: string[]): boolean {
  if (formulas.length < 3) return false;

  let driftCount = 0;
  const limit = Math.min(formulas.length - 1, 8); // check first 8 pairs at most

  for (let i = 1; i <= limit; i++) {
    const prev = extractRelativeRanges(formulas[i - 1] ?? "");
    const curr = extractRelativeRanges(formulas[i]     ?? "");

    // Need at least one range in both rows, and the same number of ranges
    if (prev.length === 0 || prev.length !== curr.length) continue;

    // Flag if ANY range reference in this pair drifted by exactly +1
    const hasDrift = prev.some((p, ri) => {
      const c = curr[ri];
      return c !== undefined && c.s === p.s + 1 && c.e === p.e + 1;
    });

    if (hasDrift) driftCount++;
  }

  return driftCount >= 2;
}
