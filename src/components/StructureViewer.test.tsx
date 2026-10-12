import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});

describe("StructureViewer", () => {
    it("hides an object in the model from its eye button and shows it again", async () => {
        render(<StructureViewer structure={structure} />);

        await userEvent.click(screen.getByRole("button", { name: "Ocultar Sala" }));

        expect([...(lastCall("setHidden")[0] as Set<string>)]).toEqual(["room-1"]);

        await userEvent.click(screen.getByRole("button", { name: "Mostrar Sala" }));

        expect([...(lastCall("setHidden")[0] as Set<string>)]).toEqual([]);
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

    it("switches to the parallel projection and says so in the status", async () => {
        render(<StructureViewer structure={structure} />);

        await userEvent.click(screen.getByRole("button", { name: "Paralela" }));

        expect(lastCall("setProjection")).toEqual(["parallel"]);
        expect(screen.getByRole("status", { name: "Estado del modelo" })).toHaveTextContent(
            "Proyección paralela",
        );
    });

    it("finds objects in the tree by name", async () => {
        render(<StructureViewer structure={structure} />);

        await userEvent.type(screen.getByLabelText("Buscar objeto por nombre"), "coc");

        expect(screen.queryByRole("button", { name: "Sala" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cocina" })).toBeInTheDocument();
    });
});
