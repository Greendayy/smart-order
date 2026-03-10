import { expect, test } from "@playwright/test";

test("home page shows API health", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Smart Order" })).toBeVisible();
  await expect(page.getByText("API health:")).toBeVisible();
});

