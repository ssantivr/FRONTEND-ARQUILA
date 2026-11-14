import { prefersReducedMotion } from "../../state/motion";
import { MathUtils, PerspectiveCamera, Sphere, Spherical, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { FOCUS_MARGIN, cameraLimits, fitDistance } from "./frameToFit";
import {
    TRANSITION_MS,
    easeInOut,
    interpolate,
    shortestTurn,
    type Transition,
} from "./transitions";
import { VIEW_DIRECTIONS, type ViewName } from "./views";

export type { ViewName };

const PAN_LIMIT_FACTOR = 1.5;

export interface CameraRig {
    fit: (bounds: Sphere) => void;
    /** Share of the canvas the model may fill (0–1), for panels laid over the scene. */
    setFill: (fill: number) => void;
    frame: (view: ViewName, animate: boolean) => void;
    focus: (volume: Sphere | null, toward?: Vector3) => void;
    lookFrom: (position: Vector3, target: Vector3) => void;
    zoomBy: (factor: number) => void;
    zoomPercent: () => number;
    distance: () => number;
    update: (time: number) => boolean;
    /** Off while the transform gizmo is dragged, so the drag moves the room, not the camera. */
    setEnabled: (enabled: boolean) => void;
    dispose: () => void;
}

export function createCameraRig(
    camera: PerspectiveCamera,
    canvas: HTMLCanvasElement,
    onChange: () => void,
): CameraRig {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;
    controls.zoomToCursor = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    const scene = new Sphere(new Vector3(), 1);
    const offset = new Vector3();
    const current = new Spherical();
    let transition: Transition | null = null;
    let fill = 1;

    function viewDistance(radius = scene.radius): number {
        return fitDistance(radius, camera.fov, camera.aspect, fill);
    }

    function distance(): number {
        return camera.position.distanceTo(controls.target);
    }

    function direction(): Vector3 {
        return camera.position.clone().sub(controls.target);
    }

    function fit(bounds: Sphere): void {
        const whole = viewDistance(bounds.radius);
        const limits = cameraLimits(bounds.radius, whole);

        scene.copy(bounds);
        camera.near = limits.near;
        camera.far = limits.far;
        camera.updateProjectionMatrix();
        controls.minDistance = limits.minDistance;
        controls.maxDistance = limits.maxDistance;
    }

    function moveTo(target: Vector3, toward: Vector3, reach: number, animate: boolean): void {
        const length = MathUtils.clamp(reach, controls.minDistance, controls.maxDistance);
        const to = new Spherical().setFromVector3(toward.clone().setLength(length));

        if (!animate || prefersReducedMotion()) {
            transition = null;
            controls.target.copy(target);
            camera.position.setFromSpherical(to).add(target);
            controls.update();
            onChange();

            return;
        }

        const from = new Spherical().setFromVector3(direction());

        to.theta = from.theta + shortestTurn(to.theta - from.theta);
        transition = {
            startedAt: null,
            fromTarget: controls.target.clone(),
            toTarget: target.clone(),
            from,
            to,
        };
    }

    function clampTarget(): void {
        const limit = scene.radius * PAN_LIMIT_FACTOR;
        const away = offset.copy(controls.target).sub(scene.center).length();

        if (away > limit) {
            offset.setLength(away - limit);
            controls.target.sub(offset);
            camera.position.sub(offset);
        }
    }

    function handleChange(): void {
        clampTarget();
        onChange();
    }

    function cancelTransition(): void {
        transition = null;
    }

    function update(time: number): boolean {
        if (transition === null) {
            controls.update();

            return false;
        }

        transition.startedAt ??= time;

        const progress = Math.min((time - transition.startedAt) / TRANSITION_MS, 1);
        const eased = easeInOut(progress);

        controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
        camera.position.setFromSpherical(interpolate(transition, eased, current));
        camera.position.add(controls.target);
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
        fit,
        setFill: (next) => {
            fill = MathUtils.clamp(next, 0.3, 1);
        },
        frame: (view, animate) =>
            moveTo(scene.center, VIEW_DIRECTIONS[view], viewDistance(), animate),
        focus: (volume, toward = direction()) =>
            volume === null
                ? moveTo(scene.center, toward, viewDistance(), true)
                : moveTo(volume.center, toward, viewDistance(volume.radius) * FOCUS_MARGIN, true),
        lookFrom: (position, target) =>
            moveTo(target, position.clone().sub(target), position.distanceTo(target), true),
        zoomBy: (factor) => moveTo(controls.target, direction(), distance() / factor, true),
        zoomPercent: () => Math.round((viewDistance() / distance()) * 100),
        distance,
        update,
        setEnabled: (enabled) => {
            controls.enabled = enabled;
        },
        dispose: () => {
            controls.removeEventListener("change", handleChange);
            controls.removeEventListener("start", cancelTransition);
            controls.dispose();
        },
    };
}
