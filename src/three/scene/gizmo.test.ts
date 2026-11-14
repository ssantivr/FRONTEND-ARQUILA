import { BoxGeometry, EventDispatcher, Group, Mesh, Object3D } from "three";
import { describe, expect, it, vi } from "vitest";

import { SCENE_PALETTES } from "../lightingPalette";
import type { ExperienceEngine } from "../engine/ExperienceEngine";
import { createSceneContents } from "./contents";
import type { ElementMesh } from "./elements";
import { createRoomGizmo, type GizmoChange } from "./gizmo";

/** Stands in for TransformControls, which needs a browser: the test plays the drag itself. */
const fake = vi.hoisted(() => ({ controls: null as null | Record<string, unknown> }));

vi.mock("three/examples/jsm/controls/TransformControls.js", async () => {
    const three = await import("three");

    class FakeControls extends three.EventDispatcher<{
        "dragging-changed": { value: boolean };
        objectChange: object;
        change: object;
    }> {
        object: Object3D | undefined = undefined;
        camera: unknown;
        showY = true;
        translationSnap: number | null = null;
        readonly helper = new three.Object3D();
        readonly dispose = vi.fn();

        constructor(camera: unknown) {
            super();
            this.camera = camera;
            fake.controls = this as unknown as Record<string, unknown>;
        }

        getHelper() {
            return this.helper;
        }

        setSpace() {}

        setMode() {}

        attach(object: Object3D) {
            this.object = object;
        }

        detach() {
            this.object = undefined;
        }
    }

    return { TransformControls: FakeControls };
});

type Controls = EventDispatcher<{ "dragging-changed": { value: boolean } }> & {
    object: Object3D | undefined;
    helper: Object3D;
    dispose: ReturnType<typeof vi.fn>;
};

function setUp() {
    const contents = createSceneContents(SCENE_PALETTES.dark);
    const overlay = new Group();
    const engine = {
        overlay,
        canvas: {},
        activeCamera: () => ({}),
        invalidate: vi.fn(),
    } as unknown as ExperienceEngine;
    const mesh = new Mesh(new BoxGeometry(1, 1, 1)) as unknown as ElementMesh;
    const onChange = vi.fn<(change: GizmoChange) => void>();

    mesh.userData.key = "room-1";
    contents.elements = [mesh];

    const gizmo = createRoomGizmo(contents, engine, vi.fn(), onChange);
    gizmo.attach("room-1");

    return { gizmo, mesh, overlay, onChange, controls: fake.controls as unknown as Controls };
}

function drag(controls: Controls, move: () => void) {
    controls.dispatchEvent({ type: "dragging-changed", value: true });
    move();
    controls.dispatchEvent({ type: "dragging-changed", value: false });
}

describe("room gizmo", () => {
    it("lives in the overlay, so images of the model leave it out", () => {
        const { overlay, controls } = setUp();

        expect(overlay.children).toContain(controls.helper);
    });

    it("reports a move in plan metres and puts the mesh back until the change is saved", () => {
        const { mesh, onChange, controls } = setUp();

        drag(controls, () => mesh.position.set(1.5, 0, -2));

        expect(onChange).toHaveBeenCalledWith({
            key: "room-1",
            mode: "translate",
            dxM: 1.5,
            // The plan's y runs along the scene's -z.
            dyM: 2,
            scaleX: 1,
            scaleY: 1,
        });
        expect(mesh.position.toArray()).toEqual([0, 0, 0]);
    });

    it("reports a resize as size factors and puts the scale back", () => {
        const { gizmo, mesh, onChange, controls } = setUp();

        gizmo.setMode("scale");
        drag(controls, () => mesh.scale.set(2, 1, 0.5));

        expect(onChange.mock.calls[0][0]).toMatchObject({ mode: "scale", scaleX: 2, scaleY: 0.5 });
        expect(mesh.scale.toArray()).toEqual([1, 1, 1]);
    });

    it("ignores a drag that changed nothing", () => {
        const { mesh, onChange, controls } = setUp();

        drag(controls, () => mesh.position.set(0.00001, 0, 0));

        expect(onChange).not.toHaveBeenCalled();
        expect(mesh.position.x).toBe(0);
    });

    it("leaves the overlay and stops listening when disposed", () => {
        const { gizmo, mesh, overlay, onChange, controls } = setUp();

        gizmo.dispose();
        drag(controls, () => mesh.position.set(3, 0, 0));

        expect(overlay.children).toHaveLength(0);
        expect(controls.dispose).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });
});
