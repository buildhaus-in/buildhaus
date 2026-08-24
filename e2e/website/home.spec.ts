import { test, expect } from "@playwright/test";

test("home page loads with hero content and a link into the estimator", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /The home you envision is the home you receive/ })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Estimate your build" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See past projects" })).toBeVisible();
});
