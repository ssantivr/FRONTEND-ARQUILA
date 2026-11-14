import { PerspectiveCamera } from "three";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { describe, expect, it, vi } from "vitest";

import type { ExperienceEngine } from "../engine/ExperienceEngine";
import { SCENE_PALETTES } from "../lightingPalette";
import { createSceneContents } from "./contents";
import { createSelection } from "./selection";

/** A 100 × 100 px canvas without a browser: selection only needs its events, box and cursor. */
function fakeCanvas() {
    const target = new EventTarget();

    return Object.assign(target, {
        style: { cursor: "" },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
}

function setUp() {
    const canvas = fakeCanvas();
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    const engine = {
        canvas,
        rig: { focus: vi.fn() },
        activeCamera: () => camera,
        invalidate: vi.fn(),
    } as unknown as ExperienceEngine;
    const onSelect = vi.fn<(key: string | null) => void>();
    const selection = createSelection(
        createSceneContents(SCENE_PALETTES.dark),
        engine,
        {} as LineMaterial,
        () => undefined,
        onSelect,
    );

    selection.attach();

    return { canvas, selection, onSelect };
}

function dispatch(canvas: EventTarget, type: string) {
    canvas.dispatchEvent(Object.assign(new Event(type), { clientX: 50, clientY: 50, button: 0 }));
}

describe("selection", () => {
    it("selects on a click without movement", () => {
        const { canvas, onSelect } = setUp();

        dispatch(canvas, "pointerdown");
        dispatch(canvas, "pointerup");

        expect(onSelect).toHaveBeenCalledWith(null);
    });

    it("does not treat the release that ends a gizmo drag as a click", () => {
        const { canvas, selection, onSelect } = setUp();

        // The gizmo ends its drag on the same pointer release, before selection sees it.
        dispatch(canvas, "pointerdown");
        selection.ignoreNextClick();
        dispatch(canvas, "pointerup");

        expect(onSelect).not.toHaveBeenCalled();

        // The next click selects again.
        dispatch(canvas, "pointerdown");
        dispatch(canvas, "pointerup");

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("forgets the ignored click on the next press, whatever order the listeners ran in", () => {
        const { canvas, selection, onSelect } = setUp();

        // Here the gizmo ended its drag after selection had already handled the release.
        selection.ignoreNextClick();
        dispatch(canvas, "pointerdown");
        dispatch(canvas, "pointerup");

        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});
