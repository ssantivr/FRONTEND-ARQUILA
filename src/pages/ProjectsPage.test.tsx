import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, templatesApi } from "../services/api";
import type { Project } from "../types/api";
import { ProjectsPage } from "./ProjectsPage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn(), create: vi.fn() },
    templatesApi: { list: vi.fn(), createProject: vi.fn() },
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
        expect(screen.getByLabelText("Nombre")).toHaveValue("");
    });

    it("keeps the form and shows the error when the project cannot be created", async () => {
        projects.list.mockResolvedValue([]);
        projects.create.mockRejectedValue(new Error("Failed to fetch"));

        renderPage();
        await screen.findByText("No hay proyectos.");
        await userEvent.type(screen.getByLabelText("Nombre"), "Casa Nueva");
        await userEvent.click(screen.getByRole("button", { name: "Crear" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No se pudo conectar con el servidor.",
        );
        expect(screen.getByLabelText("Nombre")).toHaveValue("Casa Nueva");
        expect(screen.getByRole("button", { name: "Crear" })).toBeEnabled();
    });
});
