import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, summaryApi } from "../services/api";
import type { Project, User } from "../types/api";
import { HomePage } from "./HomePage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn(), update: vi.fn() },
    summaryApi: { get: vi.fn() },
}));

const user: User = {
    id: 1,
    name: "Ana Torres",
    email: "ana@example.com",
    created_at: "2026-10-01T12:00:00Z",
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(projectsApi).list.mockResolvedValue([]);
    vi.mocked(summaryApi).get.mockResolvedValue({
        projects: 4,
        draft_projects: 1,
        active_projects: 2,
        archived_projects: 1,
        terrains: 3,
        total_area_m2: 480,
        materials_total_cost: 1200,
    });
});

function project(id: number, name: string, status: Project["status"]): Project {
    return {
        id,
        owner_id: 1,
        name,
        description: null,
        location: null,
        status,
        created_at: "2026-10-01T12:00:00Z",
        updated_at: `2026-10-0${id}T12:00:00Z`,
    };
}

describe("HomePage", () => {
    it("filters the recent projects by name and by status", async () => {
        vi.mocked(projectsApi).list.mockResolvedValue([
            project(1, "Casa Andina", "active"),
            project(2, "Oficina", "draft"),
        ]);
        render(
            <HomePage user={user} onOpenProject={() => undefined} onNavigate={() => undefined} />,
        );

        await screen.findByRole("button", { name: /Casa Andina/ });
        await userEvent.type(screen.getByLabelText("Buscar en proyectos recientes"), "ofi");

        expect(screen.queryByRole("button", { name: /Casa Andina/ })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Oficina/ })).toBeInTheDocument();

        await userEvent.selectOptions(
            screen.getByLabelText("Filtrar recientes por estado"),
            "active",
        );

        expect(
            screen.getByText("Ningún proyecto reciente coincide con el filtro."),
        ).toBeInTheDocument();
    });

    it("archives a recent project from its menu and opens its 3D model", async () => {
        const onOpenProject = vi.fn();

        vi.mocked(projectsApi).list.mockResolvedValue([project(1, "Casa Andina", "active")]);
        vi.mocked(projectsApi).update.mockResolvedValue(project(1, "Casa Andina", "archived"));
        render(<HomePage user={user} onOpenProject={onOpenProject} onNavigate={() => undefined} />);

        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Ver el modelo 3D" }));
        await userEvent.click(screen.getByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Archivar" }));

        expect(onOpenProject).toHaveBeenCalledWith(1, "model");
        expect(projectsApi.update).toHaveBeenCalledWith(1, { status: "archived" });
    });

    it("greets the user and shows the figures the API returns", async () => {
        render(
            <HomePage user={user} onOpenProject={() => undefined} onNavigate={() => undefined} />,
        );

        expect(screen.getByRole("heading", { name: "Hola, Ana Torres" })).toBeInTheDocument();
        expect(
            await screen.findByText("2 activos · 1 en borrador · 1 archivados"),
        ).toBeInTheDocument();
    });

    it("takes the main actions of the hero to their modules", async () => {
        const onNavigate = vi.fn();

        render(<HomePage user={user} onOpenProject={() => undefined} onNavigate={onNavigate} />);

        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));
        await userEvent.click(screen.getByRole("button", { name: "Abrir el visor 3D" }));

        expect(onNavigate).toHaveBeenNthCalledWith(1, "projects");
        expect(onNavigate).toHaveBeenNthCalledWith(2, "viewer");
    });
});
