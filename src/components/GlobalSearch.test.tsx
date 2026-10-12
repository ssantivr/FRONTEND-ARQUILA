import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi } from "../services/api";
import type { Project } from "../types/api";
import { GlobalSearch } from "./GlobalSearch";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
}));

const projects = vi.mocked(projectsApi);
const found: Project = {
    id: 3,
    owner_id: 1,
    name: "Casa Andina",
    description: null,
    location: "Quito",
    status: "active",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
};

beforeEach(() => {
    vi.resetAllMocks();
});

describe("GlobalSearch", () => {
    it("searches the API by name and opens the chosen project", async () => {
        const onOpenProject = vi.fn();

        projects.list.mockResolvedValue([found]);
        render(<GlobalSearch onOpenProject={onOpenProject} />);

        await userEvent.type(screen.getByRole("searchbox", { name: "Buscar proyectos" }), "andina");
        await userEvent.click(await screen.findByRole("button", { name: /Casa Andina/ }));

        expect(projects.list).toHaveBeenLastCalledWith({ search: "andina" });
        expect(onOpenProject).toHaveBeenCalledWith(3);
        expect(screen.getByRole("searchbox")).toHaveValue("");
    });

    it("says so when nothing matches", async () => {
        projects.list.mockResolvedValue([]);
        render(<GlobalSearch onOpenProject={() => undefined} />);

        await userEvent.type(screen.getByRole("searchbox"), "zzz");

        expect(await screen.findByText(/Ningún proyecto coincide/)).toBeInTheDocument();
    });

    it("takes the focus when the slash key is pressed outside a field", async () => {
        render(<GlobalSearch onOpenProject={() => undefined} />);

        await userEvent.keyboard("/");

        expect(screen.getByRole("searchbox")).toHaveFocus();
    });
});
