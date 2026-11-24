import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { StructureRoom } from "../types/api";
import type { PlanLevel } from "../utils/building";
import { renderWithModals } from "../test/render";
import { FloorPlan } from "./FloorPlan";

const LEVEL: PlanLevel = {
    planId: 1,
    title: "Planta baja",
    base: 0,
    height: 2.8,
    area: 80,
    rooms: [
        {
            kind: "room",
            id: 1,
            plan_id: 1,
            plan_title: "Planta baja",
            name: "Sala",
            level: null,
            x_m: 0,
            y_m: 0,
            base_m: 0,
            width_m: 10,
            depth_m: 8,
            height_m: 2.8,
            surface: null,
        } satisfies StructureRoom,
    ],
    components: [],
};

describe("FloorPlan", () => {
    it("offers accessible zoom, fit and dimension controls", async () => {
        const user = userEvent.setup();

        renderWithModals(
            <FloorPlan level={LEVEL} projectName="Casa de prueba" openings={new Map()} />,
        );

        const drawing = screen.getByRole("img", { name: /planta de planta baja/i });
        const originalViewBox = drawing.getAttribute("viewBox");

        await user.click(screen.getByRole("button", { name: "Acercar planta" }));
        expect(drawing.getAttribute("viewBox")).not.toBe(originalViewBox);

        await user.click(screen.getByRole("button", { name: "Ajustar" }));
        expect(drawing.getAttribute("viewBox")).toBe(originalViewBox);

        await user.click(screen.getByRole("checkbox", { name: "Cotas y ejes" }));
        expect(drawing.querySelector('g[visibility="hidden"]')).not.toBeNull();
    });
});
