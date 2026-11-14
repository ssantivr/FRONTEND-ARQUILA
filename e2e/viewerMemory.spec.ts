import { expect, test, type Page } from "@playwright/test";

import { mockApi } from "./api";

// The 3D engine is a large file of its own; the development server compiles it on first use.
const MODEL_TIMEOUT_MS = 45_000;
const ROUNDS = 20;

interface LiveObjects {
    buffers: number;
    textures: number;
    programs: number;
}

interface WebGlCounts {
    /** Objects on contexts that are still alive: none once the viewer has closed. */
    live: LiveObjects;
    /** What each context still held when the viewer let it go, one entry per context. */
    lost: LiveObjects[];
    /** Contexts that created at least one object. */
    seen: number;
}

/*
 * What three.js (r186) itself keeps on a context until the context is lost: the four empty
 * textures of WebGLState, the global DFG lookup texture and the shadow map's depth materials (one
 * program per variant: clipping, wireframe). It has
 * no API to free them; `forceContextLoss()` does, and the browser frees whatever a lost context
 * held. Anything above this left on a context is a resource the viewer forgot to free.
 */
const THREE_INTERNALS: LiveObjects = { buffers: 0, textures: 5, programs: 4 };

/**
 * Counts the WebGL objects of each context: each create adds one, each delete takes one away.
 * When the viewer loses its context on purpose, what that context still held is recorded and
 * no longer counted as alive, because the browser frees it.
 */
function countWebGlObjects() {
    type Kind = "buffers" | "textures" | "programs";
    const byContext = new Map<unknown, Map<unknown, Kind>>();
    const lost: Record<Kind, number>[] = [];
    let seen = 0;
    const objects = (context: unknown) => {
        let map = byContext.get(context);

        if (map === undefined) {
            map = new Map();
            byContext.set(context, map);
            seen += 1;
        }

        return map;
    };
    const tally = (map: Map<unknown, Kind>) => {
        const counts = { buffers: 0, textures: 0, programs: 0 };

        for (const kind of map.values()) {
            counts[kind] += 1;
        }

        return counts;
    };
    const pairs: [string, string, Kind][] = [
        ["createBuffer", "deleteBuffer", "buffers"],
        ["createTexture", "deleteTexture", "textures"],
        ["createProgram", "deleteProgram", "programs"],
    ];

    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
        const prototype = context.prototype as unknown as Record<
            string,
            (...args: unknown[]) => unknown
        >;

        for (const [create, remove, kind] of pairs) {
            const original = { create: prototype[create], remove: prototype[remove] };

            prototype[create] = function (this: unknown, ...args: unknown[]) {
                const made = original.create.apply(this, args);

                if (made !== null) {
                    objects(this).set(made, kind);
                }

                return made;
            };
            prototype[remove] = function (this: unknown, ...args: unknown[]) {
                objects(this).delete(args[0]);

                return original.remove.apply(this, args);
            };
        }

        const getExtension = prototype.getExtension;

        prototype.getExtension = function (this: unknown, ...args: unknown[]) {
            const extension = getExtension.apply(this, args) as {
                loseContext?: () => void;
                counted?: true;
            } | null;

            // The browser hands out one extension object per context: wrap it once.
            if (
                args[0] === "WEBGL_lose_context" &&
                extension?.loseContext !== undefined &&
                extension.counted !== true
            ) {
                const loseContext = extension.loseContext.bind(extension);

                extension.counted = true;
                extension.loseContext = () => {
                    lost.push(tally(objects(this)));
                    byContext.delete(this);
                    loseContext();
                };
            }

            return extension;
        };
    }

    (window as unknown as { __webgl: () => WebGlCounts }).__webgl = () => {
        const live = { buffers: 0, textures: 0, programs: 0 };

        for (const map of byContext.values()) {
            const counts = tally(map);

            live.buffers += counts.buffers;
            live.textures += counts.textures;
            live.programs += counts.programs;
        }

        return { live, lost: [...lost], seen };
    };
}

function webGlCounts(page: Page): Promise<WebGlCounts> {
    return page.evaluate(() => (window as unknown as { __webgl: () => WebGlCounts }).__webgl());
}

function section(page: Page, name: string) {
    return page
        .getByRole("navigation", { name: "Secciones del proyecto" })
        .getByRole("button", { name, exact: true })
        .click();
}

test.describe("3D viewer memory", () => {
    test("opening and closing the viewer 20 times with its tools on leaves no live WebGL objects", async ({
        page,
    }) => {
        test.setTimeout(ROUNDS * 30_000);
        await page.addInitScript(countWebGlObjects);
        await mockApi(page);
        await page.goto("/proyectos/1");

        const live: LiveObjects[] = [];

        for (let round = 0; round < ROUNDS; round += 1) {
            await section(page, "Modelo 3D");
            await expect(page.locator(".structure-viewer canvas")).toBeVisible({
                timeout: MODEL_TIMEOUT_MS,
            });

            // The gizmo on a room, the wireframe and the measure tool, all switched on.
            // The selection is kept between visits, so a second click would let go of the room.
            const move = page.getByRole("button", { name: "Mover cuarto" });

            if ((await move.getAttribute("aria-disabled")) === "true") {
                await page.getByRole("button", { name: "Sala", exact: true }).click();
            }

            await expect(move).not.toHaveAttribute("aria-disabled", "true");
            await move.click();
            await page.getByLabel("Modo de vista").selectOption("wireframe");
            await page.getByRole("button", { name: "Medir distancia" }).click();
            // Two points on the model, so a measurement line is drawn and has to be freed too.
            const canvas = page.locator(".structure-viewer canvas");
            const box = await canvas.boundingBox();

            if (box !== null) {
                await canvas.click({ position: { x: box.width * 0.45, y: box.height * 0.55 } });
                await canvas.click({ position: { x: box.width * 0.55, y: box.height * 0.55 } });
            }

            await section(page, "Resumen");
            await expect(page.locator(".structure-viewer canvas")).toHaveCount(0);
            live.push((await webGlCounts(page)).live);
        }

        const { lost, seen } = await webGlCounts(page);
        const most = (kind: keyof LiveObjects) => Math.max(...lost.map((left) => left[kind]));

        console.log(
            `WebGL: ${lost.length} of ${seen} contexts lost in ${ROUNDS} rounds; the most one left: ` +
                `${most("buffers")} buffers, ${most("textures")} textures, ${most("programs")} programs`,
        );
        // Every context is let go when the viewer closes, so nothing stays alive between rounds.
        expect(live).toEqual(
            Array.from({ length: ROUNDS }, () => ({ buffers: 0, textures: 0, programs: 0 })),
        );
        expect(lost.length).toBe(seen);
        // And no context holds more than three.js's own internals when it is let go.
        for (const left of lost) {
            expect(left.buffers).toBeLessThanOrEqual(THREE_INTERNALS.buffers);
            expect(left.textures).toBeLessThanOrEqual(THREE_INTERNALS.textures);
            expect(left.programs).toBeLessThanOrEqual(THREE_INTERNALS.programs);
        }
    });
});
