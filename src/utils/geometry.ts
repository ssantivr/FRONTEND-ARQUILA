import type { Terrain } from "../types/api";

export interface Point {
    x: number;
    y: number;
}

export interface Bounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export function footprint(terrain: Terrain): Point[] | null {
    if (terrain.points.length >= 3) {
        return terrain.points.map((point) => ({ x: point.x_m, y: point.y_m }));
    }

    if (terrain.width_m !== null && terrain.length_m !== null) {
        return [
            { x: 0, y: 0 },
            { x: terrain.width_m, y: 0 },
            { x: terrain.width_m, y: terrain.length_m },
            { x: 0, y: terrain.length_m },
        ];
    }

    return null;
}

export function polygonArea(points: Point[]): number {
    let total = 0;

    points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        total += point.x * next.y - next.x * point.y;
    });

    return Math.abs(total) / 2;
}

export function bounds(points: Point[]): Bounds {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
    };
}

export interface Edge {
    middle: Point;
    outward: Point;
    length: number;
}

export function edges(points: Point[]): Edge[] {
    let signedArea = 0;

    points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        signedArea += point.x * next.y - next.x * point.y;
    });

    const side = signedArea >= 0 ? 1 : -1;
    const result: Edge[] = [];

    points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.hypot(dx, dy);

        if (length > 0) {
            result.push({
                middle: { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 },
                outward: { x: (side * dy) / length, y: (-side * dx) / length },
                length,
            });
        }
    });

    return result;
}

export function insetBounds(box: Bounds, margin: number): Bounds | null {
    const inner = {
        minX: box.minX + margin,
        maxX: box.maxX - margin,
        minY: box.minY + margin,
        maxY: box.maxY - margin,
    };

    return inner.maxX > inner.minX && inner.maxY > inner.minY ? inner : null;
}

const CONTOUR_STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
const MAX_CONTOURS = 6;

export function contourStep(rise: number): number {
    return (
        CONTOUR_STEPS.find((step) => rise / step <= MAX_CONTOURS) ??
        CONTOUR_STEPS[CONTOUR_STEPS.length - 1]
    );
}

export function contourLevels(rise: number): number[] {
    const step = contourStep(rise);
    const levels: number[] = [];

    for (let index = 1; index * step < rise && levels.length < MAX_CONTOURS; index += 1) {
        levels.push(Number((index * step).toFixed(2)));
    }

    return levels;
}

export function frontElevation(points: Point[], slopePercent: number): Point[] {
    const { minY } = bounds(points);

    return points.map((point) => ({
        x: point.x,
        y: ((point.y - minY) * slopePercent) / 100,
    }));
}

/** Twice the signed area of the triangle a-b-c: positive when c is to the left of a→b. */
function turn(a: Point, b: Point, c: Point): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** True when c, known to be on the line through a and b, lies between them. */
function between(a: Point, b: Point, c: Point): boolean {
    return (
        Math.min(a.x, b.x) <= c.x &&
        c.x <= Math.max(a.x, b.x) &&
        Math.min(a.y, b.y) <= c.y &&
        c.y <= Math.max(a.y, b.y)
    );
}

/** True when the segments a-b and c-d share at least one point. */
function segmentsMeet(a: Point, b: Point, c: Point, d: Point): boolean {
    const d1 = turn(c, d, a);
    const d2 = turn(c, d, b);
    const d3 = turn(a, b, c);
    const d4 = turn(a, b, d);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    return (
        (d1 === 0 && between(c, d, a)) ||
        (d2 === 0 && between(c, d, b)) ||
        (d3 === 0 && between(a, b, c)) ||
        (d4 === 0 && between(a, b, d))
    );
}

/**
 * Looks for two sides of an outline that cross or touch, which makes it not a simple polygon:
 * its area and its setback would mean nothing. Returns the positions of the two sides, counted
 * from 1 as the user wrote them (side 1 goes from the first vertex to the second), or `null`
 * when the outline is fine.
 *
 * Two sides in a row always share their common vertex; they are only a fault when one folds
 * back over the other. Every pair of sides is compared: O(n²), with n at most 50.
 */
export function selfIntersection(points: Point[]): [number, number] | null {
    const count = points.length;

    for (let first = 0; first < count; first += 1) {
        const a = points[first];
        const b = points[(first + 1) % count];

        for (let second = first + 1; second < count; second += 1) {
            const c = points[second];
            const d = points[(second + 1) % count];
            const neighbours = second === first + 1 || (first === 0 && second === count - 1);

            if (neighbours) {
                // b is c (or a is d): a fault only if the far ends lie along the same line and
                // on the same side of the shared vertex.
                const [shared, farA, farB] = second === first + 1 ? [b, a, d] : [a, b, c];
                const folded =
                    turn(farA, shared, farB) === 0 &&
                    (farA.x - shared.x) * (farB.x - shared.x) +
                        (farA.y - shared.y) * (farB.y - shared.y) >
                        0;

                if (folded) {
                    return [first + 1, second + 1];
                }
            } else if (segmentsMeet(a, b, c, d)) {
                return [first + 1, second + 1];
            }
        }
    }

    return null;
}

export type ParsedPoints = { points: Point[] } | { error: string };

export function parsePoints(text: string): ParsedPoints {
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    const points: Point[] = [];

    for (const [index, line] of lines.entries()) {
        const parts = line.split(/[;\s]+/).filter((part) => part !== "");
        const [x, y] = parts.map((part) => Number(part.replace(",", ".")));

        if (parts.length !== 2 || !Number.isFinite(x) || !Number.isFinite(y)) {
            return { error: `Línea ${index + 1}: escribe dos números, por ejemplo «15 30».` };
        }

        points.push({ x, y });
    }

    if (points.length > 0 && points.length < 3) {
        return { error: "Un lote necesita al menos tres vértices." };
    }

    if (points.length > 50) {
        return { error: "Un lote admite como máximo 50 vértices." };
    }

    const crossing = points.length >= 3 ? selfIntersection(points) : null;
    // Points all on one line also «fold back», but what is wrong with them is simpler to say.
    const apart =
        crossing !== null &&
        crossing[1] - crossing[0] > 1 &&
        !(crossing[0] === 1 && crossing[1] === points.length);

    if (points.length >= 3 && polygonArea(points) === 0 && !apart) {
        return { error: "Los vértices no encierran ningún área." };
    }

    if (crossing !== null) {
        return {
            error: `El contorno se cruza a sí mismo: el lado ${crossing[0]} toca o corta al lado ${crossing[1]}. Escribe los vértices en el orden en que se recorre el borde del lote.`,
        };
    }

    return { points };
}

export function formatPoints(points: Point[]): string {
    return points.map((point) => `${point.x} ${point.y}`).join("\n");
}
