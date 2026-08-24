import { test, expect } from "@playwright/test";

test("cost estimator form fills, submits, and the resulting estimate shows the disclaimer text", async ({ page }) => {
  await page.goto("/cost-estimator");

  await page.getByLabel("Full name").fill("Playwright Test User");
  await page.getByLabel("Mobile number", { exact: true }).fill("+91 90000 00001");
  await page.getByLabel("Site location / address").fill("Test Site, Nellore");
  // City / State / Floors ship with sensible defaults (Nellore / Andhra
  // Pradesh / 2) — only the required fields without defaults need filling.
  await page.getByLabel("Building type").selectOption("villa");
  await page.getByLabel("Built-up area per floor (sqft)").fill("1500");

  await page.getByRole("button", { name: "Get My Estimate" }).click();

  // Premium (₹2,400/sqft) is the default-selected package per brand rules, so
  // an untouched package selector produces a Premium estimate.
  await expect(page.getByText(/Indicative estimate — Premium package/)).toBeVisible();
  await expect(page.getByText("₹2,400", { exact: true })).toBeVisible();
  await expect(page.getByText("Cost breakdown", { exact: true })).toBeVisible();

  // Official 7-milestone schedule: 10% advance + six 15% stages.
  await expect(page.getByText("Suggested payment schedule", { exact: true })).toBeVisible();
  await expect(page.getByText("Advance / Agreement", { exact: true })).toBeVisible();
  await expect(page.getByText("Final Handover Balance", { exact: true })).toBeVisible();

  // The disclaimer/assumptions card — buildEstimate() always attaches the
  // fixed ASSUMPTIONS list from packages/utils/src/estimator-calc.ts.
  await expect(page.getByText("Assumptions & disclaimers", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Government approval fees, statutory charges and stamp duty are not included/)
  ).toBeVisible();
});
