import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildsApi } from "../../services/builds";
import { extractionsApi } from "../../services/extractions";
import { renderWithModals } from "../../test/render";
import type { Build } from "../../types/build";
import { BuildPanel } from "./BuildPanel";

vi.mock("../../services/api", () => ({ filesApi: { upload: vi.fn() } }));
vi.mock("../../services/extractions", () => ({ extractionsApi: { status: vi.fn() } }));
vi.mock("../../services/builds", () => ({
    buildsApi: { listByProject: vi.fn(), create: vi.fn(), apply: vi.fn(), undo: vi.fn() },
}));

const builds = vi.mocked(buildsApi);
const status = vi.mocked(extractionsApi.status);
const read = (value: string | number) => ({ value, confidence: 0.95, source: "sala de 5 m" });

const PROPOSED: Build = {
    id: 9,
    project_id: 7,
    file_id: null,
    status: "review",
    origin: "description",
    levels: [
        { fields: { title: read("Planta baja") }, rooms: [{ name: read("sala") }], components: [] },
    ],
    truncated: false,
    plan_ids: [],
    created_at: "2026-11-23T12:00:00Z",
};

beforeEach(() => {
    vi.resetAllMocks();
    status.mockResolvedValue({
        available: true,
        external: true,
        mime_types: ["application/pdf", "image/png"],
        max_bytes: 4_300_000,
    });
    builds.listByProject.mockResolvedValue([]);
    builds.create.mockResolvedValue(PROPOSED);
    builds.apply.mockResolvedValue({ ...PROPOSED, status: "applied", plan_ids: [1] });
});

async function describeProject() {
    const onChanged = vi.fn();

    renderWithModals(<BuildPanel projectId={7} onChanged={onChanged} />);
    await userEvent.type(
        await screen.findByLabelText(/Describe el proyecto/),
        "Casa con sala de 5 m",
    );
    await userEvent.click(screen.getByRole("button", { name: "Proponer con IA" }));

    return onChanged;
}

describe("BuildPanel", () => {
    it("sends nothing without consent", async () => {
        await describeProject();
        await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

        expect(builds.create).not.toHaveBeenCalled();
    });

    it("asks for the missing values and creates only after confirming", async () => {
        const onChanged = await describeProject();
        await userEvent.click(await screen.findByRole("button", { name: "Enviar" }));

        expect(builds.create).toHaveBeenCalledWith(
            7,
            { description: "Casa con sala de 5 m" },
            true,
        );
        expect(await screen.findByText("Faltan 5 datos")).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Crear niveles, ambientes y elementos" }),
        );
        expect(await screen.findByRole("alert")).toHaveTextContent("Falta «X (m)»");
        expect(builds.apply).not.toHaveBeenCalled();

        const room = screen.getByRole("group", { name: "Ambiente 1" });
        const inputs = room.querySelectorAll("input");
        for (const [index, value] of ["", "0", "0", "5", "4", "2,6"].entries()) {
            if (value) {
                await userEvent.type(inputs[index], value);
            }
        }

        await userEvent.click(
            screen.getByRole("button", { name: "Crear niveles, ambientes y elementos" }),
        );

        await waitFor(() =>
            expect(builds.apply).toHaveBeenCalledWith(9, {
                levels: [
                    {
                        title: "Planta baja",
                        rooms: [
                            { name: "sala", x_m: 0, y_m: 0, width_m: 5, depth_m: 4, height_m: 2.6 },
                        ],
                        components: [],
                    },
                ],
            }),
        );
        expect(onChanged).toHaveBeenCalled();
        expect(await screen.findByRole("button", { name: "Deshacer" })).toBeInTheDocument();
    });
});
