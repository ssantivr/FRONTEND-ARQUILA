import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { renderWithModals } from "../../test/render";
import { EditDialog } from "./EditDialog";

it("shows what changes and asks before discarding it", async () => {
    const onCancel = vi.fn();

    renderWithModals(
        <EditDialog editing title="Actualizar el plano" onCancel={onCancel}>
            <label>
                Título
                <input />
            </label>
        </EditDialog>,
    );
    await userEvent.type(screen.getByLabelText("Título"), "Planta");
    expect(screen.getByRole("status")).toHaveTextContent("Se actualizará: Título.");

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }));

    expect(onCancel).toHaveBeenCalled();
});
