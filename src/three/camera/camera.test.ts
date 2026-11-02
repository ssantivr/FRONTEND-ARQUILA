import { OrthographicCamera, PerspectiveCamera, Spherical, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { cameraLimits, fitDistance, matchOrthographic } from "./frameToFit";
import { easeInOut, interpolate, shortestTurn, type Transition } from "./transitions";

describe("frameToFit", () => {
    it("stands back so that the sphere fits in the narrower side of the view", () => {
        const wide = fitDistance(10, 45, 2, 1);
        const narrow = fitDistance(10, 45, 0.5, 1);

        expect(wide).toBeCloseTo(10 / Math.sin((22.5 * Math.PI) / 180));
        expect(narrow).toBeCloseTo(10 / Math.sin((11.25 * Math.PI) / 180));
        expect(narrow).toBeGreaterThan(wide);
    });

    it("stands further back when panels leave less room", () => {
        expect(fitDistance(10, 45, 2, 0.5)).toBeCloseTo(fitDistance(10, 45, 2, 1) * 2);
    });

    it("sizes the clipping planes and the orbit to the model", () => {
        expect(cameraLimits(10, 100)).toEqual({
            near: 0.5,
            far: 1200,
            minDistance: 0.8,
            maxDistance: 400,
        });
    });

    it("shows at the target with the orthographic camera what the perspective one shows", () => {
        const camera = new PerspectiveCamera(45, 2, 0.1, 1000);
        const orthographic = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

        camera.position.set(3, 4, 5);
        matchOrthographic(orthographic, camera, 20);

        const half = 20 * Math.tan((22.5 * Math.PI) / 180);

        expect(orthographic.top).toBeCloseTo(half);
        expect(orthographic.right).toBeCloseTo(half * 2);
        expect(orthographic.position.equals(new Vector3(3, 4, 5))).toBe(true);
    });
});

describe("transitions", () => {
    it("takes the shortest way round", () => {
        expect(shortestTurn(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
        expect(shortestTurn(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
        expect(shortestTurn(0.5)).toBeCloseTo(0.5);
    });

    it("eases from rest to rest", () => {
        expect(easeInOut(0)).toBe(0);
        expect(easeInOut(0.5)).toBeCloseTo(0.5);
        expect(easeInOut(1)).toBe(1);
        expect(easeInOut(0.1)).toBeLessThan(0.1);
        expect(easeInOut(0.9)).toBeGreaterThan(0.9);
    });

    it("interpolates the position around the target", () => {
        const transition: Transition = {
            startedAt: 0,
            fromTarget: new Vector3(),
            toTarget: new Vector3(),
            from: new Spherical(10, 1, 0),
            to: new Spherical(20, 2, 1),
        };
        const middle = interpolate(transition, 0.5, new Spherical());

        expect([middle.radius, middle.phi, middle.theta]).toEqual([15, 1.5, 0.5]);
    });
});
