import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, structureApi } from "../services/api";
import type { Project, Structure } from "../types/api";
import { SURFACE_MATERIAL_IDS } from "../utils/surfaceMaterials";
import { ProjectCover } from "./ProjectCover";
import { SurfaceLibrary } from "./SurfaceLibrary";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
    structureApi: { get: vi.fn(), setSurface: vi.fn() },
}));

const sala = {
    kind: "room" as const,
    id: 11,
    plan_id: 1,
    plan_title: "Planta baja",
    name: "Sala",
    level: "Planta baja",
    x_m: 0,
    y_m: 0,
    base_m: 0,
    width_m: 4,
    depth_m: 5,
    height_m: 2.6,
    surface: null,
};

beforeEach(() => {
    window.localStorage.clear();
    vi.resetAllMocks();
    vi.mocked(projectsApi.list).mockResolvedValue([{ id: 7, name: "Casa Andina" } as Project]);
    vi.mocked(structureApi.get).mockResolvedValue({
        project_id: 7,
        roof: "gable",
        terrains: [],
        rooms: [sala],
        components: [],
    } as Structure);
});

describe("SurfaceLibrary", () => {
    it("lists every surface the 3D engine has, with the values it renders with", () => {
        render(<SurfaceLibrary />);

        expect(screen.getAllByRole("button", { name: /Rugosidad/ })).toHaveLength(
            SURFACE_MATERIAL_IDS.length,
        );
    });

    it("says the favourites live in this browser and not in the account", () => {
        render(<SurfaceLibrary />);

        expect(
            screen.getByText(/se guardan en este navegador, no en tu cuenta/),
        ).toBeInTheDocument();
    });

    it("remembers a favourite in this browser and can show only those", async () => {
        const { unmount } = render(<SurfaceLibrary />);

        await userEvent.click(screen.getByRole("button", { name: "Marcar como favorita: Madera" }));
        unmount();
        render(<SurfaceLibrary />);

        expect(screen.getByRole("button", { name: "Quitar de favoritas: Madera" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await userEvent.click(screen.getByLabelText("Solo favoritas de este navegador"));

        expect(screen.getAllByRole("button", { name: /Rugosidad/ })).toHaveLength(1);
    });
});

describe("SurfaceLibrary catalogue", () => {
    it("filters by category, searches by name and sorts by a value", async () => {
        render(<SurfaceLibrary />);

        await userEvent.selectOptions(screen.getByLabelText("Filtrar por categoría"), "Metal");
        // Glass is metallic in the engine, but it is a category of its own.
        expect(screen.getAllByRole("button", { name: /Rugosidad/ })).toHaveLength(1);
        expect(screen.getByRole("button", { name: /Rugosidad/ })).toHaveTextContent("Acero");

        await userEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
        await userEvent.type(screen.getByRole("searchbox", { name: "Buscar superficie" }), "pied");
        expect(screen.getAllByRole("button", { name: /Rugosidad/ })).toHaveLength(1);

        await userEvent.clear(screen.getByRole("searchbox", { name: "Buscar superficie" }));
        await userEvent.selectOptions(screen.getByLabelText("Ordenar superficies"), "roughness");
        expect(screen.getAllByRole("button", { name: /Rugosidad/ })[0]).toHaveTextContent("Piedra");
    });

    it("shows the engine values in the enlarged view, with editing off and why", async () => {
        const onOpenViewer = vi.fn();

        render(<SurfaceLibrary onOpenViewer={onOpenViewer} />);
        await userEvent.click(screen.getByRole("button", { name: /^Ladrillo/ }));

        const panel = screen.getByRole("dialog", { name: "Ladrillo" });

        expect(panel).toHaveTextContent("#a9583f");
        expect(panel).toHaveTextContent("Una tesela cada 0,84 m");
        expect(within(panel).getByRole("slider", { name: /Rugosidad/ })).toBeDisabled();
        expect(panel).toHaveTextContent(/la API no guarda materiales propios/);

        await userEvent.click(within(panel).getByRole("button", { name: "Abrir el editor 3D" }));
        expect(onOpenViewer).toHaveBeenCalledTimes(1);
    });
});

describe("SurfaceApply", () => {
    it("puts the surface on an element of a project's model and saves it there", async () => {
        vi.mocked(structureApi.setSurface).mockResolvedValue(undefined);
        render(<SurfaceLibrary />);
        await userEvent.click(screen.getByRole("button", { name: /^Ladrillo/ }));

        const panel = screen.getByRole("dialog", { name: "Ladrillo" });

        await userEvent.selectOptions(await within(panel).findByLabelText("Proyecto"), "7");
        await userEvent.selectOptions(
            await within(panel).findByLabelText("Elemento del modelo"),
            "room:11",
        );

        // A room without a surface of its own is drawn in brick: there is nothing to change.
        expect(within(panel).getByRole("status")).toHaveTextContent("Ahora: Ladrillo");
        expect(
            within(panel).getByRole("button", { name: /Aplicar «Ladrillo» a Sala/ }),
        ).toHaveAttribute("aria-disabled", "true");
        expect(structureApi.setSurface).not.toHaveBeenCalled();
    });

    it("applies another surface and tells so", async () => {
        vi.mocked(structureApi.setSurface).mockResolvedValue(undefined);
        render(<SurfaceLibrary />);
        await userEvent.click(screen.getByRole("button", { name: /^Madera/ }));

        const panel = screen.getByRole("dialog", { name: "Madera" });

        await userEvent.selectOptions(await within(panel).findByLabelText("Proyecto"), "7");
        await userEvent.selectOptions(
            await within(panel).findByLabelText("Elemento del modelo"),
            "room:11",
        );
        await userEvent.click(
            within(panel).getByRole("button", { name: /Aplicar «Madera» a Sala/ }),
        );

        expect(structureApi.setSurface).toHaveBeenCalledWith(7, sala, "wood");
    });
});

describe("ProjectCover", () => {
    it("draws the same cover for a project every time and a different one for another", () => {
        const first = render(<ProjectCover id={1} name="Casa Andina" />).container.innerHTML;
        const again = render(<ProjectCover id={1} name="Casa Andina" />).container.innerHTML;
        const other = render(<ProjectCover id={2} name="Oficina Central" />).container.innerHTML;

        expect(again).toBe(first);
        expect(other).not.toBe(first);
    });
});
