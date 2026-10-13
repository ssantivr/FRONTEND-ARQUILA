import polygonClipping, { type MultiPolygon, type Pair, type Polygon } from "polygon-clipping";

import { polygonArea, type Point } from "./geometry";

/** How many sides stand in for the round corner of a setback. */
const ARC_STEPS = 12;

function ring(points: Point[]): Pair[] {
    return points.map((point) => [point.x, point.y]);
}

function areaOf(shape: MultiPolygon): number {
    return shape.reduce(
        (total, polygon) =>
            total +
            polygon.reduce((sum, loop, index) => {
                const area = polygonArea(loop.map(([x, y]) => ({ x, y })));

                // The first ring of a polygon is its outline; the others are holes in it.
                return index === 0 ? sum + area : sum - area;
            }, 0),
        0,
    );
}

/** The band of ground within `margin` of one side of the lot: a rectangle along the side. */
function sideBand(from: Point, to: Point, margin: number): Polygon {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const nx = (-(to.y - from.y) / length) * margin;
    const ny = ((to.x - from.x) / length) * margin;

    return [
        [
            [from.x + nx, from.y + ny],
            [to.x + nx, to.y + ny],
            [to.x - nx, to.y - ny],
            [from.x - nx, from.y - ny],
        ],
    ];
}

/** The ground within `margin` of a corner of the lot: a circle, drawn as a polygon. */
function cornerDisc(centre: Point, margin: number): Polygon {
    return [
        Array.from({ length: ARC_STEPS * 2 }, (_, step): Pair => {
            // Half a step off the axes, so no side of the disc lies along a side of a band.
            const angle = ((step + 0.5) / (ARC_STEPS * 2)) * Math.PI * 2;

            return [centre.x + Math.cos(angle) * margin, centre.y + Math.sin(angle) * margin];
        }),
    ];
}

export interface Buildable {
    /** One outline per piece: a narrow lot can be cut in two by its setback. */
    pieces: Point[][];
    area: number;
}

/**
 * The part of a lot left after stepping back `margin` metres from every side, for a lot of any
 * shape.
 *
 * Every point closer than `margin` to the boundary is removed: a band along each side and a
 * disc on each corner are subtracted from the lot (polygon-clipping does the subtraction). A
 * convex corner keeps its sharp angle and a re-entrant one comes out rounded, which is what a
 * setback measured from the boundary gives. The disc is a polygon of 24 sides drawn inside the
 * circle, so beside a re-entrant corner the result is generous by a few hundredths of a square
 * metre. With n sides it subtracts 2n shapes; a lot has at
 * most 50 vertices.
 *
 * Returns no pieces when the setback eats the whole lot.
 */
export function buildableArea(outline: Point[], margin: number): Buildable {
    if (margin <= 0) {
        return { pieces: [outline], area: polygonArea(outline) };
    }

    const removed = outline.flatMap((point, index) => {
        const next = outline[(index + 1) % outline.length];

        return point.x === next.x && point.y === next.y
            ? [cornerDisc(point, margin)]
            : [sideBand(point, next, margin), cornerDisc(point, margin)];
    });
    // One shape at a time: the library is steadier with two shapes than with a hundred at once.
    const left = removed.reduce<MultiPolygon>(
        (rest, shape) => (rest.length === 0 ? rest : polygonClipping.difference(rest, shape)),
        [[ring(outline)]],
    );

    return {
        // A setback never leaves a hole of its own, so the outline of each piece is enough.
        pieces: left.map((polygon) => polygon[0].map(([x, y]) => ({ x, y }))),
        area: areaOf(left),
    };
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    depth: number;
}

function rectangle(shape: Rectangle): Polygon {
    return [
        [
            [shape.x, shape.y],
            [shape.x + shape.width, shape.y],
            [shape.x + shape.width, shape.y + shape.depth],
            [shape.x, shape.y + shape.depth],
        ],
    ];
}

/**
 * The ground covered by a set of rectangles, counting once what two of them share. It is what a
 * level really occupies when two of its rooms overlap.
 */
export function coveredArea(shapes: Rectangle[]): number {
    const solid = shapes.filter((shape) => shape.width > 0 && shape.depth > 0);

    if (solid.length === 0) {
        return 0;
    }

    const [first, ...rest] = solid.map(rectangle);

    return areaOf(polygonClipping.union(first, ...rest));
}

/** The area two rectangles share, or 0 when they only touch or are apart. */
export function sharedArea(first: Rectangle, second: Rectangle): number {
    const width =
        Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
    const depth =
        Math.min(first.y + first.depth, second.y + second.depth) - Math.max(first.y, second.y);

    return width > 0 && depth > 0 ? width * depth : 0;
}
