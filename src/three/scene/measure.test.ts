import { BoxGeometry, Group, Mesh, PerspectiveCamera, Plane, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import type { Measurement } from "../../utils/measure";
import { createResources } from "../engine/resources";
import type { ExperienceEngine } from "../engine/ExperienceEngine";
import { SCENE_PALETTES } from "../lightingPalette";
import { createSceneContents } from "./contents";
import type { ElementMesh } from "./elements";
import { createMeasureTool } from "./measure";

/** A 100 × 100 px canvas without a browser: the tool only needs its events, box and cursor. */
function fakeCanvas() {
    const target = new EventTarget();

    return Object.assign(target, {
        style: { cursor: "" },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
}

function setUp(cutPlanes: Plane[] = []) {
    const canvas = fakeCanvas();
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    const overlay = new Group();
    const resources = createResources();
    const engine = {
        canvas,
        overlay,
        resources,
        cutPlanes,
        activeCamera: () => camera,
        trackLineMaterials: vi.fn(),
        invalidate: vi.fn(),
    } as unknown as ExperienceEngine;
    const contents = createSceneContents(SCENE_PALETTES.dark);
    // A wall 10 m wide whose front face is at z = 0.5, seen straight on from 10 m away.
    const wall = new Mesh(new BoxGeometry(10, 10, 1)) as unknown as ElementMesh;
    const onMeasure = vi.fn<(measurement: Measurement | null) => void>();

    camera.position.set(0, 0, 10);
    camera.lookAt(new Vector3(0, 0, 0));
    camera.updateMatrixWorld();
    wall.updateMatrixWorld();
    contents.elements = [wall];

    const tool = createMeasureTool(contents, engine, onMeasure);

    return { tool, canvas, overlay, onMeasure, resources };
}

function click(canvas: EventTarget, x: number, y: number) {
    for (const type of ["pointerdown", "pointerup"]) {
        canvas.dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: y, button: 0 }));
    }
}

describe("measure tool", () => {
    it("does nothing until it is switched on", () => {
        const { canvas, onMeasure } = setUp();

        click(canvas, 50, 50);

        expect(onMeasure).not.toHaveBeenCalled();
    });

    it("measures between two clicks on the model, drawn in the overlay", () => {
        const { tool, canvas, overlay, onMeasure } = setUp();

        tool.setActive(true);
        expect(canvas.style.cursor).toBe("crosshair");

        click(canvas, 50, 50);
        expect(onMeasure).toHaveBeenLastCalledWith(null);

        click(canvas, 70, 50);
        const measurement = onMeasure.mock.lastCall?.[0];

        expect(measurement?.from[2]).toBeCloseTo(0.5);
        expect(measurement?.to[2]).toBeCloseTo(0.5);
        expect(measurement?.distanceM).toBeGreaterThan(0);
        // Two markers and the line, all in the overlay that images of the model leave out.
        expect(overlay.children.filter((child) => child.visible)).toHaveLength(3);
    });

    it("starts again on the third click", () => {
        const { tool, canvas, onMeasure } = setUp();

        tool.setActive(true);
        click(canvas, 50, 50);
        click(canvas, 70, 50);
        click(canvas, 60, 50);

        expect(onMeasure).toHaveBeenLastCalledWith(null);
    });

    it("ignores a click where the cut plane hides the model", () => {
        // Keeps only what lies behind z = 0: the front face of the wall is cut away.
        const { tool, canvas, onMeasure } = setUp([new Plane(new Vector3(0, 0, -1), 0)]);

        tool.setActive(true);
        click(canvas, 50, 50);

        expect(onMeasure).not.toHaveBeenCalled();
    });

    it("clears the measurement and the cursor when switched off or disposed", () => {
        const { tool, canvas, overlay, onMeasure } = setUp();

        tool.setActive(true);
        click(canvas, 50, 50);
        click(canvas, 70, 50);
        tool.setActive(false);

        expect(onMeasure).toHaveBeenLastCalledWith(null);
        expect(canvas.style.cursor).toBe("");
        expect(overlay.children.filter((child) => child.visible)).toHaveLength(0);

        tool.setActive(true);
        tool.dispose();
        expect(canvas.style.cursor).toBe("");
        expect(overlay.children).toHaveLength(0);
    });
});
