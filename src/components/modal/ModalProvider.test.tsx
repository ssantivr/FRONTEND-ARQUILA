import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithModals } from "../../test/render";
import { useModal, type ConfirmOptions } from "./modalContext";

function Opener({
    options,
    onAnswer,
}: {
    options: ConfirmOptions;
    onAnswer: (accepted: boolean) => void;
}) {
    const modal = useModal();

    return (
        <button type="button" onClick={async () => onAnswer(await modal.confirm(options))}>
            Abrir
        </button>
    );
}

async function open(extra: Partial<ConfirmOptions> = {}) {
    const onAnswer = vi.fn();
    const options = { title: "Eliminar", body: "¿Seguro?", tone: "danger" as const, ...extra };

    renderWithModals(<Opener options={options} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    return { onAnswer, dialog: await screen.findByRole("dialog", { name: "Eliminar" }) };
}

describe("ModalProvider", () => {
    it("opens named, with the safe button focused", async () => {
        await open();

        expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    });

    it("answers false when cancelled and returns the focus", async () => {
        const action = vi.fn();
        const { onAnswer } = await open({ action });

        await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(onAnswer).toHaveBeenCalledWith(false);
        expect(action).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.getByRole("button", { name: "Abrir" })).toHaveFocus());
    });

    it("closes with Escape", async () => {
        const { onAnswer, dialog } = await open();

        dialog.dispatchEvent(new Event("cancel", { bubbles: false, cancelable: true }));

        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false));
    });

    it("stays open when the browser closes it while it works", async () => {
        const action = vi.fn(() => new Promise<void>(() => undefined));
        const { onAnswer, dialog } = await open({ action });

        await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
        dialog.removeAttribute("open");
        dialog.dispatchEvent(new Event("close"));

        expect(onAnswer).not.toHaveBeenCalled();
        expect(dialog).toHaveAttribute("open");
    });

    it("does not close a delete by clicking outside", async () => {
        const { onAnswer, dialog } = await open();

        await userEvent.click(dialog);

        expect(onAnswer).not.toHaveBeenCalled();
        expect(dialog).toBeInTheDocument();
    });

    it("shows the progress and blocks a second click", async () => {
        let finish: () => void = () => undefined;
        const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
        const { onAnswer } = await open({ action });

        await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
        expect(screen.getByRole("button", { name: "Procesando…" })).toBeDisabled();

        finish();

        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(true));
        expect(action).toHaveBeenCalledTimes(1);
    });

    it("keeps the error inside and lets the user retry", async () => {
        const action = vi
            .fn()
            .mockRejectedValueOnce(new Error("Failed to fetch"))
            .mockResolvedValueOnce(undefined);
        const { onAnswer } = await open({ action });

        await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");

        await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(true));
    });

    it("asks to type the name before deleting a project", async () => {
        await open({ requireText: "Casa" });
        const accept = screen.getByRole("button", { name: "Confirmar" });

        expect(accept).toBeDisabled();
        await userEvent.type(screen.getByRole("textbox"), "Casa");

        expect(accept).toBeEnabled();
    });
});
