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
    const dark = block('[data-theme="dark"]');

    it("give every semantic token a value of its own in the light and the dark theme", () => {
        for (const name of SEMANTIC) {
            const inLight = light.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
            const inDark = dark.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];

            expect(inLight, `${name} (claro)`).toBeDefined();
            expect(inDark, `${name} (oscuro)`).toBeDefined();
        }

        // The dark theme is designed on its own, not the light one inverted or copied.
        expect(dark).toMatch(/--color-bg:\s*#080b16/);
        expect(light).toMatch(/--color-bg:\s*#f5f7ff/);
    });

    it("keep the official palette of ARQUILA in the dark theme", () => {
        for (const hex of [
            "#080b16",
            "#111729",
            "#192239",
            "#7552ff",
            "#00c8ff",
            "#f5f7ff",
            "#929db5",
            "#22c55e",
            "#f59e0b",
        ]) {
            expect(dark.toLowerCase()).toContain(hex);
        }
    });

    it("give the glass panels a moderate blur and a subtle edge", () => {
        expect(css).toMatch(/--glass-blur:\s*12px/);
        expect(dark).toMatch(/--glass-border:\s*rgba\(255, 255, 255, 0\.08\)/);
    });

    it("keep violet text readable: the fill is never the text colour on dark", () => {
        expect(dark).toMatch(/--accent-text:\s*#a08bff/);
        expect(dark).toMatch(/--color-on-accent:\s*#ffffff/);
    });

    it("name the design's semantic tokens as aliases, with the fill apart from the text", () => {
        expect(css).toMatch(/--accent:\s*var\(--color-accent\)/);
        expect(css).toMatch(/--accent-contrast:\s*var\(--color-on-accent\)/);
        expect(css).toMatch(/--surface:\s*var\(--color-surface\)/);
        expect(css).toMatch(/--surface-2:\s*var\(--color-surface-raised\)/);
        expect(css).toMatch(/--danger:\s*var\(--color-danger\)/);
    });

    it("fill every primary control with one violet, never the text violet", () => {
        // `--lime` once pointed at `--brand-lime`, which D-BRAND turned into the text violet
        // #a08bff, so legacy fills read lighter than the app's primaries (#7552ff).
        expect(css).toMatch(/--lime:\s*var\(--color-accent\)/);
        expect(css).toMatch(/--lime-hover:\s*var\(--color-accent-hover\)/);
        expect(css).toMatch(/--lime-contrast:\s*var\(--color-on-accent\)/);
    });

    it("follow a dark system before the script has chosen a theme", () => {
        expect(css).toMatch(
            /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{[^}]*--color-bg:\s*#080b16/,
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
