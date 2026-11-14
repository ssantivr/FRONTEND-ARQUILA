import { describe, expect, it } from "vitest";

import { snapSize, snapTo, snapToNeighbours } from "./snap";

describe("snap", () => {
    it("rounds to the nearest step without floating-point dust", () => {
        expect(snapTo(1.12, 0.25)).toBe(1);
        expect(snapTo(1.13, 0.25)).toBe(1.25);
        expect(snapTo(0.1 + 0.2, 0.1)).toBe(0.3);
        expect(snapTo(-0.74, 0.5)).toBe(-0.5);
    });

    it("never makes a size smaller than one step", () => {
        expect(snapSize(0.01, 0.25)).toBe(0.25);
        expect(snapSize(3.4, 0.5)).toBe(3.5);
    });
});

describe("snapToNeighbours", () => {
    const neighbour = { x_m: 0, y_m: 0, width_m: 4, depth_m: 4 };

    it("pulls a wall onto the wall of the room beside it", () => {
        // Its left wall is at 2.1, 0.1 m from the neighbour's right wall at 2.
        expect(
            snapToNeighbours({ x_m: 4.1, y_m: 0.15, width_m: 4, depth_m: 4 }, [neighbour]),
        ).toEqual({ x_m: 4, y_m: 0 });
    });

    it("leaves an axis alone when no wall is close enough", () => {
        expect(snapToNeighbours({ x_m: 5, y_m: 7, width_m: 4, depth_m: 4 }, [neighbour])).toEqual({
            x_m: 5,
            y_m: 7,
        });
    });

    it("keeps the room where it is with nothing around it", () => {
        expect(snapToNeighbours({ x_m: 1.3, y_m: 2.2, width_m: 3, depth_m: 3 }, [])).toEqual({
            x_m: 1.3,
            y_m: 2.2,
        });
    });
});
