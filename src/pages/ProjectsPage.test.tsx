import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadAcrossProjects, projectsApi, summaryApi, templatesApi } from "../services/api";
import type { Project, RenovationLog } from "../types/api";
import { ProjectsPage } from "./ProjectsPage";

vi.mock("../services/api", () => ({
    projectsApi: {
        page: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        duplicate: vi.fn(),
        archive: vi.fn(),
        unarchive: vi.fn(),
    },
    templatesApi: { list: vi.fn(), createProject: vi.fn() },
    summaryApi: { get: vi.fn() },
    loadAcrossProjects: vi.fn(),
    loadProjectTasks: vi.fn(),
}));

function task(id: number, title: string, dates: Partial<RenovationLog>): RenovationLog {
    return {
        id,
        project_id: 1,
        room_id: null,
        spatial_element_id: null,
        created_by: null,
        layer: "finishes",
        title,
        description: null,
        status: "planned",
        planned_start: null,
        planned_end: null,
        completed_at: null,
        estimated_cost: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        ...dates,
    };
}

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

/** One page of GET /projects with these projects and nothing more. */
function pageOf(items: Project[]) {
    return { items, total: items.length, page: 1, page_size: 12, paged: true };
}

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
        let finish: (page: ReturnType<typeof pageOf>) => void = () => undefined;
        projects.page.mockReturnValue(new Promise((resolve) => (finish = resolve)));

        renderPage();

        expect(screen.getAllByRole("status").some((node) => node.textContent === "Cargando…")).toBe(
            true,
        );

        finish(pageOf([project(1, "Casa Andina"), project(2, "Oficina")]));

        expect(await screen.findByRole("button", { name: /Casa Andina/ })).toHaveTextContent(
            "Quito",
        );
        // No place recorded: the card leaves it out instead of writing a placeholder.
        expect(screen.getByRole("button", { name: /Oficina/ })).not.toHaveTextContent("Quito");
    });

    it("opens a project when its card is activated", async () => {
        projects.page.mockResolvedValue(pageOf([project(7, "Casa Andina")]));

        const { onOpenProject } = renderPage();
        await userEvent.click(await screen.findByRole("button", { name: /Casa Andina/ }));

        expect(onOpenProject).toHaveBeenCalledWith(7);
    });

    it("says so when there are no projects", async () => {
        projects.page.mockResolvedValue(pageOf([]));

        renderPage();

        expect(await screen.findByText("Todavía no hay proyectos")).toBeInTheDocument();
    });

    it("shows a load error and reloads when the user retries", async () => {
        projects.page.mockRejectedValueOnce(new Error("Failed to fetch"));
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina")]));

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
        projects.page.mockResolvedValueOnce(pageOf([]));
        projects.page.mockResolvedValue(pageOf([project(3, "Casa Nueva")]));
        projects.create.mockResolvedValue(project(3, "Casa Nueva"));

        renderPage();
        await screen.findByText("Todavía no hay proyectos");

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
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina"), project(2, "Oficina")]));

        renderPage();

        expect(await screen.findByRole("heading", { name: "2 proyectos" })).toBeInTheDocument();
        expect(screen.getByText("0 activos · 2 en borrador · 0 archivados")).toBeInTheDocument();
    });

    it("offers the examples as a secondary way in and opens the one chosen", async () => {
        projects.page.mockResolvedValue(pageOf([]));
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

        await userEvent.click(await screen.findByRole("button", { name: "Ejemplos" }));
        await userEvent.click(await screen.findByRole("button", { name: /Casa de ejemplo/ }));

        expect(onOpenModel).toHaveBeenCalledWith(9);
    });

    it("keeps the form and shows the error when the project cannot be created", async () => {
        projects.page.mockResolvedValue(pageOf([]));
        projects.create.mockRejectedValue(new Error("Failed to fetch"));

        renderPage();
        await screen.findByText("Todavía no hay proyectos");
        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));
        await userEvent.type(screen.getByLabelText("Nombre"), "Casa Nueva");
        await userEvent.click(screen.getByRole("button", { name: "Crear" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No se pudo conectar con el servidor.",
        );
        expect(screen.getByLabelText("Nombre")).toHaveValue("Casa Nueva");
        expect(screen.getByRole("button", { name: "Crear" })).toBeEnabled();
    });

    it("archives a project from its menu and asks for the list again", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina")]));
        projects.archive.mockResolvedValue({ ...project(1, "Casa Andina"), status: "archived" });

        renderPage();
        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Archivar" }));

        expect(projects.archive).toHaveBeenCalledWith(1);
        await waitFor(() => expect(projects.page).toHaveBeenCalledTimes(2));
    });

    it("unarchives an archived project and duplicates another", async () => {
        projects.page.mockResolvedValue(
            pageOf([{ ...project(1, "Casa Andina"), status: "archived" }, project(2, "Oficina")]),
        );
        projects.unarchive.mockResolvedValue(project(1, "Casa Andina"));
        projects.duplicate.mockResolvedValue(project(3, "Oficina (copia)"));

        renderPage();
        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Desarchivar" }));
        await waitFor(() => expect(projects.unarchive).toHaveBeenCalledWith(1));
        await userEvent.click(screen.getByTitle("Acciones de Oficina"));
        await userEvent.click(
            within(screen.getByRole("group", { name: "Acciones de Oficina" })).getByRole("button", {
                name: "Duplicar",
            }),
        );

        await waitFor(() => expect(projects.duplicate).toHaveBeenCalledWith(2));
    });

    it("edits a project in a window and saves only what the form says", async () => {
        projects.page.mockResolvedValue(pageOf([{ ...project(1, "Casa Andina"), progress: 20 }]));
        projects.update.mockResolvedValue(project(1, "Casa Andes"));

        renderPage();
        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Editar…" }));

        const dialog = screen.getByRole("dialog", { name: "Editar «Casa Andina»" });
        const name = within(dialog).getByLabelText("Nombre");
        const progress = within(dialog).getByLabelText("Avance (%)");

        await userEvent.clear(name);
        await userEvent.type(name, "Casa Andes");
        await userEvent.clear(progress);
        await userEvent.type(progress, "45");
        await userEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

        expect(projects.update).toHaveBeenCalledWith(1, {
            name: "Casa Andes",
            location: "Quito",
            description: null,
            progress: 45,
        });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("asks before deleting and deletes only after the confirmation", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina")]));
        projects.remove.mockResolvedValue(undefined);

        renderPage();
        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Eliminar…" }));

        expect(projects.remove).not.toHaveBeenCalled();
        expect(screen.getByText("¿Eliminar «Casa Andina»?")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));

        expect(projects.remove).toHaveBeenCalledWith(1);
    });

    it("lets the user cancel a deletion", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina")]));

        renderPage();
        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Eliminar…" }));
        await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(projects.remove).not.toHaveBeenCalled();
        expect(screen.getByTitle("Acciones de Casa Andina")).toBeInTheDocument();
    });

    it("asks the API for the order, the filter and the search chosen", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Oficina")]));

        renderPage();
        await screen.findByRole("button", { name: /Oficina/ });

        expect(projects.page).toHaveBeenLastCalledWith({
            page: 1,
            page_size: 12,
            q: undefined,
            archived: false,
            sort: "updated_at",
            order: "desc",
        });

        await userEvent.selectOptions(screen.getByLabelText("Ordenar proyectos"), "name");
        await userEvent.selectOptions(screen.getByLabelText("Qué proyectos mostrar"), "archived");
        await userEvent.type(
            screen.getByLabelText("Buscar por nombre, descripción o lugar"),
            "casa",
        );

        await waitFor(() =>
            expect(projects.page).toHaveBeenLastCalledWith({
                page: 1,
                page_size: 12,
                q: "casa",
                archived: true,
                sort: "name",
                order: "asc",
            }),
        );
    });

    it("moves between pages with the total the API gives", async () => {
        const many = Array.from({ length: 12 }, (_, index) => project(index + 1, `P${index + 1}`));

        projects.page.mockResolvedValue({ ...pageOf(many), total: 30 });

        renderPage();
        await screen.findByText("P1");

        expect(screen.getByText("1–12 de 30 proyectos")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

        await waitFor(() =>
            expect(projects.page).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
        );
    });

    it("says so when the API in use does not page the list", async () => {
        projects.page.mockResolvedValue({ ...pageOf([project(1, "Casa Andina")]), paged: false });

        renderPage();

        expect(await screen.findByRole("note")).toHaveTextContent("no pagina la lista");
    });

    it("offers to clear the filters when they leave nothing, and clears them", async () => {
        projects.page.mockResolvedValue(pageOf([]));

        renderPage();
        await userEvent.type(
            screen.getByLabelText("Buscar por nombre, descripción o lugar"),
            "zzz",
        );
        await userEvent.click(await screen.findByRole("button", { name: "Quitar los filtros" }));

        expect(screen.getByLabelText("Buscar por nombre, descripción o lugar")).toHaveValue("");
        expect(await screen.findByText("Todavía no hay proyectos")).toBeInTheDocument();
    });

    it("shows the list as rows with the same data when asked", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina")]));

        renderPage();
        await screen.findByRole("button", { name: /Casa Andina/ });
        await userEvent.click(screen.getByRole("radio", { name: "Lista" }));

        const row = screen.getByRole("row", { name: /Casa Andina/ });

        expect(row).toHaveTextContent("Quito");
        expect(row).toHaveTextContent("Borrador");
        expect(within(row).getByTitle("Acciones de Casa Andina")).toBeInTheDocument();
    });

    it("asks for the tasks only when the timeline is opened, and places them by their dates", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina"), project(2, "Oficina")]));
        vi.mocked(loadAcrossProjects).mockResolvedValue({
            projects: [project(1, "Casa Andina"), project(2, "Oficina")],
            items: [
                task(1, "Pintar fachada", {
                    planned_start: "2026-10-01",
                    planned_end: "2026-10-20",
                }),
                task(2, "Cambiar tejas", { planned_end: "2026-11-05" }),
                task(3, "Revisar desagües", {}),
            ],
        });

        renderPage();
        await screen.findByRole("button", { name: /Casa Andina/ });

        expect(loadAcrossProjects).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole("radio", { name: "Cronograma" }));

        const group = await screen.findByRole("region", { name: /Casa Andina/ });

        expect(within(group).getByText("Pintar fachada").closest("li")).toHaveTextContent(
            "del 01/10/2026 al 20/10/2026",
        );
        // One planned date only: it is said so, and no start is made up.
        expect(within(group).getByText("Cambiar tejas").closest("li")).toHaveTextContent(
            "termina el 05/11/2026, sin la otra fecha",
        );

        const undated = screen.getByRole("region", { name: "Tareas sin fechas" });

        expect(undated).toHaveTextContent("Revisar desagües");
        expect(screen.getByText(/Sin tareas registradas: Oficina/)).toBeInTheDocument();
    });

    it("deletes from a confirmation window that opens on «Cancelar»", async () => {
        projects.page.mockResolvedValue(pageOf([project(1, "Casa Andina")]));
        projects.remove.mockResolvedValue(undefined);

        renderPage();
        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Eliminar…" }));

        const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar «Casa Andina»?" });

        expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
        await userEvent.click(within(dialog).getByRole("button", { name: "Sí, eliminar" }));
        expect(projects.remove).toHaveBeenCalledWith(1);
    });
});
