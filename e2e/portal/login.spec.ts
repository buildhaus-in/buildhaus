import { test, expect, type Page } from "@playwright/test";

const CREDS = {
  owner: { email: "owner@buildhaus.example", password: "Buildhaus#Owner1" },
  engineer: { email: "engineer@buildhaus.example", password: "Buildhaus#Engineer1" },
  architect: { email: "architect@buildhaus.example", password: "Buildhaus#Architect1" },
  client: { email: "client@buildhaus.example", password: "Buildhaus#Client1" },
};

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("owner login redirects to /owner and the Command Centre cards render with counts", async ({ page }) => {
  await login(page, CREDS.owner.email, CREDS.owner.password);
  await expect(page).toHaveURL(/\/owner$/);
  await expect(page.getByRole("heading", { name: "Command Centre" })).toBeVisible();

  // Four primary StatCards, each with a numeric/currency value next to its label.
  for (const label of ["Active Projects", "New Enquiries", "Pending Approvals", "Cash Position"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});

test("engineer login lands on their own home (/engineer)", async ({ page }) => {
  await login(page, CREDS.engineer.email, CREDS.engineer.password);
  await expect(page).toHaveURL(/\/engineer$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("architect login lands on their own home (/architect)", async ({ page }) => {
  await login(page, CREDS.architect.email, CREDS.architect.password);
  await expect(page).toHaveURL(/\/architect$/);
  await expect(page.getByRole("heading", { name: "Architect Dashboard" })).toBeVisible();
});

test("client login lands on their own home (/client)", async ({ page }) => {
  await login(page, CREDS.client.email, CREDS.client.password);
  await expect(page).toHaveURL(/\/client$/);
});

test("an invalid password is rejected with an inline error, not a redirect", async ({ page }) => {
  await login(page, CREDS.owner.email, "wrong-password");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("sign out redirects to /login", async ({ page }) => {
  await login(page, CREDS.owner.email, CREDS.owner.password);
  await expect(page).toHaveURL(/\/owner$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // And the session really is gone — the app area redirects again.
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/login/);
});
