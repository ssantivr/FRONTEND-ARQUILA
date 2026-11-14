/** Steps of the editor grid, in metres. */
export const SNAP_STEPS = [0.05, 0.1, 0.25, 0.5, 1] as const;

/** A value on the grid: the nearest multiple of `step`, without floating-point dust (0.30000004). */
export function snapTo(value: number, step: number): number {
    return Number((Math.round(value / step) * step).toFixed(3));
}

/** A size on the grid, never below one step: a room cannot be made zero metres wide. */
export function snapSize(value: number, step: number): number {
    return Math.max(step, snapTo(value, step));
}

/** A room on the plan: x_m and y_m are its centre, as the viewer draws it. */
export interface PlanRect {
    x_m: number;
    y_m: number;
    width_m: number;
    depth_m: number;
}

/** How close, in metres, an edge must come to another room's edge to be pulled onto it. */
export const NEIGHBOUR_SNAP_M = 0.2;

function edgeShift(low: number, high: number, others: number[], tolerance: number): number {
    let best = 0;
    let bestGap = tolerance;

    for (const target of others) {
        for (const edge of [low, high]) {
            const gap = Math.abs(target - edge);

            if (gap <= bestGap) {
                best = target - edge;
                bestGap = gap;
            }
        }
    }

    return best;
}

/**
 * Pulls a room so that its walls line up with the walls of the rooms around it when they are
 * within `tolerance`: the corner-to-corner snapping of CAD tools. Each axis is snapped on its own;
 * an axis with no wall close enough keeps its value.
 */
export function snapToNeighbours(
    rect: PlanRect,
    others: readonly PlanRect[],
    tolerance = NEIGHBOUR_SNAP_M,
): { x_m: number; y_m: number } {
    const xs = others.flatMap((other) => [
        other.x_m - other.width_m / 2,
        other.x_m + other.width_m / 2,
    ]);
    const ys = others.flatMap((other) => [
        other.y_m - other.depth_m / 2,
        other.y_m + other.depth_m / 2,
    ]);
    const dx = edgeShift(rect.x_m - rect.width_m / 2, rect.x_m + rect.width_m / 2, xs, tolerance);
    const dy = edgeShift(rect.y_m - rect.depth_m / 2, rect.y_m + rect.depth_m / 2, ys, tolerance);

    return {
        x_m: Number((rect.x_m + dx).toFixed(3)),
        y_m: Number((rect.y_m + dy).toFixed(3)),
    };
}
