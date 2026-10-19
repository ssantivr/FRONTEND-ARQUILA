import { describe, expect, it } from "vitest";

import { snapSize, snapTo } from "./snap";

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
