import type { OrthographicCamera, PerspectiveCamera, Sphere } from "three";
import { Vector3 } from "three";

import type { SceneLights } from "../materials/environment";

const STILL_SUN_SPREAD = 0.024;

export interface StillJob {
    width: number;
    height: number;
    /**
     * Frames averaged into the image: each one shifts the camera a fraction of a pixel and the
     * sun a fraction of a degree, which smooths the edges and softens the shadows.
     */
    samples: number;
    shadowMapSize: number;
    onProgress: (done: number, total: number) => void;
    signal?: AbortSignal;
}

/** Low-discrepancy sequence: spreads the samples of a still evenly inside the pixel. */
export function halton(index: number, base: number): number {
    // Below 2, or from an unbounded index, the loop would never end: the rest would not shrink.
    if (!Number.isInteger(base) || base < 2 || !Number.isSafeInteger(index) || index < 0) {
        throw new RangeError(`halton needs an index of 0 or more and an integer base of 2 or more`);
    }

    let result = 0;
    let fraction = 1 / base;

    for (let rest = index; rest > 0; rest = Math.floor(rest / base)) {
        result += fraction * (rest % base);
        fraction /= base;
    }

    return result;
}

/**
 * Moves the camera a fraction of a pixel and the sun a fraction of a degree for the sample
 * `index` of a still, around the sun direction it had before the still began.
 */
export function jitterSample(
    index: number,
    job: StillJob,
    camera: PerspectiveCamera | OrthographicCamera,
    lights: SceneLights,
    restingDirection: Vector3,
    bounds: Sphere,
): void {
    const offset = new Vector3(halton(index + 1, 5) - 0.5, 0, halton(index + 1, 7) - 0.5);

    camera.setViewOffset(
        job.width,
        job.height,
        halton(index + 1, 2) - 0.5,
        halton(index + 1, 3) - 0.5,
        job.width,
        job.height,
    );
    lights.direction
        .copy(restingDirection)
        .add(offset.multiplyScalar(STILL_SUN_SPREAD))
        .normalize();
    lights.placeSun(bounds);
}
