import { MathUtils, PerspectiveCamera, Sphere, Spherical, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type ViewName = "isometric" | "front" | "side" | "top";

const VIEW_DIRECTIONS: Record<ViewName, Vector3> = {
    isometric: new Vector3(0.7, 0.6, 1).normalize(),
    front: new Vector3(0, 0.22, 1).normalize(),
    side: new Vector3(1, 0.22, 0).normalize(),
    top: new Vector3(0, 1, 0.001).normalize(),
};

const TRANSITION_MS = 700;
const FOCUS_MARGIN = 1.8;
const PAN_LIMIT_FACTOR = 1.5;
const MIN_DISTANCE_FACTOR = 0.08;
const MAX_DISTANCE_FACTOR = 4;

interface Transition {
    startedAt: number | null;
    fromTarget: Vector3;
    toTarget: Vector3;
    from: Spherical;
    to: Spherical;
}

export interface CameraRig {
    fit: (bounds: Sphere) => void;
    frame: (view: ViewName, animate: boolean) => void;
    focus: (volume: Sphere | null, toward?: Vector3) => void;
    lookFrom: (position: Vector3, target: Vector3) => void;
    zoomBy: (factor: number) => void;
    zoomPercent: () => number;
    distance: () => number;
    update: (time: number) => boolean;
    dispose: () => void;
}

function shortestTurn(angle: number): number {
    return MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

function easeInOut(progress: number): number {
    return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let transition: Transition | null = null;

    function viewDistance(radius = scene.radius): number {
        const fitAngle = Math.min(camera.fov, camera.fov * camera.aspect) / 2;

        return radius / Math.sin(MathUtils.degToRad(fitAngle));
    }

    function distance(): number {
        return camera.position.distanceTo(controls.target);
    }

    function direction(): Vector3 {
        return camera.position.clone().sub(controls.target);
    }

    function fit(bounds: Sphere): void {
        const whole = viewDistance(bounds.radius);

        scene.copy(bounds);
        camera.near = whole / 200;
        camera.far = whole * 12;
        camera.updateProjectionMatrix();
        controls.minDistance = scene.radius * MIN_DISTANCE_FACTOR;
        controls.maxDistance = whole * MAX_DISTANCE_FACTOR;
    }

    function moveTo(target: Vector3, toward: Vector3, reach: number, animate: boolean): void {
        const length = MathUtils.clamp(reach, controls.minDistance, controls.maxDistance);
        const to = new Spherical().setFromVector3(toward.clone().setLength(length));

        if (!animate || reducedMotion.matches) {
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
        const { from, to } = transition;

        controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
        current.set(
            MathUtils.lerp(from.radius, to.radius, eased),
            MathUtils.lerp(from.phi, to.phi, eased),
            MathUtils.lerp(from.theta, to.theta, eased),
        );
        camera.position.setFromSpherical(current).add(controls.target);
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
        dispose: () => {
            controls.removeEventListener("change", handleChange);
            controls.removeEventListener("start", cancelTransition);
            controls.dispose();
        },
    };
}
