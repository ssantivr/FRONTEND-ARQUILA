import { screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { structureApi } from "../services/api";
import type { Project, Structure } from "../types/api";
import { renderWithModals } from "../test/render";
import { ProjectCard } from "./ProjectCard";

vi.mock("../services/api", () => ({ structureApi: { get: vi.fn() } }));

const structure: Structure = {
    project_id: 1,
    roof: "gable",
    terrains: [
        {
            id: 8,
            name: "Lote",
            outline: [
                { x_m: 0, y_m: 0 },
                { x_m: 10, y_m: 0 },
                { x_m: 10, y_m: 20 },
                { x_m: 0, y_m: 20 },
            ],
        },
    ],
    rooms: [
        {
            kind: "room",
            id: 5,
            plan_id: 2,
            plan_title: "Planta baja",
            name: "Sala",
            level: "Planta baja",
            x_m: 1,
            y_m: 1,
            base_m: 0,
            width_m: 5,
            depth_m: 4,
            height_m: 2.7,
            surface: null,
        },
    ],
    components: [],
};

const project: Project = {
    id: 1,
    owner_id: 3,
    name: "Casa del patio",
    description: null,
    location: "Medellín",
    latitude: null,
    longitude: null,
    location_zoom: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-11-20T14:30:00Z",
};

beforeEach(() => {
    vi.mocked(structureApi.get).mockResolvedValue(structure);
});

it("shows a real SVG preview when the project has terrain and rooms", async () => {
    renderWithModals(<ProjectCard project={project} onOpen={vi.fn()} />);

    expect(
        await screen.findByRole("img", {
            name: "Vista previa del terreno y distribución de Casa del patio",
        }),
    ).toBeInTheDocument();
    expect(screen.getByText("Medellín")).toBeInTheDocument();
    expect(screen.getByText("20 nov 2026, 9:30 a. m.")).toBeInTheDocument();
});
