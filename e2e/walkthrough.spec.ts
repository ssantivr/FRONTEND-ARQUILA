import { expect, test } from "@playwright/test";

import { mockApi } from "./api";

// The 3D engine is a large file of its own; the development server compiles it on first use.
const MODEL_TIMEOUT_MS = 45_000;

test("the old walkthrough address opens the 3D viewer as a walkthrough (R14)", async ({ page }) => {
    await mockApi(page);
    await page.goto("/recorrido");

    await expect(page).toHaveURL(/\/visor\?modo=recorrido$/);
    await expect(page.locator(".structure-viewer canvas")).toBeVisible({
        timeout: MODEL_TIMEOUT_MS,
    });
});
