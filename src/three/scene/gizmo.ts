import { Vector3, type Object3D } from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import { disposeObject } from "../dispose";
import type { ExperienceEngine } from "../engine/ExperienceEngine";
import type { SceneContents } from "./contents";

/** Rooms are moved on the plan and resized there; height and level are edited in the inspector,
 *  and rooms store no rotation, so the gizmo offers neither the vertical axis nor rotation. */
export type GizmoMode = "translate" | "scale";

/** What a drag did, in plan terms: metres along x and y of the plan, and size factors. */
export interface GizmoChange {
    key: string;
    mode: GizmoMode;
    dxM: number;
    dyM: number;
    scaleX: number;
    scaleY: number;
}

export interface RoomGizmo {
    /** Puts the gizmo on the element with this key, or takes it away with null. */
    attach: (key: string | null) => void;
    setMode: (mode: GizmoMode) => void;
    /** Grid step of the translation, in metres. */
    setSnap: (metres: number) => void;
    /** After the model was rebuilt: follows the new mesh of the same element and the camera. */
    sync: () => void;
    dispose: () => void;
}

const MIN_CHANGE = 1e-4;

export function createRoomGizmo(
    contents: SceneContents,
    engine: ExperienceEngine,
    onDragging: (dragging: boolean) => void,
    onChange: (change: GizmoChange) => void,
): RoomGizmo {
    const controls = new TransformControls(engine.activeCamera(), engine.canvas);
    const helper = controls.getHelper();
    const startPosition = new Vector3();
    const startScale = new Vector3(1, 1, 1);
    let key: string | null = null;
    let mode: GizmoMode = "translate";

    controls.setSpace("world");
    controls.showY = false;
    controls.setMode(mode);
    engine.overlay.add(helper);

    function target(): Object3D | undefined {
        return key === null
            ? undefined
            : contents.elements.find((mesh) => mesh.userData.key === key);
    }

    function place(): void {
        const mesh = target();

        if (mesh === undefined) {
            controls.detach();
        } else if (controls.object !== mesh) {
            controls.attach(mesh);
        }

        controls.camera = engine.activeCamera();
        engine.invalidate();
    }

    function handleDragging(event: { value: unknown }): void {
        const dragging = event.value === true;
        const object = controls.object;

        onDragging(dragging);

        if (object === undefined) {
            return;
        }

        if (dragging) {
            startPosition.copy(object.position);
            startScale.copy(object.scale);
            return;
        }

        const change: GizmoChange = {
            key: object.userData.key as string,
            mode,
            // The plan's y runs along the scene's -z (see buildElement).
            dxM: object.position.x - startPosition.x,
            dyM: -(object.position.z - startPosition.z),
            scaleX: object.scale.x / startScale.x,
            scaleY: object.scale.z / startScale.z,
        };

        const moved =
            Math.abs(change.dxM) > MIN_CHANGE ||
            Math.abs(change.dyM) > MIN_CHANGE ||
            Math.abs(change.scaleX - 1) > MIN_CHANGE ||
            Math.abs(change.scaleY - 1) > MIN_CHANGE;

        // The mesh goes back to where it was: the scene only ever draws saved values. A saved
        // change reloads the model and redraws the room in its new place; a change that fails,
        // is undone or snaps back to the same values leaves it where it is stored.
        object.position.copy(startPosition);
        object.scale.copy(startScale);
        engine.invalidate();

        if (moved) {
            onChange(change);
        }
    }

    const invalidate = () => engine.invalidate();

    controls.addEventListener("dragging-changed", handleDragging);
    controls.addEventListener("objectChange", invalidate);
    controls.addEventListener("change", invalidate);

    return {
        attach: (next) => {
            key = next;
            place();
        },
        setMode: (next) => {
            mode = next;
            controls.setMode(next);
            engine.invalidate();
        },
        setSnap: (metres) => {
            controls.translationSnap = metres;
        },
        sync: place,
        dispose: () => {
            controls.removeEventListener("dragging-changed", handleDragging);
            controls.removeEventListener("objectChange", invalidate);
            controls.removeEventListener("change", invalidate);
            controls.detach();
            helper.removeFromParent();
            controls.dispose();
            disposeObject(helper);
        },
    };
}
