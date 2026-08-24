import { test, expect } from "@playwright/test";

test("enquiry form submits and shows the success state", async ({ page }) => {
  await page.goto("/enquiry");

  await page.getByLabel("Full name").fill("Playwright Enquiry User");
  await page.getByLabel("Mobile number").fill("+91 90000 00002");
  await page.getByLabel("Site location").fill("Test Enquiry Site, Nellore");
  await page.getByLabel("What are you looking to build?").fill("A 2BHK independent house, budget around 40 lakhs.");

  await page.getByRole("button", { name: "Send Enquiry" }).click();

  await expect(page.getByText("Thanks — we've got your enquiry.")).toBeVisible();
});
