// Delay-risk engine. Never trusts a manually entered risk value alone: it
// derives planned progress from the schedule and compares it to actual.

export type RiskLevel =
  | "On Track"
  | "Attention Required"
  | "At Risk"
  | "Delayed"
  | "Critical";

export interface DelayAssessment {
  plannedProgress: number;   // where the project should be today (0-100)
  actualProgress: number;    // where it actually is (0-100)
  variance: number;          // actual - planned (negative = behind)
  daysRemaining: number | null;
  totalDays: number | null;
  elapsedDays: number | null;
  expectedCompletion: string | null; // ISO date, projected from current pace
  delayDays: number;         // projected days late (0 if on/ahead)
  risk: RiskLevel;
}

const DAY = 86400000;

function toDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function assessDelay(input: {
  startDate?: string | null;
  plannedCompletion?: string | null;
  actualProgress?: number | null;
  now?: Date;
}): DelayAssessment {
  const now = input.now ?? new Date();
  const start = toDate(input.startDate);
  const end = toDate(input.plannedCompletion);
  const actual = Math.max(0, Math.min(100, Number(input.actualProgress ?? 0)));

  let plannedProgress = 0;
  let totalDays: number | null = null;
  let elapsedDays: number | null = null;
  let daysRemaining: number | null = null;

  if (start && end && end.getTime() > start.getTime()) {
    totalDays = Math.round((end.getTime() - start.getTime()) / DAY);
    elapsedDays = Math.round((now.getTime() - start.getTime()) / DAY);
    daysRemaining = Math.round((end.getTime() - now.getTime()) / DAY);
    plannedProgress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  } else if (end) {
    daysRemaining = Math.round((end.getTime() - now.getTime()) / DAY);
  }

  const variance = actual - plannedProgress;

  // Project a completion date from the current pace (progress per elapsed day).
  let expectedCompletion: string | null = null;
  let delayDays = 0;
  if (start && actual > 0 && elapsedDays && elapsedDays > 0) {
    const pace = actual / elapsedDays;               // % per day
    const daysToFinish = pace > 0 ? (100 - actual) / pace : Infinity;
    if (isFinite(daysToFinish)) {
      const projected = new Date(now.getTime() + daysToFinish * DAY);
      expectedCompletion = projected.toISOString().slice(0, 10);
      if (end) delayDays = Math.max(0, Math.round((projected.getTime() - end.getTime()) / DAY));
    }
  }

  // Risk is driven by schedule variance (actual vs where the plan says we
  // should be) — an always-reliable, intuitive signal. The projected
  // completion date and delayDays below are shown for information but do not
  // by themselves drive the risk level (the pace forecast is too noisy early
  // in a project to escalate risk on its own).
  let risk: RiskLevel = "On Track";
  const behind = -variance; // positive = behind plan
  if (daysRemaining != null && daysRemaining < 0 && actual < 100) {
    risk = "Critical";        // past the deadline and not finished
  } else if (behind >= 25) {
    risk = "Critical";
  } else if (behind >= 15) {
    risk = "Delayed";
  } else if (behind >= 8) {
    risk = "At Risk";
  } else if (behind >= 3) {
    risk = "Attention Required";
  }

  return {
    plannedProgress: Math.round(plannedProgress),
    actualProgress: Math.round(actual),
    variance: Math.round(variance),
    daysRemaining,
    totalDays,
    elapsedDays,
    expectedCompletion,
    delayDays,
    risk,
  };
}

export function riskTone(risk: RiskLevel): "ok" | "warn" | "danger" | "brand" | "muted" {
  switch (risk) {
    case "On Track": return "ok";
    case "Attention Required": return "warn";
    case "At Risk": return "warn";
    case "Delayed": return "danger";
    case "Critical": return "danger";
    default: return "muted";
  }
}
