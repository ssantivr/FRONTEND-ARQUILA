import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activityApi, loadAcrossProjects, projectsApi, summaryApi } from "../services/api";
import type { Activity, Project, RenovationLog, User } from "../types/api";
import { HomePage } from "./HomePage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
    summaryApi: { get: vi.fn() },
    activityApi: { listByProject: vi.fn() },
    loadAcrossProjects: vi.fn(),
    loadProjectTasks: vi.fn(),
}));

const user: User = {
    id: 1,
    name: "Ana Torres",
    email: "ana@example.com",
    created_at: "2026-10-01T12:00:00Z",
};

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

function change(id: number, projectId: number, label: string, at: string): Activity {
    return {
        id,
        project_id: projectId,
        user_id: 1,
        action: "created",
        entity_type: "terrain",
        entity_id: id,
        detail: { label },
        created_at: at,
    };
}

function task(id: number, title: string, end: string | null, status = "planned"): RenovationLog {
    return { id, project_id: 1, title, planned_end: end, status } as RenovationLog;
}

const noActivity = { items: [], total: 0, page: 1, page_size: 5 };

function showHome(onOpenProject = vi.fn(), onNavigate = vi.fn(), onCreateProject = vi.fn()) {
    render(
        <HomePage
            user={user}
            onOpenProject={onOpenProject}
            onNavigate={onNavigate}
            onCreateProject={onCreateProject}
        />,
    );

    return { onOpenProject, onNavigate, onCreateProject };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(projectsApi).list.mockResolvedValue([]);
    vi.mocked(activityApi).listByProject.mockResolvedValue(noActivity);
    vi.mocked(loadAcrossProjects).mockResolvedValue({ projects: [], items: [] } as never);
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

describe("HomePage with data", () => {
    beforeEach(() => {
        vi.mocked(projectsApi).list.mockResolvedValue([
            project(1, "Casa Andina", "active"),
            { ...project(2, "Oficina", "draft"), progress: 40 },
            project(3, "Bodega", "archived"),
        ]);
    });

    it("greets the user with the date and shows the figures the API returns", async () => {
        showHome();

        expect(screen.getByRole("heading", { name: "Hola, Ana Torres", level: 1 })).toBeVisible();
        // The word agrees with the figure: «1 archivado», not «1 archivados».
        expect(
            await screen.findByText("2 activos · 1 en borrador · 1 archivado"),
        ).toBeInTheDocument();
        expect(screen.getByText("480 m² en total")).toBeInTheDocument();
        // An API older than 20 October sends no count of plans nor a «completed» figure.
        const figures = screen.getByLabelText("Resumen de tu cuenta");

        expect(within(figures).queryByText(/planos/i)).not.toBeInTheDocument();
        expect(within(figures).queryByText(/completad/i)).not.toBeInTheDocument();
    });

    it("shows the figures of progress, materials and plans when the API sends them", async () => {
        vi.mocked(summaryApi).get.mockResolvedValue({
            projects: 4,
            draft_projects: 1,
            active_projects: 2,
            archived_projects: 1,
            terrains: 3,
            total_area_m2: 480,
            materials_total_cost: 1200,
            in_progress_projects: 2,
            completed_projects: 1,
            materials: 9,
            plans: 5,
        });
        showHome();

        const figures = await screen.findByLabelText("Resumen de tu cuenta");

        for (const label of ["En progreso", "Completados", "Materiales", "Planos"]) {
            expect(await within(figures).findByText(label)).toBeInTheDocument();
        }
        // The cost moves under the count of materials instead of a line of its own.
        expect(within(figures).queryByText("Costo de materiales")).not.toBeInTheDocument();
    });

    it("focuses on the last project touched that is not archived, with its progress", async () => {
        const { onOpenProject } = showHome();
        const focus = await screen.findByRole("region", { name: "Proyecto en foco" });

        expect(await within(focus).findByRole("heading", { name: "Oficina" })).toBeInTheDocument();
        expect(within(focus).getByRole("progressbar", { name: "Avance" })).toHaveAttribute(
            "aria-valuenow",
            "40",
        );

        await userEvent.click(within(focus).getByRole("button", { name: "Abrir" }));

        expect(onOpenProject).toHaveBeenCalledWith(2);
    });

    it("does not draw a progress the API did not send", async () => {
        vi.mocked(projectsApi).list.mockResolvedValue([project(1, "Casa Andina", "active")]);
        showHome();

        await screen.findByRole("heading", { name: "Casa Andina" });

        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("lists what changed lately, the latest first, across the projects touched last", async () => {
        vi.mocked(activityApi).listByProject.mockImplementation((projectId) =>
            Promise.resolve({
                ...noActivity,
                items:
                    projectId === 1
                        ? [change(1, 1, "Lote 14", "2026-10-02T12:00:00Z")]
                        : projectId === 2
                          ? [change(2, 2, "Lote 20", "2026-10-03T12:00:00Z")]
                          : [],
            }),
        );
        showHome();

        const block = await screen.findByRole("region", { name: "Actividad reciente" });
        const rows = await within(block).findAllByRole("listitem");

        expect(rows[0]).toHaveTextContent("Se creó el terreno «Lote 20»");
        expect(rows[0]).toHaveTextContent("Oficina");
        expect(rows[1]).toHaveTextContent("Se creó el terreno «Lote 14»");
    });

    it("asks for a fixed number of histories however many projects there are", async () => {
        const many = Array.from({ length: 9 }, (_, index) =>
            project(index + 1, `Proyecto ${index + 1}`, "active"),
        );

        vi.mocked(projectsApi).list.mockResolvedValue(many);
        showHome();

        await screen.findByRole("heading", { name: "Proyecto 9" });

        expect(vi.mocked(activityApi).listByProject.mock.calls.length).toBeLessThanOrEqual(5);
    });

    it("lists the unfinished tasks by their end date, and says which are late", async () => {
        vi.mocked(loadAcrossProjects).mockResolvedValue({
            projects: [],
            items: [
                task(1, "Pintar", "2999-03-01"),
                task(2, "Cubierta", "2020-01-10"),
                task(3, "Ya hecha", "2020-01-01", "completed"),
                task(4, "Sin fecha", null),
            ],
        } as never);
        showHome();

        const block = await screen.findByRole("region", { name: "Tareas próximas" });
        const rows = await within(block).findAllByRole("listitem");

        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent("Cubierta");
        expect(rows[0]).toHaveTextContent("Atrasada");
        expect(rows[1]).toHaveTextContent("Pintar");
        expect(rows[1]).toHaveTextContent("Planificada");
    });

    it("links the four working screens with their addresses", async () => {
        const { onNavigate } = showHome();
        const quick = screen.getByRole("navigation", { name: "Accesos rápidos" });
        const links = within(quick).getAllByRole("link");

        expect(links.map((link) => link.getAttribute("href"))).toEqual([
            "/visor",
            "/terrenos",
            "/planos",
            "/materiales",
        ]);

        await userEvent.click(links[1]);

        expect(onNavigate).toHaveBeenCalledWith("terrains");
        await screen.findByRole("heading", { name: "Oficina" });
    });

    it("takes the one main action to the creation form", async () => {
        const { onCreateProject } = showHome();

        await screen.findByRole("heading", { name: "Oficina" });
        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));

        expect(onCreateProject).toHaveBeenCalledTimes(1);
    });
});

describe("HomePage without projects", () => {
    it("offers to create the first one, once", async () => {
        const { onCreateProject } = showHome();
        const focus = screen.getByRole("region", { name: "Proyecto en foco" });

        expect(await within(focus).findByText("Todavía no tienes proyectos")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Crear proyecto" })).toHaveLength(1);

        await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));

        expect(onCreateProject).toHaveBeenCalledTimes(1);
    });

    it("gives the empty lists a concrete text and a way forward", async () => {
        const { onNavigate } = showHome();

        await userEvent.click(await screen.findByRole("button", { name: "Ir a tareas" }));

        expect(onNavigate).toHaveBeenCalledWith("tasks");
        expect(
            await screen.findByText("Aquí aparecerá cada cambio que hagas en tus proyectos."),
        ).toBeInTheDocument();
    });
});

describe("HomePage with errors", () => {
    it("says what failed in each block and retries only that one", async () => {
        vi.mocked(projectsApi).list.mockRejectedValueOnce(new Error("Sin conexión"));
        vi.mocked(summaryApi).get.mockRejectedValueOnce(new Error("Resumen caído"));
        showHome();

        const focus = screen.getByRole("region", { name: "Proyecto en foco" });

        expect(await within(focus).findByRole("alert")).toHaveTextContent("Sin conexión");
        expect(
            await within(screen.getByRole("region", { name: "Cifras clave" })).findByRole("alert"),
        ).toHaveTextContent("Resumen caído");

        vi.mocked(projectsApi).list.mockResolvedValue([project(1, "Casa Andina", "active")]);
        await userEvent.click(within(focus).getByRole("button", { name: "Reintentar" }));

        expect(
            await within(focus).findByRole("heading", { name: "Casa Andina" }),
        ).toBeInTheDocument();
        expect(summaryApi.get).toHaveBeenCalledTimes(1);
    });

    it("keeps the rest of the home when the tasks fail", async () => {
        vi.mocked(loadAcrossProjects).mockRejectedValue(new Error("Tareas caídas"));
        vi.mocked(projectsApi).list.mockResolvedValue([project(1, "Casa Andina", "active")]);
        showHome();

        const block = screen.getByRole("region", { name: "Tareas próximas" });

        expect(await within(block).findByRole("alert")).toHaveTextContent("Tareas caídas");
        expect(await screen.findByRole("heading", { name: "Casa Andina" })).toBeInTheDocument();
    });
});

describe("HomePage while loading", () => {
    it("draws a placeholder in each block and no invented figure", () => {
        vi.mocked(projectsApi).list.mockReturnValue(new Promise(() => undefined));
        vi.mocked(summaryApi).get.mockReturnValue(new Promise(() => undefined));
        vi.mocked(loadAcrossProjects).mockReturnValue(new Promise(() => undefined));
        showHome();

        for (const name of [
            "Proyecto en foco",
            "Cifras clave",
            "Actividad reciente",
            "Tareas próximas",
        ]) {
            expect(
                within(screen.getByRole("region", { name })).getByRole("status"),
            ).toHaveTextContent("Cargando…");
        }

        expect(screen.queryByLabelText("Resumen de tu cuenta")).not.toBeInTheDocument();
        // Until the projects arrive nothing says there are none.
        expect(screen.queryByText("Todavía no tienes proyectos")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Crear proyecto" })).toBeInTheDocument();
    });
});
