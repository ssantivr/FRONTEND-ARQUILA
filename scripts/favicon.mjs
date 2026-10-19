/**
 * Draws public/favicon.svg from the geometry of the logo, so the tab shows the same isometric
 * mark as the app. Run it after changing src/components/ui/logoGeometry.ts:
 *
 *   npm run favicon
 */
import { writeFileSync } from "node:fs";

import { LOGO_FACES, LOGO_HEIGHT, LOGO_WIDTH } from "../src/components/ui/logoGeometry.ts";

// The colours of the faces and of the tile, from src/styles/tokens.css (--brand-*).
const FILL = { top: "#b8f36b", left: "#8fcf4c", right: "#236b42" };
const FOREST = "#0b211a";

const SIZE = 32;
const PAD = 4;
const scale = (SIZE - PAD * 2) / Math.max(LOGO_WIDTH, LOGO_HEIGHT);
const dx = (SIZE - LOGO_WIDTH * scale) / 2;
const dy = (SIZE - LOGO_HEIGHT * scale) / 2;

const faces = LOGO_FACES.map(
    (face) => `        <path d="${face.d}" fill="${FILL[face.side]}" />`,
).join("\n");

export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" rx="7" fill="${FOREST}" />
    <g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale.toFixed(4)})" stroke="${FOREST}" stroke-width="0.6" stroke-linejoin="round">
${faces}
    </g>
</svg>
`;

if (process.argv[1]?.endsWith("favicon.mjs")) {
    writeFileSync(new URL("../public/favicon.svg", import.meta.url), FAVICON);
    console.log("public/favicon.svg escrito con", LOGO_FACES.length, "caras");
}
