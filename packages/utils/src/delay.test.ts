import { describe, it, expect } from "vitest";
import { assessDelay, riskTone } from "./delay";

const DAY = 86400000;
function isoPlusDays(base: string, days: number): string {
  return new Date(new Date(base).getTime() + days * DAY).toISOString();
}

// A fixed 100-day project window: start -> start+100d. Using a round total
// makes "planned progress" land on tidy percentages, so the risk thresholds
// in delay.ts (behind >= 3 / 8 / 15 / 25) can be hit exactly.
const START = "2026-01-01T00:00:00.000Z";
const END = isoPlusDays(START, 100);
const NOW_HALFWAY = new Date(isoPlusDays(START, 50)); // plannedProgress = 50%

describe("assessDelay — risk levels", () => {
  const base = { startDate: START, plannedCompletion: END, now: NOW_HALFWAY };

  it("On Track — at or ahead of planned progress", () => {
    expect(assessDelay({ ...base, actualProgress: 50 }).risk).toBe("On Track");
    expect(assessDelay({ ...base, actualProgress: 65 }).risk).toBe("On Track");
  });

  it("Attention Required — 3-7% behind plan", () => {
    expect(assessDelay({ ...base, actualProgress: 45 }).risk).toBe("Attention Required"); // 5% behind
  });

  it("At Risk — 8-14% behind plan", () => {
    expect(assessDelay({ ...base, actualProgress: 40 }).risk).toBe("At Risk"); // 10% behind
  });

  it("Delayed — 15-24% behind plan", () => {
    expect(assessDelay({ ...base, actualProgress: 30 }).risk).toBe("Delayed"); // 20% behind
  });

  it("Critical — 25%+ behind plan", () => {
    expect(assessDelay({ ...base, actualProgress: 20 }).risk).toBe("Critical"); // 30% behind
  });

  it("Critical — past the planned completion date and still incomplete, regardless of variance", () => {
    const afterEnd = new Date(isoPlusDays(START, 120));
    const result = assessDelay({ startDate: START, plannedCompletion: END, actualProgress: 90, now: afterEnd });
    expect(result.risk).toBe("Critical");
  });

  it("not Critical past the deadline if actual progress reached 100%", () => {
    const afterEnd = new Date(isoPlusDays(START, 120));
    const result = assessDelay({ startDate: START, plannedCompletion: END, actualProgress: 100, now: afterEnd });
    expect(result.risk).toBe("On Track");
  });

  it("boundary: exactly 3% behind trips Attention Required, 2% behind stays On Track", () => {
    // totalDays=100 so 1 percentage point of "behind" == 1 percentage point
    // of actualProgress below the 50% planned mark.
    expect(assessDelay({ ...base, actualProgress: 47 }).risk).toBe("Attention Required"); // 3% behind
    expect(assessDelay({ ...base, actualProgress: 48 }).risk).toBe("On Track"); // 2% behind
  });
});

describe("assessDelay — supporting fields", () => {
  it("computes plannedProgress, elapsedDays and totalDays from the schedule", () => {
    const result = assessDelay({ startDate: START, plannedCompletion: END, actualProgress: 50, now: NOW_HALFWAY });
    expect(result.totalDays).toBe(100);
    expect(result.elapsedDays).toBe(50);
    expect(result.plannedProgress).toBe(50);
    expect(result.daysRemaining).toBe(50);
  });

  it("falls back to plannedProgress 0 when there's no usable start/end pair", () => {
    const result = assessDelay({ actualProgress: 40 });
    expect(result.plannedProgress).toBe(0);
    expect(result.totalDays).toBeNull();
  });
});

describe("riskTone", () => {
  it("maps each risk level to a tone", () => {
    expect(riskTone("On Track")).toBe("ok");
    expect(riskTone("Attention Required")).toBe("warn");
    expect(riskTone("At Risk")).toBe("warn");
    expect(riskTone("Delayed")).toBe("danger");
    expect(riskTone("Critical")).toBe("danger");
  });
});
