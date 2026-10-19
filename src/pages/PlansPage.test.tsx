import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, structureApi, terrainsApi } from "../services/api";
import type { Structure, StructureRoom } from "../types/api";
import { PlansPage } from "./PlansPage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
    structureApi: { get: vi.fn() },
    terrainsApi: { listByProject: vi.fn() },
}));

function room(id: number, name: string, x: number): StructureRoom {
    return {
        kind: "room",
        id,
        plan_id: 1,
        plan_title: "Planta baja",
        name,
        level: "1",
        x_m: x,
        y_m: 3,
        base_m: 0,
        width_m: 5,
        depth_m: 4,
        height_m: 2.8,
        surface: null,
    };
}

const STRUCTURE: Structure = {
    project_id: 1,
    roof: "gable",
    terrains: [],
    rooms: [room(1, "Sala", 2), room(2, "Cocina", 7)],
    components: [],
};

beforeEach(() => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
    vi.mocked(projectsApi.list).mockResolvedValue([{ id: 1, name: "Casa Mirador" }] as never);
    vi.mocked(structureApi.get).mockResolvedValue(STRUCTURE);
    vi.mocked(terrainsApi.listByProject).mockResolvedValue([]);
});

describe("PlansPage", () => {
    it("lists the sheets of the project by group and opens the one chosen", async () => {
        render(<PlansPage onOpenProject={() => undefined} />);

        const sheets = await screen.findByRole("navigation", { name: "Láminas del proyecto" });

        expect(sheets).toHaveTextContent("Plantas");
        expect(sheets).toHaveTextContent("Fachadas y corte");
        // No terrain, so no site plan: a sheet is only listed when it can be drawn.
        expect(sheets).not.toHaveTextContent("Implantación");

        const first = screen.getByRole("button", { name: "Planta baja" });

        expect(first).toHaveAttribute("aria-current", "page");

        await userEvent.click(screen.getByRole("button", { name: "Corte esquemático A-A" }));

        expect(screen.getByRole("button", { name: "Corte esquemático A-A" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(first).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("img", { name: /Corte esquemático A-A/ })).toBeInTheDocument();
    });

    it("shows the drawing tools the API cannot keep as disabled, with the reason", async () => {
        const openViewer = vi.fn();

        render(<PlansPage onOpenProject={() => undefined} onOpenViewer={openViewer} />);

        const walls = await screen.findByRole("button", { name: "Muros" });

        expect(walls).toHaveAttribute("aria-disabled", "true");
        expect(walls).toHaveAccessibleDescription(/la API no guarda trazos/);

        await userEvent.click(screen.getByRole("button", { name: "Abrir el editor 3D" }));

        expect(openViewer).toHaveBeenCalled();
    });

    it("says what to do when the project has nothing to draw yet", async () => {
        vi.mocked(structureApi.get).mockResolvedValue({ ...STRUCTURE, rooms: [] });

        render(<PlansPage onOpenProject={() => undefined} />);

        expect(await screen.findByText("Todavía no hay láminas")).toBeInTheDocument();
    });
});
