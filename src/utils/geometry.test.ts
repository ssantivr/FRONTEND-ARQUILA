import { describe, expect, it } from "vitest";

import type { Terrain } from "../types/api";
import {
    bounds,
    footprint,
    formatPoints,
    frontElevation,
    parsePoints,
    polygonArea,
} from "./geometry";

const L_SHAPE = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 30 },
    { x: 0, y: 30 },
];

function terrain(overrides: Partial<Terrain>): Terrain {
    return {
        id: 1,
        project_id: 1,
        name: "Lote",
        area_m2: 100,
        width_m: null,
        length_m: null,
        points: [],
        slope_percent: null,
        soil_type: null,
        latitude: null,
        longitude: null,
        created_at: "2026-10-03T00:00:00",
        ...overrides,
    };
}

describe("polygonArea", () => {
    it("computes the area whatever the direction of the outline", () => {
        expect(polygonArea(L_SHAPE)).toBe(400);
        expect(polygonArea([...L_SHAPE].reverse())).toBe(400);
    });

    it("is zero when the points are on one line", () => {
        expect(
            polygonArea([
                { x: 0, y: 0 },
                { x: 5, y: 5 },
                { x: 10, y: 10 },
            ]),
        ).toBe(0);
    });
});

describe("bounds", () => {
    it("returns the extremes of the outline", () => {
        expect(bounds(L_SHAPE)).toEqual({ minX: 0, maxX: 20, minY: 0, maxY: 30 });
    });
});

describe("frontElevation", () => {
    it("keeps the width and turns the depth into height along the slope", () => {
        const rectangle = [
            { x: 0, y: 0 },
            { x: 15, y: 0 },
            { x: 15, y: 30 },
            { x: 0, y: 30 },
        ];

        expect(frontElevation(rectangle, 10)).toEqual([
            { x: 0, y: 0 },
            { x: 15, y: 0 },
            { x: 15, y: 3 },
            { x: 0, y: 3 },
        ]);
    });

    it("measures the height from the lowest vertex of the lot", () => {
        const lot = [
            { x: 0, y: 10 },
            { x: 20, y: 10 },
            { x: 10, y: 30 },
        ];

        expect(frontElevation(lot, 20).map((point) => point.y)).toEqual([0, 0, 4]);
    });

    it("is flat when there is no slope", () => {
        expect(bounds(frontElevation(L_SHAPE, 0)).maxY).toBe(0);
    });
});

describe("footprint", () => {
    it("prefers the vertices when the terrain has them", () => {
        const shape = footprint(
            terrain({
                width_m: 5,
                length_m: 5,
                points: L_SHAPE.map((point) => ({ x_m: point.x, y_m: point.y })),
            }),
        );

        expect(shape).toEqual(L_SHAPE);
    });

    it("falls back to the width by length rectangle", () => {
        expect(footprint(terrain({ width_m: 15, length_m: 30 }))).toEqual([
            { x: 0, y: 0 },
            { x: 15, y: 0 },
            { x: 15, y: 30 },
            { x: 0, y: 30 },
        ]);
    });

    it("is null when there is not enough data", () => {
        expect(footprint(terrain({ width_m: 15 }))).toBeNull();
    });
});

describe("parsePoints", () => {
    it("accepts spaces or semicolons and decimal commas", () => {
        expect(parsePoints("0 0\n12,5; 0\n  0   8.25 \n\n")).toEqual({
            points: [
                { x: 0, y: 0 },
                { x: 12.5, y: 0 },
                { x: 0, y: 8.25 },
            ],
        });
    });

    it("treats empty text as no polygon", () => {
        expect(parsePoints("  \n ")).toEqual({ points: [] });
    });

    it("reports the line that cannot be read", () => {
        expect(parsePoints("0 0\n5 0\nabc")).toEqual({
            error: "Línea 3: escribe dos números, por ejemplo «15 30».",
        });
        expect(parsePoints("0 0 0")).toHaveProperty("error");
    });

    it("rejects too few points and outlines without area", () => {
        expect(parsePoints("0 0\n5 0")).toEqual({
            error: "Un lote necesita al menos tres vértices.",
        });
        expect(parsePoints("0 0\n5 5\n10 10")).toEqual({
            error: "Los vértices no encierran ningún área.",
        });
    });

    it("round-trips with formatPoints", () => {
        expect(parsePoints(formatPoints(L_SHAPE))).toEqual({ points: L_SHAPE });
    });
});
