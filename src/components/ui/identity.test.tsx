import { readFileSync } from "node:fs";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FAVICON } from "../../../scripts/favicon.mjs";
import { BlueprintGrid, CornerMarks, DimensionLine, GridAxes } from "./Blueprint";
import { Button } from "./Button";
import { CameraControls } from "./CameraControls";
import { ContextMenu } from "./ContextMenu";
import { EmptyState, FocusFormButton } from "./EmptyState";
import { IconButton } from "./IconButton";
import { PasswordInput } from "./Input";
import { Kbd } from "./Kbd";
import { Loader } from "./Loader";
import { Logo, LogoMark } from "./Logo";
import { LOGO_PIECES } from "./logoGeometry";
import { MaterialPicker } from "./MaterialPicker";
import { PropertyField, PropertyPanel, PropertyRow, PropertySection } from "./PropertyPanel";
import { Quantity } from "./Quantity";
import { Range } from "./Range";
import { DerivedTag, Tag } from "./Tag";

describe("Logo", () => {
    it("is named by its word and draws each volume as a piece the entrance can move", () => {
        const { container } = render(<Logo tagline />);

        expect(screen.getByText("ARQUILA")).toBeInTheDocument();
        expect(screen.getByText("Diseña · Planifica · Construye")).toBeInTheDocument();

        const mark = container.querySelector("svg");

        expect(mark).toHaveAttribute("aria-hidden", "true");
        expect(
            [...(mark?.querySelectorAll("[data-piece]") ?? [])].map((piece) =>
                piece.getAttribute("data-piece"),
            ),
        ).toEqual(LOGO_PIECES);
    });

    it("keeps the proportions of the drawing at any height", () => {
        const { container } = render(<LogoMark size={40} />);
        const mark = container.querySelector("svg") as SVGElement;

        expect(Number(mark.getAttribute("height"))).toBe(40);
        expect(Number(mark.getAttribute("width"))).toBeGreaterThan(0);
    });

    it("is the same drawing as the favicon", () => {
        // Git may check the file out with CRLF line endings on Windows.
        const favicon = readFileSync("public/favicon.svg", "utf8").replace(/\r\n/g, "\n");

        expect(favicon).toBe(FAVICON);
    });
});

describe("Loader", () => {
    it("announces what loads and can keep the text for screen readers only", () => {
        const { rerender } = render(<Loader label="Cargando el modelo…" minHeight={320} />);

        expect(screen.getByRole("status")).toHaveTextContent("Cargando el modelo…");
        expect(screen.getByRole("status")).toHaveStyle({ minHeight: "320px" });

        rerender(<Loader label="Cargando el modelo…" quiet />);

        expect(screen.getByText("Cargando el modelo…")).toHaveClass("visually-hidden");
    });
});

describe("Blueprint motif", () => {
    it("is decoration, except the measure of a dimension line", () => {
        const { container } = render(
            <>
                <BlueprintGrid />
                <CornerMarks />
                <GridAxes labels={["A", "B"]} />
                <DimensionLine />
                <DimensionLine label="12,40 m" />
            </>,
        );
        const shown = [...container.children].filter(
            (element) => element.getAttribute("aria-hidden") !== "true",
        );

        expect(shown).toHaveLength(1);
        expect(shown[0]).toHaveTextContent("12,40 m");
    });
});

describe("Kbd", () => {
    it("draws one cap per key and keeps the combination as one text", () => {
        const { container } = render(<Kbd>Ctrl + K</Kbd>);
        const combo = container.firstElementChild as HTMLElement;

        expect(combo.tagName).toBe("KBD");
        expect(combo.querySelectorAll("kbd")).toHaveLength(2);
        expect(combo).toHaveTextContent("CtrlK");
    });
});

describe("Tag and Quantity", () => {
    it("says the tone with a word, and marks what the interface calculated", () => {
        render(
            <>
                <Tag tone="warning" icon="alert">
                    En revisión
                </Tag>
                <DerivedTag detail="Calculado con las medidas de los cuartos." />
            </>,
        );

        expect(screen.getByText("En revisión")).toBeInTheDocument();
        expect(screen.getByText("Derivado")).toHaveAttribute(
            "title",
            "Calculado con las medidas de los cuartos.",
        );
    });

    it("shows the unit and the origin of a figure, and says when it is missing", () => {
        const { rerender } = render(<Quantity value="233,6" unit="m²" derived />);

        expect(screen.getByText("233,6")).toBeInTheDocument();
        expect(screen.getByText("m²")).toBeInTheDocument();
        expect(screen.getByText("Derivado")).toBeInTheDocument();

        rerender(<Quantity value={null} unit="m²" missing="Sin registrar" />);

        expect(screen.getByText("Sin registrar")).toBeInTheDocument();
        expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
});

describe("Button and IconButton", () => {
    it("explains why an action is not available, and stays reachable with Tab", async () => {
        const onClick = vi.fn();

        render(
            <Button disabledReason="El backend no guarda la rotación." onClick={onClick}>
                Rotar
            </Button>,
        );

        const button = screen.getByRole("button", { name: "Rotar" });

        await userEvent.tab();
        expect(button).toHaveFocus();
        expect(button).toHaveAttribute("aria-disabled", "true");
        expect(button).toHaveAccessibleDescription("El backend no guarda la rotación.");

        await userEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it("shows the keys of a shortcut next to the label", () => {
        render(<Button shortcut="Ctrl K">Buscar</Button>);

        const button = screen.getByRole("button", { name: /^Buscar/ });

        expect(button.querySelector("kbd")).toHaveTextContent("CtrlK");
    });

    it("names an icon-only button and gives its reason when disabled", async () => {
        const onClick = vi.fn();

        render(
            <>
                <IconButton label="Acercar" icon="zoomIn" shortcut="+" onClick={onClick} />
                <IconButton label="Rotar" icon="rotate" disabledReason="sin campo de giro" />
            </>,
        );

        await userEvent.click(screen.getByRole("button", { name: "Acercar" }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("button", { name: "Rotar" })).toHaveAccessibleDescription(
            "Rotar: sin campo de giro",
        );
    });
});

describe("PasswordInput", () => {
    it("shows what was typed with a button that keeps its name", async () => {
        render(<PasswordInput label="Contraseña" />);

        const field = screen.getByLabelText("Contraseña");
        const reveal = screen.getByRole("button", { name: "Mostrar contraseña" });

        expect(field).toHaveAttribute("type", "password");
        await userEvent.click(reveal);
        expect(field).toHaveAttribute("type", "text");
        expect(reveal).toHaveAttribute("aria-pressed", "true");
    });
});

describe("ContextMenu", () => {
    const items = (onRename: () => void) => [
        { label: "Renombrar", onSelect: onRename },
        { label: "Duplicar", onSelect: () => undefined, disabled: true, reason: "Sin API" },
        { label: "Eliminar", onSelect: () => undefined, danger: true },
    ];

    it("opens at the pointer and runs the chosen action", async () => {
        const onRename = vi.fn();

        render(
            <ContextMenu label="Acciones de Cocina" items={items(onRename)}>
                <button type="button">Cocina</button>
            </ContextMenu>,
        );

        fireEvent.contextMenu(screen.getByRole("button", { name: "Cocina" }));

        expect(screen.getByRole("menu", { name: "Acciones de Cocina" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /Duplicar/ })).toBeDisabled();

        await userEvent.click(screen.getByRole("menuitem", { name: "Renombrar" }));

        expect(onRename).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("opens from the keyboard, skips disabled items and gives the focus back on Escape", async () => {
        render(
            <ContextMenu label="Acciones de Cocina" items={items(() => undefined)}>
                <button type="button">Cocina</button>
            </ContextMenu>,
        );

        const origin = screen.getByRole("button", { name: "Cocina" });

        origin.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");

        expect(screen.getByRole("menuitem", { name: "Renombrar" })).toHaveFocus();

        await userEvent.keyboard("{ArrowDown}");
        expect(screen.getByRole("menuitem", { name: "Eliminar" })).toHaveFocus();

        await userEvent.keyboard("{Escape}");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(origin).toHaveFocus();
    });
});

describe("CameraControls", () => {
    it("draws only the controls the view can answer to", () => {
        render(<CameraControls onView={() => undefined} view="top" />);

        expect(screen.getByRole("toolbar", { name: "Cámara" })).toBeInTheDocument();
        expect(screen.getAllByRole("button")).toHaveLength(4);
        expect(screen.getByRole("button", { name: "Vista superior" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.queryByRole("button", { name: "Acercar" })).not.toBeInTheDocument();
    });

    it("switches the projection and moves between buttons with the arrows", async () => {
        const onProjection = vi.fn();

        render(
            <CameraControls
                projection="perspective"
                onProjection={onProjection}
                onFrame={() => undefined}
            />,
        );

        const projection = screen.getByRole("button", { name: /Proyección en perspectiva/ });

        await userEvent.click(projection);
        expect(onProjection).toHaveBeenCalledWith("orthographic");

        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name: "Encuadrar" })).toHaveFocus();
    });
});

describe("MaterialPicker", () => {
    const OPTIONS = [
        { id: "concrete", label: "Hormigón", swatch: <span /> },
        { id: "wood", label: "Madera", swatch: <span />, detail: "Rugosidad 0,6" },
    ] as const;

    it("is a radio group whose arrows move the choice", async () => {
        const onChange = vi.fn();

        render(
            <MaterialPicker
                label="Acabado"
                options={OPTIONS}
                value="concrete"
                onChange={onChange}
            />,
        );

        expect(screen.getByRole("radiogroup", { name: "Acabado" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Hormigón" })).toHaveAttribute("tabindex", "0");

        screen.getByRole("radio", { name: "Hormigón" }).focus();
        await userEvent.keyboard("{ArrowRight}");

        expect(onChange).toHaveBeenCalledWith("wood");
        expect(screen.getByRole("radio", { name: /Madera/ })).toHaveFocus();
    });

    it("says why nothing can be chosen", () => {
        render(
            <MaterialPicker
                label="Acabado"
                options={OPTIONS}
                value={null}
                onChange={() => undefined}
                disabledReason="Selecciona un muro."
            />,
        );

        expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription("Selecciona un muro.");
        expect(screen.getByRole("radio", { name: "Hormigón" })).toBeDisabled();
    });
});

describe("PropertyPanel", () => {
    function Inspector({ onCommit }: { onCommit: (value: number) => void }) {
        return (
            <PropertyPanel title="Cocina" kind="Cuarto">
                <PropertySection title="Dimensiones">
                    <PropertyField
                        label="Ancho"
                        value={4}
                        unit="m"
                        min={0.5}
                        max={40}
                        onCommit={onCommit}
                    />
                </PropertySection>
                <PropertySection title="Superficie" derived>
                    <PropertyRow label="Área">16 m²</PropertyRow>
                </PropertySection>
            </PropertyPanel>
        );
    }

    it("names the selection and marks the groups the interface calculated", () => {
        render(<Inspector onCommit={() => undefined} />);

        expect(screen.getByRole("region", { name: "Propiedades de Cocina" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: /^Superficie/ })).toHaveTextContent("16 m²");
    });

    it("sends a value only when it is confirmed, with a comma or a point", async () => {
        const onCommit = vi.fn();

        render(<Inspector onCommit={onCommit} />);

        const width = screen.getByLabelText("Ancho (m)");

        await userEvent.clear(width);
        await userEvent.type(width, "4,25");
        expect(onCommit).not.toHaveBeenCalled();

        await userEvent.keyboard("{Enter}");
        expect(onCommit).toHaveBeenCalledWith(4.25);
    });

    it("refuses a value out of range and goes back with Escape", async () => {
        const onCommit = vi.fn();

        render(<Inspector onCommit={onCommit} />);

        const width = screen.getByLabelText("Ancho (m)");

        await userEvent.clear(width);
        await userEvent.type(width, "90{Enter}");

        expect(onCommit).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("Entre 0,5 y 40 m.");
        expect(width).toBeInvalid();

        await userEvent.keyboard("{Escape}");
        expect(width).toHaveValue("4");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});

describe("Range", () => {
    it("reads its value with the unit, and says why it is disabled", () => {
        const { rerender } = render(
            <Range
                label="Exposición"
                value={1.2}
                display="1,2 EV"
                min={0}
                max={2}
                step={0.1}
                onChange={() => undefined}
            />,
        );

        expect(screen.getByRole("slider", { name: /Exposición/ })).toHaveAttribute(
            "aria-valuetext",
            "1,2 EV",
        );

        rerender(
            <Range
                label="Nubes"
                value={0}
                display="0 %"
                min={0}
                max={100}
                step={1}
                onChange={() => undefined}
                disabledReason="El motor no dibuja nubes."
            />,
        );

        expect(screen.getByRole("slider")).toBeDisabled();
        expect(screen.getByText("El motor no dibuja nubes.")).toBeInTheDocument();
    });
});

describe("EmptyState", () => {
    it("keeps its drawing out of the accessibility tree", () => {
        const { container } = render(
            <EmptyState title="Sin planos" text="Genera el primero." art="section" />,
        );

        expect(container.querySelector("svg")?.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(screen.getByText("Sin planos")).toBeInTheDocument();
    });

    it("takes the cursor to the first field of the form in its panel", async () => {
        render(
            <section className="panel">
                <EmptyState
                    text="Sin cuartos."
                    action={<FocusFormButton>Agregar cuarto</FocusFormButton>}
                />
                <form>
                    <input aria-label="Nombre del cuarto" />
                </form>
            </section>,
        );

        await userEvent.click(screen.getByRole("button", { name: "Agregar cuarto" }));

        expect(screen.getByLabelText("Nombre del cuarto")).toHaveFocus();
    });
});
