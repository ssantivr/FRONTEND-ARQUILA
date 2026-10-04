import { Box3, BoxGeometry } from "three";
import { describe, expect, it } from "vitest";

import type { StructureRoom } from "../types/api";
import type { Opening } from "../utils/openings";
import { buildRoomShell, applyMetricUVs } from "./roomGeometry";

const ROOM: StructureRoom = {
    kind: "room",
    id: 1,
    plan_id: 1,
    plan_title: "Ground",
    name: "Hall",
    level: "0",
    x_m: 2,
    y_m: 2,
    base_m: 0,
    width_m: 5,
    depth_m: 4,
    height_m: 3,
    surface: null,
};

const WINDOW: Opening = {
    kind: "window",
    side: "right",
    center: 2,
    width: 1.1,
    height: 1.1,
    sill: 0.9,
};
const DOOR: Opening = {
    kind: "door",
    side: "front",
    center: 2.5,
    width: 0.95,
    height: 2.1,
    sill: 0,
};

function segments(shell: ReturnType<typeof buildRoomShell>): number {
    return shell.lines.getAttribute("position").count / 2;
}

describe("buildRoomShell", () => {
    it("builds a closed shell with only the corner lines when there are no openings", () => {
        const shell = buildRoomShell(ROOM, []);

        expect(shell.glass).toBeNull();
        expect(shell.frames).toBeNull();
        expect(shell.door).toBeNull();
        expect(segments(shell)).toBe(12);
    });

    it("keeps the walls inside the size of the room", () => {
        const shell = buildRoomShell(ROOM, [WINDOW, DOOR]);
        const size = new Box3().setFromBufferAttribute(
            shell.walls.getAttribute("position") as never,
        );

        expect(size.max.x - size.min.x).toBeCloseTo(5);
        expect(size.max.y - size.min.y).toBeCloseTo(3);
        expect(size.max.z - size.min.z).toBeCloseTo(4);
    });

    it("adds glass for a window, a leaf for a door and four lines per opening", () => {
        const shell = buildRoomShell(ROOM, [WINDOW, DOOR]);

        expect(shell.glass).not.toBeNull();
        expect(shell.door).not.toBeNull();
        expect(shell.frames).not.toBeNull();
        expect(segments(shell)).toBe(12 + 4 + 4);
    });

    it("puts a window of the right side on the +X face", () => {
        const shell = buildRoomShell(ROOM, [WINDOW]);
        const glass = new Box3().setFromBufferAttribute(
            shell.glass!.getAttribute("position") as never,
        );

        expect(glass.max.x).toBeLessThanOrEqual(2.5);
        expect(glass.min.x).toBeGreaterThan(2.5 - 0.2);
    });
});

describe("applyMetricUVs", () => {
    it("measures the texture in metres on every face", () => {
        const uv = applyMetricUVs(new BoxGeometry(4, 2, 6)).getAttribute("uv");
        const spans = [0, 1].map((axis) => {
            const values = Array.from({ length: uv.count }, (_, index) =>
                axis === 0 ? uv.getX(index) : uv.getY(index),
            );

            return Math.max(...values) - Math.min(...values);
        });

        expect(spans).toEqual([6, 6]);
    });
});
