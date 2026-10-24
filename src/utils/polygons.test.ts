import { describe, expect, it } from "vitest";

import { polygonArea } from "./geometry";
import { buildableArea, coveredArea, sharedArea } from "./polygons";

const RECTANGLE = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 30 },
    { x: 0, y: 30 },
];
const L_SHAPE = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 30 },
    { x: 0, y: 30 },
];

describe("buildableArea", () => {
    it("gives the inner rectangle of a rectangular lot, as before", () => {
        const result = buildableArea(RECTANGLE, 3);

        expect(result.pieces).toHaveLength(1);
        expect(result.area).toBeCloseTo(14 * 24, 6);
    });

    it("is the whole lot without a setback", () => {
        expect(buildableArea(L_SHAPE, 0)).toEqual({ pieces: [L_SHAPE], area: 400 });
    });

    it("steps back from every side of an L-shaped lot", () => {
        const result = buildableArea(L_SHAPE, 2);

        // Two arms 6 m wide, 16 × 6 along the front and 6 × 20 up the side (216 m²), plus the
        // ground beside the inner corner that is still 2 m away from it: a 2 × 2 square less a
        // quarter of a circle of radius 2.
        const exact = 216 + (4 - Math.PI);

        expect(result.pieces).toHaveLength(1);
        expect(result.area).toBeGreaterThan(exact);
        expect(result.area).toBeLessThan(exact + 0.05);
        expect(result.area).toBeLessThan(polygonArea(L_SHAPE));
    });

    it("works the same whichever way the vertices were written", () => {
        expect(buildableArea([...L_SHAPE].reverse(), 2).area).toBeCloseTo(
            buildableArea(L_SHAPE, 2).area,
            6,
        );
    });

    it("leaves nothing when the setback is wider than the lot", () => {
        expect(buildableArea(RECTANGLE, 10)).toEqual({ pieces: [], area: 0 });
    });

    it("can cut a lot with a narrow waist in two", () => {
        const hourglass = [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 10 },
            { x: 12, y: 10 },
            { x: 12, y: 14 },
            { x: 20, y: 14 },
            { x: 20, y: 24 },
            { x: 0, y: 24 },
            { x: 0, y: 14 },
            { x: 8, y: 14 },
            { x: 8, y: 10 },
            { x: 0, y: 10 },
        ];

        expect(buildableArea(hourglass, 3).pieces).toHaveLength(2);
    });

    it("keeps every piece inside the lot", () => {
        for (const piece of buildableArea(L_SHAPE, 2).pieces) {
            for (const point of piece) {
                expect(point.x).toBeGreaterThanOrEqual(2 - 1e-9);
                expect(point.y).toBeGreaterThanOrEqual(2 - 1e-9);
                expect(point.x).toBeLessThanOrEqual(18 + 1e-9);
                expect(point.y).toBeLessThanOrEqual(28 + 1e-9);
            }
        }
    });
});

describe("coveredArea", () => {
    const sala = { x: 0, y: 0, width: 6, depth: 5 };

    it("adds rooms that do not overlap", () => {
        expect(coveredArea([sala, { x: 6, y: 0, width: 4, depth: 5 }])).toBeCloseTo(50, 6);
    });

    it("counts once the ground two rooms share", () => {
        expect(coveredArea([sala, { x: 4, y: 0, width: 6, depth: 5 }])).toBeCloseTo(50, 6);
    });

    it("counts a room inside another only once", () => {
        expect(coveredArea([sala, { x: 1, y: 1, width: 2, depth: 2 }])).toBeCloseTo(30, 6);
    });

    it("is zero without rooms and ignores a room without size", () => {
        expect(coveredArea([])).toBe(0);
        expect(coveredArea([sala, { x: 0, y: 0, width: 0, depth: 5 }])).toBeCloseTo(30, 6);
    });
});

describe("sharedArea", () => {
    it("measures the overlap and is zero for rooms that only share a wall", () => {
        const sala = { x: 0, y: 0, width: 6, depth: 5 };

        expect(sharedArea(sala, { x: 4, y: 3, width: 6, depth: 5 })).toBe(4);
        expect(sharedArea(sala, { x: 6, y: 0, width: 4, depth: 5 })).toBe(0);
        expect(sharedArea(sala, { x: 20, y: 20, width: 4, depth: 5 })).toBe(0);
    });
});
