const METRES = new Intl.NumberFormat("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: "always",
});

export type Point3 = readonly [number, number, number];

/** Distance under which a measured point jumps to the nearest corner of the face it hit. */
export const VERTEX_SNAP_M = 0.15;

export interface Measurement {
    from: Point3;
    to: Point3;
    distanceM: number;
    /** Whether each end was moved onto a vertex of the geometry. */
    snapped: [boolean, boolean];
}

export function distance(a: Point3, b: Point3): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * The vertex of `vertices` closest to `point` when it is within `tolerance` metres, else the
 * point itself. Measuring from a corner is what a user means when they click near one.
 */
export function snapToVertex(
    point: Point3,
    vertices: readonly Point3[],
    tolerance = VERTEX_SNAP_M,
): { point: Point3; snapped: boolean } {
    let best: Point3 | null = null;
    let bestDistance = tolerance;

    for (const vertex of vertices) {
        const gap = distance(point, vertex);

        if (gap <= bestDistance) {
            best = vertex;
            bestDistance = gap;
        }
    }

    return best === null ? { point, snapped: false } : { point: best, snapped: true };
}

export function measurementOf(
    from: { point: Point3; snapped: boolean },
    to: { point: Point3; snapped: boolean },
): Measurement {
    return {
        from: from.point,
        to: to.point,
        distanceM: distance(from.point, to.point),
        snapped: [from.snapped, to.snapped],
    };
}

/** "4,32 m": two decimals, the precision of the editor grid's smallest step. */
export function formatDistance(metres: number): string {
    return `${METRES.format(metres)} m`;
}

/** How the figure was obtained, shown next to it: units and method always travel with it. */
export function describeMeasurement(measurement: Measurement): string {
    const corners = measurement.snapped.filter(Boolean).length;
    const method = "Distancia en línea recta entre dos puntos de la superficie del modelo";

    return corners === 0
        ? `${method}.`
        : `${method}; ${corners === 2 ? "ambos extremos se ajustaron" : "un extremo se ajustó"} a un vértice.`;
}
