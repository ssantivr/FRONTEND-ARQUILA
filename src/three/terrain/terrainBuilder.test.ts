import { describe, expect, it } from "vitest";

import type { Structure, StructureTerrain } from "../../types/api";
import { groundHeight, insidePolygon, lowestGround, slopePivot } from "./terrainBuilder";

const lot = {
    id: 1,
    name: "Lote",
    slope_percent: 10,
    outline: [
        { x_m: 0, y_m: 0 },
        { x_m: 10, y_m: 0 },
        { x_m: 10, y_m: 20 },
        { x_m: 0, y_m: 20 },
    ],
} as unknown as StructureTerrain;

function structure(rooms: { x_m: number; y_m: number }[]): Structure {
    return {
        project_id: 1,
        roof: "gable",
        terrains: [lot],
        rooms: rooms.map((room) => ({ ...room, width_m: 4, depth_m: 4 })),
        components: [],
    } as unknown as Structure;
}

describe("terrainBuilder", () => {
    it("tells the points inside a lot from those outside", () => {
        expect(insidePolygon(5, 10, lot.outline)).toBe(true);
        expect(insidePolygon(15, 10, lot.outline)).toBe(false);
    });

    it("raises the ground with the depth, by the slope of the terrain", () => {
        expect(groundHeight(lot, 5, 5)).toBe(0);
        expect(groundHeight(lot, 5, 15)).toBeCloseTo(1);
        expect(groundHeight(lot, 5, 0)).toBeCloseTo(-0.5);
    });

    it("draws a terrain without a slope flat", () => {
        expect(groundHeight({ ...lot, slope_percent: null }, 5, 15)).toBe(0);
    });

    it("pivots on the back wall of the building, or on the front of a lot without one", () => {
        expect(slopePivot(structure([]))).toBe(0);
        expect(slopePivot(structure([{ x_m: 5, y_m: 10 }]))).toBe(12);
    });

    it("measures how far the lot falls below level 0", () => {
        expect(lowestGround(structure([]), 0)).toBe(0);
        expect(lowestGround(structure([]), 10)).toBeCloseTo(1);
    });
});
