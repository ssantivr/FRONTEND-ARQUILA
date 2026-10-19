// Checks the WCAG AA contrast (4.5:1) of every text/background pair of the design tokens, in the
// light and the dark theme. Run it with:  npm run contraste
import { readFileSync } from "node:fs";

const MINIMUM = 4.5;
const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8").replace(
    /\r\n/g,
    "\n",
);

/** The `--name: #rrggbb` declarations of the first block whose selector contains `selector`. */
function block(selector) {
    const start = css.indexOf(selector);
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

const shared = block("/* Values that are the same in both themes. */\n:root");
const themes = {
    claro: { ...shared, ...block(':root,\n[data-theme="light"]') },
    oscuro: { ...shared, ...block('[data-theme="dark"],') },
};

const SURFACES = ["bg", "bg-secondary", "panel", "panel-raised"];
const PAIRS = [
    ...["text", "text-secondary", "text-muted", "accent", "success", "warning", "error"].flatMap(
        (text) => SURFACES.map((surface) => [text, surface]),
    ),
    ["accent-contrast", "accent"],
    ["primary-contrast", "primary"],
    ["lime-contrast", "lime"],
    ["lime-contrast", "lime-hover"],
    ["forest-text", "forest"],
    ["forest-text", "forest-raised"],
    ["white", "forest"],
    ["white", "forest-raised"],
    ["lime", "forest"],
    ["lime", "forest-raised"],
    ["on-scene", "viewport-deep"],
];

let failures = 0;

for (const [theme, tokens] of Object.entries(themes)) {
    console.log(`Tema ${theme}:`);

    for (const [text, background] of PAIRS) {
        const value = ratio(tokens[text], tokens[background]);
        const ok = value >= MINIMUM;

        failures += ok ? 0 : 1;
        console.log(
            `  ${ok ? "ok   " : "FALLA"} ${value.toFixed(2).padStart(5)}:1  --${text} sobre --${background}`,
        );
    }
}

console.log(
    failures === 0
        ? `Todos los pares llegan a ${MINIMUM}:1.`
        : `${failures} pares no llegan a ${MINIMUM}:1.`,
);
process.exitCode = failures === 0 ? 0 : 1;
