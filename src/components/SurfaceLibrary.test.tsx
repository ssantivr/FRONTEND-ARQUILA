import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SURFACE_MATERIAL_IDS } from "../utils/surfaceMaterials";
import { ProjectCover } from "./ProjectCover";
import { SurfaceLibrary } from "./SurfaceLibrary";

beforeEach(() => {
    window.localStorage.clear();
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
    it("filters by finish, searches by name and sorts by a value", async () => {
        render(<SurfaceLibrary />);

        await userEvent.selectOptions(screen.getByLabelText("Filtrar por acabado"), "Metálicas");
        // Glass is metallic too, but its opacity puts it among the translucent ones.
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

describe("ProjectCover", () => {
    it("draws the same cover for a project every time and a different one for another", () => {
        const first = render(<ProjectCover id={1} name="Casa Andina" />).container.innerHTML;
        const again = render(<ProjectCover id={1} name="Casa Andina" />).container.innerHTML;
        const other = render(<ProjectCover id={2} name="Oficina Central" />).container.innerHTML;

        expect(again).toBe(first);
        expect(other).not.toBe(first);
    });
});
