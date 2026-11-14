import { Box3, Raycaster, Sphere, Vector2, Vector3, type BufferGeometry } from "three";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type { ExperienceEngine } from "../engine/ExperienceEngine";
import type { SceneContents } from "./contents";

const CLICK_TOLERANCE_PX = 4;
const INSPECT_POLAR = 0.75;

export interface Selection {
    select: (key: string | null) => void;
    focus: (key: string | null, azimuth?: number) => void;
    /** Rebuilds the outline of the selected element, after the model changed. */
    outline: () => void;
    removeOutline: () => void;
    /** Hover is resolved once per frame, however many times the pointer moved. */
    flushHover: () => void;
    /** Off while another tool (measuring, the gizmo) owns the clicks on the canvas. */
    setPicking: (enabled: boolean) => void;
    /**
     * The pointer release that ends a gizmo drag is not a selection click, even when the
     * pointer did not move. The next press clears it, whatever order the listeners run in.
     */
    ignoreNextClick: () => void;
    attach: () => void;
    detach: () => void;
}

export function createSelection(
    contents: SceneContents,
    engine: ExperienceEngine,
    outlineMaterial: LineMaterial,
    paint: () => void,
    onSelect: (key: string | null) => void,
): Selection {
    const { canvas, rig } = engine;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let outline: LineSegments2 | null = null;
    let pendingHover: PointerEvent | null = null;
    let pressX = 0;
    let pressY = 0;
    let picking = true;
    let ignoringClick = false;

    function removeOutline(): void {
        if (outline !== null) {
            outline.removeFromParent();
            outline.geometry.dispose();
            outline = null;
        }
    }

    function outlineSelection(): void {
        removeOutline();

        const mesh = contents.elements.find((item) => item.userData.key === contents.selectedKey);

        if (mesh !== undefined) {
            const lines = mesh.userData.lines as BufferGeometry;

            outline = new LineSegments2(
                new LineSegmentsGeometry().setPositions([...lines.getAttribute("position").array]),
                outlineMaterial,
            );
            mesh.add(outline);
        }
    }

    function focus(key: string | null, azimuth?: number): void {
        const mesh = [...contents.elements, ...contents.overlays].find(
            (item) => item.userData.key === key,
        );

        rig.focus(
            mesh === undefined
                ? null
                : new Box3().setFromObject(mesh).getBoundingSphere(new Sphere()),
            azimuth === undefined
                ? undefined
                : new Vector3().setFromSphericalCoords(1, INSPECT_POLAR, azimuth),
        );
    }

    function pick(event: MouseEvent): string | null {
        const box = canvas.getBoundingClientRect();

        pointer.set(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            -((event.clientY - box.top) / box.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, engine.activeCamera());

        // The work layers are drawn over the model, so they are also picked before it.
        const [hit] = [contents.overlays, contents.elements].flatMap((group) =>
            raycaster
                .intersectObjects(
                    group.filter((mesh) => mesh.visible),
                    false,
                )
                .slice(0, 1),
        );

        return hit === undefined ? null : (hit.object.userData.key as string);
    }

    function handlePointerDown(event: PointerEvent): void {
        pressX = event.clientX;
        pressY = event.clientY;
        ignoringClick = false;
    }

    function handlePointerUp(event: PointerEvent): void {
        const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY);
        const ignored = ignoringClick;

        ignoringClick = false;

        if (!ignored && picking && event.button === 0 && moved <= CLICK_TOLERANCE_PX) {
            onSelect(pick(event));
        }
    }

    function handlePointerMove(event: PointerEvent): void {
        pendingHover = event;
    }

    function setHovered(key: string | null): void {
        contents.hoveredKey = key;
        canvas.style.cursor = key === null ? "" : "pointer";
        paint();
    }

    function handlePointerLeave(): void {
        pendingHover = null;

        if (contents.hoveredKey !== null) {
            setHovered(null);
        }
    }

    function handleDoubleClick(event: MouseEvent): void {
        if (!picking) {
            return;
        }

        const key = pick(event);

        if (key !== null) {
            onSelect(key);
        }

        focus(key);
        engine.invalidate();
    }

    return {
        select: (key) => {
            contents.selectedKey = key;
            outlineSelection();
            paint();
        },
        focus,
        outline: outlineSelection,
        removeOutline,
        flushHover: () => {
            if (pendingHover !== null) {
                const key = picking && pendingHover.buttons === 0 ? pick(pendingHover) : null;

                if (key !== contents.hoveredKey) {
                    setHovered(key);
                }

                pendingHover = null;
            }
        },
        setPicking: (enabled) => {
            picking = enabled;

            if (!enabled && contents.hoveredKey !== null) {
                setHovered(null);
            }
        },
        ignoreNextClick: () => {
            ignoringClick = true;
        },
        attach: () => {
            canvas.addEventListener("pointerdown", handlePointerDown);
            canvas.addEventListener("pointerup", handlePointerUp);
            canvas.addEventListener("pointermove", handlePointerMove);
            canvas.addEventListener("pointerleave", handlePointerLeave);
            canvas.addEventListener("dblclick", handleDoubleClick);
        },
        detach: () => {
            canvas.removeEventListener("pointerdown", handlePointerDown);
            canvas.removeEventListener("pointerup", handlePointerUp);
            canvas.removeEventListener("pointermove", handlePointerMove);
            canvas.removeEventListener("pointerleave", handlePointerLeave);
            canvas.removeEventListener("dblclick", handleDoubleClick);
        },
    };
}
