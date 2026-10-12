import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsApi, summaryApi } from "../services/api";
import type { User } from "../types/api";
import { HomePage } from "./HomePage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
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

describe("HomePage", () => {
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
