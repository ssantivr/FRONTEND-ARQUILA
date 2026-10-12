import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Field } from "./Field";
import { Menu } from "./Menu";
import { ProgressBar } from "./ProgressBar";
import { Tabs } from "./Tabs";

describe("Button", () => {
    it("does not submit a form unless asked to and carries its variant", () => {
        render(<Button variant="danger">Eliminar</Button>);

        const button = screen.getByRole("button", { name: "Eliminar" });

        expect(button).toHaveAttribute("type", "button");
        expect(button).toHaveClass("button-danger");
    });

    it("is blocked and announced as busy while loading", async () => {
        const onClick = vi.fn();

        render(
            <Button loading onClick={onClick}>
                Guardar
            </Button>,
        );
        await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

        expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute(
            "aria-busy",
            "true",
        );
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe("Field", () => {
    it("ties the label and the hint to the control", () => {
        render(
            <Field label="Nombre" hint="Como aparecerá en la lista.">
                <input />
            </Field>,
        );

        expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription(
            "Como aparecerá en la lista.",
        );
    });

    it("marks the control as invalid and announces the error", () => {
        render(
            <Field label="Correo" hint="Tu correo." error="Escribe un correo válido.">
                <input />
            </Field>,
        );

        expect(screen.getByLabelText("Correo")).toBeInvalid();
        expect(screen.getByRole("alert")).toHaveTextContent("Escribe un correo válido.");
    });
});

describe("Tabs", () => {
    it("marks the open section and reports the one that is chosen", async () => {
        const onChange = vi.fn();

        render(
            <Tabs
                label="Secciones"
                items={[
                    { id: "a", label: "Terreno" },
                    { id: "b", label: "Planos" },
                ]}
                current="a"
                onChange={onChange}
            />,
        );

        expect(screen.getByRole("button", { name: "Terreno" })).toHaveAttribute(
            "aria-current",
            "page",
        );

        await userEvent.click(screen.getByRole("button", { name: "Planos" }));

        expect(onChange).toHaveBeenCalledWith("b");
    });
});

describe("Menu", () => {
    it("runs the chosen action and closes", async () => {
        const onArchive = vi.fn();
        const { container } = render(
            <Menu
                label="Acciones de Casa Andina"
                items={[{ label: "Archivar", onSelect: onArchive }]}
            />,
        );
        const details = container.querySelector("details") as HTMLDetailsElement;

        await userEvent.click(screen.getByTitle("Acciones de Casa Andina"));
        expect(details.open).toBe(true);

        await userEvent.click(screen.getByRole("button", { name: "Archivar" }));

        expect(onArchive).toHaveBeenCalledTimes(1);
        expect(details.open).toBe(false);
    });

    it("closes with Escape", async () => {
        const { container } = render(
            <Menu label="Acciones" items={[{ label: "Abrir", onSelect: () => undefined }]} />,
        );
        const details = container.querySelector("details") as HTMLDetailsElement;

        await userEvent.click(screen.getByTitle("Acciones"));
        await userEvent.keyboard("{Escape}");

        expect(details.open).toBe(false);
    });
});

describe("ProgressBar", () => {
    it("reports its value as a percentage and never leaves the 0 to 100 range", () => {
        const { rerender } = render(<ProgressBar label="Avance" value={0.62} />);

        expect(screen.getByRole("progressbar", { name: "Avance" })).toHaveAttribute(
            "aria-valuenow",
            "62",
        );

        rerender(<ProgressBar label="Avance" value={3} />);

        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    });
});

describe("EmptyState", () => {
    it("shows the text and the next step it is given", () => {
        render(<EmptyState text="Sin proyectos." action={<button type="button">Crear</button>} />);

        expect(screen.getByText("Sin proyectos.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
    });
});
