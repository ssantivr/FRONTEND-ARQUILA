import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadAcrossProjects } from "../services/api";
import type { Material } from "../types/api";
import { MaterialsPage } from "./MaterialsPage";

vi.mock("../services/api", () => ({
    loadAcrossProjects: vi.fn(),
    materialsApi: { listByProject: vi.fn() },
}));

function material(id: number, name: string, category: string | null): Material {
    return {
        id,
        project_id: 1,
        name,
        category,
        unit: "u",
        quantity: 10,
        unit_cost: id,
        created_at: "2026-10-01T12:00:00Z",
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadAcrossProjects).mockResolvedValue({
        projects: [],
        items: [
            material(1, "Ladrillo", "Mampostería"),
            material(2, "Cemento", "Estructura"),
            material(3, "Acero", "Estructura"),
        ],
    });
});

/** The budget items are the second catalogue; the surfaces of the 3D model open first. */
async function openWorks() {
    await userEvent.click(screen.getByRole("button", { name: "Materiales de obra" }));
}

describe("MaterialsPage", () => {
    it("opens on the visual catalogue of surfaces and counts both catalogues", async () => {
        render(<MaterialsPage onOpenProject={() => undefined} />);

        expect(
            screen.getByRole("heading", { name: "Superficies del modelo 3D" }),
        ).toBeInTheDocument();
        expect(
            await screen.findByText(/7 superficies del motor · 3 materiales de obra/),
        ).toBeInTheDocument();
    });

    it("filters the list by name", async () => {
        render(<MaterialsPage onOpenProject={() => undefined} />);
        await openWorks();

        await userEvent.type(await screen.findByLabelText("Buscar material por nombre"), "cem");

        expect(screen.getByRole("cell", { name: "Cemento" })).toBeInTheDocument();
        expect(screen.queryByRole("cell", { name: "Ladrillo" })).not.toBeInTheDocument();
    });

    it("filters the list by category", async () => {
        render(<MaterialsPage onOpenProject={() => undefined} />);
        await openWorks();

        await userEvent.selectOptions(
            await screen.findByLabelText("Filtrar por categoría"),
            "Mampostería",
        );

        expect(screen.getByRole("cell", { name: "Ladrillo" })).toBeInTheDocument();
        expect(screen.queryByRole("cell", { name: "Acero" })).not.toBeInTheDocument();
    });

    it("says so when the filter leaves nothing", async () => {
        render(<MaterialsPage onOpenProject={() => undefined} />);
        await openWorks();

        await userEvent.type(await screen.findByLabelText("Buscar material por nombre"), "zzz");

        expect(screen.getByText("Ningún material coincide con el filtro.")).toBeInTheDocument();
    });
});
