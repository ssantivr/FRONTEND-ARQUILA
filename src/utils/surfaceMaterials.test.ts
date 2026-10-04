import { describe, expect, it } from "vitest";

import {
    DEFAULT_SURFACE,
    SURFACE_MATERIALS,
    SURFACE_MATERIAL_IDS,
    savedSurfaces,
    surfaceOf,
} from "./surfaceMaterials";

describe("surfaceOf", () => {
    it("falls back to the default of the element kind", () => {
        expect(surfaceOf({}, "column-1", "column")).toBe(DEFAULT_SURFACE.column);
        expect(surfaceOf({ "room-2": "glass" }, "room-1", "room")).toBe(DEFAULT_SURFACE.room);
    });

    it("returns the material chosen for the element", () => {
        expect(surfaceOf({ "column-1": "steel" }, "column-1", "column")).toBe("steel");
    });
});

describe("savedSurfaces", () => {
    it("keeps only the elements with a saved material", () => {
        const element = {
            plan_id: 1,
            plan_title: "Ground",
            level: "0",
            x_m: 0,
            y_m: 0,
            base_m: 0,
            width_m: 1,
            depth_m: 1,
            height_m: 3,
        };

        expect(
            savedSurfaces([
                { ...element, kind: "room", id: 1, name: "Hall", surface: "glass" },
                { ...element, kind: "column", id: 1, name: "C1", surface: null },
                { ...element, kind: "wall", id: 2, name: "M1", surface: "steel" },
            ]),
        ).toEqual({ "room-1": "glass", "wall-2": "steel" });
    });
});

describe("SURFACE_MATERIALS", () => {
    it("lists every material with a label", () => {
        for (const id of SURFACE_MATERIAL_IDS) {
            expect(SURFACE_MATERIALS[id].label).not.toBe("");
        }
    });
});
