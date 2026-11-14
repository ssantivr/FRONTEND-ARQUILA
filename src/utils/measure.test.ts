import { describe, expect, it } from "vitest";

import {
    describeMeasurement,
    distance,
    formatDistance,
    measurementOf,
    snapToVertex,
} from "./measure";

describe("measure", () => {
    it("measures the straight distance in metres", () => {
        expect(distance([0, 0, 0], [3, 4, 0])).toBe(5);
        expect(distance([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    it("jumps to the nearest vertex only within the tolerance", () => {
        const corners = [
            [0, 0, 0],
            [4, 0, 0],
        ] as const;

        expect(snapToVertex([0.1, 0.05, 0], corners)).toEqual({ point: [0, 0, 0], snapped: true });
        expect(snapToVertex([2, 0, 0], corners)).toEqual({ point: [2, 0, 0], snapped: false });
    });

    it("prefers the closest of two vertices in reach", () => {
        expect(
            snapToVertex(
                [0.1, 0, 0],
                [
                    [0, 0, 0],
                    [0.12, 0, 0],
                ],
            ).point,
        ).toEqual([0.12, 0, 0]);
    });

    it("writes the figure with its unit and says how it was obtained", () => {
        const measurement = measurementOf(
            { point: [0, 0, 0], snapped: true },
            { point: [4.321, 0, 0], snapped: false },
        );

        expect(formatDistance(measurement.distanceM)).toBe("4,32 m");
        expect(formatDistance(3)).toBe("3,00 m");
        expect(describeMeasurement(measurement)).toContain("un extremo se ajustó a un vértice");
    });
});
