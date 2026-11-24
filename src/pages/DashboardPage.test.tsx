import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { projectsApi } from "../services/api";
import { extractionsApi } from "../services/extractions";
import { renderWithModals } from "../test/render";
import type { Project } from "../types/api";
import { DashboardPage } from "./DashboardPage";

vi.mock("../components/location/MapCanvas", () => ({ default: () => null }));
vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn(), create: vi.fn() },
    summaryApi: { get: vi.fn().mockResolvedValue({ terrains: 0, plans: 0 }) },
    structureApi: { get: vi.fn().mockResolvedValue({ terrains: [], rooms: [], components: [] }) },
    filesApi: {},
}));
vi.mock("../services/extractions", () => ({ extractionsApi: { status: vi.fn() } }));

it("creates by hand when the server has no AI", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    vi.mocked(projectsApi.create).mockResolvedValue({ id: 9 } as Project);
    vi.mocked(extractionsApi.status).mockResolvedValue({
        available: false,
        external: false,
        mime_types: [],
        max_bytes: 0,
    });
    const onOpen = vi.fn();

    renderWithModals(<DashboardPage onOpenProject={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Crear proyecto con IA" }));
    await screen.findByText(/no está configurada/);
    await userEvent.type(screen.getByLabelText("Nombre"), "Casa");
    await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));

    expect(onOpen).toHaveBeenCalledWith(9);
});
