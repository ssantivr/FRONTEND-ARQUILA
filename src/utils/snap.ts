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
