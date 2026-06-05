import { expect, test } from "@playwright/test";

test.describe("RollFinder public MVP discovery", () => {
  test("finds open mats, academy details, and map listings from the local production build", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Where can I train today?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured Open Mats" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured Academies" })).toBeVisible();

    await page.getByPlaceholder(/Search today's open mats/i).fill("Hackney");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/open-mats\?/);
    await expect(page.getByRole("heading", { name: "Open Mats" })).toBeVisible();
    await expect(page.getByText("Competition Rounds").first()).toBeVisible();
    await expect(page.getByText("Hackney No-Gi Lab").first()).toBeVisible();

    await page.getByRole("combobox").nth(1).selectOption("NO_GI");
    await page.getByRole("button", { name: "Filter" }).click();

    await expect(page).toHaveURL(/gi=NO_GI/);
    await expect(page.getByText("NO-GI").first()).toBeVisible();
    await page.getByRole("link", { name: "View Details" }).first().click();

    await expect(page.getByRole("heading", { name: "Competition Rounds" })).toBeVisible();
    await expect(page.getByText("Cost")).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps\/search/);

    await page.goto("/academies");
    await page.getByPlaceholder(/Hackney, SW9, no-gi, competition/i).fill("Camden");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/academies\?/);
    await expect(page.getByText("Camden Grappling Academy").first()).toBeVisible();
    await page.getByRole("link", { name: "Details" }).first().click();

    await expect(page.getByRole("heading", { name: "Camden Grappling Academy" })).toBeVisible();
    await expect(page.getByText("Upcoming Open Mats")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Map" })).toHaveAttribute("href", /google\.com\/maps\/search/);

    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "Map" })).toBeVisible();
    await expect(page.getByText("Shoreditch BJJ Club").first()).toBeVisible();
  });
});
