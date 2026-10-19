import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Terrain } from "../types/api";
import { request } from "./http";
import { rememberDeletedTerrain, undoLastDeletion } from "./terrainUndo";

vi.mock("./http", async (original) => ({
    ...(await original<typeof import("./http")>()),
    request: vi.fn(),
}));

const POINTS = [
    { x_m: 0, y_m: 0 },
    { x_m: 20, y_m: 0 },
    { x_m: 20, y_m: 10 },
    { x_m: 10, y_m: 30 },
];

function terrain(overrides: Partial<Terrain>): Terrain {
    return {
        id: 4,
        project_id: 1,
        name: "Lote Mirador",
        area_m2: 350,
        width_m: null,
        length_m: null,
        points: POINTS,
        slope_percent: 6,
        soil_type: null,
        latitude: null,
        longitude: null,
        created_at: "2026-10-01T12:00:00Z",
        ...overrides,
    };
}

/** Answers the API: the undo says what came back, the list says how it came back. */
function api(restored: { kind: string; label: string }, terrains: Terrain[]) {
    vi.mocked(request).mockImplementation((path: string, options?: { method?: string }) => {
        if (path === "/projects/1/undo") {
            return Promise.resolve(restored);
        }

        if (path === "/projects/1/terrains") {
            return Promise.resolve(terrains);
        }

        return options?.method === "PATCH"
            ? Promise.resolve(terrains[0])
            : Promise.reject(new Error(`unexpected ${path}`));
    });
}

function patches() {
    return vi
        .mocked(request)
        .mock.calls.filter(([, options]) => (options as { method?: string })?.method === "PATCH");
}

beforeEach(() => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
});

describe("undoing the deletion of a terrain", () => {
    it("sends the vertices again when the terrain comes back without them", async () => {
        rememberDeletedTerrain(terrain({}));
        api({ kind: "terrain", label: "Lote Mirador" }, [terrain({ points: [] })]);

        await expect(undoLastDeletion(1)).resolves.toEqual({
            kind: "terrain",
            label: "Lote Mirador",
        });
        expect(patches()).toEqual([["/terrains/4", { method: "PATCH", body: { points: POINTS } }]]);
    });

    it("finds the terrain by its name when the API gave it a new id", async () => {
        rememberDeletedTerrain(terrain({}));
        api({ kind: "terrain", label: "Lote Mirador" }, [terrain({ id: 9, points: [] })]);

        await undoLastDeletion(1);

        expect(patches()[0][0]).toBe("/terrains/9");
    });

    it("leaves a terrain alone when it already came back with its vertices", async () => {
        rememberDeletedTerrain(terrain({}));
        api({ kind: "terrain", label: "Lote Mirador" }, [terrain({})]);

        await undoLastDeletion(1);

        expect(patches()).toEqual([]);
    });

    it("does nothing more for a rectangular terrain or for another kind of item", async () => {
        rememberDeletedTerrain(terrain({ points: [], width_m: 10, length_m: 20 }));
        api({ kind: "material", label: "Cemento" }, []);

        await undoLastDeletion(1);

        expect(vi.mocked(request)).toHaveBeenCalledTimes(1);
    });

    it("does not send the outline of one terrain to another that was restored", async () => {
        rememberDeletedTerrain(terrain({}));
        api({ kind: "terrain", label: "Lote del fondo" }, [
            terrain({ id: 7, name: "Lote del fondo", points: [] }),
        ]);

        await undoLastDeletion(1);

        expect(patches()).toEqual([]);
    });

    it("still counts the undo as done when the vertices cannot be sent, and keeps them", async () => {
        rememberDeletedTerrain(terrain({}));
        vi.mocked(request).mockImplementation((path: string) =>
            path === "/projects/1/undo"
                ? Promise.resolve({ kind: "terrain", label: "Lote Mirador" })
                : Promise.reject(new Error("sin red")),
        );

        await expect(undoLastDeletion(1)).resolves.toMatchObject({ kind: "terrain" });
        expect(window.sessionStorage.getItem("arquila:deleted-terrains:1")).toContain(
            "Lote Mirador",
        );
    });
});
