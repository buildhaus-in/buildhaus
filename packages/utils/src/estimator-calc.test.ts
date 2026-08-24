import { describe, it, expect } from "vitest";
import {
  buildEstimate,
  OPTIONAL_WORKS,
  PAYMENT_MILESTONES,
  type EstimatorPackageRow,
  type EstimatorRateRow,
  type EstimateInput,
} from "./estimator-calc";
import { STANDARD_STAGES } from "./stages";

const pkg: EstimatorPackageRow = {
  id: "pkg-basic",
  key: "basic",
  label: "Basic",
  rate_per_sqft: 2000,
  description: "Cost-effective specification with dependable structural quality.",
  series: "Value Series",
  inclusions: ["Structural construction"],
  exclusions: ["Land cost"],
};

const premiumPkg: EstimatorPackageRow = {
  id: "pkg-premium",
  key: "premium",
  label: "Premium",
  rate_per_sqft: 2400,
  description: "Move-in ready specification for end-use buyers.",
  series: "Signature Series",
  inclusions: ["Structural construction"],
  exclusions: ["Land cost"],
};

// Percents sum to exactly 100 so breakdown-sum-equals-totalCost assertions
// aren't confounded by the fixture itself being off.
const rates: EstimatorRateRow[] = [
  { id: "r1", component: "design_structural", label: "Design & structural", percent: 5 },
  { id: "r2", component: "rcc_structure", label: "RCC structure", percent: 26 },
  { id: "r3", component: "finishing", label: "Finishing & everything else", percent: 69 },
];

function input(overrides: Partial<EstimateInput> = {}): EstimateInput {
  return {
    builtup_area_sqft: 2000,
    floors: 2,
    package_key: "basic",
    optional_works: [],
    ...overrides,
  };
}

describe("buildEstimate — cost math", () => {
  it("computes base cost as area x rate/sqft, with no optional works added", () => {
    const result = buildEstimate(input(), pkg, rates);
    expect(result.baseCost).toBe(2000 * 2000);
    expect(result.totalCost).toBe(result.baseCost);
  });

  it("adds optional-work markups on top of the base cost", () => {
    const result = buildEstimate(input({ optional_works: ["parking", "lift"] }), pkg, rates);
    const parkingAmt = Math.round((result.baseCost * 1.5) / 100);
    const liftAmt = Math.round((result.baseCost * 4) / 100);
    expect(result.optionalWorks).toHaveLength(2);
    expect(result.totalCost).toBe(result.baseCost + parkingAmt + liftAmt);
  });

  it("ignores unknown optional-work keys", () => {
    const result = buildEstimate(input({ optional_works: ["not_a_real_key"] }), pkg, rates);
    expect(result.optionalWorks).toHaveLength(0);
    expect(result.totalCost).toBe(result.baseCost);
  });
});

describe("buildEstimate — percentage breakdown", () => {
  it("breakdown line amounts sum to totalCost, within rounding tolerance", () => {
    const result = buildEstimate(input({ optional_works: ["parking"] }), pkg, rates);
    const sum = result.breakdown.reduce((s, b) => s + b.amount, 0);
    // Each of the `rates.length` lines can be off by at most ~0.5 due to
    // independent rounding, so bound the tolerance by the line count.
    expect(Math.abs(sum - result.totalCost)).toBeLessThanOrEqual(rates.length);
  });

  it("breakdown carries the same percent split as the input rates", () => {
    const result = buildEstimate(input(), pkg, rates);
    expect(result.breakdown.map((b) => b.percent)).toEqual(rates.map((r) => r.percent));
    expect(result.breakdown.reduce((s, b) => s + b.percent, 0)).toBe(100);
  });
});

describe("buildEstimate — payment schedule", () => {
  it("PAYMENT_MILESTONES percentages sum to exactly 100", () => {
    const totalPercent = PAYMENT_MILESTONES.reduce((s, m) => s + m.percent, 0);
    expect(totalPercent).toBe(100);
  });

  it("uses the official 7-milestone schedule (10% advance + six 15% stages)", () => {
    expect(PAYMENT_MILESTONES.map((m) => m.milestone)).toEqual([
      "Advance / Agreement",
      "Foundation Stage",
      "Plinth Level",
      "Slab / Structural Stage",
      "Blockwork & MEP Rough-ins",
      "Finishing Stage",
      "Final Handover Balance",
    ]);
    expect(PAYMENT_MILESTONES.map((m) => m.percent)).toEqual([10, 15, 15, 15, 15, 15, 15]);
  });

  it("payment schedule has one line per milestone and sums close to totalCost", () => {
    const result = buildEstimate(input(), pkg, rates);
    expect(result.paymentSchedule).toHaveLength(PAYMENT_MILESTONES.length);
    const sum = result.paymentSchedule.reduce((s, p) => s + p.amount, 0);
    expect(Math.abs(sum - result.totalCost)).toBeLessThanOrEqual(PAYMENT_MILESTONES.length);
  });

  it("matches the catalog's worked example: 1,200 sqft x Premium ₹2,400", () => {
    // Pricing Catalog v2 example: total ₹28,80,000; advance ₹2,88,000; each
    // 15% stage ₹4,32,000.
    const result = buildEstimate(
      input({ builtup_area_sqft: 1200, package_key: "premium" }),
      premiumPkg,
      rates
    );
    expect(result.baseCost).toBe(2_880_000);
    expect(result.totalCost).toBe(2_880_000);
    expect(result.paymentSchedule[0]).toMatchObject({ milestone: "Advance / Agreement", percent: 10, amount: 288_000 });
    for (const line of result.paymentSchedule.slice(1)) {
      expect(line.percent).toBe(15);
      expect(line.amount).toBe(432_000);
    }
  });
});

describe("buildEstimate — timeline", () => {
  it("has exactly one timeline stage per STANDARD_STAGES entry, in order", () => {
    const result = buildEstimate(input(), pkg, rates);
    expect(result.timeline).toHaveLength(STANDARD_STAGES.length);
    expect(result.timeline.map((t) => t.name)).toEqual(STANDARD_STAGES);
  });

  it("clamps total duration between 6 and 24 months", () => {
    const short = buildEstimate(input({ builtup_area_sqft: 10, floors: 1 }), pkg, rates);
    expect(short.totalMonths).toBeGreaterThanOrEqual(6);
    const long = buildEstimate(input({ builtup_area_sqft: 1_000_000, floors: 20 }), pkg, rates);
    expect(long.totalMonths).toBeLessThanOrEqual(24);
  });

  it("stage windows are contiguous and start from the given (or default) start date", () => {
    const result = buildEstimate(input({ preferred_start_date: "2026-01-01" }), pkg, rates);
    expect(result.timeline[0].startDate).toBe("2026-01-01");
    for (let i = 1; i < result.timeline.length; i++) {
      expect(result.timeline[i].startDate).toBe(result.timeline[i - 1].endDate);
    }
  });
});

describe("buildEstimate — edge cases", () => {
  it("handles zero optional works selected", () => {
    const result = buildEstimate(input({ optional_works: [] }), pkg, rates);
    expect(result.optionalWorks).toHaveLength(0);
    expect(result.totalCost).toBe(result.baseCost);
  });

  it("handles every optional work selected at once", () => {
    const allKeys = OPTIONAL_WORKS.map((w) => w.key);
    const result = buildEstimate(input({ optional_works: allKeys }), pkg, rates);
    expect(result.optionalWorks).toHaveLength(OPTIONAL_WORKS.length);
    const expectedExtra = OPTIONAL_WORKS.reduce(
      (s, w) => s + Math.round((result.baseCost * w.markupPercent) / 100),
      0
    );
    expect(result.totalCost).toBe(result.baseCost + expectedExtra);
  });

  it("handles a tiny built-up area (1 sqft) without breaking cost-per-sqft", () => {
    const result = buildEstimate(input({ builtup_area_sqft: 1 }), pkg, rates);
    expect(result.baseCost).toBe(2000);
    expect(result.costPerSqft).toBe(result.totalCost);
  });

  it("handles a huge built-up area (1,000,000 sqft) without NaN/Infinity", () => {
    const result = buildEstimate(input({ builtup_area_sqft: 1_000_000, floors: 10 }), pkg, rates);
    expect(Number.isFinite(result.totalCost)).toBe(true);
    expect(Number.isFinite(result.costPerSqft)).toBe(true);
    expect(result.totalMonths).toBeLessThanOrEqual(24);
  });

  it("clamps a negative/garbage area down to zero rather than going negative", () => {
    const result = buildEstimate(input({ builtup_area_sqft: -500 }), pkg, rates);
    expect(result.baseCost).toBe(0);
    expect(result.costPerSqft).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("floors below 1 are clamped up to 1", () => {
    const result = buildEstimate(input({ floors: 0 }), pkg, rates);
    expect(result.totalMonths).toBeGreaterThanOrEqual(6);
  });
});
