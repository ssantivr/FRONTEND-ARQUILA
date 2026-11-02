import { MathUtils, type OrthographicCamera, type PerspectiveCamera } from "three";

export const FOCUS_MARGIN = 1.8;

const MIN_DISTANCE_FACTOR = 0.08;
const MAX_DISTANCE_FACTOR = 4;
const NEAR_FACTOR = 1 / 200;
const FAR_FACTOR = 12;

/**
 * How far a camera must stand for a sphere to fit in view. `fill` is the share of the canvas the
 * model may take, so that panels laid over the scene do not cover it.
 */
export function fitDistance(radius: number, fov: number, aspect: number, fill: number): number {
    const fitAngle = Math.min(fov, fov * aspect) / 2;

    return radius / Math.sin(MathUtils.degToRad(fitAngle)) / fill;
}

/** Clipping planes and orbit limits for a model of this size, seen from its fit distance. */
export function cameraLimits(radius: number, whole: number) {
    return {
        near: whole * NEAR_FACTOR,
        far: whole * FAR_FACTOR,
        minDistance: radius * MIN_DISTANCE_FACTOR,
        maxDistance: whole * MAX_DISTANCE_FACTOR,
    };
}

/**
 * Places the orthographic camera where the perspective one is and sizes its frustum to show, at
 * the orbit target, exactly what the perspective camera shows there. Moving closer or farther
 * therefore zooms it, and switching projection keeps the model framed.
 */
export function matchOrthographic(
    orthographic: OrthographicCamera,
    camera: PerspectiveCamera,
    distance: number,
): void {
    const half = distance * Math.tan(MathUtils.degToRad(camera.fov / 2));

    orthographic.position.copy(camera.position);
    orthographic.quaternion.copy(camera.quaternion);
    orthographic.left = -half * camera.aspect;
    orthographic.right = half * camera.aspect;
    orthographic.top = half;
    orthographic.bottom = -half;
    orthographic.near = camera.near;
    orthographic.far = camera.far;
    orthographic.updateProjectionMatrix();
    orthographic.updateMatrixWorld();
}
