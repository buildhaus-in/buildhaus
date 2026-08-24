import { test, expect } from "@playwright/test";

// Uses seed task "task-1" ("2nd floor slab shuttering", see
// packages/database/src/demo/seed.ts) which belongs to profile-engineer and
// has at least one incomplete checklist item. This test mutates the shared,
// file-backed demo store (that's expected — Demo Mode exists to be clicked
// through) but toggles the item back at the end so repeated runs start from
// the same state.
test("engineer can open a task and toggle a checklist item", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("engineer@buildhaus.example");
  await page.getByLabel("Password").fill("Buildhaus#Engineer1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/engineer$/);

  await page.goto("/engineer/tasks/task-1");
  await expect(page.getByRole("heading", { name: "2nd floor slab shuttering" })).toBeVisible();

  const checklistRow = () => page.locator("form").filter({ hasText: "Level and camber checked" });
  const checklistButton = () => checklistRow().getByRole("button");

  const initialState = await checklistButton().getAttribute("aria-label");
  expect(["Mark complete", "Mark incomplete"]).toContain(initialState);
  const toggledState = initialState === "Mark complete" ? "Mark incomplete" : "Mark complete";

  await checklistButton().click();
  await expect(checklistButton()).toHaveAttribute("aria-label", toggledState!);

  // Restore original state so the demo data isn't left mutated for the next run.
  await checklistButton().click();
  await expect(checklistButton()).toHaveAttribute("aria-label", initialState!);
});
