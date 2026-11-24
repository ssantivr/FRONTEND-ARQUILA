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
    fallback: false,
    levels: [
        { fields: { title: read("Planta baja") }, rooms: [{ name: read("sala") }], components: [] },
    ],
    project: {},
    terrain: {},
    recommendations: [],
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
    const onOpenModel = vi.fn();

    renderWithModals(<BuildPanel projectId={7} onChanged={onChanged} onOpenModel={onOpenModel} />);
    await userEvent.type(
        await screen.findByLabelText(/qué quieres construir/),
        "Casa con sala de 5 m",
    );
    await userEvent.click(
        screen.getByRole("button", { name: "Generar proyecto y planos completos con IA" }),
    );

    return { onChanged, onOpenModel };
}

describe("BuildPanel", () => {
    it("sends nothing without consent", async () => {
        await describeProject();
        await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

        expect(builds.create).not.toHaveBeenCalled();
    });

    it("asks for the missing values and creates only after confirming", async () => {
        const { onChanged, onOpenModel } = await describeProject();
        await userEvent.click(await screen.findByRole("button", { name: "Enviar" }));

        expect(builds.create).toHaveBeenCalledWith(
            7,
            { description: "Casa con sala de 5 m" },
            true,
        );
        expect(await screen.findByText("Faltan 5 datos")).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Aplicar proyecto, terreno y planos" }),
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
            screen.getByRole("button", { name: "Aplicar proyecto, terreno y planos" }),
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
        expect(onOpenModel).toHaveBeenCalled();
        expect(await screen.findByRole("button", { name: "Deshacer" })).toBeInTheDocument();
    });

    it("previews the layout and marks generated coordinates as calculated", async () => {
        builds.create.mockResolvedValue({
            ...PROPOSED,
            levels: [
                {
                    fields: { title: read("Planta baja") },
                    rooms: [
                        {
                            name: { ...read("Sala"), origin: "ai_generated" },
                            x_m: { ...read(1.2), origin: "ai_generated" },
                            y_m: { ...read(0.9), origin: "ai_generated" },
                            width_m: { ...read(5), origin: "ai_generated" },
                            depth_m: { ...read(4), origin: "ai_generated" },
                            height_m: { ...read(2.7), origin: "ai_generated" },
                        },
                    ],
                    components: [],
                },
            ],
        });
        renderWithModals(<BuildPanel projectId={7} onChanged={vi.fn()} />);
        await userEvent.type(
            await screen.findByLabelText(/qué quieres construir/),
            "Casa con sala y cocina",
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Generar proyecto y planos completos con IA" }),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Enviar" }));

        expect(
            await screen.findByRole("img", {
                name: "Vista previa de Planta baja con 1 ambientes",
            }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("X (m)")).toHaveValue("1.2");
        expect(screen.getAllByText("Calculado por IA")).toHaveLength(6);
        expect(screen.queryByText(/Faltan \d+ datos/)).not.toBeInTheDocument();
    });

    it("confirms project, terrain and recommendations with the layout", async () => {
        const build: Build = {
            ...PROPOSED,
            levels: [{ fields: { title: read("Planta baja") }, rooms: [], components: [] }],
            project: { name: read("Casa") },
            terrain: {
                name: read("Terreno principal"),
                area_m2: read(200),
                width_m: read(10),
                length_m: read(20),
            },
            recommendations: [
                {
                    category: "terrain",
                    content: "Completa la pendiente y el tipo de suelo.",
                    priority: "medium",
                },
            ],
        };
        builds.create.mockResolvedValue(build);
        renderWithModals(<BuildPanel projectId={7} onChanged={vi.fn()} />);
        await userEvent.type(
            await screen.findByLabelText(/qué quieres construir/),
            "Casa con una sala",
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Generar proyecto y planos completos con IA" }),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Enviar" }));

        expect(await screen.findByLabelText("Nombre del proyecto")).toHaveValue("Casa");
        expect(screen.getByLabelText("Área (m²)")).toHaveValue("200");
        expect(screen.getByText("Completa la pendiente y el tipo de suelo.")).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Aplicar proyecto, terreno y planos" }),
        );

        await waitFor(() =>
            expect(builds.apply).toHaveBeenCalledWith(9, {
                levels: [{ title: "Planta baja", rooms: [], components: [] }],
                project: { name: "Casa" },
                terrain: {
                    name: "Terreno principal",
                    area_m2: 200,
                    width_m: 10,
                    length_m: 20,
                },
            }),
        );
    });
});
