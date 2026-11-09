import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { materialsApi } from "../services/api";
import type { Material } from "../types/api";
import { MaterialsPanel } from "./MaterialsPanel";

vi.mock("../services/api", async (original) => ({
    ...(await original<typeof import("../services/api")>()),
    materialsApi: { listByProject: vi.fn() },
}));

const CEMENT: Material = {
    id: 1,
    project_id: 7,
    name: "Cemento",
    category: "Obra gris",
    unit: "saco",
    quantity: 3,
    unit_cost: 0.1,
    created_at: "2026-10-01T12:00:00Z",
};

let saved: { blob: Blob; name: string } | null = null;

beforeEach(() => {
    saved = null;
    let lastBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
        lastBlob = blob as Blob;
        return "blob:budget";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
        this: HTMLAnchorElement,
    ) {
        saved = { blob: lastBlob as Blob, name: this.download };
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

function renderPanel() {
    return render(
        <MaterialsPanel projectId={7} projectName="Cabaña Mindo" run={vi.fn(async () => {})} />,
    );
}

describe("MaterialsPanel CSV export", () => {
    it("is disabled, with its reason, while the project has no materials", async () => {
        vi.mocked(materialsApi.listByProject).mockResolvedValue([]);
        renderPanel();

        await screen.findByText("Sin materiales todavía");
        const button = screen.getByRole("button", { name: "Exportar presupuesto (CSV)" });

        expect(button).toHaveAttribute("aria-disabled", "true");
        expect(button).toHaveAccessibleDescription("No hay materiales que exportar.");
    });

    it("downloads the loaded materials as a CSV named after the project", async () => {
        vi.mocked(materialsApi.listByProject).mockResolvedValue([CEMENT]);
        renderPanel();
        await screen.findByText("Cemento");

        await userEvent.click(screen.getByRole("button", { name: "Exportar presupuesto (CSV)" }));

        expect(saved?.name).toBe("presupuesto-cabana-mindo.csv");
        expect(saved?.blob.type).toBe("text/csv;charset=utf-8");
        const text = await saved!.blob.text();
        expect(text).toContain("Cemento;Obra gris;saco;3,00;0,10;0,30\r\n");
        expect(text).toContain("Total;;;;;0,30\r\n");
        expect(materialsApi.listByProject).toHaveBeenCalledTimes(1);
    });
});
