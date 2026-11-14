import { describe, expect, it } from "vitest";

import { halton } from "./still";

describe("halton", () => {
    it("spreads the samples of a still evenly inside the pixel", () => {
        expect([1, 2, 3, 4].map((index) => halton(index, 2))).toEqual([0.5, 0.25, 0.75, 0.125]);
        expect(halton(1, 3)).toBeCloseTo(1 / 3);
        expect(halton(0, 2)).toBe(0);
        expect(() => halton(3, 1)).toThrow(RangeError);
        expect(() => halton(3, 2.5)).toThrow(RangeError);
        expect(() => halton(Infinity, 2)).toThrow(RangeError);
        expect(() => halton(-1, 2)).toThrow(RangeError);
    });
});
