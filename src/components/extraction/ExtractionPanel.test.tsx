import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { filesApi } from "../../services/api";
import { extractionsApi } from "../../services/extractions";
import { renderWithModals } from "../../test/render";
import type { Extraction } from "../../types/extraction";
import { ExtractionPanel } from "./ExtractionPanel";

vi.mock("../../services/api", () => ({ filesApi: { upload: vi.fn() } }));
vi.mock("../../services/extractions", () => ({
    extractionsApi: {
        status: vi.fn(),
        listByProject: vi.fn(),
        create: vi.fn(),
        apply: vi.fn(),
        undo: vi.fn(),
    },
}));

const api = vi.mocked(extractionsApi);
const files = vi.mocked(filesApi);

const APPLIED: Extraction = {
    id: 5,
    project_id: 7,
    file_id: 3,
    status: "applied",
    proposal: { terrain: { name: { value: "Lote 7", confidence: 0.95, source: "Página 1" } } },
    terrain_id: 1,
    plan_id: null,
    project_fields: [],
    created_at: "2026-11-22T12:00:00",
};

async function chooseDocument() {
    const onChanged = vi.fn();

    renderWithModals(<ExtractionPanel projectId={7} onChanged={onChanged} />);
    await userEvent.upload(
        await screen.findByLabelText(/Sube un PDF, PNG o JPG/),
        new File(["%PDF-"], "plano.pdf", { type: "application/pdf" }),
    );

    return onChanged;
}

beforeEach(() => {
    vi.resetAllMocks();
    api.status.mockResolvedValue({
        available: true,
        external: true,
        mime_types: ["application/pdf", "image/png"],
        max_bytes: 4_718_592,
    });
    api.listByProject.mockResolvedValue([]);
    api.create.mockResolvedValue(APPLIED);
    files.upload.mockResolvedValue({
        id: 3,
        project_id: 7,
        filename: "plano.pdf",
        mime_type: "application/pdf",
        size_bytes: 5,
        created_at: "2026-11-22T12:00:00",
    });
});

describe("ExtractionPanel", () => {
    it("says so when the server has no AI", async () => {
        api.status.mockResolvedValue({
            available: false,
            external: false,
            mime_types: [],
            max_bytes: 0,
        });

        renderWithModals(<ExtractionPanel projectId={7} onChanged={() => undefined} />);

        expect(await screen.findByText(/todavía no está configurada/)).toBeInTheDocument();
    });

    it("sends nothing without permission", async () => {
        await chooseDocument();

        await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

        expect(files.upload).not.toHaveBeenCalled();
        expect(api.create).not.toHaveBeenCalled();
    });

    it("fills on its own and offers to undo", async () => {
        api.undo.mockResolvedValue({ ...APPLIED, status: "undone" });
        const onChanged = await chooseDocument();

        await userEvent.click(await screen.findByRole("button", { name: "Enviar y leer" }));
        await screen.findByRole("dialog", { name: "Datos llenados por la IA" });
        expect(onChanged).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));

        expect(api.undo).toHaveBeenCalledWith(5);
        await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
    });

    it("opens the review when it is not sure", async () => {
        const review: Extraction = {
            ...APPLIED,
            status: "review",
            proposal: {
                terrain: { name: { value: "Lote 7", confidence: 0.4, source: "Página 1" } },
            },
        };
        api.create.mockResolvedValue(review);
        api.apply.mockResolvedValue(APPLIED);
        await chooseDocument();

        await userEvent.click(await screen.findByRole("button", { name: "Enviar y leer" }));
        await screen.findByRole("dialog", { name: "Revisar lo que leyó la IA" });

        await userEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Área (m²)");
        expect(api.apply).not.toHaveBeenCalled();

        await userEvent.type(screen.getByLabelText("Área (m²)"), "250");
        await userEvent.click(screen.getByRole("button", { name: "Guardar datos" }));

        expect(api.apply).toHaveBeenCalledWith(5, { terrain: { name: "Lote 7", area_m2: 250 } });
    });
});
