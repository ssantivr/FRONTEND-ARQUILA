/**
 * Draws public/og.jpg, the picture shown when a link to ARQUILA is shared, with the colours of
 * src/styles/tokens.css, the technical-sketch logo and the showcase of the sign-in screen. Run
 * it after changing the palette or the logo:
 *
 *   npm run og
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

import {
    LOGO_HEIGHT,
    LOGO_STROKES,
    LOGO_WIDTH,
    STROKE_OPACITY,
    STROKE_WIDTH,
} from "../src/components/ui/logoGeometry.ts";

const WIDTH = 1200;
const HEIGHT = 630;
const QUALITY = 86;
const TITLE = "Organiza tus proyectos de arquitectura";

const url = (path: string) => new URL(path, import.meta.url);
const tokens = readFileSync(url("../src/styles/tokens.css"), "utf8");

/** The value of a token that holds a colour, written out in tokens.css. */
function token(name: string): string {
    const value = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(tokens)?.[1];

    if (value === undefined) {
        throw new Error(`Falta --${name} en tokens.css.`);
    }

    return value;
}

function embedded(path: string, type: string): string {
    return `data:${type};base64,${readFileSync(url(path)).toString("base64")}`;
}

const deep = token("brand-forest");
const stone = token("brand-forest-text");
const violet = token("brand-lime");

const font = embedded(
    "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
    "font/woff2",
);
const render = embedded("../src/assets/auth/showcase.jpg", "image/jpeg");
const logo = LOGO_STROKES.map(
    (stroke) =>
        `<path d="${stroke.d}" stroke-width="${STROKE_WIDTH[stroke.weight]}" stroke-opacity="${STROKE_OPACITY[stroke.weight]}" />`,
).join("");

const html = `<!doctype html>
<style>
    @font-face { font-family: Inter; src: url("${font}") format("woff2"); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    body {
        display: grid;
        grid-template-columns: 7fr 5fr;
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        color: ${stone};
        background: ${deep};
        font-family: Inter, sans-serif;
    }
    main { display: flex; flex-direction: column; justify-content: space-between; padding: 64px; }
    .brand { display: flex; align-items: center; gap: 16px; font-size: 26px; font-weight: 700; letter-spacing: 0.25em; }
    h1 { font-size: 66px; font-weight: 700; line-height: 1.06; letter-spacing: -0.03em; }
    .rule { width: 96px; height: 6px; margin-top: 32px; background: linear-gradient(90deg, ${violet}, ${token("brand-cyber")}); }
    img { width: 100%; height: ${HEIGHT}px; object-fit: cover; }
</style>
<main>
    <p class="brand">
        <svg width="48" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}" fill="none" stroke="${stone}" stroke-linecap="round" stroke-linejoin="round">${logo}</svg>
        ARQUILA
    </p>
    <div><h1>${TITLE}</h1><div class="rule"></div></div>
</main>
<img alt="" src="${render}" />`;

const browser = await chromium.launch({ channel: process.env.CAPTURAS_NAVEGADOR ?? "msedge" });
const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
});

await page.setContent(html);
await page.evaluate("document.fonts.ready");
await page.screenshot({
    path: fileURLToPath(url("../public/og.jpg")),
    type: "jpeg",
    quality: QUALITY,
});
await browser.close();
console.log("public/og.jpg escrito");
