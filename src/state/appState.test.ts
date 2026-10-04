import { beforeEach, describe, expect, it, vi } from "vitest";

import { materialsApi, recommendationsApi } from "../services/api";
import type { Material, Recommendation, StructureElement } from "../types/api";
import { appState } from "./appState";

const MATERIAL: Material = {
    id: 1,
    project_id: 1,
    name: "Concrete",
    category: null,
    unit: "m3",
    quantity: 2,
    unit_cost: 100,
    created_at: "",
};

const RECOMMENDATION: Recommendation = {
    id: 1,
    project_id: 1,
    category: "structure",
    content: "Check C1.",
    source: "ai",
    priority: "high",
    created_at: "",
};

const COLUMN: StructureElement = {
    kind: "column",
    id: 1,
    plan_id: 1,
    plan_title: "Ground",
    name: "C1",
    level: "0",
    x_m: 0,
    y_m: 0,
    base_m: 0,
    width_m: 0.4,
    depth_m: 0.4,
    height_m: 3,
    surface: null,
};

beforeEach(() => {
    appState.reset();
    vi.restoreAllMocks();
});

describe("appState", () => {
    it("notifies subscribers until they unsubscribe", () => {
        const listener = vi.fn();
        const unsubscribe = appState.subscribe(listener);

        appState.setMaterials(1, [MATERIAL]);
        unsubscribe();
        appState.setMaterials(1, []);

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("keeps the data of the same project across changes", () => {
        appState.setMaterials(1, [MATERIAL]);
        appState.select(1, COLUMN);

        expect(appState.get().materials).toEqual([MATERIAL]);
        expect(appState.get().selection).toBe(COLUMN);
    });

    it("drops the data of another project but keeps the color mode", () => {
        appState.setMaterials(1, [MATERIAL]);
        appState.select(1, COLUMN);
        appState.setColorMode(1, "cost");
        appState.open(2);

        expect(appState.get()).toEqual({
            projectId: 2,
            materials: [],
            recommendations: [],
            selection: null,
            colorMode: "cost",
            surfaces: {},
        });
    });

    it("keeps the surface material chosen for each element", () => {
        const listener = vi.fn();
        appState.subscribe(listener);

        appState.setSurface(1, "column-1", "steel");
        appState.setSurface(1, "room-1", "glass");
        appState.setSurface(1, "column-1", "wood");

        expect(appState.get().surfaces).toEqual({ "column-1": "wood", "room-1": "glass" });
        expect(listener).toHaveBeenCalledTimes(3);
    });

    it("replaces the surface materials with the saved ones", () => {
        appState.setSurface(1, "column-1", "steel");
        appState.setSurfaces(1, { "room-1": "glass" });

        expect(appState.get().surfaces).toEqual({ "room-1": "glass" });
    });

    it("drops the surface materials of another project", () => {
        appState.setSurface(1, "column-1", "steel");
        appState.setSurface(2, "room-1", "glass");

        expect(appState.get().surfaces).toEqual({ "room-1": "glass" });
    });

    it("refreshes materials and recommendations from the API", async () => {
        vi.spyOn(materialsApi, "listByProject").mockResolvedValue([MATERIAL]);
        vi.spyOn(recommendationsApi, "listByProject").mockResolvedValue([RECOMMENDATION]);

        await appState.refresh(1);

        expect(appState.get().materials).toEqual([MATERIAL]);
        expect(appState.get().recommendations).toEqual([RECOMMENDATION]);
    });

    it("keeps what it had when a request fails", async () => {
        appState.setMaterials(1, [MATERIAL]);
        vi.spyOn(materialsApi, "listByProject").mockRejectedValue(new Error("offline"));
        vi.spyOn(recommendationsApi, "listByProject").mockResolvedValue([RECOMMENDATION]);

        await appState.refresh(1);

        expect(appState.get().materials).toEqual([MATERIAL]);
        expect(appState.get().recommendations).toEqual([RECOMMENDATION]);
    });

    it("ignores a refresh that finishes after the project changed", async () => {
        vi.spyOn(materialsApi, "listByProject").mockResolvedValue([MATERIAL]);
        vi.spyOn(recommendationsApi, "listByProject").mockResolvedValue([]);

        const pending = appState.refresh(1);
        appState.open(2);
        await pending;

        expect(appState.get().projectId).toBe(2);
        expect(appState.get().materials).toEqual([]);
    });
});
