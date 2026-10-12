import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadAcrossProjects } from "../services/api";
import type { Terrain } from "../types/api";
import { TerrainsPage } from "./TerrainsPage";

vi.mock("../services/api", () => ({
    loadAcrossProjects: vi.fn(),
    terrainsApi: { listByProject: vi.fn() },
}));

function terrain(id: number, name: string, projectId: number, soil: string | null): Terrain {
    return {
        id,
        project_id: projectId,
        name,
        area_m2: 480,
        width_m: 24,
        length_m: 20,
        points: [],
        slope_percent: null,
        soil_type: soil,
        latitude: null,
        longitude: null,
        created_at: "2026-10-01T12:00:00Z",
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadAcrossProjects).mockResolvedValue({
        projects: [
            { id: 1, name: "Casa Andina" },
            { id: 2, name: "Oficina" },
        ] as never,
        items: [terrain(1, "Lote norte", 1, "Arcilloso"), terrain(2, "Lote sur", 2, null)],
    });
});

describe("TerrainsPage", () => {
    it("shows a card per terrain and filters them by project", async () => {
        render(<TerrainsPage onOpenProject={() => undefined} />);

        await screen.findByRole("button", { name: /Lote norte/ });
        await userEvent.selectOptions(screen.getByLabelText("Filtrar por proyecto"), "2");

        expect(screen.queryByRole("button", { name: /Lote norte/ })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Lote sur/ })).toBeInTheDocument();
    });

    it("opens the detail of a terrain without inventing what was not recorded", async () => {
        const onOpenProject = vi.fn();

        render(<TerrainsPage onOpenProject={onOpenProject} />);
        await userEvent.click(await screen.findByRole("button", { name: /Lote sur/ }));

        const detail = screen.getByRole("complementary", { name: "Detalle de Lote sur" });

        expect(within(detail).getAllByText("Sin registrar")).toHaveLength(3);

        await userEvent.click(within(detail).getByRole("button", { name: "Abrir en su proyecto" }));

        expect(onOpenProject).toHaveBeenCalledWith(2);
    });
});
