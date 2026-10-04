import { describe, expect, it } from "vitest";

import {
    DEFAULT_SURFACE,
    SURFACE_MATERIALS,
    SURFACE_MATERIAL_IDS,
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

describe("SURFACE_MATERIALS", () => {
    it("lists every material with a label", () => {
        for (const id of SURFACE_MATERIAL_IDS) {
            expect(SURFACE_MATERIALS[id].label).not.toBe("");
        }
    });
});
