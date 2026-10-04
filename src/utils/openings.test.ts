import { describe, expect, it } from "vitest";

import type { StructureRoom } from "../types/api";
import {
    DOOR_HEIGHT_M,
    PARAPET_HEIGHT_M,
    ROOF_OVERHANG_M,
    SLAB_OVERHANG_M,
    WINDOW_SILL_M,
    elementKey,
    exteriorSides,
    levelRects,
    placeOpenings,
    rectOf,
    roofShape,
    unionOf,
} from "./openings";

function room(overrides: Partial<StructureRoom> = {}): StructureRoom {
    return {
        kind: "room",
        id: 1,
        plan_id: 1,
        plan_title: "Ground",
        name: "Hall",
        level: "0",
        x_m: 2,
        y_m: 2,
        base_m: 0,
        width_m: 4,
        depth_m: 4,
        height_m: 3,
        surface: null,
        ...overrides,
    };
}

describe("rectangles", () => {
    it("centers a room on its position", () => {
        expect(rectOf(room({ x_m: 5, y_m: 3, width_m: 4, depth_m: 2 }))).toEqual({
            minX: 3,
            maxX: 7,
            minY: 2,
            maxY: 4,
        });
    });

    it("joins rectangles into the one that contains them", () => {
        expect(
            unionOf([
                { minX: 0, maxX: 4, minY: 0, maxY: 4 },
                { minX: 4, maxX: 9, minY: -1, maxY: 3 },
            ]),
        ).toEqual({ minX: 0, maxX: 9, minY: -1, maxY: 4 });
    });

    it("keeps one rectangle per level", () => {
        const levels = levelRects([
            room({ id: 1, plan_id: 1, x_m: 2 }),
            room({ id: 2, plan_id: 1, x_m: 6 }),
            room({ id: 3, plan_id: 2, x_m: 2, base_m: 3 }),
        ]);

        expect(levels.get(1)).toEqual({ minX: 0, maxX: 8, minY: 0, maxY: 4 });
        expect(levels.get(2)).toEqual({ minX: 0, maxX: 4, minY: 0, maxY: 4 });
    });
});

describe("exteriorSides", () => {
    it("leaves out the wall shared with a neighbour", () => {
        const left = room({ id: 1, x_m: 2 });
        const right = room({ id: 2, x_m: 6 });
        const level = unionOf([rectOf(left), rectOf(right)]);

        expect(exteriorSides(left, level)).toEqual(["front", "back", "left"]);
        expect(exteriorSides(right, level)).toEqual(["front", "right", "back"]);
    });
});

describe("placeOpenings", () => {
    it("puts a single door on the front of the ground floor and windows elsewhere", () => {
        const ground = room({ id: 1 });
        const upper = room({ id: 2, plan_id: 2, base_m: 3 });
        const placed = placeOpenings([ground, upper]);
        const groundOpenings = placed.get(elementKey(ground)) ?? [];
        const upperOpenings = placed.get(elementKey(upper)) ?? [];
        const all = [...groundOpenings, ...upperOpenings];

        expect(all.filter((opening) => opening.kind === "door")).toHaveLength(1);
        expect(groundOpenings[0]).toMatchObject({
            kind: "door",
            side: "front",
            center: 2,
            height: DOOR_HEIGHT_M,
            sill: 0,
        });
        expect(groundOpenings).toHaveLength(4);
        expect(upperOpenings).toHaveLength(4);
        expect(upperOpenings.every((opening) => opening.kind === "window")).toBe(true);
        expect(upperOpenings[0].sill).toBe(WINDOW_SILL_M);
    });

    it("spreads one opening every three metres along a long wall", () => {
        const long = room({ width_m: 9, x_m: 4.5 });
        const front = (placeOpenings([long]).get(elementKey(long)) ?? []).filter(
            (opening) => opening.side === "front",
        );

        expect(front.map((opening) => opening.kind)).toEqual(["door", "window", "window"]);
        expect(front.map((opening) => opening.center)).toEqual([1.5, 4.5, 7.5]);
    });

    it("leaves a wall that is too short without openings", () => {
        const narrow = room({ width_m: 1.5, x_m: 0.75 });
        const openings = placeOpenings([narrow]).get(elementKey(narrow)) ?? [];

        expect(openings.map((opening) => opening.side)).toEqual(["right", "left"]);
        expect(openings.every((opening) => opening.kind === "window")).toBe(true);
    });

    it("leaves a room that is too low without openings", () => {
        const low = room({ height_m: 1.8 });

        expect(placeOpenings([low]).get(elementKey(low))).toEqual([]);
    });
});

describe("roofShape", () => {
    it("needs at least one room", () => {
        expect(roofShape([])).toBeNull();
    });

    it("covers only the top level with a gable that runs along the longer side", () => {
        const roof = roofShape([
            room({ id: 1, width_m: 10, depth_m: 8, x_m: 5, y_m: 4 }),
            room({ id: 2, plan_id: 2, base_m: 3, width_m: 6, depth_m: 4, x_m: 3, y_m: 2 }),
        ]);

        expect(roof).toMatchObject({
            area: { minX: 0, maxX: 6, minY: 0, maxY: 4 },
            eaves: 6,
            alongX: true,
            flat: false,
            overhang: ROOF_OVERHANG_M,
        });
        expect(roof?.span).toBeCloseTo(4.8);
        expect(roof?.length).toBeCloseTo(6.8);
        expect(roof?.rise).toBeCloseTo(4.8 * 0.28);
    });

    it("never makes a gable lower than 0.8 m", () => {
        expect(roofShape([room({ width_m: 2, depth_m: 2 })])?.rise).toBe(0.8);
    });

    it("turns a flat roof into a slab with a parapet", () => {
        const roof = roofShape([room({ width_m: 4, depth_m: 6, y_m: 3 })], "flat");

        expect(roof).toMatchObject({
            alongX: false,
            flat: true,
            overhang: SLAB_OVERHANG_M,
            rise: PARAPET_HEIGHT_M,
        });
        expect(roof?.span).toBeCloseTo(4.24);
        expect(roof?.length).toBeCloseTo(6.24);
    });
});
