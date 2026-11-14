/**
 * Draws public/favicon.svg from the geometry of the logo, so the tab shows the same technical
 * sketch as the app: white lines on the deep background of ARQUILA. Run it after changing
 * src/components/ui/logoGeometry.ts:
 *
 *   npm run favicon
 */
import { writeFileSync } from "node:fs";

import {
    FAVICON_STROKE_WIDTH,
    LOGO_HEIGHT,
    LOGO_STROKES,
    LOGO_WIDTH,
    STROKE_OPACITY,
} from "../src/components/ui/logoGeometry.ts";

// From src/styles/tokens.css: --color-bg of the dark theme, and white for the lines.
const BACKGROUND = "#080b16";
const LINE = "#ffffff";

const SIZE = 32;
const PAD = 3;
const scale = (SIZE - PAD * 2) / Math.max(LOGO_WIDTH, LOGO_HEIGHT);

const strokes = LOGO_STROKES.map(
    (stroke) =>
        `        <path d="${stroke.d}" stroke-width="${FAVICON_STROKE_WIDTH[stroke.weight]}" stroke-opacity="${STROKE_OPACITY[stroke.weight]}" />`,
).join("\n");

export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" rx="7" fill="${BACKGROUND}" />
    <g transform="translate(${PAD} ${PAD}) scale(${scale.toFixed(4)})" fill="none" stroke="${LINE}" stroke-linecap="round" stroke-linejoin="round">
${strokes}
    </g>
</svg>
`;

if (process.argv[1]?.endsWith("favicon.ts")) {
    writeFileSync(new URL("../public/favicon.svg", import.meta.url), FAVICON);
    console.log("public/favicon.svg written with", LOGO_STROKES.length, "strokes");
}
