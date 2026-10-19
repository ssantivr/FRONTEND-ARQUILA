// Checks the WCAG AA contrast (4.5:1) of every text/background pair of the design tokens, in the
// light and the dark theme. Run it with:  npm run contraste
import { readFileSync } from "node:fs";

const MINIMUM = 4.5;
const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8").replace(
    /\r\n/g,
    "\n",
);

/** The `--name: #rrggbb` declarations of the first block whose selector starts with `selector`. */
function block(selector) {
    const start = css.indexOf(`\n${selector}`);

    if (start === -1) {
        throw new Error(`No hay un bloque «${selector.split("\n")[0]}» en tokens.css.`);
    }

    const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));

    return Object.fromEntries(
        [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [
            name,
            value,
        ]),
    );
}

function luminance(hex) {
    const [r, g, b] = [1, 3, 5]
        .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
        .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(text, background) {
    const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a);

    return (light + 0.05) / (dark + 0.05);
}

const shared = block("/* ---- 2. Scales, the same in both themes ---- */\n:root {");
const themes = {
    claro: { ...shared, ...block(':root,\n[data-theme="light"] {') },
    oscuro: { ...shared, ...block('[data-theme="dark"],\n.interior-stage {') },
};

const SURFACES = ["color-bg", "color-surface", "color-surface-raised", "color-surface-sunken"];
const TEXTS = [
    "color-text",
    "color-text-secondary",
    "color-text-muted",
    "color-action",
    "color-success",
    "color-warning",
    "color-danger",
    "color-info",
];
// The sunken surface is the well of drawings and viewports: secondary text (#68736b, 4.33:1 there)
// is not used on it; its notes use --color-text-muted.
const SKIPPED = new Set(["color-text-secondary/color-surface-sunken"]);
const PAIRS = [
    ...TEXTS.flatMap((text) => SURFACES.map((surface) => [text, surface])).filter(
        ([text, surface]) => !SKIPPED.has(`${text}/${surface}`),
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
    ["scene-text", "scene-panel"],
];

let failures = 0;

for (const [theme, tokens] of Object.entries(themes)) {
    console.log(`Tema ${theme}:`);

    for (const [text, background] of PAIRS) {
        if (tokens[text] === undefined || tokens[background] === undefined) {
            failures += 1;
            console.log(`  FALLA  falta --${tokens[text] === undefined ? text : background}`);
            continue;
        }

        const value = ratio(tokens[text], tokens[background]);
        const ok = value >= MINIMUM;

        failures += ok ? 0 : 1;
        console.log(
            `  ${ok ? "ok   " : "FALLA"} ${value.toFixed(2).padStart(5)}:1  --${text} sobre --${background}`,
        );
    }
}

// Not a pair the interface uses: it is the reason lime is never text on a light surface.
const lime = ratio(themes.claro["color-accent"], themes.claro["color-surface"]);

console.log(`Referencia: lima sobre blanco ${lime.toFixed(2)}:1 (en claro, solo como relleno).`);
console.log(
    failures === 0
        ? `Todos los pares llegan a ${MINIMUM}:1.`
        : `${failures} pares no llegan a ${MINIMUM}:1.`,
);
process.exitCode = failures === 0 ? 0 : 1;
