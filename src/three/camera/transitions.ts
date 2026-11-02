import { MathUtils, Spherical, type Vector3 } from "three";

export const TRANSITION_MS = 700;

export interface Transition {
    startedAt: number | null;
    fromTarget: Vector3;
    toTarget: Vector3;
    from: Spherical;
    to: Spherical;
}

/** The same angle, as the smallest turn to either side: from -π to π. */
export function shortestTurn(angle: number): number {
    return MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

export function easeInOut(progress: number): number {
    return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

/** Writes in `into` the position around the target at a point (0–1) of the eased move. */
export function interpolate({ from, to }: Transition, eased: number, into: Spherical): Spherical {
    return into.set(
        MathUtils.lerp(from.radius, to.radius, eased),
        MathUtils.lerp(from.phi, to.phi, eased),
        MathUtils.lerp(from.theta, to.theta, eased),
    );
}
