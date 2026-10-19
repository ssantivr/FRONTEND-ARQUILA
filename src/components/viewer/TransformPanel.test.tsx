import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { StructureRoom } from "../../types/api";
import { TransformPanel } from "./TransformPanel";

const room: StructureRoom = {
    kind: "room",
    id: 1,
    plan_id: 1,
    plan_title: "Planta baja",
    name: "Sala",
    level: "1",
    x_m: 0,
    y_m: 0,
    base_m: 0,
    width_m: 6,
    depth_m: 5,
    height_m: 2.8,
    surface: null,
};

function renderPanel(onCommit = vi.fn()) {
    render(
        <TransformPanel
            room={room}
            snap={0.25}
            onSnap={() => undefined}
            onCommit={onCommit}
            busy={false}
        />,
    );

    return onCommit;
}

describe("TransformPanel", () => {
    it("puts a typed value on the grid before sending it", async () => {
        const onCommit = renderPanel();

        await userEvent.clear(screen.getByLabelText(/^Ancho/));
        await userEvent.type(screen.getByLabelText(/^Ancho/), "6,4{Enter}");

        expect(onCommit).toHaveBeenCalledWith(
            { x_m: 0, y_m: 0, width_m: 6.5, depth_m: 5, height_m: 2.8 },
            "redimensionar Sala",
        );
    });

    it("sends nothing when the value lands where it already was", async () => {
        const onCommit = renderPanel();

        await userEvent.clear(screen.getByLabelText(/^X/));
        await userEvent.type(screen.getByLabelText(/^X/), "0,1{Enter}");

        expect(onCommit).not.toHaveBeenCalled();
    });

    it("moves one grid step with the arrows", async () => {
        const onCommit = renderPanel();

        await userEvent.click(screen.getByRole("button", { name: "Mover hacia el fondo" }));

        expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ y_m: 0.25 }), "mover Sala");
    });

    it("offers rotating, switched off, with the reason", () => {
        renderPanel();

        const rotate = screen.getByRole("button", { name: "Rotar" });

        expect(rotate).toHaveAttribute("aria-disabled", "true");
        expect(rotate).toHaveAccessibleDescription(/no un ángulo/);
    });
});
