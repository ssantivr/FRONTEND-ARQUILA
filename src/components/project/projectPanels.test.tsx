import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activityApi, projectsApi, tasksApi, versionsApi } from "../../services/api";
import { ApiError } from "../../services/http";
import type { Activity, Project, Task, Version } from "../../types/api";
import { ProjectActivityPanel, describeActivity } from "./ProjectActivityPanel";
import { ProjectSummaryPanel } from "./ProjectSummaryPanel";
import { ProjectTasksPanel } from "./ProjectTasksPanel";
import { ProjectVersionsPanel, describeContents } from "./ProjectVersionsPanel";

vi.mock("../../services/api", () => ({
    tasksApi: { listByProject: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    versionsApi: { listByProject: vi.fn(), create: vi.fn(), get: vi.fn(), restore: vi.fn() },
    activityApi: { listByProject: vi.fn() },
    projectsApi: { update: vi.fn() },
    filesApi: { contentUrl: (id: number) => `/api/files/${id}/content` },
}));

/** The `run` of the project screen: runs the action and then what follows it. */
async function run(action: () => Promise<unknown>, onDone: () => void) {
    await action();
    onDone();
}

function task(overrides: Partial<Task> = {}): Task {
    return {
        id: 4,
        project_id: 7,
        title: "Pedir permisos",
        description: null,
        status: "todo",
        assignee_id: 1,
        due_date: "2026-10-10",
        progress: 40,
        created_by: 1,
        created_at: "2026-10-01T10:00:00",
        updated_at: "2026-10-01T10:00:00",
        ...overrides,
    };
}

function version(overrides: Partial<Version> = {}): Version {
    return {
        id: 9,
        project_id: 7,
        version_number: 3,
        label: "Anteproyecto",
        created_by: 1,
        created_at: "2026-10-20T16:00:00",
        contents: { plans: 2, rooms: 6, tasks: 1, materials: 0 },
        ...overrides,
    };
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe("ProjectTasksPanel", () => {
    function renderTasks() {
        render(<ProjectTasksPanel projectId={7} run={run} ownerId={1} today="2026-10-21" />);
    }

    it("lists the tasks with their state, owner, date and progress, and marks the late ones", async () => {
        vi.mocked(tasksApi.listByProject).mockResolvedValue([
            task(),
            task({
                id: 5,
                title: "Comprar cemento",
                status: "done",
                progress: 100,
                assignee_id: null,
            }),
        ]);
        renderTasks();

        const late = (await screen.findByText("Pedir permisos")).closest("li") as HTMLElement;

        expect(late).toHaveTextContent("Responsable: tú");
        expect(late).toHaveTextContent("Vencida el 10/10/2026");
        expect(within(late).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
        expect(screen.getByText("Comprar cemento").closest("li")).toHaveTextContent(
            "Sin responsable",
        );
        expect(screen.getByText("1 de 2 hechas · avance medio 70 %")).toBeInTheDocument();
    });

    it("creates a task with what the form says and asks for the list again", async () => {
        vi.mocked(tasksApi.listByProject).mockResolvedValue([]);
        vi.mocked(tasksApi.create).mockResolvedValue(task());
        renderTasks();

        await userEvent.click(await screen.findByRole("button", { name: "Nueva tarea" }));
        await userEvent.click(screen.getByRole("button", { name: "Crear tarea" }));

        // Sent empty: the form says what is missing and nothing goes to the API.
        expect(screen.getByText("Escribe un título.")).toBeInTheDocument();
        expect(tasksApi.create).not.toHaveBeenCalled();

        await userEvent.type(screen.getByLabelText("Título"), "Pedir permisos");
        await userEvent.type(screen.getByLabelText(/Fecha límite/), "2026-11-30");
        await userEvent.clear(screen.getByLabelText("Avance"));
        await userEvent.type(screen.getByLabelText("Avance"), "25");
        await userEvent.click(screen.getByRole("button", { name: "Crear tarea" }));

        expect(tasksApi.create).toHaveBeenCalledWith(7, {
            title: "Pedir permisos",
            description: null,
            status: "todo",
            due_date: "2026-11-30",
            progress: 25,
            assignee_id: 1,
        });
        await waitFor(() => expect(tasksApi.listByProject).toHaveBeenCalledTimes(2));
    });

    it("sends 100 % with a task marked as done, as the API requires", async () => {
        vi.mocked(tasksApi.listByProject).mockResolvedValue([task()]);
        vi.mocked(tasksApi.update).mockResolvedValue(task({ status: "done", progress: 100 }));
        renderTasks();

        await userEvent.selectOptions(
            await screen.findByLabelText("Estado de «Pedir permisos»"),
            "done",
        );

        expect(tasksApi.update).toHaveBeenCalledWith(4, { status: "done", progress: 100 });
    });

    it("deletes a task only after confirming it", async () => {
        vi.mocked(tasksApi.listByProject).mockResolvedValue([task()]);
        vi.mocked(tasksApi.remove).mockResolvedValue(undefined);
        renderTasks();

        await userEvent.click(
            await screen.findByRole("button", { name: "Eliminar «Pedir permisos»" }),
        );

        expect(tasksApi.remove).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole("button", { name: "Eliminar la tarea" }));
        expect(tasksApi.remove).toHaveBeenCalledWith(4);
    });

    it("says the tasks are not available when the API has no route for them", async () => {
        vi.mocked(tasksApi.listByProject).mockRejectedValue(new ApiError(404, "Not Found"));
        renderTasks();

        expect(await screen.findByText("No disponible")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.queryByRole("button", { name: "Nueva tarea" })).toBeNull();
    });
});

describe("ProjectVersionsPanel", () => {
    it("says what each version holds and saves a new one with its label", async () => {
        vi.mocked(versionsApi.listByProject).mockResolvedValue([version()]);
        vi.mocked(versionsApi.create).mockResolvedValue(version({ id: 10, version_number: 4 }));
        render(<ProjectVersionsPanel projectId={7} run={run} onRestored={vi.fn()} />);

        const row = (await screen.findByText(/Versión 3 · Anteproyecto/)).closest("li");

        expect(row).toHaveTextContent("2 planos");
        expect(row).toHaveTextContent("1 tarea");
        expect(row).not.toHaveTextContent("materiales");

        await userEvent.type(screen.getByLabelText(/Etiqueta de la versión/), "Proyecto final");
        await userEvent.click(screen.getByRole("button", { name: "Guardar versión" }));

        expect(versionsApi.create).toHaveBeenCalledWith(7, "Proyecto final");
    });

    it("restores a version after confirming it and tells the screen to read it all again", async () => {
        const onRestored = vi.fn();

        vi.mocked(versionsApi.listByProject).mockResolvedValue([version()]);
        vi.mocked(versionsApi.restore).mockResolvedValue({} as Project);
        render(<ProjectVersionsPanel projectId={7} run={run} onRestored={onRestored} />);

        await userEvent.click(
            await screen.findByRole("button", { name: "Restaurar la versión 3" }),
        );

        expect(versionsApi.restore).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole("button", { name: "Restaurar" }));

        expect(versionsApi.restore).toHaveBeenCalledWith(9);
        expect(onRestored).toHaveBeenCalled();
    });

    it("names what a version holds in Spanish, leaving out what it lacks", () => {
        expect(describeContents({ walkthrough_points: 1, elevations: 2 })).toEqual([
            "1 punto de recorrido",
            "2 elevaciones",
        ]);
    });
});

describe("ProjectActivityPanel", () => {
    function activity(overrides: Partial<Activity>): Activity {
        return {
            id: 1,
            project_id: 7,
            user_id: 1,
            action: "updated",
            entity_type: "terrain",
            entity_id: 5,
            detail: {},
            created_at: "2026-10-20T16:05:12",
            ...overrides,
        };
    }

    it("tells each change in a sentence", () => {
        expect(
            describeActivity(
                activity({ detail: { label: "Lote 14", fields: ["area_m2", "soil_type"] } }),
            ),
        ).toBe("Se actualizó el terreno «Lote 14» (área, suelo)");
        expect(describeActivity(activity({ action: "created", entity_type: "task" }))).toBe(
            "Se creó la tarea",
        );
        expect(
            describeActivity(
                activity({
                    action: "version_saved",
                    entity_type: "version",
                    detail: { version_number: 3 },
                }),
            ),
        ).toBe("Se guardó la versión 3");
    });

    it("pages through the history with the total of the API", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue({
            items: [activity({ action: "archived", entity_type: "project" })],
            total: 45,
            page: 1,
            page_size: 20,
        });
        render(<ProjectActivityPanel projectId={7} />);

        expect(await screen.findByText("Se archivó el proyecto")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

        await waitFor(() => expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 2, 20));
    });

    it("says the history is not available on an older API", async () => {
        vi.mocked(activityApi.listByProject).mockRejectedValue(
            new ApiError(405, "Method Not Allowed"),
        );
        render(<ProjectActivityPanel projectId={7} />);

        expect(await screen.findByText(/El historial de cambios no está disponible/)).toBeVisible();
    });
});

describe("ProjectSummaryPanel", () => {
    const project: Project = {
        id: 7,
        owner_id: 1,
        name: "Casa Andina",
        description: "Dos niveles",
        location: null,
        status: "active",
        created_at: "2026-10-01T10:00:00",
        updated_at: "2026-10-04T10:00:00",
        progress: 35,
        archived_at: null,
        cover_file_id: null,
    };
    const files = [
        {
            id: 3,
            project_id: 7,
            filename: "fachada.png",
            mime_type: "image/png",
            size_bytes: 1,
            created_at: "",
        },
        {
            id: 4,
            project_id: 7,
            filename: "planos.pdf",
            mime_type: "application/pdf",
            size_bytes: 1,
            created_at: "",
        },
    ];

    it("shows the real data of the project and chooses a cover among its images", async () => {
        const onChanged = vi.fn();

        vi.mocked(projectsApi.update).mockResolvedValue(project);
        render(
            <ProjectSummaryPanel
                projectId={7}
                run={run}
                project={project}
                files={files}
                onChanged={onChanged}
                onEdit={vi.fn()}
                onSection={vi.fn()}
            />,
        );

        expect(screen.getByRole("progressbar", { name: "Avance del proyecto" })).toHaveAttribute(
            "aria-valuenow",
            "35",
        );
        expect(screen.getByText("Dos niveles")).toBeInTheDocument();

        const cover = screen.getByLabelText("Imagen de portada");

        // Only the images can be a cover: the PDF is not offered.
        expect(within(cover).queryByText("planos.pdf")).toBeNull();
        await userEvent.selectOptions(cover, "3");

        expect(projectsApi.update).toHaveBeenCalledWith(7, { cover_file_id: 3 });
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it("offers no cover where the API knows nothing of covers", () => {
        const { progress, cover_file_id, archived_at, ...older } = project;

        void progress;
        void cover_file_id;
        void archived_at;
        render(
            <ProjectSummaryPanel
                projectId={7}
                run={run}
                project={older}
                files={files}
                onChanged={vi.fn()}
                onEdit={vi.fn()}
                onSection={vi.fn()}
            />,
        );

        expect(screen.queryByLabelText("Imagen de portada")).toBeNull();
        expect(screen.queryByRole("progressbar")).toBeNull();
    });
});
