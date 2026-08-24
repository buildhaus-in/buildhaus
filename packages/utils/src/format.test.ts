import { describe, it, expect } from "vitest";
import { inr, inrFull, sqft, dateLabel, daysLeft } from "./format";

describe("inr — lakh/crore aware formatting", () => {
  it("formats amounts under 1 lakh with plain Indian digit grouping", () => {
    expect(inr(45000)).toBe("₹45,000");
    expect(inr(99999)).toBe("₹99,999");
  });

  it("formats exactly 1 lakh as the lakh boundary", () => {
    expect(inr(100000)).toBe("₹1.00 L");
  });

  it("formats amounts between 1 lakh and 1 crore as lakhs", () => {
    expect(inr(2500000)).toBe("₹25.00 L");
    expect(inr(9999999)).toBe("₹100.00 L"); // just under 1 crore
  });

  it("formats exactly 1 crore as the crore boundary", () => {
    expect(inr(10000000)).toBe("₹1.00 Cr");
  });

  it("formats amounts over 1 crore as crores", () => {
    expect(inr(105000000)).toBe("₹10.50 Cr");
  });

  it("applies the same magnitude thresholds to negative numbers, keeping the sign", () => {
    expect(inr(-45000)).toBe("₹-45,000");
    expect(inr(-250000)).toBe("₹-2.50 L");
    expect(inr(-10000000)).toBe("₹-1.00 Cr");
  });

  it("returns ₹0 for null, undefined or non-numeric input", () => {
    expect(inr(null)).toBe("₹0");
    expect(inr(undefined)).toBe("₹0");
    expect(inr(NaN)).toBe("₹0");
  });

  it("treats zero as a plain rupee amount, not a lakh/crore", () => {
    expect(inr(0)).toBe("₹0");
  });
});

describe("inrFull — full digit-grouped rupee amount", () => {
  it("never truncates to lakh/crore, regardless of magnitude", () => {
    expect(inrFull(12345678)).toBe("₹" + (12345678).toLocaleString("en-IN"));
  });

  it("returns ₹0 for null/undefined", () => {
    expect(inrFull(null)).toBe("₹0");
    expect(inrFull(undefined)).toBe("₹0");
  });
});

describe("sqft", () => {
  it("formats with Indian digit grouping and a sqft suffix", () => {
    expect(sqft(4396)).toBe("4,396 sqft");
    expect(sqft(1000000)).toBe("10,00,000 sqft");
  });

  it("returns an em dash for null/undefined", () => {
    expect(sqft(null)).toBe("—");
    expect(sqft(undefined)).toBe("—");
  });
});

describe("dateLabel", () => {
  it("formats an ISO date as dd MMM yyyy (en-IN)", () => {
    const expected = new Date("2026-07-14").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    expect(dateLabel("2026-07-14")).toBe(expected);
  });

  it("returns an em dash for falsy input", () => {
    expect(dateLabel(null)).toBe("—");
    expect(dateLabel(undefined)).toBe("—");
    expect(dateLabel("")).toBe("—");
  });
});

describe("daysLeft", () => {
  it("returns null for falsy input", () => {
    expect(daysLeft(null)).toBeNull();
    expect(daysLeft(undefined)).toBeNull();
    expect(daysLeft("")).toBeNull();
  });

  it("returns a positive count for a future date and negative for a past date", () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    const past = new Date(Date.now() - 10 * 86400000).toISOString();
    expect(daysLeft(future)).toBeGreaterThan(0);
    expect(daysLeft(past)).toBeLessThan(0);
  });
});
