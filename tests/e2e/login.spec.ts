import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasPageOverflow).toBe(false);
}

test.describe("RollFinders login page", () => {
  test("renders the refined mobile login form without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();

    const email = page.getByLabel("Email");
    const password = page.getByLabel("Password");
    const togglePassword = page.getByRole("button", { name: "Show password" });
    const submit = page.getByRole("button", { name: "Sign In" });

    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("required", "");
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("required", "");
    await expect(togglePassword).toBeVisible();
    await expect(submit).toBeVisible();

    for (const control of [email, password, togglePassword, submit]) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }

    const submitBox = await submit.boundingBox();
    expect(submitBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await expect(page.getByText("RollFinders helps grapplers find their next round in London.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the desktop login form compact and centered", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");

    const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(primaryNavigation.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(primaryNavigation.getByRole("link", { name: "Academies" })).toBeVisible();
    await expect(primaryNavigation.getByRole("link", { name: "Open Mats" })).toBeVisible();
    await expect(primaryNavigation.getByRole("link", { name: "Map" })).toBeVisible();
    await expect(primaryNavigation.getByRole("link", { name: "Login" })).toBeVisible();

    const sectionBox = await page.locator("main section").boundingBox();
    const formBox = await page.locator("form").boundingBox();
    expect(sectionBox).not.toBeNull();
    expect(formBox).not.toBeNull();
    expect(sectionBox?.width ?? 0).toBeLessThanOrEqual(480);
    expect(formBox?.width ?? 0).toBeLessThanOrEqual(440);
    expect(sectionBox?.x ?? 0).toBeGreaterThan(450);
    expect(sectionBox?.y ?? 0).toBeLessThan(180);

    await expectNoHorizontalOverflow(page);
  });

  test("supports password visibility and accessible failed-login feedback", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    const password = page.getByLabel("Password");
    await password.fill("wrong-password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");

    await page.getByLabel("Email").fill("unknown@example.com");
    await page.getByRole("button", { name: "Sign In" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Invalid email or password|disabled|academy|Enter both email and password/i);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
