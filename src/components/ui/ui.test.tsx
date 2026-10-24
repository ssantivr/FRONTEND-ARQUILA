import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Icon } from "../Icon";
import { Breadcrumbs } from "./Breadcrumbs";
import { Button } from "./Button";
import { Card } from "./Card";
import { ConfirmDialog } from "./ConfirmDialog";
import { DataTable } from "./DataTable";
import { Dialog } from "./Dialog";
import { Drawer } from "./Drawer";
import { EmptyState } from "./EmptyState";
import { Field } from "./Field";
import { FilterBar } from "./FilterBar";
import { Input, Select } from "./Input";
import { Menu } from "./Menu";
import { ProgressBar } from "./ProgressBar";
import { SaveIndicator } from "./SaveIndicator";
import { SegmentedControl } from "./SegmentedControl";
import { Skeleton } from "./Skeleton";
import { Spinner } from "./Spinner";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";
import { Tooltip } from "./Tooltip";

describe("Button", () => {
    it("does not submit a form unless asked to and carries its variant", () => {
        render(<Button variant="danger">Eliminar</Button>);

        const button = screen.getByRole("button", { name: "Eliminar" });

        expect(button).toHaveAttribute("type", "button");
        expect(button).toHaveAttribute("data-variant", "danger");
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

    it("is shown but not announced when it only repeats the name of its control", () => {
        render(
            <Tooltip text="Enfocar" describes={false}>
                <button type="button" aria-label="Enfocar" />
            </Tooltip>,
        );

        expect(screen.getByRole("button", { name: "Enfocar" })).not.toHaveAccessibleDescription();
        expect(screen.getByText("Enfocar")).toHaveAttribute("aria-hidden", "true");
    });

    it("closes with Escape without letting the key reach the screen behind", async () => {
        const onWindowKey = vi.fn();

        window.addEventListener("keydown", onWindowKey);
        render(
            <Tooltip text="Selecciona un cuarto para aislarlo">
                <button type="button">Aislar cuarto</button>
            </Tooltip>,
        );

        await userEvent.tab();
        onWindowKey.mockClear();
        await userEvent.keyboard("{Escape}");

        expect(onWindowKey).not.toHaveBeenCalled();
        expect(screen.getByRole("tooltip").parentElement).toHaveAttribute("data-dismissed");

        window.removeEventListener("keydown", onWindowKey);
    });
});

describe("Skeleton", () => {
    it("announces the loading as a status and draws the bars asked for", () => {
        render(<Skeleton shape="rows" count={2} />);

        const status = screen.getByRole("status");

        expect(status).toHaveTextContent("Cargando…");
        expect(status.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
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
                    { label: "Proyectos", href: "/proyectos", onSelect: toProjects },
                    { label: "Casa Mirador", href: "/proyectos/3/terreno" },
                    { label: "Modelo 3D" },
                ]}
            />,
        );

        const trail = screen.getByRole("navigation", { name: "Migas de pan" });

        expect(trail).toHaveTextContent("ProyectosCasa MiradorModelo 3D");
        expect(screen.getByText("Modelo 3D")).toHaveAttribute("aria-current", "page");
        expect(screen.queryByRole("link", { name: "Modelo 3D" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Casa Mirador" })).toHaveAttribute(
            "href",
            "/proyectos/3/terreno",
        );

        await userEvent.click(screen.getByRole("link", { name: "Proyectos" }));

        expect(toProjects).toHaveBeenCalledTimes(1);
    });
});

describe("Drawer", () => {
    it("is a named dialog that closes with its button and with Escape", async () => {
        const onClose = vi.fn();

        render(
            <Drawer title="Filtros" side="bottom" onClose={onClose}>
                <p>Contenido</p>
            </Drawer>,
        );

        expect(screen.getByRole("dialog", { name: "Filtros" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
        await userEvent.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe("ConfirmDialog", () => {
    it("opens on «Cancelar», so Enter by habit does not confirm", async () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        render(
            <ConfirmDialog
                title="¿Eliminar el proyecto?"
                confirmLabel="Eliminar"
                danger
                onConfirm={onConfirm}
                onCancel={onCancel}
            >
                <p>No se puede deshacer.</p>
            </ConfirmDialog>,
        );

        const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar el proyecto?" });

        expect(dialog).toHaveAccessibleDescription("No se puede deshacer.");
        expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();

        await userEvent.keyboard("{Enter}");

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("confirms with its button, which is red for a destructive action", async () => {
        const onConfirm = vi.fn();

        render(
            <ConfirmDialog
                title="¿Eliminar?"
                confirmLabel="Eliminar"
                danger
                onConfirm={onConfirm}
                onCancel={() => undefined}
            >
                Texto
            </ConfirmDialog>,
        );

        const confirm = screen.getByRole("button", { name: "Eliminar" });

        expect(confirm).toHaveAttribute("data-variant", "danger");
        await userEvent.click(confirm);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("cannot be cancelled while the action runs", async () => {
        const onCancel = vi.fn();

        render(
            <ConfirmDialog
                title="¿Eliminar?"
                confirmLabel="Eliminar"
                pending
                onConfirm={() => undefined}
                onCancel={onCancel}
            >
                Texto
            </ConfirmDialog>,
        );

        await userEvent.keyboard("{Escape}");

        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Eliminar" })).toHaveAttribute(
            "aria-busy",
            "true",
        );
    });
});

describe("SegmentedControl", () => {
    const OPTIONS = [
        { value: "light", label: "Claro", icon: "sun" },
        { value: "dark", label: "Oscuro", icon: "moon" },
        { value: "auto", label: "Automático" },
    ] as const;

    it("is a radio group with one tab stop, on the chosen option", () => {
        render(
            <SegmentedControl
                label="Tema"
                options={OPTIONS}
                value="dark"
                onChange={() => undefined}
            />,
        );

        expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
        expect(screen.getByRole("radio", { name: "Oscuro" })).toHaveAttribute("tabindex", "0");
        expect(screen.getByRole("radio", { name: "Claro" })).toHaveAttribute("tabindex", "-1");
    });

    it("moves the choice with the arrows, wrapping at the ends", async () => {
        const onChange = vi.fn();

        render(
            <SegmentedControl label="Tema" options={OPTIONS} value="auto" onChange={onChange} />,
        );

        // From the last option Right wraps to the first; from the first, Left wraps to the last.
        screen.getByRole("radio", { name: "Automático" }).focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("radio", { name: "Claro" })).toHaveFocus();
        await userEvent.keyboard("{ArrowLeft}");

        expect(onChange.mock.calls).toEqual([["light"], ["auto"]]);
    });

    it("keeps the name of an icon-only option", () => {
        render(
            <SegmentedControl
                label="Tema"
                options={OPTIONS}
                value="light"
                iconOnly
                onChange={() => undefined}
            />,
        );

        expect(screen.getByRole("radio", { name: "Claro" })).toHaveAttribute("title", "Claro");
        expect(screen.queryByText("Claro")).not.toBeInTheDocument();
    });
});

describe("Switch", () => {
    it("is a labelled switch with its description", async () => {
        const onChange = vi.fn();

        render(
            <Switch
                label="Reducir movimiento"
                description="Quita las transiciones."
                checked={false}
                onChange={onChange}
            />,
        );

        const toggle = screen.getByRole("switch", { name: "Reducir movimiento" });

        expect(toggle).toHaveAccessibleDescription("Quita las transiciones.");
        await userEvent.click(toggle);
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});

describe("Spinner", () => {
    it("is announced only when it has a label", () => {
        const { rerender, container } = render(<Spinner />);

        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(container.firstChild).toHaveAttribute("aria-hidden", "true");

        rerender(<Spinner label="Cargando el modelo…" />);

        expect(screen.getByRole("status")).toHaveTextContent("Cargando el modelo…");
    });
});

describe("SaveIndicator", () => {
    it("says each state with words, not with colour alone", () => {
        const { rerender } = render(<SaveIndicator state="idle" />);

        expect(screen.getByRole("status")).toHaveTextContent("");

        rerender(<SaveIndicator state="saving" />);
        expect(screen.getByRole("status")).toHaveTextContent("Guardando…");

        rerender(<SaveIndicator state="saved" />);
        expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");

        rerender(<SaveIndicator state="error" />);
        expect(screen.getByRole("status")).toHaveTextContent("Error al guardar");
    });
});

describe("DataTable", () => {
    interface Row {
        id: number;
        name: string;
        area: number | null;
    }

    const ROWS: Row[] = [
        { id: 1, name: "Lote 10", area: 120 },
        { id: 2, name: "Lote 2", area: null },
        { id: 3, name: "Lote 1", area: 480 },
    ];
    const COLUMNS = [
        {
            id: "name",
            header: "Nombre",
            cell: (row: Row) => row.name,
            sortValue: (row: Row) => row.name,
        },
        {
            id: "area",
            header: "Área",
            numeric: true,
            cell: (row: Row) => (row.area === null ? "Sin registrar" : `${row.area} m²`),
            sortValue: (row: Row) => row.area,
        },
    ];

    function names(): string[] {
        return screen
            .getAllByRole("row")
            .slice(1)
            .map((row) => row.querySelector("td")?.textContent ?? "");
    }

    it("sorts by a column, with natural order for names and empty values last", async () => {
        render(
            <DataTable caption="Terrenos" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />,
        );

        expect(screen.getByRole("table", { name: "Terrenos" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /Nombre/ }));
        expect(names()).toEqual(["Lote 1", "Lote 2", "Lote 10"]);
        expect(screen.getByRole("columnheader", { name: /Nombre/ })).toHaveAttribute(
            "aria-sort",
            "ascending",
        );

        await userEvent.click(screen.getByRole("button", { name: /Área/ }));
        await userEvent.click(screen.getByRole("button", { name: /Área/ }));
        expect(names()).toEqual(["Lote 1", "Lote 10", "Lote 2"]);
        expect(screen.getByRole("columnheader", { name: /Área/ })).toHaveAttribute(
            "aria-sort",
            "descending",
        );
    });

    it("labels each cell with its column for the narrow layout, and shows an empty state", () => {
        const { rerender } = render(
            <DataTable caption="Terrenos" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />,
        );

        expect(screen.getAllByRole("cell")[1]).toHaveAttribute("data-label", "Área");

        rerender(
            <DataTable
                caption="Terrenos"
                columns={COLUMNS}
                rows={[]}
                rowKey={(row) => row.id}
                empty="Todavía no hay terrenos."
            />,
        );

        expect(screen.getByRole("cell")).toHaveTextContent("Todavía no hay terrenos.");
    });
});

describe("FilterBar", () => {
    it("searches, announces the count and clears the filters", async () => {
        const onSearch = vi.fn();
        const onClear = vi.fn();

        render(
            <FilterBar
                searchLabel="Buscar proyectos"
                search=""
                onSearch={onSearch}
                resultText="2 de 5 proyectos"
                active
                onClear={onClear}
            />,
        );

        expect(screen.getByRole("search")).toBeInTheDocument();
        await userEvent.type(screen.getByRole("searchbox", { name: "Buscar proyectos" }), "c");
        expect(onSearch).toHaveBeenCalledWith("c");
        expect(screen.getByRole("status")).toHaveTextContent("2 de 5 proyectos");

        await userEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it("offers «Quitar filtros» only when something narrows the list", () => {
        render(
            <FilterBar
                searchLabel="Buscar"
                search=""
                onSearch={() => undefined}
                onClear={() => undefined}
            />,
        );

        expect(screen.queryByRole("button", { name: "Quitar filtros" })).not.toBeInTheDocument();
    });
});
