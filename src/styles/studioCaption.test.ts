import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The caption of the lighting and render previews sits on the 3D canvas, whose pixels change with
// the scene and the theme. Its contrast must not depend on them: the background has to be an opaque
// token, and its text has to reach 4.5:1 on it whatever the canvas paints behind.

/** Line ends as LF (a Windows checkout has CRLF) and no comments. */
function read(path: string): string {
    return readFileSync(join(process.cwd(), path), "utf8")
        .replace(/\r\n/g, "\n")
        .replace(/\/\*[\s\S]*?\*\//g, "");
}

const tokensCss = read("src/styles/tokens.css");
const studioCss = read("src/styles/pages/studio.css");

/** The declarations of the first rule whose selector is exactly `selector`, at line start. */
function rule(css: string, selector: string): Record<string, string> {
    const start = css.indexOf(`\n${selector} {`);

    expect(start, selector).toBeGreaterThan(-1);

    const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));

    return Object.fromEntries(
        [...body.matchAll(/([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
    );
}

// The scene tokens and their aliases live in `:root` blocks shared by both themes.
const tokens: Record<string, string> = Object.fromEntries(
    [...tokensCss.matchAll(/(?:^|\n):root \{([^}]*)\}/g)].flatMap(([, body]) =>
        [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
            name,
            value.trim(),
        ]),
    ),
);

/** A value with its `var(--…)` aliases followed down to the color. */
function resolve(value: string): string {
    const alias = value.match(/^var\(--([\w-]+)\)$/);

    if (alias === null) {
        return value;
    }

    expect(tokens[alias[1]], `--${alias[1]}`).toBeDefined();

    return resolve(tokens[alias[1]]);
}

/** #rrggbb or rgb(a)() as [r, g, b, alpha]. */
function rgba(color: string): [number, number, number, number] {
    const hex = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);

    if (hex !== null) {
        return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16), 1];
    }

    const parts = color
        .match(/^rgba?\(([^)]*)\)$/)?.[1]
        .split(/[\s,/]+/)
        .filter(Boolean);

    expect(parts, color).toBeDefined();

    const [r, g, b, alpha = "1"] = parts ?? [];

    return [Number(r), Number(g), Number(b), Number(alpha)];
}

/** `color` painted over the opaque `base`. */
function over(color: string, base: [number, number, number]): [number, number, number] {
    const [r, g, b, alpha] = rgba(color);

    return [r, g, b].map((value, at) => value * alpha + base[at] * (1 - alpha)) as [
        number,
        number,
        number,
    ];
}

function luminance([r, g, b]: [number, number, number]): number {
    const [lr, lg, lb] = [r, g, b]
        .map((value) => value / 255)
        .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));

    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: [number, number, number], b: [number, number, number]): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (light + 0.05) / (dark + 0.05);
}

// What the canvas can paint behind: the light theme's pale floor at its brightest, and the dark one.
const CANVAS: [number, number, number][] = [
    [255, 255, 255],
    [0, 0, 0],
];

describe(".studio-caption", () => {
    const caption = rule(studioCss, ".studio-caption");
    const strong = rule(studioCss, ".studio-caption strong");

    it("takes its background from a token, without literal colors or gradients", () => {
        expect(caption.background).toMatch(/^var\(--[\w-]+\)$/);
    });

    it("has an opaque background, so the canvas does not show through", () => {
        expect(rgba(resolve(caption.background))[3]).toBe(1);
    });

    it.each([
        ["text", caption.color],
        ["figures (strong)", strong.color],
    ])("its %s reach 4.5:1 whatever the canvas paints behind", (_, color) => {
        for (const canvas of CANVAS) {
            const background = over(resolve(caption.background), canvas);
            const text = over(resolve(color), background);

            expect(ratio(text, background)).toBeGreaterThanOrEqual(4.5);
        }
    });
});
