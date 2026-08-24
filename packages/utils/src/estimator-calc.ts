// Pure calculation helpers for the public Cost Estimator + Instant Quotation
// flow. IMPORTANT: the package rate/sqft and the cost-breakdown percentages
// are NEVER hardcoded here — they are always passed in, already fetched from
// `estimator_packages` / `estimator_rates` by the caller. Everything in this
// file (optional-works markups, stage-duration weights, payment milestones)
// is reasonable general-contracting judgement, not a statutory/package rate.
import { STANDARD_STAGES } from "./stages";

export interface OptionalWorkDef {
  key: string;
  label: string;
  markupPercent: number;
}

// Flat markup on the base (area x package rate) cost for scope the base
// package rate doesn't cover. Kept small and clearly separate from the
// package rate itself.
export const OPTIONAL_WORKS: OptionalWorkDef[] = [
  { key: "parking", label: "Covered car parking", markupPercent: 1.5 },
  { key: "lift", label: "Passenger lift provision", markupPercent: 4 },
  { key: "basement", label: "Basement / cellar", markupPercent: 6 },
  { key: "compound_wall", label: "Compound wall & gate", markupPercent: 2 },
  { key: "sump", label: "Underground sump", markupPercent: 0.8 },
  { key: "septic_tank", label: "Septic tank", markupPercent: 0.8 },
  { key: "interior_works", label: "Interior works (modular kitchen, wardrobes, false ceiling)", markupPercent: 8 },
];

// Relative durations for the 25 standard construction stages, used only to
// spread an overall estimated project duration proportionally — not an
// absolute schedule.
const STAGE_WEIGHTS: Record<string, number> = {
  "Requirement collection": 0.4,
  "Survey": 0.4,
  "Soil testing": 0.4,
  "Architectural design": 1.5,
  "Structural design": 1.2,
  "Approvals": 1.5,
  "Site mobilisation": 0.4,
  "Excavation": 0.6,
  "Foundation": 1.5,
  "Plinth": 0.8,
  "RCC structure": 3.5,
  "Masonry": 2.2,
  "Internal plastering": 1.2,
  "External plastering": 1.2,
  "Waterproofing": 0.6,
  "Plumbing": 1.0,
  "Electrical": 1.0,
  "Flooring": 1.5,
  "Doors and windows": 1.0,
  "Painting": 1.2,
  "Fixtures": 0.6,
  "Elevation": 1.0,
  "External works": 1.0,
  "Snagging": 0.6,
  "Handover": 0.4,
};

// Official Buildhaus milestone schedule (Pricing Catalog v2): payments are
// linked to site progress and milestone completion — 10% on agreement, then
// six equal 15% stage payments through to handover.
export const PAYMENT_MILESTONES: { milestone: string; percent: number }[] = [
  { milestone: "Advance / Agreement", percent: 10 },
  { milestone: "Foundation Stage", percent: 15 },
  { milestone: "Plinth Level", percent: 15 },
  { milestone: "Slab / Structural Stage", percent: 15 },
  { milestone: "Blockwork & MEP Rough-ins", percent: 15 },
  { milestone: "Finishing Stage", percent: 15 },
  { milestone: "Final Handover Balance", percent: 15 },
];

export const ASSUMPTIONS: string[] = [
  "Package rates are a starting reference, not a final price — the final cost depends on plot size, floor count, design complexity and site conditions, and is confirmed after a detailed BOQ.",
  "Payments are linked to site progress and milestone completion; additional or upgraded work outside the package scope is billed separately upon approval.",
  "Government approval fees, statutory charges and stamp duty are not included in this estimate.",
  "Rates assume normal soil conditions. Rock-cutting, piling or extra foundation work for poor soil will be quoted separately after soil testing.",
  "Material rate movement (steel, cement) beyond 90 days from this estimate may affect final pricing.",
  "The timeline assumes uninterrupted site access, timely client decisions on selections, and normal monsoon conditions.",
  "Optional works shown are markup estimates for indicative scope; final scope and pricing are confirmed after a detailed discussion.",
];

export interface PackageSpecRow {
  item: string;
  detail: string;
}

export interface PackageSpecSection {
  section: string;
  rows: PackageSpecRow[];
}

export interface EstimatorPackageRow {
  id: string;
  key: string;
  label: string;
  rate_per_sqft: number;
  description: string;
  // Catalog metadata (Pricing Catalog v2) — optional so older rows/queries
  // that only select the core columns keep working.
  series?: string;
  best_for?: string[];
  highlights?: string[];
  specs?: PackageSpecSection[];
  inclusions?: string[];
  exclusions?: string[];
}

export interface EstimatorRateRow {
  id: string;
  component: string;
  label: string;
  percent: number;
}

export interface EstimateInput {
  builtup_area_sqft: number;
  floors: number;
  package_key: string;
  optional_works: string[];
  preferred_start_date?: string | null;
}

export interface BreakdownLine { component: string; label: string; percent: number; amount: number }
export interface OptionalWorkLine { key: string; label: string; markupPercent: number; amount: number }
export interface TimelineStage { name: string; months: number; startMonth: number; endMonth: number; startDate: string; endDate: string }
export interface PaymentLine { milestone: string; percent: number; amount: number }

export interface EstimateResult {
  packageKey: string;
  packageLabel: string;
  ratePerSqft: number;
  builtupAreaSqft: number;
  baseCost: number;
  optionalWorks: OptionalWorkLine[];
  totalCost: number;
  costPerSqft: number;
  breakdown: BreakdownLine[];
  totalMonths: number;
  timeline: TimelineStage[];
  paymentSchedule: PaymentLine[];
  inclusions: string[];
  exclusions: string[];
  assumptions: string[];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setDate(1); // avoid month-length overflow quirks
  d.setMonth(d.getMonth() + Math.round(months));
  return d.toISOString().slice(0, 10);
}

export function buildEstimate(
  input: EstimateInput,
  pkg: EstimatorPackageRow,
  rates: EstimatorRateRow[]
): EstimateResult {
  const area = Math.max(0, Number(input.builtup_area_sqft) || 0);
  const floors = Math.max(1, Number(input.floors) || 1);
  const ratePerSqft = Number(pkg.rate_per_sqft) || 0;

  const baseCost = Math.round(area * ratePerSqft);

  const selected = new Set(input.optional_works ?? []);
  const optionalWorks: OptionalWorkLine[] = OPTIONAL_WORKS
    .filter((w) => selected.has(w.key))
    .map((w) => ({
      key: w.key,
      label: w.label,
      markupPercent: w.markupPercent,
      amount: Math.round((baseCost * w.markupPercent) / 100),
    }));

  const totalCost = baseCost + optionalWorks.reduce((s, w) => s + w.amount, 0);
  const costPerSqft = area > 0 ? Math.round(totalCost / area) : 0;

  const breakdown: BreakdownLine[] = rates.map((r) => ({
    component: r.component,
    label: r.label,
    percent: r.percent,
    amount: Math.round((totalCost * r.percent) / 100),
  }));

  const totalMonths = Math.round(clamp(area / 1000 + floors, 6, 24));

  const totalWeight = STANDARD_STAGES.reduce((s, name) => s + (STAGE_WEIGHTS[name] ?? 1), 0);
  const startDate = input.preferred_start_date && !isNaN(Date.parse(input.preferred_start_date))
    ? input.preferred_start_date
    : new Date().toISOString().slice(0, 10);

  let cursor = 0;
  const timeline: TimelineStage[] = STANDARD_STAGES.map((name) => {
    const weight = STAGE_WEIGHTS[name] ?? 1;
    const months = Math.round(((weight / totalWeight) * totalMonths) * 10) / 10;
    const startMonth = cursor;
    const endMonth = cursor + months;
    cursor = endMonth;
    return {
      name,
      months,
      startMonth: Math.round(startMonth * 10) / 10,
      endMonth: Math.round(endMonth * 10) / 10,
      startDate: addMonths(startDate, startMonth),
      endDate: addMonths(startDate, endMonth),
    };
  });

  const paymentSchedule: PaymentLine[] = PAYMENT_MILESTONES.map((m) => ({
    milestone: m.milestone,
    percent: m.percent,
    amount: Math.round((totalCost * m.percent) / 100),
  }));

  return {
    packageKey: pkg.key,
    packageLabel: pkg.label,
    ratePerSqft,
    builtupAreaSqft: area,
    baseCost,
    optionalWorks,
    totalCost,
    costPerSqft,
    breakdown,
    totalMonths,
    timeline,
    paymentSchedule,
    inclusions: pkg.inclusions ?? [],
    exclusions: pkg.exclusions ?? [],
    assumptions: ASSUMPTIONS,
  };
}
