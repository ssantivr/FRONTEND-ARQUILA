// Checks the WCAG AA contrast of the design tokens in the light and the dark theme: 4.5:1 for every
// text/background pair and 3:1 for the edges and marks of a control. Run it with:  npm run contraste
import { readFileSync } from "node:fs";

const MINIMUM = 4.5;
const MINIMUM_UI = 3;
const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8").replace(
    /\r\n/g,
    "\n",
);

/** The `--name: #rrggbb` and `--name: rgba(…)` declarations of the first block whose selector
    starts with `selector`. */
function block(selector: string): Record<string, string> {
    const start = css.indexOf(`\n${selector}`);

    if (start === -1) {
        throw new Error(`No hay un bloque «${selector.split("\n")[0]}» en tokens.css.`);
    }

    const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));

    return Object.fromEntries(
        [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|rgba\([^)]*\))\s*;/gi)].map(
            ([, name, value]) => [name, value],
        ),
    );
}

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5]
        .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
        .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The tint `overlay` (rgba) painted over the solid `base`, as #rrggbb. */
function over(overlay: string, base: string): string {
    const [r, g, b, alpha] = (overlay.match(/[\d.]+/g) ?? []).map(Number);

    return `#${[r, g, b]
        .map(
            (value, at) =>
                value * alpha + parseInt(base.slice(1 + at * 2, 3 + at * 2), 16) * (1 - alpha),
        )
        .map((value) => Math.round(value).toString(16).padStart(2, "0"))
        .join("")}`;
}

function ratio(text: string, background: string): number {
    const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a);

    return (light + 0.05) / (dark + 0.05);
}

const shared = block("/* ---- 2. Scales, the same in both themes ---- */\n:root {");
const themes = {
    light: { ...shared, ...block(':root,\n[data-theme="light"] {') },
    dark: { ...shared, ...block('[data-theme="dark"] {') },
};

const SURFACES = ["color-bg", "color-surface", "color-surface-raised", "color-surface-sunken"];
// A tint over a surface: the well of a segmented control, a hovered or pressed row.
const TINTS = ["color-hover", "color-pressed"];

for (const tokens of Object.values(themes)) {
    for (const tint of TINTS) {
        for (const surface of SURFACES) {
            tokens[`${tint}+${surface}`] = over(tokens[tint], tokens[surface]);
        }
    }
}

const TEXTS = [
    "color-text",
    "color-text-secondary",
    "color-text-muted",
    "color-action",
    "color-accent-hi",
    "accent-text",
    "mineral-text",
    "color-success",
    "color-warning",
    "color-danger",
    "color-info",
];
// In light, secondary text falls short on the tints (from 4.0:1), so it is not used there: those
// places take --color-text-muted, checked below. This script checks the tokens, not where the style
// sheets use them; `npm run accesibilidad`, which renders the screens, is what sees a rule that
// breaks this.
const PAIRS = [
    ...TEXTS.flatMap((text) => SURFACES.map((surface) => [text, surface])),
    ...["color-text", "color-text-muted"].flatMap((text) =>
        TINTS.flatMap((tint) => SURFACES.map((surface) => [text, `${tint}+${surface}`])),
    ),
    ["color-on-action", "color-action"],
    ["color-on-action", "color-action-hover"],
    ["color-on-accent", "color-accent"],
    ["color-on-accent", "color-accent-hover"],
    ["color-on-danger", "color-danger"],
    ["color-text-inverse", "color-surface-inverse"],
    ["brand-forest-text", "brand-forest"],
    ["brand-forest-text", "brand-forest-raised"],
    ["brand-lime", "brand-forest"],
    ["brand-lime", "brand-forest-raised"],
    ["brand-on-lime", "brand-lime"],
    ["band-danger", "brand-forest"],
    ["band-info", "brand-forest"],
    ["scene-text", "scene-panel"],
    // The figures of the lighting and render caption, on its opaque panel over the canvas.
    ["brand-lime", "scene-panel"],
];
// What must be seen but is not text: the edge of a field, the focus outline, an icon.
const UI = ["color-border-strong", "color-focus", "accent-text", "mineral-text"];
const UI_PAIRS = UI.flatMap((mark) => SURFACES.map((surface) => [mark, surface]));

let failures = 0;

for (const [theme, tokens] of Object.entries(themes)) {
    console.log(`Theme ${theme}:`);

    for (const [pairs, minimum] of [
        [PAIRS, MINIMUM],
        [UI_PAIRS, MINIMUM_UI],
    ] as const) {
        for (const [text, background] of pairs) {
            if (tokens[text] === undefined || tokens[background] === undefined) {
                failures += 1;
                console.log(`  FAIL   missing --${tokens[text] === undefined ? text : background}`);
                continue;
            }

            const value = ratio(tokens[text], tokens[background]);
            const ok = value >= minimum;

            failures += ok ? 0 : 1;
            console.log(
                `  ${ok ? "ok   " : "FAIL "} ${value.toFixed(2).padStart(5)}:1  --${text} on --${background} (minimum ${minimum})`,
            );
        }
    }
}

// Not a pair the interface uses: it is the reason violet is never text on the dark surfaces.
const violet = ratio(themes.dark["color-accent"], themes.dark["color-bg"]);

console.log(
    `Reference: violet on the dark background ${violet.toFixed(2)}:1 (fill only; text uses --accent-text).`,
);
console.log(
    failures === 0
        ? `Every pair reaches its minimum (text ${MINIMUM}:1, interface ${MINIMUM_UI}:1).`
        : `${failures} pairs do not reach their minimum.`,
);
process.exitCode = failures === 0 ? 0 : 1;
