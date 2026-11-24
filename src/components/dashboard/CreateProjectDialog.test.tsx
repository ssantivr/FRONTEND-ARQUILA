import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { filesApi, projectsApi } from "../../services/api";
import { buildsApi } from "../../services/builds";
import { extractionsApi } from "../../services/extractions";
import { renderWithModals } from "../../test/render";
import type { Project } from "../../types/api";
import type { Build } from "../../types/build";
import type { Extraction } from "../../types/extraction";
import { CreateProjectDialog } from "./CreateProjectDialog";

vi.mock("../location/MapCanvas", () => ({ default: () => null }));
vi.mock("../../services/api", () => ({
    projectsApi: { create: vi.fn() },
    filesApi: { upload: vi.fn() },
}));
vi.mock("../../services/extractions", () => ({
    extractionsApi: { status: vi.fn(), create: vi.fn() },
}));
vi.mock("../../services/builds", () => ({ buildsApi: { create: vi.fn(), apply: vi.fn() } }));

const PROPOSED: Build = {
    id: 4,
    project_id: 9,
    file_id: null,
    status: "review",
    origin: "description",
    fallback: false,
    levels: [
        {
            fields: { title: { value: "Planta baja", confidence: 0.95, source: "Planta baja" } },
            rooms: [],
            components: [],
        },
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
    vi.mocked(extractionsApi.status).mockResolvedValue({
        available: true,
        external: true,
        mime_types: ["application/pdf", "image/png"],
        max_bytes: 4_300_000,
    });
    vi.mocked(projectsApi.create).mockResolvedValue({ id: 9 } as Project);
});

async function fill(description: string) {
    const onCreated = vi.fn();

    renderWithModals(<CreateProjectDialog onCreated={onCreated} onClose={vi.fn()} />);
    await userEvent.type(await screen.findByLabelText(/Nombre del proyecto/), "Casa");

    if (description) {
        await userEvent.type(screen.getByLabelText(/Describe el proyecto/), description);
    }

    return onCreated;
}

it("needs a document or a description, and consent, before creating with AI", async () => {
    await fill("");
    const create = screen.getByRole("button", {
        name: "Generar proyecto y planos completos con IA",
    });

    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Describe el proyecto/), "Casa de un piso");
    expect(create).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Acepto enviar/));
    expect(create).toBeEnabled();
});

it("opens the review of the proposal after creating the project", async () => {
    vi.mocked(buildsApi.create).mockResolvedValue(PROPOSED);
    vi.mocked(buildsApi.apply).mockResolvedValue({ ...PROPOSED, status: "applied" });
    const onCreated = await fill("Planta baja");

    await userEvent.click(screen.getByLabelText(/Acepto enviar/));
    await userEvent.click(
        screen.getByRole("button", { name: "Generar proyecto y planos completos con IA" }),
    );

    expect(buildsApi.create).toHaveBeenCalledWith(9, { description: "Planta baja" }, true);
    expect(await screen.findByText("Revisar el proyecto que propone la IA")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();

    await userEvent.click(
        screen.getByRole("button", { name: "Aplicar proyecto, terreno y planos" }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(9, true));
});

it("still sends the description when the document gives nothing, and reads it only once", async () => {
    vi.mocked(filesApi.upload).mockResolvedValue({ id: 3 } as Awaited<
        ReturnType<typeof filesApi.upload>
    >);
    vi.mocked(extractionsApi.create).mockResolvedValue({ status: "failed" } as Extraction);
    vi.mocked(buildsApi.create).mockResolvedValue({ ...PROPOSED, status: "failed", levels: [] });
    await fill("Casa");

    await userEvent.upload(
        screen.getByLabelText(/Adjunta un plano/),
        new File(["%PDF-"], "plano.pdf", { type: "application/pdf" }),
    );
    await userEvent.click(screen.getByLabelText(/Acepto enviar/));
    await userEvent.click(
        screen.getByRole("button", { name: "Generar proyecto y planos completos con IA" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
        "El proyecto se creó, pero la IA no pudo leer datos del documento y la IA no encontró niveles ni ambientes en la descripción. Puedes completarlo a mano en el proyecto.",
    );
    expect(buildsApi.create).toHaveBeenCalledTimes(1);

    await userEvent.click(
        screen.getByRole("button", { name: "Generar proyecto y planos completos con IA" }),
    );

    await waitFor(() => expect(buildsApi.create).toHaveBeenCalledTimes(2));
    expect(projectsApi.create).toHaveBeenCalledTimes(1);
    expect(extractionsApi.create).toHaveBeenCalledTimes(1);
});
