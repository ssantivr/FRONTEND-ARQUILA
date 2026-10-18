import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, summaryApi } from "../services/api";
import type { Project, User } from "../types/api";
import { HomePage } from "./HomePage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn(), update: vi.fn(), remove: vi.fn() },
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
        // The word agrees with the figure: «1 archivado», not «1 archivados».
        expect(
            await screen.findByText("2 activos · 1 en borrador · 1 archivado"),
        ).toBeInTheDocument();
        expect(screen.getByText("480 m² en total")).toBeInTheDocument();
        // Only what GET /summary returns: no count of plans nor a «completed» state.
        const figures = screen.getByLabelText("Resumen de tu cuenta");

        expect(within(figures).queryByText(/planos/i)).not.toBeInTheDocument();
        expect(within(figures).queryByText(/completad/i)).not.toBeInTheDocument();
    });

    it("deletes a recent project only after confirming it", async () => {
        vi.mocked(projectsApi).list.mockResolvedValue([project(1, "Casa Andina", "active")]);
        vi.mocked(projectsApi).remove.mockResolvedValue(undefined);
        render(
            <HomePage user={user} onOpenProject={() => undefined} onNavigate={() => undefined} />,
        );

        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Eliminar…" }));

        const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar «Casa Andina»?" });

        expect(projectsApi.remove).not.toHaveBeenCalled();
        await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar el proyecto" }));

        expect(projectsApi.remove).toHaveBeenCalledWith(1);
    });

    it("offers to continue with the last project that is not archived", async () => {
        const onOpenProject = vi.fn();

        vi.mocked(projectsApi).list.mockResolvedValue([
            project(1, "Casa Andina", "active"),
            project(2, "Oficina", "draft"),
            project(3, "Bodega", "archived"),
        ]);
        render(<HomePage user={user} onOpenProject={onOpenProject} onNavigate={() => undefined} />);

        const card = await screen.findByRole("region", { name: "Continuar donde lo dejaste" });

        expect(within(card).getByRole("heading", { name: "Oficina" })).toBeInTheDocument();

        await userEvent.click(within(card).getByRole("button", { name: "Abrir el modelo 3D" }));

        expect(onOpenProject).toHaveBeenCalledWith(2, "model");
        expect(screen.getByRole("img", { name: /Activos: 2, En borrador: 1/ })).toBeInTheDocument();
    });

    it("takes the main actions of the hero to the creation form and to the projects", async () => {
        const onNavigate = vi.fn();
        const onCreateProject = vi.fn();

        render(
            <HomePage
                user={user}
                onOpenProject={() => undefined}
                onNavigate={onNavigate}
                onCreateProject={onCreateProject}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));
        await userEvent.click(screen.getByRole("button", { name: "Explorar proyectos" }));

        expect(onCreateProject).toHaveBeenCalledTimes(1);
        expect(onNavigate).toHaveBeenCalledWith("projects");
    });
});
