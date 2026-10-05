import { Box3, PerspectiveCamera, Vector3 } from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listeners = new Map<string, () => void>();

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
    OrbitControls: class {
        target = new Vector3();
        addEventListener(name: string, listener: () => void) {
            listeners.set(name, listener);
        }
        removeEventListener() {}
        update() {}
        dispose() {}
    },
}));

const { createInteriorCamera } = await import("./interiorCamera");

const ROOM = new Box3(new Vector3(-4, 0.3, -5), new Vector3(4, 5, 5));
const SOFA = new Box3(new Vector3(-1, 0, -1), new Vector3(1, 1, 1));

function place(x: number, y: number, z: number): Vector3 {
    const camera = new PerspectiveCamera();

    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    createInteriorCamera(camera, {} as HTMLCanvasElement, ROOM, [SOFA], () => undefined);
    camera.position.set(x, y, z);
    listeners.get("change")?.();

    return camera.position;
}

beforeEach(() => {
    listeners.clear();
});

describe("createInteriorCamera", () => {
    it("keeps the camera inside the room", () => {
        expect(place(9, 9, -9).toArray()).toEqual([4, 5, -5]);
    });

    it("pushes the camera out of a solid through its nearest face", () => {
        expect(place(0.2, 1.1, 0).toArray()).toEqual([0.2, 1.3, 0]);
        expect(place(1.2, 0.5, 0).toArray()).toEqual([1.3, 0.5, 0]);
    });

    it("leaves a camera outside the solids where it is", () => {
        expect(place(3, 2, 3).toArray()).toEqual([3, 2, 3]);
    });
});
