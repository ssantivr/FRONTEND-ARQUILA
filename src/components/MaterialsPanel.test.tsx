import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { materialsApi } from "../services/api";
import type { Material } from "../types/api";
import { formatMoney } from "../utils/format";
import { MaterialsPanel } from "./MaterialsPanel";

vi.mock("../services/api", () => ({
    materialsApi: {
        listByProject: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    },
}));

const CEMENT: Material = {
    id: 1,
    project_id: 7,
    name: "Cemento",
    category: "Obra gris",
    unit: "saco",
    quantity: 10,
    unit_cost: 8.5,
    created_at: "2026-10-06T10:00:00",
};

const STEEL: Material = {
    id: 2,
    project_id: 7,
    name: "Acero",
    category: null,
    unit: "kg",
    quantity: 100,
    unit_cost: 1.25,
    created_at: "2026-10-06T10:00:00",
};

const materials = vi.mocked(materialsApi);

function money(value: number): string {
    return formatMoney(value).replace(/\s/g, " ");
}

async function run(action: () => Promise<unknown>, onDone: () => void) {
    await action();
    onDone();
}

beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    materials.listByProject.mockResolvedValue([CEMENT, STEEL]);
    materials.create.mockResolvedValue(CEMENT);
    materials.update.mockResolvedValue(CEMENT);
    materials.remove.mockResolvedValue(undefined);
});

describe("MaterialsPanel", () => {
    it("says so when the project has no materials", async () => {
        materials.listByProject.mockResolvedValue([]);

        render(<MaterialsPanel projectId={7} run={run} />);

        expect(await screen.findByText("Este proyecto no tiene materiales.")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("lists the materials with their subtotal and the total cost", async () => {
        render(<MaterialsPanel projectId={7} run={run} />);

        const cement = (await screen.findByText("Cemento")).closest("tr") as HTMLElement;

        expect(within(cement).getByText("Obra gris")).toBeInTheDocument();
        expect(within(cement).getByText(money(85))).toBeInTheDocument();
        expect(
            within(screen.getByText("Acero").closest("tr") as HTMLElement).getByText("—"),
        ).toBeInTheDocument();
        expect(
            within(screen.getByText("Total").closest("tr") as HTMLElement).getByText(money(210)),
        ).toBeInTheDocument();
    });

    it("creates a material from the form and reloads the list", async () => {
        const user = userEvent.setup();
        render(<MaterialsPanel projectId={7} run={run} />);
        await screen.findByText("Cemento");

        await user.type(screen.getByLabelText("Nombre"), "  Arena  ");
        await user.type(screen.getByLabelText("Unidad"), "m3");
        await user.type(screen.getByLabelText("Cantidad"), "4");
        await user.type(screen.getByLabelText("Costo unitario"), "22.5");
        await user.click(screen.getByRole("button", { name: "Agregar material" }));

        expect(materials.create).toHaveBeenCalledWith(7, {
            name: "Arena",
            category: null,
            unit: "m3",
            quantity: 4,
            unit_cost: 22.5,
        });
        await waitFor(() => expect(materials.listByProject).toHaveBeenCalledTimes(2));
        expect(screen.getByLabelText("Nombre")).toHaveValue("");
    });

    it("loads a row into the form and saves the change", async () => {
        const user = userEvent.setup();
        render(<MaterialsPanel projectId={7} run={run} />);

        await user.click(await screen.findByRole("button", { name: "Editar material Cemento" }));

        expect(screen.getByLabelText("Nombre")).toHaveValue("Cemento");
        expect(screen.getByLabelText("Categoría")).toHaveValue("Obra gris");

        await user.clear(screen.getByLabelText("Cantidad"));
        await user.type(screen.getByLabelText("Cantidad"), "12");
        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

        expect(materials.update).toHaveBeenCalledWith(1, {
            name: "Cemento",
            category: "Obra gris",
            unit: "saco",
            quantity: 12,
            unit_cost: 8.5,
        });
        expect(materials.create).not.toHaveBeenCalled();
    });

    it("cancels the edit without saving", async () => {
        const user = userEvent.setup();
        render(<MaterialsPanel projectId={7} run={run} />);

        await user.click(await screen.findByRole("button", { name: "Editar material Acero" }));
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(screen.getByLabelText("Nombre")).toHaveValue("");
        expect(screen.getByRole("button", { name: "Agregar material" })).toBeInTheDocument();
        expect(materials.update).not.toHaveBeenCalled();
    });

    it("deletes a material and reloads the list", async () => {
        const user = userEvent.setup();
        render(<MaterialsPanel projectId={7} run={run} />);

        await user.click(await screen.findByRole("button", { name: "Eliminar material Acero" }));

        expect(materials.remove).toHaveBeenCalledWith(2);
        await waitFor(() => expect(materials.listByProject).toHaveBeenCalledTimes(2));
    });
});
