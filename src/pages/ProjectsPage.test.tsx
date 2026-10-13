import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, summaryApi, templatesApi } from "../services/api";
import type { Project } from "../types/api";
import { ProjectsPage } from "./ProjectsPage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    templatesApi: { list: vi.fn(), createProject: vi.fn() },
    summaryApi: { get: vi.fn() },
}));

function project(id: number, name: string): Project {
    return {
        id,
        owner_id: 1,
        name,
        description: null,
        location: id === 1 ? "Quito" : null,
        status: "draft",
        created_at: "2026-10-01T00:00:00",
        updated_at: "2026-10-01T00:00:00",
    };
}

const projects = vi.mocked(projectsApi);
const templates = vi.mocked(templatesApi);

function renderPage() {
    const onOpenProject = vi.fn();
    const onOpenModel = vi.fn();

    render(<ProjectsPage onOpenProject={onOpenProject} onOpenModel={onOpenModel} />);

    return { onOpenProject, onOpenModel };
}

beforeEach(() => {
    vi.resetAllMocks();
    templates.list.mockResolvedValue([]);
    vi.mocked(summaryApi).get.mockResolvedValue({
        projects: 2,
        draft_projects: 2,
        active_projects: 0,
        archived_projects: 0,
        terrains: 0,
        total_area_m2: 0,
        materials_total_cost: 0,
    });
});

describe("ProjectsPage", () => {
    it("shows a loading state and then the projects", async () => {
        let finish: (items: Project[]) => void = () => undefined;
        projects.list.mockReturnValue(new Promise<Project[]>((resolve) => (finish = resolve)));

        renderPage();

        expect(screen.getAllByRole("status").some((node) => node.textContent === "Cargando…")).toBe(
            true,
        );

        finish([project(1, "Casa Andina"), project(2, "Oficina")]);

        expect(await screen.findByRole("button", { name: /Casa Andina/ })).toHaveTextContent(
            "Quito",
        );
        expect(screen.getByRole("button", { name: /Oficina/ })).toHaveTextContent("Sin ubicación");
    });

    it("opens a project when its card is activated", async () => {
        projects.list.mockResolvedValue([project(7, "Casa Andina")]);

        const { onOpenProject } = renderPage();
        await userEvent.click(await screen.findByRole("button", { name: /Casa Andina/ }));

        expect(onOpenProject).toHaveBeenCalledWith(7);
    });

    it("says so when there are no projects", async () => {
        projects.list.mockResolvedValue([]);

        renderPage();

        expect(await screen.findByText("No hay proyectos.")).toBeInTheDocument();
    });

    it("shows a load error and reloads when the user retries", async () => {
        projects.list.mockRejectedValueOnce(new Error("Failed to fetch"));
        projects.list.mockResolvedValue([project(1, "Casa Andina")]);

        renderPage();

        const alert = await screen.findByText("No se pudo conectar con el servidor.");

        await userEvent.click(
            within(alert.closest("[role=alert]") as HTMLElement).getByRole("button", {
                name: "Reintentar",
            }),
        );

        expect(await screen.findByRole("button", { name: /Casa Andina/ })).toBeInTheDocument();
        expect(screen.queryByText("No se pudo conectar con el servidor.")).not.toBeInTheDocument();
    });

    it("creates a project from the labelled form and reloads the list", async () => {
        projects.list.mockResolvedValueOnce([]);
        projects.list.mockResolvedValue([project(3, "Casa Nueva")]);
        projects.create.mockResolvedValue(project(3, "Casa Nueva"));

        renderPage();
        await screen.findByText("No hay proyectos.");

        expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));

        expect(screen.getByLabelText("Nombre")).toHaveFocus();
        expect(screen.getByRole("button", { name: "Crear" })).toBeDisabled();

        await userEvent.type(screen.getByLabelText("Nombre"), " Casa Nueva ");
        await userEvent.type(screen.getByLabelText("Ubicación"), "Pasto");
        await userEvent.click(screen.getByRole("button", { name: "Crear" }));

        expect(projects.create).toHaveBeenCalledWith({
            name: "Casa Nueva",
            location: "Pasto",
            description: undefined,
        });
        expect(await screen.findByRole("button", { name: /Casa Nueva/ })).toBeInTheDocument();
        expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    });

    it("shows the real project counts of the account", async () => {
        projects.list.mockResolvedValue([project(1, "Casa Andina"), project(2, "Oficina")]);

        renderPage();

        const drafts = (await screen.findByText("En borrador")).closest("div") as HTMLElement;

        expect(drafts).toHaveTextContent("2");
        expect(screen.getByRole("heading", { name: "2 proyectos" })).toBeInTheDocument();
    });

    it("offers the examples inside the creation panel and opens the one chosen", async () => {
        projects.list.mockResolvedValue([]);
        templates.list.mockResolvedValue([
            {
                id: "casa",
                name: "Casa de ejemplo",
                kind: "Vivienda",
                description: "Dos niveles.",
                levels: 2,
                built_area_m2: 120,
                lot_area_m2: 300,
            },
        ] as never);
        templates.createProject.mockResolvedValue(project(9, "Casa de ejemplo"));

        const { onOpenModel } = renderPage();

        await userEvent.click(await screen.findByRole("button", { name: "Crear proyecto" }));
        await userEvent.click(await screen.findByRole("button", { name: /Casa de ejemplo/ }));

        expect(onOpenModel).toHaveBeenCalledWith(9);
    });

    it("keeps the form and shows the error when the project cannot be created", async () => {
        projects.list.mockResolvedValue([]);
        projects.create.mockRejectedValue(new Error("Failed to fetch"));

        renderPage();
        await screen.findByText("No hay proyectos.");
        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));
        await userEvent.type(screen.getByLabelText("Nombre"), "Casa Nueva");
        await userEvent.click(screen.getByRole("button", { name: "Crear" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No se pudo conectar con el servidor.",
        );
        expect(screen.getByLabelText("Nombre")).toHaveValue("Casa Nueva");
        expect(screen.getByRole("button", { name: "Crear" })).toBeEnabled();
    });

    it("archives a project from its card and confirms it", async () => {
        projects.list.mockResolvedValue([project(1, "Casa Andina")]);
        projects.update.mockResolvedValue({ ...project(1, "Casa Andina"), status: "archived" });

        renderPage();
        await userEvent.click(await screen.findByRole("button", { name: "Archivar" }));

        expect(projects.update).toHaveBeenCalledWith(1, { status: "archived" });
        await waitFor(() => expect(projects.list).toHaveBeenCalledTimes(2));
    });

    it("asks before deleting and deletes only after the confirmation", async () => {
        projects.list.mockResolvedValue([project(1, "Casa Andina")]);
        projects.remove.mockResolvedValue(undefined);

        renderPage();
        await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

        expect(projects.remove).not.toHaveBeenCalled();
        expect(screen.getByText("¿Eliminar «Casa Andina»?")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));

        expect(projects.remove).toHaveBeenCalledWith(1);
    });

    it("lets the user cancel a deletion", async () => {
        projects.list.mockResolvedValue([project(1, "Casa Andina")]);

        renderPage();
        await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));
        await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(projects.remove).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    });

    it("sorts by name on request", async () => {
        projects.list.mockResolvedValue([project(1, "Oficina"), project(2, "Casa Andina")]);

        renderPage();
        await screen.findByRole("button", { name: /Oficina/ });
        await userEvent.selectOptions(screen.getByLabelText("Ordenar proyectos"), "name");

        const names = screen
            .getAllByRole("button", { name: /Casa Andina|Oficina/ })
            .map((card) => card.textContent ?? "");

        expect(names[0]).toContain("Casa Andina");
    });
});
