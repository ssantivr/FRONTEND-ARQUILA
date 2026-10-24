import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Engine } from "../components/LitModel";
import { projectsApi, terrainsApi } from "../services/api";
import { RenderPage } from "./RenderPage";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn() },
    terrainsApi: { listByProject: vi.fn() },
}));

/** What the fake engine hands back as the encoded file: by default, the type asked for. */
let encodedAs: (mime: string) => string = (mime) => mime;
let maxImageSize = 16384;

const renderStill = vi.fn(async (job: { onProgress: (done: number, total: number) => void }) => {
    job.onProgress(1, 1);

    return {
        toBlob: (done: (blob: Blob) => void, mime: string) =>
            done(new Blob(["imagen"], { type: encodedAs(mime) })),
    } as unknown as HTMLCanvasElement;
});

vi.mock("../components/LitModel", () => ({
    LitModel: ({ onEngine }: { onEngine?: (engine: Engine | null) => void }) => {
        useEffect(() => {
            onEngine?.({
                renderStill,
                maxImageSize,
                setProjection: vi.fn(),
                setView: vi.fn(),
            } as unknown as Engine);
        }, [onEngine]);

        return <div>visor</div>;
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    encodedAs = (mime) => mime;
    maxImageSize = 16384;
    window.sessionStorage.clear();
    vi.mocked(projectsApi.list).mockResolvedValue([{ id: 1, name: "Casa Mirador" }] as never);
    vi.mocked(terrainsApi.listByProject).mockResolvedValue([]);
    // A browser that encodes PNG and JPEG but not WebP: asked for WebP, it hands back a PNG.
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation((mime) =>
        mime === "image/webp" ? "data:image/png;base64," : `data:${mime};base64,`,
    );
    URL.createObjectURL = vi.fn(() => "blob:captura");
    URL.revokeObjectURL = vi.fn();
});

async function openPanel() {
    render(<RenderPage onLighting={() => undefined} />);

    return within(await screen.findByRole("complementary", { name: "Parámetros de la captura" }));
}

describe("RenderPage", () => {
    it("waits, generates a capture of the view and offers the file", async () => {
        const panel = await openPanel();

        expect(panel.getByRole("status")).toHaveTextContent("En espera · 1920 × 1080 px en PNG");

        await userEvent.click(await panel.findByRole("button", { name: "Generar captura" }));

        expect(await panel.findByRole("status")).toHaveTextContent("Captura lista");

        const result = screen.getByRole("figure", { name: "Captura de la vista" });

        expect(within(result).getByRole("link", { name: "Descargar" })).toHaveAttribute(
            "download",
            "arquila-Casa-Mirador-1920x1080.png",
        );
        // It is never called a photorealistic render.
        expect(document.body).not.toHaveTextContent(/render fotorrealista(?!:)/);
    });

    it("says it failed when the browser hands back another format", async () => {
        encodedAs = () => "image/png";
        const panel = await openPanel();

        await userEvent.selectOptions(panel.getByLabelText("Formato de salida"), "jpeg");
        await userEvent.click(await panel.findByRole("button", { name: "Generar captura" }));

        expect(await panel.findByRole("alert")).toHaveTextContent("No se pudo generar la imagen");
        expect(screen.queryByRole("figure", { name: "Captura de la vista" })).toBeNull();
    });

    it("turns off the sizes and the quality this device cannot draw, with the reason", async () => {
        maxImageSize = 2048;
        const panel = await openPanel();

        await panel.findByText("Este equipo dibuja imágenes de hasta 2048 px de lado.");
        expect(panel.getByRole("option", { name: /2560 × 1440 px/ })).toBeDisabled();
        expect(panel.getByRole("option", { name: /1920 × 1080 px/ })).toBeEnabled();
        expect(panel.getByRole("button", { name: "Alta" })).toBeDisabled();
    });

    it("offers only the formats this browser can encode", async () => {
        const panel = await openPanel();

        expect(panel.getByRole("option", { name: "PNG" })).toBeEnabled();
        expect(panel.getByRole("option", { name: "JPEG" })).toBeEnabled();
        expect(
            panel.getByRole("option", { name: "WebP (este navegador no lo genera)" }),
        ).toBeDisabled();
    });

    it("folds the parameters away so the preview takes the width", async () => {
        await openPanel();

        await userEvent.click(screen.getByRole("button", { name: "Parámetros" }));

        expect(
            screen.queryByRole("complementary", { name: "Parámetros de la captura" }),
        ).toBeNull();
        expect(screen.getByRole("button", { name: "Parámetros" })).toHaveAttribute(
            "aria-pressed",
            "false",
        );
    });
});
