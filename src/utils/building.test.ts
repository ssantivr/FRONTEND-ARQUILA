import { describe, expect, it } from "vitest";

import type { Structure, StructureComponent, StructureRoom } from "../types/api";
import { buildingIndicators, planLevels, roomOverlaps } from "./building";

function room(overrides: Partial<StructureRoom>): StructureRoom {
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

function beam(overrides: Partial<StructureComponent>): StructureComponent {
    return { ...room({}), kind: "beam", name: "V1", height_m: 0.4, base_m: 2.6, ...overrides };
}

const LOT = {
    id: 1,
    name: "Lot",
    outline: [
        { x_m: 0, y_m: 0 },
        { x_m: 10, y_m: 0 },
        { x_m: 10, y_m: 20 },
        { x_m: 0, y_m: 20 },
    ],
};

function structure(overrides: Partial<Structure>): Structure {
    return {
        project_id: 1,
        roof: "gable",
        terrains: [LOT],
        rooms: [],
        components: [],
        ...overrides,
    };
}

describe("planLevels", () => {
    it("groups rooms and components by plan, from the lowest level up", () => {
        const levels = planLevels(
            structure({
                rooms: [
                    room({ id: 3, plan_id: 2, plan_title: "Upper", base_m: 3, height_m: 2.5 }),
                    room({ id: 1 }),
                    room({ id: 2, x_m: 6, width_m: 2 }),
                ],
                components: [beam({})],
            }),
        );

        expect(levels.map((level) => level.title)).toEqual(["Ground", "Upper"]);
        expect(levels[0]).toMatchObject({ base: 0, height: 3, area: 24 });
        expect(levels[0].components).toHaveLength(1);
        expect(levels[1]).toMatchObject({ base: 3, height: 2.5, area: 16 });
    });

    it("places a level that only has a beam at the base of the beam", () => {
        const [level] = planLevels(structure({ components: [beam({})] }));

        expect(level.base).toBe(2.6);
        expect(level.area).toBe(0);
    });
});

describe("buildingIndicators", () => {
    it("is null without rooms", () => {
        expect(buildingIndicators(structure({ components: [beam({})] }))).toBeNull();
    });

    it("computes footprint, built area, COS and CUS against the first lot", () => {
        const indicators = buildingIndicators(
            structure({
                rooms: [
                    room({ id: 1, width_m: 5, depth_m: 8 }),
                    room({ id: 2, plan_id: 2, base_m: 3, width_m: 5, depth_m: 4, height_m: 2.5 }),
                ],
            }),
        );

        expect(indicators).toEqual({
            lotArea: 200,
            footprint: 40,
            builtArea: 60,
            freeArea: 160,
            cos: 0.2,
            cus: 0.3,
            levels: 2,
            height: 5.5,
            overlaps: [],
        });
    });

    it("leaves the ratios empty when the project has no lot outline", () => {
        const indicators = buildingIndicators(structure({ terrains: [], rooms: [room({})] }));

        expect(indicators).toMatchObject({
            lotArea: null,
            freeArea: null,
            cos: null,
            cus: null,
            builtArea: 16,
        });
    });
});

describe("overlapping rooms", () => {
    const sala = room({ id: 1, name: "Sala", x_m: 0, y_m: 0, width_m: 6, depth_m: 5 });
    const cocina = room({ id: 2, name: "Cocina", x_m: 4, y_m: 0, width_m: 6, depth_m: 5 });

    it("counts the ground two rooms share only once in COS, CUS and the areas", () => {
        const indicators = buildingIndicators(structure({ rooms: [sala, cocina] }));

        // 6 × 5 and 6 × 5 with 2 × 5 in common cover 50 m², not 60, of a 200 m² lot.
        expect(indicators?.footprint).toBeCloseTo(50, 6);
        expect(indicators?.builtArea).toBeCloseTo(50, 6);
        expect(indicators?.cos).toBeCloseTo(0.25, 6);
        expect(indicators?.cus).toBeCloseTo(0.25, 6);
        expect(indicators?.freeArea).toBeCloseTo(150, 6);
    });

    it("names the rooms that overlap and how much ground they share", () => {
        const indicators = buildingIndicators(structure({ rooms: [sala, cocina] }));

        expect(indicators?.overlaps).toEqual([
            { level: "Ground", first: "Sala", second: "Cocina", area: 10 },
        ]);
    });

    it("does not take rooms that share a wall, or rooms on different levels, for an overlap", () => {
        const beside = room({ id: 2, name: "Cocina", x_m: 6, y_m: 0, width_m: 4, depth_m: 5 });
        const above = room({ id: 3, name: "Alcoba", plan_id: 2, plan_title: "Upper", base_m: 3 });
        const levels = planLevels(
            structure({ rooms: [sala, beside, { ...above, x_m: 0, y_m: 0 }] }),
        );

        expect(roomOverlaps(levels)).toEqual([]);
    });

    it("lists the largest overlap first", () => {
        const comedor = room({ id: 3, name: "Comedor", x_m: 5, y_m: 4, width_m: 3, depth_m: 3 });
        const overlaps = roomOverlaps(planLevels(structure({ rooms: [sala, cocina, comedor] })));

        expect(overlaps.map((overlap) => `${overlap.first}-${overlap.second}`)).toEqual([
            "Sala-Cocina",
            "Cocina-Comedor",
            "Sala-Comedor",
        ]);
    });
});
