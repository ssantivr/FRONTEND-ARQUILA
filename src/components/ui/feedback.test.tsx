import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { showToast } from "../../state/toasts";
import { Toasts } from "../Toasts";
import { StatusBadge } from "./Badge";
import { Button, type ButtonVariant } from "./Button";
import { Dialog } from "./Dialog";
import { Drawer } from "./Drawer";
import { ErrorState } from "./ErrorState";
import { Select } from "./Input";
import { Toast } from "./Toast";

describe("Button variants and states", () => {
    const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];

    it("draws each of the four variants as a named button", () => {
        render(
            <>
                {variants.map((variant) => (
                    <Button key={variant} variant={variant}>
                        {variant}
                    </Button>
                ))}
            </>,
        );

        for (const variant of variants) {
            expect(screen.getByRole("button", { name: variant })).toHaveAttribute(
                "data-variant",
                variant,
            );
        }
    });

    it("does nothing while disabled, and runs its action once enabled", async () => {
        const onClick = vi.fn();
        const { rerender } = render(
            <Button disabled onClick={onClick}>
                Publicar
            </Button>,
        );

        await userEvent.click(screen.getByRole("button", { name: "Publicar" }));
        expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled();
        expect(onClick).not.toHaveBeenCalled();

        rerender(<Button onClick={onClick}>Publicar</Button>);
        await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("takes the keyboard focus, which the focus ring is drawn for", async () => {
        render(<Button variant="secondary">Abrir</Button>);

        await userEvent.tab();

        expect(screen.getByRole("button", { name: "Abrir" })).toHaveFocus();
    });
});

describe("Button states", () => {
    it("is busy and blocked while its action runs", () => {
        render(<Button loading>Guardar</Button>);

        const button = screen.getByRole("button", { name: "Guardar" });

        expect(button).toHaveAttribute("aria-busy", "true");
        expect(button).toBeDisabled();
    });

    it("does not submit a form unless it is told to", () => {
        render(<Button>Cancelar</Button>);

        expect(screen.getByRole("button", { name: "Cancelar" })).toHaveAttribute("type", "button");
    });

    it("draws the two sizes", () => {
        render(
            <>
                <Button size="sm">Pequeño</Button>
                <Button size="md">Mediano</Button>
            </>,
        );

        expect(screen.getByRole("button", { name: "Pequeño" }).className).toMatch(/sm/);
        expect(screen.getByRole("button", { name: "Mediano" }).className).toMatch(/md/);
    });
});

describe("ErrorState", () => {
    it("announces what failed", () => {
        render(<ErrorState message="No se pudo guardar." />);

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("offers to try again, and says when it is doing it", async () => {
        const onRetry = vi.fn();
        const { rerender } = render(<ErrorState message="Falló." onRetry={onRetry} />);

        await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
        expect(onRetry).toHaveBeenCalledTimes(1);

        rerender(<ErrorState message="Falló." onRetry={onRetry} retrying />);
        expect(screen.getByRole("button", { name: "Reintentando…" })).toBeDisabled();
    });
});

describe("Dialog and Drawer", () => {
    it.each([
        ["Dialog", Dialog],
        ["Drawer", Drawer],
    ])("%s names itself, shows its actions and closes with its button", async (_, Modal) => {
        const onClose = vi.fn();

        render(
            <Modal title="Muestra" actions={<Button>Exportar</Button>} onClose={onClose}>
                Contenido
            </Modal>,
        );

        expect(screen.getByRole("dialog", { name: "Muestra" })).toHaveTextContent("Contenido");
        expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});

describe("Select", () => {
    it("is a labelled native select that reports the chosen option", async () => {
        const onChange = vi.fn();

        render(
            <Select label="Unidades" defaultValue="m" onChange={onChange}>
                <option value="m">Métricas</option>
                <option value="ft">Imperiales</option>
            </Select>,
        );

        const select = screen.getByRole("combobox", { name: "Unidades" });

        await userEvent.selectOptions(select, "ft");

        expect(select).toHaveValue("ft");
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("wires its error to the control and announces it", () => {
        render(
            <Select label="Unidades" error="Elige una unidad">
                <option>Métricas</option>
            </Select>,
        );

        const select = screen.getByRole("combobox", { name: "Unidades" });

        expect(select).toBeInvalid();
        expect(select).toHaveAccessibleDescription("Elige una unidad");
        expect(screen.getByRole("alert")).toHaveTextContent("Elige una unidad");
    });

    it("keeps a description of its own when it has no note", () => {
        render(
            <>
                <p id="fuera">Se calcula al exportar.</p>
                <Select label="Unidades" aria-describedby="fuera">
                    <option>Métricas</option>
                </Select>
            </>,
        );

        expect(screen.getByRole("combobox", { name: "Unidades" })).toHaveAccessibleDescription(
            "Se calcula al exportar.",
        );
    });

    it("can be disabled", () => {
        render(
            <Select label="Unidades" disabled>
                <option>Métricas</option>
            </Select>,
        );

        expect(screen.getByRole("combobox", { name: "Unidades" })).toBeDisabled();
    });
});

describe("StatusBadge", () => {
    it("tells the state with a word, not with colour alone", () => {
        render(
            <>
                <StatusBadge status="draft" />
                <StatusBadge status="active" />
                <StatusBadge status="archived" />
            </>,
        );

        expect(screen.getByText("Borrador")).toBeInTheDocument();
        expect(screen.getByText("Activo")).toBeInTheDocument();
        expect(screen.getByText("Archivado")).toBeInTheDocument();
    });
});

describe("Toast", () => {
    it("closes with its button and asks to be held while the pointer or the focus is on it", async () => {
        const onClose = vi.fn();
        const onHold = vi.fn();
        const onRelease = vi.fn();

        render(
            <Toast
                text="Imagen guardada."
                lifeMs={3820}
                onClose={onClose}
                onHold={onHold}
                onRelease={onRelease}
            />,
        );

        const close = screen.getByRole("button", { name: "Cerrar el aviso" });

        await userEvent.hover(close);
        expect(onHold).toHaveBeenCalledWith("pointer");

        await userEvent.unhover(close);
        expect(onRelease).toHaveBeenCalledWith("pointer");

        await userEvent.tab();
        expect(onHold).toHaveBeenCalledWith("focus");

        await userEvent.keyboard("{Enter}");
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("draws a different mark for an error than for a success", () => {
        const { container } = render(
            <>
                <Toast text="Hecho." lifeMs={1000} onClose={() => undefined} />
                <Toast text="Falló." tone="error" lifeMs={1000} onClose={() => undefined} />
            </>,
        );
        const [success, error] = container.querySelectorAll<HTMLElement>("[data-tone]");

        expect(success).toHaveAttribute("data-tone", "success");
        expect(error).toHaveAttribute("data-tone", "error");
        expect(success.querySelector("svg")?.innerHTML).not.toBe(
            error.querySelector("svg")?.innerHTML,
        );
    });
});

describe("Toasts", () => {
    afterEach(() => {
        act(() => vi.runAllTimers());
        vi.useRealTimers();
    });

    it("reads what `showToast` sends in a polite live region, with its tone", () => {
        vi.useFakeTimers();
        render(<Toasts />);

        act(() => showToast("No se pudo guardar la imagen.", "error"));

        const region = screen.getByRole("status");

        expect(region).toHaveAttribute("aria-live", "polite");
        expect(within(region).getByText("No se pudo guardar la imagen.")).toBeInTheDocument();
        expect(region.querySelector('[data-tone="error"]')).not.toBeNull();
    });
});
