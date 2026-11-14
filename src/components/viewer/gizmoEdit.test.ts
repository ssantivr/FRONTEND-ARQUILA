import { describe, expect, it } from "vitest";

import type { GizmoChange } from "../../three/BuildingSceneManager";
import type { StructureRoom } from "../../types/api";
import { elementKey } from "../../utils/openings";
import { gizmoEdit } from "./gizmoEdit";

function room(id: number, x: number, width: number, planId = 1): StructureRoom {
    return {
        kind: "room",
        id,
        plan_id: planId,
        plan_title: "Nivel 1",
        name: `Cuarto ${id}`,
        level: "1",
        x_m: x,
        y_m: 3,
        base_m: 0,
        width_m: width,
        depth_m: 5,
        height_m: 2.8,
        surface: null,
    };
}

function change(overrides: Partial<GizmoChange>): GizmoChange {
    return {
        key: elementKey(room(1, 3, 6)),
        mode: "translate",
        dxM: 0,
        dyM: 0,
        scaleX: 1,
        scaleY: 1,
        ...overrides,
    };
}

describe("gizmoEdit", () => {
    it("puts a moved room on the grid", () => {
        const edit = gizmoEdit(change({ dxM: 1.1, dyM: -0.6 }), [room(1, 3, 6)], 0.25);

        expect(edit?.next).toMatchObject({ x_m: 4, y_m: 2.5, width_m: 6, depth_m: 5 });
        expect(edit?.label).toBe("mover Cuarto 1");
    });

    it("pulls a moved room onto the wall of a room of the same plan within reach", () => {
        // On the grid the right wall lands at 9.75; the neighbour's wall is at 9.9 (0.15 away).
        const rooms = [room(1, 3, 6), room(2, 11.9, 4)];

        expect(gizmoEdit(change({ dxM: 3.85 }), rooms, 0.25)?.next.x_m).toBe(6.9);
    });

    it("ignores the walls of rooms on another plan", () => {
        const rooms = [room(1, 3, 6), room(2, 11.9, 4, 2)];

        expect(gizmoEdit(change({ dxM: 3.85 }), rooms, 0.25)?.next.x_m).toBe(6.75);
    });

    it("resizes on the grid and never below one step", () => {
        const grown = gizmoEdit(
            change({ mode: "scale", scaleX: 1.5, scaleY: 0.01 }),
            [room(1, 3, 6)],
            0.25,
        );

        expect(grown?.next).toMatchObject({ x_m: 3, width_m: 9, depth_m: 0.25 });
        expect(grown?.label).toBe("cambiar el tamaño de Cuarto 1");
    });

    it("gives nothing for an element that is not a room of the model", () => {
        expect(gizmoEdit(change({ key: "component-9" }), [room(1, 3, 6)], 0.25)).toBeNull();
    });
});
