import { expect, test } from "@playwright/test";

test("sign-in page renders the Clerk sign-in form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("main").first()).toBeVisible();
  await expect(page.getByText(/sign in/i).first()).toBeVisible({
    timeout: 20_000,
  });
});

test("unauthenticated visitors are redirected from protected routes", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in/);
});
