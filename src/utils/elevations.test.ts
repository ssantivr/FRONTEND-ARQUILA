import { describe, expect, it } from "vitest";

import type { Structure, StructureRoom } from "../types/api";
import { facade, section } from "./elevations";
import { elementKey, placeOpenings, roofShape } from "./openings";

function room(overrides: Partial<StructureRoom>): StructureRoom {
    return {
        kind: "room",
        id: 1,
        plan_id: 1,
        plan_title: "Ground",
        name: "Hall",
        level: "0",
        x_m: 3,
        y_m: 2,
        base_m: 0,
        width_m: 6,
        depth_m: 4,
        height_m: 3,
        ...overrides,
    };
}

const HOUSE: StructureRoom[] = [
    room({ id: 1, name: "Living" }),
    room({ id: 2, name: "Kitchen", x_m: 8, width_m: 4 }),
    room({ id: 3, name: "Bedroom", plan_id: 2, plan_title: "Upper", base_m: 3, x_m: 5, width_m: 10 }),
];

function structure(rooms: StructureRoom[]): Structure {
    return { project_id: 1, terrains: [], rooms, components: [] };
}

describe("placeOpenings", () => {
    it("puts one door on the ground floor front and windows on the other exterior faces", () => {
        const openings = placeOpenings(HOUSE);
        const living = openings.get(elementKey(HOUSE[0])) ?? [];
        const kitchen = openings.get(elementKey(HOUSE[1])) ?? [];
        const doors = [...openings.values()].flat().filter((opening) => opening.kind === "door");

        expect(doors).toHaveLength(1);
        expect(living.filter((opening) => opening.side === "front")).toEqual([
            { kind: "door", side: "front", center: 1.5, width: 0.95, height: 2.1, sill: 0 },
            { kind: "window", side: "front", center: 4.5, width: 1.1, height: 1.1, sill: 0.9 },
        ]);
        expect(living.map((opening) => opening.side)).not.toContain("right");
        expect(kitchen.map((opening) => opening.side).sort()).toEqual(["back", "front", "right"]);
    });

    it("leaves out windows that do not fit under a low ceiling", () => {
        const openings = placeOpenings([room({ height_m: 2 })]);

        expect([...openings.values()].flat()).toEqual([]);
    });
});

describe("roofShape", () => {
    it("runs the ridge along the longer side of the top level", () => {
        expect(roofShape(HOUSE)).toMatchObject({ alongX: true, eaves: 6, span: 4.8, length: 10.8 });
        expect(roofShape([])).toBeNull();
    });
});

describe("facade", () => {
    it("is null without rooms", () => {
        expect(facade(structure([]), "front")).toBeNull();
    });

    it("draws each level, its openings and the roof seen from the front", () => {
        const drawing = facade(structure(HOUSE), "front");

        expect(drawing).toMatchObject({ width: 10, marks: [0, 3, 6, 7.34] });
        expect(drawing?.boxes).toEqual([
            { label: "Ground", from: 0, to: 10, base: 0, height: 3 },
            { label: "Upper", from: 0, to: 10, base: 3, height: 3 },
        ]);
        expect(drawing?.roof).toMatchObject({ from: -0.4, to: 10.4, base: 6, gable: false });
        expect(drawing?.openings[0]).toEqual({
            kind: "door",
            from: 1.025,
            to: 1.975,
            base: 0,
            height: 2.1,
        });
        expect(drawing?.openings.filter((opening) => opening.base === 3.9)).toHaveLength(3);
    });

    it("mirrors the back and shows the gable from the side", () => {
        const back = facade(structure(HOUSE), "back");
        const side = facade(structure(HOUSE), "right");

        expect(back?.openings.every((opening) => opening.kind === "window")).toBe(true);
        expect(side).toMatchObject({ width: 4 });
        expect(side?.roof.gable).toBe(true);
    });
});

describe("section", () => {
    it("shows the rooms crossed by the middle of the building", () => {
        const drawing = section(structure(HOUSE));

        expect(drawing?.boxes.map((box) => box.label)).toEqual(["Living", "Bedroom"]);
        expect(drawing?.boxes[1]).toEqual({ label: "Bedroom", from: 0, to: 4, base: 3, height: 3 });
        expect(drawing?.roof.gable).toBe(true);
        expect(drawing?.openings).toEqual([]);
    });
});
