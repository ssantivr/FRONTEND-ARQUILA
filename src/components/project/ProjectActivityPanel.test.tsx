import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activityApi } from "../../services/api";
import { ApiError } from "../../services/http";
import type { Activity } from "../../types/api";
import {
    ActivityRow,
    ProjectActivityPanel,
    describeActivity,
    describeChanges,
    describeSource,
    groupByDay,
} from "./ProjectActivityPanel";
import { activityIcon } from "./activityText";

vi.mock("../../services/api", () => ({
    activityApi: { listByProject: vi.fn() },
}));

beforeEach(() => {
    vi.resetAllMocks();
});

describe("ProjectActivityPanel", () => {
    function activity(overrides: Partial<Activity>): Activity {
        return {
            id: 1,
            project_id: 7,
            user_id: 1,
            action: "updated",
            entity_type: "terrain",
            entity_id: 5,
            detail: {},
            created_at: "2026-10-20T16:05:12",
            ...overrides,
        };
    }

    it("tells each change in a sentence", () => {
        expect(
            describeActivity(
                activity({ detail: { label: "Lote 14", fields: ["area_m2", "soil_type"] } }),
            ),
        ).toBe("Se actualizó el terreno «Lote 14» (área, suelo)");
        expect(describeActivity(activity({ action: "created", entity_type: "task" }))).toBe(
            "Se creó la tarea",
        );
        expect(
            describeActivity(
                activity({
                    action: "version_saved",
                    entity_type: "version",
                    detail: { version_number: 3 },
                }),
            ),
        ).toBe("Se guardó la versión 3");
    });

    it("tells a redo apart from a deletion, and gives the scene no stored name", () => {
        expect(
            describeActivity(
                activity({
                    action: "deleted",
                    entity_type: "room",
                    detail: { label: "Sala", via: "redo" },
                }),
            ),
        ).toBe("Se eliminó el cuarto «Sala» con «Rehacer»");
        expect(
            describeActivity(
                activity({
                    entity_type: "scene_settings",
                    detail: { label: "Scene", fields: ["lighting"] },
                }),
            ),
        ).toBe("Se actualizó la escena (iluminación)");
    });

    it("says in Spanish who made a change and from which module", () => {
        expect(describeSource(activity({ origin: "ai", source_module: "plans" }))).toBe(
            "Por la IA · desde Planos",
        );
        expect(describeSource(activity({ origin: "system", source_module: null }))).toBe(
            "Por el sistema",
        );
        expect(describeSource(activity({ origin: "user", source_module: "viewer" }))).toBe(
            "Desde Visor 3D",
        );
        expect(describeSource(activity({}))).toBe("");
    });

    it("lists the values before and after, and nothing for entries without them", () => {
        expect(
            describeChanges(
                activity({
                    old_value: { area_m2: 100, soil_type: null },
                    new_value: { area_m2: 120.5, soil_type: "arcilla" },
                }),
            ),
        ).toEqual(["área: 100 m² → 120,5 m²", "suelo: — → arcilla"]);
        expect(
            describeChanges(
                activity({
                    entity_type: "elevation",
                    old_value: { orientation: "north", width_m: 3 },
                    new_value: { orientation: "west", width_m: 4.5 },
                }),
            ),
        ).toEqual(["orientación: Norte → Oeste", "ancho: 3 m → 4,5 m"]);
        expect(
            describeChanges(activity({ new_value: { camera_presets: [{ name: "Frente" }] } })),
        ).toEqual(["cámaras: cambió"]);
        expect(describeChanges(activity({ old_value: null, new_value: null }))).toEqual([]);
    });

    it("translates stored codes and hides ids and unknown codes", () => {
        expect(
            describeChanges(
                activity({
                    entity_type: "project",
                    old_value: { status: "draft", roof: "gable", cover_file_id: 3 },
                    new_value: { status: "active", roof: "flat", cover_file_id: 9 },
                }),
            ),
        ).toEqual([
            "estado: Borrador → Activo",
            "cubierta: A dos aguas → Plana",
            "portada: cambió",
        ]);
        expect(
            describeChanges(
                activity({
                    entity_type: "task",
                    old_value: { status: "todo" },
                    new_value: { status: "in_progress" },
                }),
            ),
        ).toEqual(["estado: Por hacer → En curso"]);
        expect(
            describeChanges(
                activity({
                    entity_type: "component",
                    old_value: { kind: "column", surface: "brick", mesh_ref: "a" },
                    new_value: { kind: "wall", surface: "not_a_surface", mesh_ref: "b" },
                }),
            ),
        ).toEqual(["tipo: Columna → Muro", "acabado: cambió", "malla: cambió"]);
        expect(
            describeChanges(
                activity({
                    entity_type: "room",
                    old_value: { category: "bedroom" },
                    new_value: { category: "kitchen" },
                }),
            ),
        ).toEqual(["categoría: Cuarto → Cocina"]);
        expect(
            describeChanges(
                activity({
                    entity_type: "task",
                    old_value: { due_date: "2026-12-01" },
                    new_value: { due_date: "2026-12-15" },
                }),
            ),
        ).toEqual(["fecha límite: 01/12/2026 → 15/12/2026"]);
        expect(
            describeChanges(
                activity({
                    entity_type: "material",
                    old_value: { category: "Pisos" },
                    new_value: { category: "Muros" },
                }),
            ),
        ).toEqual(["categoría: Pisos → Muros"]);
        expect(describeChanges(activity({ new_value: { secret_flag: "x" } }))).toEqual([
            "otro dato: cambió",
        ]);
        expect(describeChanges(activity({}))).toEqual([]);
    });

    describe("with the time zone fixed to America/Bogota (UTC-5)", () => {
        const zone = "America/Bogota";

        it("groups by the local day, not the UTC one", () => {
            // 02:30 UTC on the 14th is still the 13th in Bogotá.
            const groups = groupByDay(
                [
                    activity({ id: 3, created_at: "2026-11-14T15:00:00Z" }),
                    activity({ id: 2, created_at: "2026-11-14T02:30:00Z" }),
                    activity({ id: 1, created_at: "2026-11-13T14:00:00Z" }),
                ],
                zone,
            );

            expect(groups.map((group) => [group.day, group.items.map((item) => item.id)])).toEqual([
                ["sábado, 14 de noviembre de 2026", [3]],
                ["viernes, 13 de noviembre de 2026", [2, 1]],
            ]);
        });

        it("shows the local hour, the relative time and the UTC instant", () => {
            render(
                <ol>
                    <ActivityRow
                        item={activity({ created_at: "2026-11-13T14:05:12Z" })}
                        timeZone={zone}
                    />
                </ol>,
            );

            const time = screen.getByTitle("2026-11-13 14:05:12 UTC");

            expect(time.tagName).toBe("TIME");
            expect(time).toHaveAttribute("dateTime", "2026-11-13T14:05:12Z");
            expect(time).toHaveTextContent(/9:05\sa\.\s?m\./);
            expect(time).toHaveTextContent(/hace|ayer|hoy|mañana/);
        });
    });

    it("leads each entry with the glyph of its action and a weighted title", () => {
        const { container } = render(
            <ol>
                <ActivityRow item={activity({ action: "deleted", detail: { label: "Lote 14" } })} />
            </ol>,
        );

        const title = screen.getByText("Se eliminó el terreno «Lote 14»");

        expect(title.tagName).toBe("P");
        expect(title.className).toMatch(/rowTitle/);
        expect(container.querySelector("svg.icon")).not.toBeNull();
        expect(activityIcon("deleted")).toBe("trash");
        expect(activityIcon("version_saved")).toBe("save");
        expect(activityIcon("something_new")).toBe("history");
    });

    it("pages through the history with the total of the API", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue({
            items: [activity({ action: "archived", entity_type: "project" })],
            total: 45,
            page: 1,
            page_size: 20,
        });
        render(<ProjectActivityPanel projectId={7} />);

        expect(await screen.findByText("Se archivó el proyecto")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

        await waitFor(() => expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 2, 20));
    });

    it("says the history is not available on an older API", async () => {
        vi.mocked(activityApi.listByProject).mockRejectedValue(
            new ApiError(405, "Method Not Allowed"),
        );
        render(<ProjectActivityPanel projectId={7} />);

        expect(await screen.findByText(/El historial de cambios no está disponible/)).toBeVisible();
    });
});
