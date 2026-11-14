import { Box3, Plane, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { CUT_DISABLED_M } from "../engine/ExperienceEngine";
import { placeSection, sectionConstant } from "./section";

const range = new Box3(new Vector3(-5, 0, -2), new Vector3(5, 6, 8));

describe("section planes", () => {
    it("sit a fraction of the way through the model on each axis", () => {
        expect(sectionConstant("y", 0.5, range)).toBe(3);
        expect(sectionConstant("x", 0.25, range)).toBe(-2.5);
        expect(sectionConstant("z", 0, range)).toBe(-2);
    });

    it("cut nothing when open or with nothing to cut", () => {
        expect(sectionConstant("y", 1, range)).toBe(CUT_DISABLED_M);
        expect(sectionConstant("x", 0.5, new Box3())).toBe(CUT_DISABLED_M);
    });

    it("keep what is below the plane and remove what is beyond it", () => {
        const plane = new Plane();

        placeSection(plane, "x", 0.5, range);

        expect(plane.distanceToPoint(new Vector3(-1, 3, 0))).toBeGreaterThan(0);
        expect(plane.distanceToPoint(new Vector3(1, 3, 0))).toBeLessThan(0);
    });
});
