import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { appState } from "../state/appState";
import type { Structure, StructureRoom } from "../types/api";
import { StructureViewer } from "./StructureViewer";

/** Stands in for the WebGL engine, which jsdom cannot run; the real one is checked in a browser. */
const engine = vi.hoisted(() => {
    const calls = new Map<string, ReturnType<typeof vi.fn>>();

    return {
        calls,
        viewer: new Proxy(
            {},
            {
                get: (_target, name: string) => {
                    if (!calls.has(name)) {
                        calls.set(
                            name,
                            vi.fn(() =>
                                name === "capture" ? "data:image/png;base64,AAAA" : undefined,
                            ),
                        );
                    }

                    return calls.get(name);
                },
            },
        ),
    };
});

vi.mock("../three/BuildingSceneManager", async (original) => ({
    ...(await original<typeof import("../three/BuildingSceneManager")>()),
    createStructureViewer: () => engine.viewer,
}));

vi.mock("../services/http", async (original) => ({
    ...(await original<typeof import("../services/http")>()),
    request: vi.fn((path: string) => {
        if (path.includes("spatial-data")) {
            return Promise.resolve({
                project_id: 1,
                counts: { structure: 0, installations: 0, finishes: 0 },
                elements: [],
            });
        }

        if (path.includes("interior-walkthrough")) {
            return Promise.resolve({ project_id: 1, steps: [], renovation_logs: [] });
        }

        return Promise.resolve([]);
    }),
}));

function room(id: number, name: string): StructureRoom {
    return {
        kind: "room",
        id,
        plan_id: 1,
        plan_title: "Nivel 1",
        name,
        level: "1",
        x_m: 3,
        y_m: 3,
        base_m: 0,
        width_m: 6,
        depth_m: 5,
        height_m: 2.8,
        surface: null,
    };
}

const structure: Structure = {
    project_id: 1,
    roof: "gable",
    terrains: [],
    rooms: [room(1, "Sala"), room(2, "Cocina")],
    components: [],
};

function lastCall(name: string): unknown[] {
    const calls = engine.calls.get(name)?.mock.calls ?? [];

    return calls[calls.length - 1] ?? [];
}

beforeEach(() => {
    engine.calls.clear();
    // The selection lives in a shared store, so one test must not leave it set for the next.
    appState.select(1, null);
});

describe("StructureViewer", () => {
    it("hides an object in the model from its eye button and shows it again", async () => {
        render(<StructureViewer structure={structure} />);

        await userEvent.click(screen.getByRole("button", { name: "Ocultar Sala" }));

        expect([...(lastCall("setHidden")[0] as Set<string>)]).toEqual(["room-1"]);

        await userEvent.click(screen.getByRole("button", { name: "Mostrar Sala" }));

        expect([...(lastCall("setHidden")[0] as Set<string>)]).toEqual([]);
    });

    it("warns that the roof goes with a hidden room of the top floor", async () => {
        render(<StructureViewer structure={structure} />);

        expect(screen.queryByText(/El techo se oculta/)).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Ocultar Cocina" }));

        expect(screen.getByText(/El techo se oculta/)).toBeInTheDocument();
    });

    it("turns the sun of the scene with its slider", () => {
        render(<StructureViewer structure={structure} />);

        fireEvent.change(screen.getByRole("slider", { name: /Sol/ }), { target: { value: "90" } });

        expect(lastCall("setSun")).toEqual([90]);
    });

    it("downloads the current view as a PNG named after the project", async () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            expect(this.href).toBe("data:image/png;base64,AAAA");
            expect(this.download).toBe("arquila-proyecto-1.png");
        });

        render(<StructureViewer structure={structure} />);
        await userEvent.click(screen.getByRole("button", { name: "Guardar imagen" }));

        expect(engine.calls.get("capture")).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);

        click.mockRestore();
    });

    it("switches to the orthographic camera and says so in the status", async () => {
        render(<StructureViewer structure={structure} />);

        await userEvent.click(screen.getByRole("button", { name: "Ortográfica" }));

        expect(lastCall("setProjection")).toEqual(["orthographic"]);
        expect(screen.getByRole("status", { name: "Estado del modelo" })).toHaveTextContent(
            "Ortográfica",
        );
    });

    it("finds objects in the tree by name", async () => {
        render(<StructureViewer structure={structure} />);

        await userEvent.type(screen.getByLabelText("Buscar objeto por nombre"), "coc");

        expect(screen.queryByRole("button", { name: "Sala" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cocina" })).toBeInTheDocument();
    });

    describe("tool rail and shortcuts", () => {
        it("explains why a tool does not apply instead of hiding it", async () => {
            render(<StructureViewer structure={structure} />);

            const isolate = screen.getByRole("button", { name: "Aislar cuarto" });
            const inside = screen.getByRole("button", { name: "Vista interior" });

            expect(isolate).toHaveAttribute("aria-disabled", "true");
            expect(isolate).toHaveAccessibleDescription("Selecciona un cuarto para aislarlo");
            expect(inside).toHaveAccessibleDescription(
                "Aísla un cuarto para entrar a la vista interior",
            );

            await userEvent.click(isolate);

            expect(engine.calls.get("isolate")).not.toHaveBeenCalledWith("room-1");
            // Pressing it says why out loud, which is what a touch screen has instead of hover.
            expect(
                screen
                    .getAllByRole("status")
                    .some((region) =>
                        region.textContent?.includes("Selecciona un cuarto para aislarlo"),
                    ),
            ).toBe(true);
            // A tool that applies is not described again with its own name.
            expect(screen.getByRole("button", { name: "Corte" })).not.toHaveAccessibleDescription();
        });

        it("keeps answering after a layer is ticked, and stays quiet when the focus is elsewhere", async () => {
            render(
                <>
                    <button type="button">Fuera del visor</button>
                    <StructureViewer structure={structure} />
                </>,
            );

            await userEvent.click(screen.getByRole("checkbox", { name: "Cuadrícula" }));
            await userEvent.keyboard("3");

            expect(lastCall("setView")).toEqual(["side"]);

            await userEvent.click(screen.getByRole("button", { name: "Fuera del visor" }));
            await userEvent.keyboard("4");

            expect(lastCall("setView")).toEqual(["side"]);
        });

        it("switches the isolated room when another one is selected", async () => {
            render(<StructureViewer structure={structure} />);

            await userEvent.click(screen.getByRole("button", { name: "Sala" }));
            await userEvent.keyboard("i");
            await userEvent.click(screen.getByRole("button", { name: "Aislar cuarto" }));

            expect(lastCall("isolate")).toEqual([null]);
        });

        it("confirms that the picture was saved", async () => {
            const click = vi
                .spyOn(HTMLAnchorElement.prototype, "click")
                .mockImplementation(() => undefined);

            render(<StructureViewer structure={structure} />);
            await userEvent.click(screen.getByRole("button", { name: "Guardar imagen" }));

            expect(click).toHaveBeenCalledTimes(1);
            click.mockRestore();
        });

        it("changes the view with 1 to 4", async () => {
            render(<StructureViewer structure={structure} />);

            await userEvent.keyboard("4");

            expect(lastCall("setView")).toEqual(["top"]);
            expect(screen.getByRole("button", { name: "Superior" })).toHaveAttribute(
                "aria-pressed",
                "true",
            );

            await userEvent.keyboard("2");

            expect(lastCall("setView")).toEqual(["front"]);
        });

        it("focuses with F, isolates with I and steps back with Escape", async () => {
            render(<StructureViewer structure={structure} />);

            await userEvent.click(screen.getByRole("button", { name: "Sala" }));
            await userEvent.keyboard("f");

            expect(lastCall("focus")).toEqual(["room-1"]);

            await userEvent.keyboard("i");

            expect(lastCall("isolate")).toEqual(["room-1"]);
            expect(screen.getByRole("button", { name: "Aislar cuarto" })).toHaveAttribute(
                "aria-pressed",
                "true",
            );
            expect(screen.getByText("Esc vuelve un paso atrás")).toBeInTheDocument();

            await userEvent.keyboard("{Escape}");

            expect(lastCall("isolate")).toEqual([null]);

            await userEvent.keyboard("{Escape}");

            expect(screen.getByRole("status", { name: "Estado del modelo" })).toHaveTextContent(
                "Sin selección",
            );
        });

        it("toggles the cut from the rail", async () => {
            render(<StructureViewer structure={structure} />);

            await userEvent.click(screen.getByRole("button", { name: "Corte" }));

            expect(lastCall("setCutaway")).toEqual([0.6]);

            await userEvent.click(screen.getByRole("button", { name: "Corte" }));

            expect(lastCall("setCutaway")).toEqual([1]);
        });

        it("opens the shortcut help with ? and ignores keys typed in a field", async () => {
            render(<StructureViewer structure={structure} />);

            await userEvent.type(screen.getByLabelText("Buscar objeto por nombre"), "4i?");

            expect(engine.calls.get("setView")).toBeUndefined();
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

            await userEvent.click(document.body);
            await userEvent.keyboard("?");

            expect(screen.getByRole("dialog", { name: "Atajos de teclado" })).toBeInTheDocument();

            await userEvent.keyboard("3");

            expect(engine.calls.get("setView")).toBeUndefined();
        });

        it("does not listen to the keyboard when it is only a preview", async () => {
            render(<StructureViewer structure={structure} preview />);

            await userEvent.keyboard("4");

            expect(engine.calls.get("setView")).toBeUndefined();
        });
    });
});
