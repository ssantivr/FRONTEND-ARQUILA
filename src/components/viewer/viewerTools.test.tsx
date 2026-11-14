import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { railTools } from "./railTools";
import { ScenePanel } from "./ScenePanel";
import { ViewGizmo, type OrbitListener } from "./ViewGizmo";

function rail(overrides: Partial<Parameters<typeof railTools>[0]> = {}) {
    const noop = () => undefined;

    return railTools({
        moving: false,
        scaling: false,
        measuring: false,
        measureUnavailable: undefined,
        roomSelected: false,
        somethingSelected: false,
        isolationPressed: false,
        roomIsolated: false,
        cutActive: false,
        inside: false,
        onMove: noop,
        onScale: noop,
        onMeasure: noop,
        onFocus: noop,
        onIsolate: noop,
        onCut: noop,
        onInside: noop,
        onCapture: noop,
        onHelp: noop,
        ...overrides,
    });
}

describe("rail tools", () => {
    it("explain why the size gizmo needs a room", () => {
        const scale = rail().find((tool) => tool.id === "scale");

        expect(scale?.unavailable).toMatch(/Selecciona un cuarto/);
        expect(rail({ roomSelected: true }).find((tool) => tool.id === "scale")?.unavailable).toBe(
            undefined,
        );
    });

    it("press the measuring tool only while it can measure", () => {
        const on = rail({ measuring: true }).find((tool) => tool.id === "measure");
        const blocked = rail({ measuring: true, measureUnavailable: "Quita el despiece" }).find(
            (tool) => tool.id === "measure",
        );

        expect(on?.pressed).toBe(true);
        expect(blocked?.pressed).toBe(false);
        expect(blocked?.unavailable).toBe("Quita el despiece");
    });
});

describe("scene panel", () => {
    function renderPanel() {
        const onRenderMode = vi.fn();
        const onSectionAxis = vi.fn();

        render(
            <ScenePanel
                layers={{ rooms: true, roof: true, environment: true, grid: true }}
                onLayers={vi.fn()}
                cut={60}
                onCut={vi.fn()}
                explode={0}
                onExplode={vi.fn()}
                sun={0}
                onSun={vi.fn()}
                roof="gable"
                onRoof={vi.fn()}
                renderMode="solid"
                onRenderMode={onRenderMode}
                sectionAxis="x"
                onSectionAxis={onSectionAxis}
            />,
        );

        return { onRenderMode, onSectionAxis };
    }

    it("switches between the render modes", async () => {
        const { onRenderMode } = renderPanel();

        await userEvent.selectOptions(screen.getByLabelText("Modo de vista"), "wireframe");

        expect(onRenderMode).toHaveBeenCalledWith("wireframe");
    });

    it("cuts across the chosen axis and says what the percentage is a share of", async () => {
        const { onSectionAxis } = renderPanel();

        expect(screen.getByRole("slider", { name: /Corte/ })).toHaveAttribute(
            "aria-valuetext",
            "Corte al 60 % del ancho",
        );

        await userEvent.selectOptions(screen.getByLabelText("Eje del corte"), "y");

        expect(onSectionAxis).toHaveBeenCalledWith("y");
    });
});

describe("orientation gizmo", () => {
    function Gizmo({ onView }: { onView: (view: string) => void }) {
        const listener = useRef<OrbitListener | null>(null);

        return <ViewGizmo listener={listener} onView={onView} />;
    }

    it("looks along an axis when it is clicked, and goes back to isometric from the centre", async () => {
        const onView = vi.fn();

        render(<Gizmo onView={onView} />);

        await userEvent.click(screen.getByRole("button", { name: /Vista de planta/ }));
        await userEvent.click(screen.getByRole("button", { name: "Vista isométrica" }));

        expect(onView).toHaveBeenNthCalledWith(1, "top");
        expect(onView).toHaveBeenNthCalledWith(2, "isometric");
    });

    it("can be used from the keyboard", async () => {
        const onView = vi.fn();

        render(<Gizmo onView={onView} />);

        screen.getByRole("button", { name: /Vista de perfil/ }).focus();
        await userEvent.keyboard("{Enter}");

        expect(onView).toHaveBeenCalledWith("side");
    });
});
