import {
    Mesh,
    MeshBasicMaterial,
    Raycaster,
    SphereGeometry,
    Vector2,
    Vector3,
    type BufferGeometry,
    type Intersection,
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import { measurementOf, snapToVertex, type Measurement, type Point3 } from "../../utils/measure";
import type { ExperienceEngine } from "../engine/ExperienceEngine";
import type { SceneContents } from "./contents";

const COLOR = 0x00c8ff;
const MARKER_RADIUS_M = 0.07;
const LINE_WIDTH_PX = 2;
const CLICK_TOLERANCE_PX = 4;
// Drawn over the model, so a point behind a wall can still be seen once it is placed.
const ON_TOP = 999;

export interface MeasureTool {
    setActive: (active: boolean) => void;
    clear: () => void;
    dispose: () => void;
}

type End = { point: Point3; snapped: boolean };

function toPoint(vector: Vector3): Point3 {
    return [vector.x, vector.y, vector.z];
}

/** The corners of the triangle that was hit, in world coordinates. */
function faceCorners(hit: Intersection): Point3[] {
    if (hit.face == null || !(hit.object instanceof Mesh)) {
        return [];
    }

    const position = (hit.object.geometry as BufferGeometry).getAttribute("position");
    const corner = new Vector3();

    return [hit.face.a, hit.face.b, hit.face.c].map((index) =>
        toPoint(corner.fromBufferAttribute(position, index).applyMatrix4(hit.object.matrixWorld)),
    );
}

/**
 * Measures straight distances on the model: the first click places one end, the second the other
 * and reports the measurement, the third starts again. Each end jumps to the corner of the face it
 * hit when the click is near one. Units are metres, the units of the scene.
 */
export function createMeasureTool(
    contents: SceneContents,
    engine: ExperienceEngine,
    onMeasure: (measurement: Measurement | null) => void,
): MeasureTool {
    const { canvas, resources, overlay } = engine;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const markerGeometry = resources.track(new SphereGeometry(MARKER_RADIUS_M, 16, 12));
    const markerMaterial = resources.track(
        new MeshBasicMaterial({
            color: COLOR,
            depthTest: false,
            transparent: true,
            fog: false,
            toneMapped: false,
        }),
    );
    const lineMaterial = resources.track(
        new LineMaterial({
            color: COLOR,
            linewidth: LINE_WIDTH_PX,
            depthTest: false,
            toneMapped: false,
        }),
    );
    const markers = [
        new Mesh(markerGeometry, markerMaterial),
        new Mesh(markerGeometry, markerMaterial),
    ];
    let line: LineSegments2 | null = null;
    let ends: End[] = [];
    let active = false;
    let pressX = 0;
    let pressY = 0;

    engine.trackLineMaterials(lineMaterial);

    for (const marker of markers) {
        marker.renderOrder = ON_TOP;
        marker.visible = false;
        marker.raycast = () => undefined;
        overlay.add(marker);
    }

    function removeLine(): void {
        if (line !== null) {
            line.removeFromParent();
            line.geometry.dispose();
            line = null;
        }
    }

    function draw(): void {
        markers.forEach((marker, index) => {
            const end = ends[index];

            marker.visible = end !== undefined;

            if (end !== undefined) {
                marker.position.set(...end.point);
            }
        });

        removeLine();

        if (ends.length === 2) {
            line = new LineSegments2(
                new LineSegmentsGeometry().setPositions([...ends[0].point, ...ends[1].point]),
                lineMaterial,
            );
            line.renderOrder = ON_TOP;
            line.raycast = () => undefined;
            overlay.add(line);
        }

        engine.invalidate();
    }

    function hitAt(event: PointerEvent): Intersection | undefined {
        const box = canvas.getBoundingClientRect();

        pointer.set(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            -((event.clientY - box.top) / box.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, engine.activeCamera());

        // Slabs, frames and doors are children of their room: they can be measured too. Lines
        // (edges, wireframe) are skipped; clipped-away geometry is not there to be measured.
        return raycaster
            .intersectObjects(
                contents.elements.filter((mesh) => mesh.visible),
                true,
            )
            .find(
                (hit) =>
                    hit.object instanceof Mesh &&
                    hit.object.visible &&
                    engine.cutPlanes.every((plane) => plane.distanceToPoint(hit.point) >= 0),
            );
    }

    function handlePointerDown(event: PointerEvent): void {
        pressX = event.clientX;
        pressY = event.clientY;
    }

    function handlePointerUp(event: PointerEvent): void {
        const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY);

        // A drag orbits the camera; only a click places a point.
        if (!active || event.button !== 0 || moved > CLICK_TOLERANCE_PX) {
            return;
        }

        const hit = hitAt(event);

        if (hit === undefined) {
            return;
        }

        const end = snapToVertex(toPoint(hit.point), faceCorners(hit));

        ends = ends.length === 2 ? [end] : [...ends, end];
        draw();
        onMeasure(ends.length === 2 ? measurementOf(ends[0], ends[1]) : null);
    }

    function clear(): void {
        ends = [];
        draw();
        onMeasure(null);
    }

    return {
        setActive: (next) => {
            if (next === active) {
                return;
            }

            active = next;

            if (active) {
                canvas.addEventListener("pointerdown", handlePointerDown);
                canvas.addEventListener("pointerup", handlePointerUp);
                canvas.style.cursor = "crosshair";
            } else {
                canvas.removeEventListener("pointerdown", handlePointerDown);
                canvas.removeEventListener("pointerup", handlePointerUp);
                canvas.style.cursor = "";
                clear();
            }
        },
        clear,
        dispose: () => {
            canvas.removeEventListener("pointerdown", handlePointerDown);
            canvas.removeEventListener("pointerup", handlePointerUp);
            canvas.style.cursor = "";
            removeLine();

            for (const marker of markers) {
                marker.removeFromParent();
            }
        },
    };
}
