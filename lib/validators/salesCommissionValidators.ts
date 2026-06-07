import { cell, type ExpectedCell } from "./rangeValidator";

import DEALS_RAW        from "@/content/scenarios/real-sales-commission-001/deals.json";
import REP_MASTER_RAW   from "@/content/scenarios/real-sales-commission-001/rep_master.json";
import RATES_RAW        from "@/content/scenarios/real-sales-commission-001/commission_rates.json";

interface Deal {
  deal_id: string; rep_id: string; deal_type: string;
  amount: number; split_pct: number; status: string;
}
interface Rep {
  rep_id: string; rep_name: string; plan_type: string;
  annual_quota: number; proration_factor: number;
}
interface RateRow {
  tier_min: number | null; standard_rate: number; accelerator_rate: number; deal_type: string;
}

const DEALS = DEALS_RAW as any[] as Deal[];
const REPS  = REP_MASTER_RAW as any[] as Rep[];
const RATES = RATES_RAW as any[] as RateRow[];

const VALID_TYPES = new Set(["New Business", "Renewal", "Expansion"]);

function isIncluded(d: Deal) {
  return d.status !== "Cancelled" && d.amount !== 0 && VALID_TYPES.has(d.deal_type);
}

function repRevenue(repId: string, dealType: string): number {
  return DEALS.filter(d => d.rep_id === repId && d.deal_type === dealType && isIncluded(d))
    .reduce((sum, d) => sum + d.amount * d.split_pct, 0);
}

const NB_TIERS = RATES.filter(r => r.deal_type === "New Business" && r.tier_min !== null)
  .sort((a, b) => (a.tier_min as number) - (b.tier_min as number));

function getNBRate(planType: string, attainment: number): number {
  let rate = planType === "Accelerator" ? NB_TIERS[0].accelerator_rate : NB_TIERS[0].standard_rate;
  for (const tier of NB_TIERS) {
    if (attainment >= (tier.tier_min as number)) {
      rate = planType === "Accelerator" ? tier.accelerator_rate : tier.standard_rate;
    }
  }
  return rate;
}

const FLAT_RATES: Record<string, { standard: number; accelerator: number }> = Object.fromEntries(
  RATES.filter(r => r.tier_min === null).map(r => [r.deal_type, { standard: r.standard_rate, accelerator: r.accelerator_rate }])
);
const COMMISSION_CAP = 25000;
const CLAWBACK: Record<string, number> = { "R003": -1200 };

// T01 — AuditFlag (Deals!H2:H48, 47 rows)
export const EXP_T01: ExpectedCell[] = DEALS.map(d =>
  cell.text(isIncluded(d) ? "Include" : "Exclude")
);

// T02 — RepName XLOOKUP+TRIM (Commission_Calculator!B2:B11)
export const EXP_T02: ExpectedCell[] = REPS.map(r => cell.text(r.rep_name.trim()));

// T03 — PlanType (Commission_Calculator!C2:C11)
export const EXP_T03: ExpectedCell[] = REPS.map(r => cell.text(r.plan_type));

// T04 — AdjustedQuota = annual_quota/12 * proration_factor (D2:D11)
export const EXP_T04: ExpectedCell[] = REPS.map(r =>
  cell.num((r.annual_quota / 12) * r.proration_factor, 1)
);

// T05 — NB Revenue SUMPRODUCT (E2:E11)
export const EXP_T05: ExpectedCell[] = REPS.map(r =>
  cell.num(repRevenue(r.rep_id, "New Business"), 1)
);

// T06 — Renewal Revenue (F2:F11)
export const EXP_T06: ExpectedCell[] = REPS.map(r =>
  cell.num(repRevenue(r.rep_id, "Renewal"), 1)
);

// T07 — Expansion Revenue (G2:G11)
export const EXP_T07: ExpectedCell[] = REPS.map(r =>
  cell.num(repRevenue(r.rep_id, "Expansion"), 1)
);

// T08 — DealCount COUNTIFS (H2:H11)
export const EXP_T08: ExpectedCell[] = REPS.map(r =>
  cell.num(DEALS.filter(d => d.rep_id === r.rep_id && isIncluded(d)).length, 0)
);

// T09 — QuotaAttainment = NB / AdjustedQuota (I2:I11)
export const EXP_T09: ExpectedCell[] = REPS.map(r => {
  const nb       = repRevenue(r.rep_id, "New Business");
  const adjQuota = (r.annual_quota / 12) * r.proration_factor;
  return cell.num(nb / adjQuota, 0.005);
});

// T10 — CommissionRate VLOOKUP approx (J2:J11)
export const EXP_T10: ExpectedCell[] = REPS.map(r => {
  const nb       = repRevenue(r.rep_id, "New Business");
  const adjQuota = (r.annual_quota / 12) * r.proration_factor;
  return cell.num(getNBRate(r.plan_type, nb / adjQuota), 0.001);
});

// T11 — BaseCommission (K2:K11)
export const EXP_T11: ExpectedCell[] = REPS.map(r => {
  const nb         = repRevenue(r.rep_id, "New Business");
  const renewal    = repRevenue(r.rep_id, "Renewal");
  const expansion  = repRevenue(r.rep_id, "Expansion");
  const adjQuota   = (r.annual_quota / 12) * r.proration_factor;
  const nbRate     = getNBRate(r.plan_type, nb / adjQuota);
  const renRate    = r.plan_type === "Accelerator" ? FLAT_RATES["Renewal"].accelerator : FLAT_RATES["Renewal"].standard;
  const expRate    = r.plan_type === "Accelerator" ? FLAT_RATES["Expansion"].accelerator : FLAT_RATES["Expansion"].standard;
  return cell.num(nb * nbRate + renewal * renRate + expansion * expRate, 1);
});

// T12 — FinalCommission = MIN(K+L, cap) (M2:M11)
export const EXP_T12: ExpectedCell[] = REPS.map(r => {
  const nb         = repRevenue(r.rep_id, "New Business");
  const renewal    = repRevenue(r.rep_id, "Renewal");
  const expansion  = repRevenue(r.rep_id, "Expansion");
  const adjQuota   = (r.annual_quota / 12) * r.proration_factor;
  const nbRate     = getNBRate(r.plan_type, nb / adjQuota);
  const renRate    = r.plan_type === "Accelerator" ? FLAT_RATES["Renewal"].accelerator : FLAT_RATES["Renewal"].standard;
  const expRate    = r.plan_type === "Accelerator" ? FLAT_RATES["Expansion"].accelerator : FLAT_RATES["Expansion"].standard;
  const base       = nb * nbRate + renewal * renRate + expansion * expRate;
  const clawback   = CLAWBACK[r.rep_id] ?? 0;
  return cell.num(Math.min(base + clawback, COMMISSION_CAP), 1);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const SALES_COMMISSION_VALIDATORS: Record<string, {
  sheet: string; answerRange: string; expected: ExpectedCell[]; xpReward: number; correctThreshold?: number;
}> = {
  T01: { sheet: "Deals",                  answerRange: "H2:H48", expected: EXP_T01, xpReward: 75 },
  T02: { sheet: "Commission_Calculator",  answerRange: "B2:B11", expected: EXP_T02, xpReward: 50 },
  T03: { sheet: "Commission_Calculator",  answerRange: "C2:C11", expected: EXP_T03, xpReward: 50 },
  T04: { sheet: "Commission_Calculator",  answerRange: "D2:D11", expected: EXP_T04, xpReward: 75 },
  T05: { sheet: "Commission_Calculator",  answerRange: "E2:E11", expected: EXP_T05, xpReward: 100 },
  T06: { sheet: "Commission_Calculator",  answerRange: "F2:F11", expected: EXP_T06, xpReward: 75 },
  T07: { sheet: "Commission_Calculator",  answerRange: "G2:G11", expected: EXP_T07, xpReward: 75 },
  T08: { sheet: "Commission_Calculator",  answerRange: "H2:H11", expected: EXP_T08, xpReward: 50 },
  T09: { sheet: "Commission_Calculator",  answerRange: "I2:I11", expected: EXP_T09, xpReward: 75, correctThreshold: 0.9 },
  T10: { sheet: "Commission_Calculator",  answerRange: "J2:J11", expected: EXP_T10, xpReward: 100 },
  T11: { sheet: "Commission_Calculator",  answerRange: "K2:K11", expected: EXP_T11, xpReward: 100 },
  T12: { sheet: "Commission_Calculator",  answerRange: "M2:M11", expected: EXP_T12, xpReward: 100, correctThreshold: 0.9 },
};
