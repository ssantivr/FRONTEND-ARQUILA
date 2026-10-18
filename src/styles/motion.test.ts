import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sheets(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);

        return statSync(path).isDirectory() ? sheets(path) : path.endsWith(".css") ? [path] : [];
    });
}

// Every style sheet of the app as text, without its comments.
const files = sheets(SRC).map((path) => ({
    name: path.slice(SRC.length + 1).replace(/\\/g, "/"),
    css: readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}));
const motion = files.find((file) => file.name === "styles/motion.css");
const others = files.filter((file) => file.name !== "styles/motion.css");

/** Declarations of the properties that move things, each as one string. */
function movingDeclarations(css: string): string[] {
    return css.match(/(?:^|[\s;{])(?:animation|transition)(?:-[a-z-]+)?\s*:[^;}]+/g) ?? [];
}

describe("motion system", () => {
    it("keeps every curve and every keyframe in motion.css", () => {
        for (const file of others) {
            expect(file.css, file.name).not.toMatch(/cubic-bezier\(/);
            expect(file.css, file.name).not.toMatch(/@keyframes/);
            expect(file.css, file.name).not.toMatch(/\bease(?:-in|-out|-in-out)?\b(?![\w-]*\))/);
        }
    });

    it("writes no duration by hand: they are all tokens", () => {
        const loose = others.flatMap((file) =>
            movingDeclarations(file.css)
                // 0s is «no delay», not a duration someone chose.
                .filter((line) => /(?<![\w.-])(?!0s\b)\d*\.?\d+m?s\b/.test(line))
                .map((line) => `${file.name}: ${line.trim()}`),
        );

        expect(loose).toEqual([]);
    });

    it("only animates transform and opacity, so nothing shifts the layout", () => {
        // The collapse of the sidebar changes its grid column on purpose (see FRONTEND.md).
        const allowed = ["styles/shell.css"];
        const layout = others
            .filter((file) => !allowed.includes(file.name))
            .flatMap((file) =>
                movingDeclarations(file.css)
                    .filter((line) => /transition/.test(line))
                    .filter((line) =>
                        /[\s:,](?:width|height|top|left|right|bottom|margin|padding)\b/.test(line),
                    )
                    .map((line) => `${file.name}: ${line.trim()}`),
            );

        expect(layout).toEqual([]);
    });

    it("has the three curves and keeps the interface at 240 ms or less", () => {
        const tokens = files.find((file) => file.name === "styles/tokens.css")?.css ?? "";

        expect(motion?.css).toMatch(/--ease-out:\s*cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
        expect(motion?.css).toMatch(/--ease-in:\s*cubic-bezier\(0\.7, 0, 0\.84, 0\)/);
        expect(motion?.css).toMatch(/--ease-in-out:\s*cubic-bezier\(0\.65, 0, 0\.35, 1\)/);
        expect(tokens).toMatch(/--dur-fast:\s*120ms/);
        expect(tokens).toMatch(/--dur:\s*180ms/);
        expect(tokens).toMatch(/--dur-slow:\s*240ms/);
    });

    it("switches all movement off for reduced motion, from the system and from the user", () => {
        const css = motion?.css ?? "";
        const system = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

        expect(system).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
        expect(system).toMatch(/transition:\s*none\s*!important/);
        expect(system).toMatch(/animation-iteration-count:\s*1\s*!important/);
        expect(css).toMatch(/\[data-motion="reduced"\], \[data-motion="off"\]/);
        expect(system).toMatch(/::view-transition-new\(\*\)[^}]*\{[^}]*animation:\s*none/);
    });

    it("leaves the switch to motion.css: no component turns movement off by its own", () => {
        for (const file of others) {
            expect(file.css, file.name).not.toMatch(/prefers-reduced-motion/);
        }
    });
});
