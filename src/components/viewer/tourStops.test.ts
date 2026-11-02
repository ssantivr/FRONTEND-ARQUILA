import { describe, expect, it } from "vitest";

import type { StructureRoom, WalkthroughStep } from "../../types/api";
import { ISOLATION_CUT_PERCENT, TOUR_STEP_MS, tourStops } from "./tourStops";

const sala = { kind: "room", id: 1, name: "Sala" } as StructureRoom;
const cocina = { kind: "room", id: 2, name: "Cocina" } as StructureRoom;

function step(values: Partial<WalkthroughStep>): WalkthroughStep {
    return {
        room_id: 1,
        title: "Entrada",
        description: "Vista general",
        duration_ms: 3000,
        view_config: {},
        ...values,
    } as WalkthroughStep;
}

describe("tourStops", () => {
    it("visits every room when the project has no planned stops", () => {
        expect(tourStops([sala, cocina])).toEqual([
            {
                key: "room-1",
                title: "Sala",
                description: null,
                durationMs: TOUR_STEP_MS,
                cut: ISOLATION_CUT_PERCENT,
                camera: null,
            },
            {
                key: "room-2",
                title: "Cocina",
                description: null,
                durationMs: TOUR_STEP_MS,
                cut: ISOLATION_CUT_PERCENT,
                camera: null,
            },
        ]);
    });

    it("follows the planned stops, with their cut and their camera", () => {
        const camera = { position: [1, 2, 1.6], target: [3, 4, 1.2] };
        const [stop] = tourStops([sala], [step({ view_config: { cut_fraction: 0.5, camera } })]);

        expect(stop).toEqual({
            key: "room-1",
            title: "Entrada",
            description: "Vista general",
            durationMs: 3000,
            cut: 50,
            camera,
        });
    });

    it("ignores a stop whose room is gone and a camera that is not a pose", () => {
        const stops = tourStops(
            [sala],
            [step({ room_id: 9 }), step({ view_config: { camera: { position: "aquí" } } })],
        );

        expect(stops).toHaveLength(1);
        expect(stops[0].camera).toBeNull();
        expect(stops[0].cut).toBe(ISOLATION_CUT_PERCENT);
    });
});
