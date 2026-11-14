import { LineBasicMaterial, LineSegments, WireframeGeometry, type Plane } from "three";

import type { Resources } from "../engine/resources";
import type { RenderMode, SceneContents } from "./contents";

const WIRE_COLOR = 0x00c8ff;
const WIRE_OPACITY = 0.38;

export interface RenderModes {
    /** Shows or hides the wireframe of every element; builds the missing ones on demand. */
    sync: () => void;
}

/**
 * The wireframe overlay of the render modes. The triangles of each element are drawn over its
 * solid: the wires are children of the element, so they move, explode, hide and are freed with
 * it. One material is shared by all of them and lives as long as the engine.
 */
export function createRenderModes(
    contents: SceneContents,
    resources: Resources,
    cutPlanes: Plane[],
): RenderModes {
    const material = resources.track(
        new LineBasicMaterial({
            color: WIRE_COLOR,
            transparent: true,
            opacity: WIRE_OPACITY,
            depthWrite: false,
        }),
    );

    material.clippingPlanes = cutPlanes;
    // disposeObject skips it when an element goes; the registry frees it with the engine.
    material.userData.shared = true;

    return {
        sync: () => {
            const wired = contents.renderMode === "wireframe";

            for (const mesh of contents.elements) {
                let wire = mesh.userData.wire as LineSegments | undefined;

                if (wired && wire === undefined) {
                    wire = new LineSegments(new WireframeGeometry(mesh.geometry), material);
                    // Never picked: a click goes to the element under it.
                    wire.raycast = () => undefined;
                    mesh.add(wire);
                    mesh.userData.wire = wire;
                }

                if (wire !== undefined) {
                    wire.visible = wired;
                }
            }
        },
    };
}

export const RENDER_MODES: readonly RenderMode[] = ["solid", "wireframe", "materials"];
