import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Line ends as LF: a Windows checkout (core.autocrlf) has CRLF, and the selectors span lines.
const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the first block whose selector is exactly `selector`. */
function block(selector: string): string {
    const start = css.indexOf(`${selector} {`);

    expect(start, selector).toBeGreaterThan(-1);

    return css.slice(start, css.indexOf("}", start));
}

// What every screen names: page, surfaces, text, edges, the accent and the states.
const SEMANTIC = [
    "color-bg",
    "color-surface",
    "color-surface-raised",
    "color-text",
    "color-text-secondary",
    "color-border",
    "color-accent",
    "color-accent-hi",
    "accent-text",
    "mineral-text",
    "color-on-accent",
    "color-action",
    "color-focus",
    "color-success",
    "color-warning",
    "color-danger",
    "color-info",
    "shadow-1",
    "focus-ring",
];

describe("design tokens", () => {
    const light = block(':root,\n[data-theme="light"]');
    const dark = block('[data-theme="dark"],\n.interior-stage');

    it("give every semantic token a value of its own in the light and the dark theme", () => {
        for (const name of SEMANTIC) {
            const inLight = light.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
            const inDark = dark.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];

            expect(inLight, `${name} (claro)`).toBeDefined();
            expect(inDark, `${name} (oscuro)`).toBeDefined();
        }

        // The dark theme is designed on its own, not the light one inverted or copied.
        expect(dark).toMatch(/--color-bg:\s*#171918/);
        expect(light).toMatch(/--color-bg:\s*#e8e4da/);
    });

    it("keep the brand palette of ARQUILA", () => {
        for (const hex of ["#171918", "#e8e4da", "#d66a3d", "#89968c"]) {
            expect(css.toLowerCase()).toContain(hex);
        }
    });

    it("name the design's semantic tokens as aliases, with the fill apart from the text", () => {
        expect(css).toMatch(/--accent:\s*var\(--color-accent\)/);
        expect(css).toMatch(/--accent-contrast:\s*var\(--color-on-accent\)/);
        expect(css).toMatch(/--surface:\s*var\(--color-surface\)/);
        expect(css).toMatch(/--surface-2:\s*var\(--color-surface-raised\)/);
        expect(css).toMatch(/--danger:\s*var\(--color-danger\)/);
    });

    it("follow a dark system before the script has chosen a theme", () => {
        expect(css).toMatch(
            /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{[^}]*--color-bg:\s*#171918/,
        );
    });

    it("define the scales of type, space, radii, shadows and motion once", () => {
        for (const name of [
            "font-sans",
            "text-md",
            "space-4",
            "radius-md",
            "shadow-2",
            "dur-fast",
            "dur",
            "dur-base",
            "dur-slow",
            "border-w",
            "radius-0",
            "space-12",
            "shadow-thumb",
            "font-display",
            "leading-normal",
        ]) {
            expect(css, name).toMatch(new RegExp(`--${name}:`));
        }

        expect(css).toMatch(/--font-sans:\s*"Inter Variable"/);
    });
});
