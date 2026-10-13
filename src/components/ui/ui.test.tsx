import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Icon } from "../Icon";
import { Breadcrumbs } from "./Breadcrumbs";
import { Button } from "./Button";
import { Card } from "./Card";
import { Dialog } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { Field } from "./Field";
import { Input, Select } from "./Input";
import { Menu } from "./Menu";
import { ProgressBar } from "./ProgressBar";
import { Skeleton } from "./Skeleton";
import { Tabs } from "./Tabs";
import { Tooltip } from "./Tooltip";

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

describe("Dialog", () => {
    it("is a named dialog that closes with its button and with Escape", async () => {
        const onClose = vi.fn();

        render(
            <Dialog title="Atajos del visor" size="compact" onClose={onClose}>
                <p>Contenido</p>
            </Dialog>,
        );

        expect(screen.getByRole("dialog", { name: "Atajos del visor" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
        await userEvent.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("keeps the focus inside while it is open", async () => {
        render(
            <Dialog title="Vista previa" onClose={() => undefined} actions={<a href="/x">Abrir</a>}>
                <p>Contenido</p>
            </Dialog>,
        );

        const dialog = screen.getByRole("dialog");

        await userEvent.tab();
        await userEvent.tab();
        await userEvent.tab();

        expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });
});

describe("Tooltip", () => {
    it("describes its control and shows the shortcut", () => {
        render(
            <Tooltip text="Enfocar la selección" shortcut="F">
                <button type="button" aria-label="Enfocar" />
            </Tooltip>,
        );

        const button = screen.getByRole("button", { name: "Enfocar" });

        expect(button).toHaveAccessibleDescription("Enfocar la selecciónF");
        expect(screen.getByRole("tooltip")).toHaveTextContent("F");
    });
});

describe("Skeleton", () => {
    it("announces the loading as a status and draws the bars asked for", () => {
        const { container } = render(<Skeleton shape="rows" count={2} />);

        expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
        expect(container.querySelectorAll(".skeleton-bar")).toHaveLength(2);
    });
});

describe("Card", () => {
    it("renders the element it is asked for and keeps extra attributes", () => {
        render(
            <Card as="article" aria-label="Casa Mirador">
                Contenido
            </Card>,
        );

        expect(screen.getByRole("article", { name: "Casa Mirador" })).toHaveTextContent(
            "Contenido",
        );
    });
});

describe("Input and Select", () => {
    it("label the control and announce its error", () => {
        render(
            <>
                <Input label="Retiro" error="Escribe un número mayor que cero." />
                <Select label="Escala">
                    <option>1:100</option>
                </Select>
            </>,
        );

        expect(screen.getByRole("textbox", { name: "Retiro" })).toBeInvalid();
        expect(screen.getByRole("alert")).toHaveTextContent("Escribe un número mayor que cero.");
        expect(screen.getByRole("combobox", { name: "Escala" })).toBeInTheDocument();
    });
});

describe("Icon", () => {
    it("draws every icon from the same set, hidden from screen readers", () => {
        const { container } = render(
            <>
                <Icon name="home" />
                <Icon name="viewTop" />
            </>,
        );
        const icons = container.querySelectorAll("svg.icon");

        expect(icons).toHaveLength(2);
        icons.forEach((icon) => {
            expect(icon).toHaveAttribute("aria-hidden", "true");
            expect(icon).toHaveAttribute("stroke-width", "1.5");
        });
    });
});

describe("Breadcrumbs", () => {
    it("links every step but the last, which is the current page", async () => {
        const toProjects = vi.fn();

        render(
            <Breadcrumbs
                items={[
                    { label: "Proyectos", onSelect: toProjects },
                    { label: "Casa Mirador", onSelect: () => undefined },
                    { label: "Modelo 3D" },
                ]}
            />,
        );

        const trail = screen.getByRole("navigation", { name: "Migas de pan" });

        expect(trail).toHaveTextContent("ProyectosCasa MiradorModelo 3D");
        expect(screen.getByText("Modelo 3D")).toHaveAttribute("aria-current", "page");
        expect(screen.queryByRole("button", { name: "Modelo 3D" })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Proyectos" }));

        expect(toProjects).toHaveBeenCalledTimes(1);
    });
});
