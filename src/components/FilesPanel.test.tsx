import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { filesApi } from "../services/api";
import type { ProjectFile } from "../types/api";
import { FilesPanel } from "./FilesPanel";

vi.mock("../services/api", () => ({
    filesApi: {
        upload: vi.fn(),
        remove: vi.fn(),
        contentUrl: (id: number) => `/api/files/${id}/content`,
    },
}));

const PLAN: ProjectFile = {
    id: 3,
    project_id: 7,
    filename: "planta-baja.png",
    mime_type: "image/png",
    size_bytes: 2048,
    created_at: "2026-10-06T10:00:00",
};

const REPORT: ProjectFile = {
    id: 4,
    project_id: 7,
    filename: "memoria.pdf",
    mime_type: "application/pdf",
    size_bytes: 512,
    created_at: "2026-10-06T10:00:00",
};

const files = vi.mocked(filesApi);

async function run(action: () => Promise<unknown>, onDone: () => void) {
    await action();
    onDone();
}

function renderPanel(list: ProjectFile[], busy = false) {
    const onChanged = vi.fn();

    render(<FilesPanel projectId={7} run={run} files={list} busy={busy} onChanged={onChanged} />);

    return onChanged;
}

beforeEach(() => {
    vi.resetAllMocks();
    files.upload.mockResolvedValue(PLAN);
    files.remove.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("FilesPanel", () => {
    it("says so when the project has no files", () => {
        renderPanel([]);

        expect(screen.getByText("Este proyecto no tiene archivos.")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("lists each file with its type, its size and a link to its content", () => {
        renderPanel([PLAN, REPORT]);

        const plan = screen.getByRole("link", { name: "planta-baja.png" });
        const row = plan.closest("tr") as HTMLElement;

        expect(plan).toHaveAttribute("href", "/api/files/3/content");
        expect(within(row).getByText("PNG")).toBeInTheDocument();
        expect(within(row).getByText("2 KB")).toBeInTheDocument();
        expect(
            within(screen.getByText("memoria.pdf").closest("tr") as HTMLElement).getByText("512 B"),
        ).toBeInTheDocument();
    });

    it("uploads the chosen file and reports the change", async () => {
        const user = userEvent.setup();
        const onChanged = renderPanel([]);
        const chosen = new File(["contenido"], "fachada.png", { type: "image/png" });

        await user.upload(screen.getByLabelText(/Subir archivo/), chosen);

        expect(files.upload).toHaveBeenCalledWith(7, chosen);
        expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("does not let a file be chosen while another action is saving", () => {
        renderPanel([], true);

        expect(screen.getByLabelText(/Subir archivo/)).toBeDisabled();
    });

    it("deletes a file only after the user confirms", async () => {
        const user = userEvent.setup();
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
        const onChanged = renderPanel([PLAN]);
        const button = screen.getByRole("button", { name: "Eliminar archivo planta-baja.png" });

        await user.click(button);
        expect(files.remove).not.toHaveBeenCalled();

        confirm.mockReturnValue(true);
        await user.click(button);

        expect(files.remove).toHaveBeenCalledWith(3);
        expect(onChanged).toHaveBeenCalledTimes(1);
    });
});
