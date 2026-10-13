import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi } from "../services/api";
import type { Project } from "../types/api";
import { CommandPalette, type Command } from "./CommandPalette";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
}));

const projects = vi.mocked(projectsApi);
const found: Project = {
    id: 3,
    owner_id: 1,
    name: "Casa Mirador",
    description: null,
    location: "Manizales",
    status: "active",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
};

function setup() {
    const runs = { terrains: vi.fn(), analysis: vi.fn(), theme: vi.fn() };
    const commands: Command[] = [
        { id: "terrains", group: "Ir a", label: "Terrenos", icon: "terrains", run: runs.terrains },
        {
            id: "analysis",
            group: "Este proyecto",
            label: "Análisis",
            icon: "chevronRight",
            run: runs.analysis,
        },
        {
            id: "theme",
            group: "Acciones",
            label: "Cambiar al modo oscuro",
            icon: "moon",
            run: runs.theme,
        },
    ];
    const onOpenProject = vi.fn();
    const onClose = vi.fn();

    render(<CommandPalette commands={commands} onOpenProject={onOpenProject} onClose={onClose} />);

    return { runs, onOpenProject, onClose, input: screen.getByRole("combobox") };
}

beforeEach(() => {
    vi.resetAllMocks();
    projects.list.mockResolvedValue([]);
});

describe("CommandPalette", () => {
    it("opens with the cursor in its field and lists the commands by group", () => {
        const { input } = setup();

        expect(screen.getByRole("dialog", { name: "Paleta de comandos" })).toBeInTheDocument();
        expect(input).toHaveFocus();
        expect(screen.getByRole("group", { name: "Ir a" })).toBeInTheDocument();
        expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    it("filters without minding accents and runs the first match with Enter", async () => {
        const { runs, onClose, input } = setup();

        await userEvent.type(input, "analisis");

        expect(screen.getAllByRole("option")).toHaveLength(1);
        expect(screen.getByRole("option", { name: "Análisis" })).toHaveAttribute(
            "aria-selected",
            "true",
        );

        await userEvent.keyboard("{Enter}");

        expect(runs.analysis).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("moves through the options with the arrows, wrapping at the ends", async () => {
        const { runs, input } = setup();

        await userEvent.type(input, "{ArrowUp}");

        expect(screen.getByRole("option", { name: "Cambiar al modo oscuro" })).toHaveAttribute(
            "aria-selected",
            "true",
        );
        expect(input).toHaveAttribute(
            "aria-activedescendant",
            screen.getByRole("option", { name: "Cambiar al modo oscuro" }).id,
        );

        await userEvent.keyboard("{ArrowDown}{Enter}");

        expect(runs.terrains).toHaveBeenCalledTimes(1);
    });

    it("finds projects by name through the API and opens the chosen one", async () => {
        projects.list.mockResolvedValue([found]);
        const { onOpenProject, input } = setup();

        await userEvent.type(input, "mirador");
        await userEvent.click(await screen.findByRole("option", { name: /Casa Mirador/ }));

        expect(projects.list).toHaveBeenCalledWith({ search: "mirador" });
        expect(onOpenProject).toHaveBeenCalledWith(3);
    });

    it("says so when nothing matches and when the search fails", async () => {
        const { input } = setup();

        await userEvent.type(input, "zzz");

        expect(await screen.findByText(/Nada coincide con «zzz»/)).toBeInTheDocument();

        projects.list.mockRejectedValue(new Error("sin red"));
        await userEvent.clear(input);
        await userEvent.type(input, "casa");

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No se pudieron buscar los proyectos",
        );
    });

    it("closes with Escape", async () => {
        const { onClose } = setup();

        await userEvent.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
