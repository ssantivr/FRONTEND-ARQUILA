import { Box3, PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const TRANSITION_MS = 900;
const CLEARANCE = 0.3;
const AXES = ["x", "y", "z"] as const;

export interface Viewpoint {
    position: [number, number, number];
    target: [number, number, number];
}

export interface InteriorCamera {
    flyTo: (viewpoint: Viewpoint, animate: boolean) => void;
    update: (time: number) => boolean;
    dispose: () => void;
}

interface Transition {
    startedAt: number | null;
    fromPosition: Vector3;
    fromTarget: Vector3;
    toPosition: Vector3;
    toTarget: Vector3;
}

function easeInOut(progress: number): number {
    return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

function pushOut(point: Vector3, solid: Box3): void {
    let nearest = Infinity;
    let axis: (typeof AXES)[number] = "x";
    let face = 0;

    for (const candidate of AXES) {
        const low = solid.min[candidate] - CLEARANCE;
        const high = solid.max[candidate] + CLEARANCE;

        if (point[candidate] <= low || point[candidate] >= high) {
            return;
        }

        for (const side of [low, high]) {
            if (Math.abs(point[candidate] - side) < nearest) {
                nearest = Math.abs(point[candidate] - side);
                axis = candidate;
                face = side;
            }
        }
    }

    point[axis] = face;
}

export function createInteriorCamera(
    camera: PerspectiveCamera,
    canvas: HTMLCanvasElement,
    room: Box3,
    solids: Box3[],
    onChange: () => void,
): InteriorCamera {
    const controls = new OrbitControls(camera, canvas);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let transition: Transition | null = null;

    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.55;
    controls.panSpeed = 0.6;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 0.8;
    controls.maxDistance = 9;

    function handleChange(): void {
        room.clampPoint(controls.target, controls.target);
        room.clampPoint(camera.position, camera.position);

        for (const solid of solids) {
            pushOut(camera.position, solid);
        }

        onChange();
    }

    function cancelTransition(): void {
        transition = null;
    }

    function flyTo(viewpoint: Viewpoint, animate: boolean): void {
        const toPosition = new Vector3(...viewpoint.position);
        const toTarget = new Vector3(...viewpoint.target);

        if (!animate || reducedMotion.matches) {
            transition = null;
            camera.position.copy(toPosition);
            controls.target.copy(toTarget);
            controls.update();
            onChange();

            return;
        }

        transition = {
            startedAt: null,
            fromPosition: camera.position.clone(),
            fromTarget: controls.target.clone(),
            toPosition,
            toTarget,
        };
    }

    function update(time: number): boolean {
        if (transition === null) {
            controls.update();

            return false;
        }

        transition.startedAt ??= time;

        const progress = Math.min((time - transition.startedAt) / TRANSITION_MS, 1);
        const eased = easeInOut(progress);

        camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
        controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
        camera.lookAt(controls.target);

        if (progress === 1) {
            transition = null;
            controls.update();
        }

        onChange();

        return true;
    }

    controls.addEventListener("change", handleChange);
    controls.addEventListener("start", cancelTransition);

    return {
        flyTo,
        update,
        dispose: () => {
            controls.removeEventListener("change", handleChange);
            controls.removeEventListener("start", cancelTransition);
            controls.dispose();
        },
    };
}
