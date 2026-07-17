import { expect, test } from "@playwright/test";

test.describe("Practitioner registration", () => {
  test("uses an academy autocomplete combobox before account creation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: "Join your academy on RollFinders" }),
    ).toBeVisible();

    const academySearch = page.getByRole("combobox", {
      name: "Find your academy",
    });
    await expect(academySearch).toBeVisible();
    await expect(academySearch).toHaveAttribute(
      "placeholder",
      "Search by academy name, city, or postcode",
    );

    await academySearch.fill("academy");
    await expect(academySearch).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('input[name="academyId"]')).toHaveAttribute(
      "type",
      "hidden",
    );

    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();

    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasPageOverflow).toBe(false);
  });
});
