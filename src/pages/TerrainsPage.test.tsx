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
    it("derives the dimensions, perimeter and drop from what the terrain records", async () => {
        vi.mocked(loadAcrossProjects).mockResolvedValue({
            projects: [{ id: 1, name: "Casa Andina", location: "Quito" }] as never,
            items: [
                {
                    ...terrain(1, "Lote norte", 1, null),
                    slope_percent: 5,
                    latitude: -0.18,
                    longitude: -78.47,
                },
            ],
        });
        window.localStorage.setItem(
            "arquila:site:1",
            JSON.stringify({ terrains: { 1: { north: 30 } } }),
        );

        render(<TerrainsPage onOpenProject={() => undefined} />);

        const detail = await screen.findByRole("complementary", { name: "Detalle de Lote norte" });

        expect(detail).toHaveTextContent("24 × 20 m");
        expect(detail).toHaveTextContent("88 m · 4 lados");
        // 20 m of depth at 5 %.
        expect(detail).toHaveTextContent("1 m de desnivel en el fondo");
        expect(detail).toHaveTextContent("Quito");
        expect(detail).toHaveTextContent("Norte a 30°");
        expect(within(detail).getByRole("link", { name: /OpenStreetMap/ })).toHaveAttribute(
            "href",
            expect.stringContaining("mlat=-0.18&mlon=-78.47"),
        );
        window.localStorage.clear();
    });

    it("sorts by area and by slope, with unrecorded slopes last", async () => {
        vi.mocked(loadAcrossProjects).mockResolvedValue({
            projects: [{ id: 1, name: "Casa Andina" }] as never,
            items: [
                { ...terrain(1, "Plano", 1, null), area_m2: 100, slope_percent: null },
                { ...terrain(2, "Ladera", 1, null), area_m2: 300, slope_percent: 12 },
                { ...terrain(3, "Suave", 1, null), area_m2: 200, slope_percent: 2 },
            ],
        });

        render(<TerrainsPage onOpenProject={() => undefined} />);
        await screen.findByRole("button", { name: /Plano/ });

        const names = () =>
            within(screen.getByRole("list"))
                .getAllByRole("button")
                .map((card) => card.textContent?.split("Casa Andina")[0]);

        await userEvent.selectOptions(screen.getByLabelText("Ordenar terrenos"), "area");
        expect(names()).toEqual(["Ladera", "Suave", "Plano"]);

        await userEvent.selectOptions(screen.getByLabelText("Ordenar terrenos"), "slope");
        expect(names()).toEqual(["Ladera", "Suave", "Plano"]);
    });

    it("shows a card per terrain and filters them by project", async () => {
        render(<TerrainsPage onOpenProject={() => undefined} />);

        await screen.findByRole("button", { name: /Lote norte/ });
        await userEvent.selectOptions(screen.getByLabelText("Filtrar por proyecto"), "2");

        expect(screen.queryByRole("button", { name: /Lote norte/ })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Lote sur/ })).toBeInTheDocument();
    });

    it("shows the first terrain in the detail panel until another is chosen, and its figures", async () => {
        render(<TerrainsPage onOpenProject={() => undefined} />);

        expect(
            await screen.findByRole("complementary", { name: "Detalle de Lote norte" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "2 terrenos" })).toBeInTheDocument();
        expect(screen.getByText("960 m²")).toBeInTheDocument();
    });

    it("opens the detail of a terrain without inventing what was not recorded", async () => {
        const onOpenProject = vi.fn();

        render(<TerrainsPage onOpenProject={onOpenProject} />);
        await userEvent.click(await screen.findByRole("button", { name: /Lote sur/ }));

        const detail = screen.getByRole("complementary", { name: "Detalle de Lote sur" });

        // Slope, soil, location of the project, orientation and coordinates: none recorded.
        expect(within(detail).getAllByText("Sin registrar")).toHaveLength(5);

        await userEvent.click(within(detail).getByRole("button", { name: "Abrir en su proyecto" }));

        expect(onOpenProject).toHaveBeenCalledWith(2);
    });
});
