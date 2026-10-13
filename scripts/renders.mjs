// Draws the two pictures of the home page and the sign-in screen with the app's own 3D viewer:
// the sample building by day (light theme) and by night (dark theme).
// Run it with the dev server up:  npm run dev  →  npm run renders
//
// It uses the viewer exactly as a person would: it hides the side panels, moves closer, shifts
// the building to the right so the text has room on the left, and presses «Guardar imagen».
/* global Image, document -- they are used inside page.evaluate, which runs in the browser. */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

import { answer } from "./datos-de-muestra.mjs";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5173";
const OUT = new URL("../src/assets/renders/", import.meta.url);
const WIDTH = 2000;
const QUALITY = 0.84;

const browser = await chromium.launch({
    channel: process.env.CAPTURAS_NAVEGADOR ?? "msedge",
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

for (const [theme, name] of [
    ["light", "house-day"],
    ["dark", "house-night"],
]) {
    const context = await browser.newContext({
        viewport: { width: 2300, height: 1500 },
        deviceScaleFactor: 1,
    });

    await context.addInitScript((value) => localStorage.setItem("arquila:theme", value), theme);
    await context.route("**/api/**", (route) =>
        route.fulfill({
            json: answer(new URL(route.request().url()).pathname.replace(/^\/api/, "")),
        }),
    );

    const page = await context.newPage();

    await page.goto(`${BASE}/proyectos/1/modelo-3d`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Paneles" }).click();

    // Each step is a camera move of its own: the next one waits for it to finish.
    for (let step = 0; step < 2; step += 1) {
        await page.getByRole("button", { name: "Acercar" }).click();
        await page.waitForTimeout(1200);
    }

    // Dragging with the right button pans the camera: the building moves to the right.
    const box = await page.locator(".structure-viewer canvas").boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + Math.min(box.height, 1200) / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(centerX + 260, centerY - 60, { steps: 12 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(1200);

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Guardar imagen" }).click(),
    ]);
    const png = await readFile(await download.path());
    // The browser itself turns the PNG into a smaller JPEG; the project has no image library.
    const jpeg = await page.evaluate(
        async ({ data, width, quality }) => {
            const image = new Image();

            image.src = `data:image/png;base64,${data}`;
            await image.decode();

            const canvas = document.createElement("canvas");

            // A 16:9 band across the middle of the view, whatever shape the viewer had.
            const band = Math.min(image.height, Math.round((image.width * 9) / 16));
            const top = Math.round((image.height - band) / 2);

            canvas.width = width;
            canvas.height = Math.round((width * 9) / 16);
            canvas
                .getContext("2d")
                .drawImage(image, 0, top, image.width, band, 0, 0, canvas.width, canvas.height);

            return canvas.toDataURL("image/jpeg", quality).split(",")[1];
        },
        { data: png.toString("base64"), width: WIDTH, quality: QUALITY },
    );

    await writeFile(fileURLToPath(new URL(`${name}.jpg`, OUT)), Buffer.from(jpeg, "base64"));
    console.log(`  ${name}.jpg`);
    await context.close();
}

await browser.close();
