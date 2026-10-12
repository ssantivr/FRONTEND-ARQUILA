import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

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

    it("remembers a favourite in this browser and can show only those", async () => {
        const { unmount } = render(<SurfaceLibrary />);

        await userEvent.click(screen.getByRole("button", { name: "Marcar como favorita: Madera" }));
        unmount();
        render(<SurfaceLibrary />);

        expect(screen.getByRole("button", { name: "Quitar de favoritas: Madera" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await userEvent.click(screen.getByLabelText("Solo favoritas"));

        expect(screen.getAllByRole("button", { name: /Rugosidad/ })).toHaveLength(1);
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
