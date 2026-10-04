import type { RoofKind, StructureElement, StructureRoom } from "../types/api";

export const WINDOW_SIZE_M = 1.1;
export const WINDOW_SILL_M = 0.9;
export const WINDOW_SPACING_M = 3;
export const DOOR_WIDTH_M = 0.95;
export const DOOR_HEIGHT_M = 2.1;
export const ROOF_OVERHANG_M = 0.4;
export const SLAB_OVERHANG_M = 0.12;
export const PARAPET_HEIGHT_M = 0.5;

export type Side = "front" | "right" | "back" | "left";

export const SIDES: Side[] = ["front", "right", "back", "left"];

export interface Rect {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface Opening {
    kind: "window" | "door";
    side: Side;
    center: number;
    width: number;
    height: number;
    sill: number;
}

export interface RoofShape {
    area: Rect;
    eaves: number;
    alongX: boolean;
    span: number;
    length: number;
    rise: number;
    flat: boolean;
    overhang: number;
}

export function elementKey(element: StructureElement): string {
    return `${element.kind}-${element.id}`;
}

export function rectOf(element: StructureElement): Rect {
    return {
        minX: element.x_m - element.width_m / 2,
        maxX: element.x_m + element.width_m / 2,
        minY: element.y_m - element.depth_m / 2,
        maxY: element.y_m + element.depth_m / 2,
    };
}

export function unionOf(rects: Rect[]): Rect {
    return {
        minX: Math.min(...rects.map((rect) => rect.minX)),
        maxX: Math.max(...rects.map((rect) => rect.maxX)),
        minY: Math.min(...rects.map((rect) => rect.minY)),
        maxY: Math.max(...rects.map((rect) => rect.maxY)),
    };
}

export function near(first: number, second: number): boolean {
    return Math.abs(first - second) < 0.01;
}

export function exteriorSides(room: StructureRoom, level: Rect): Side[] {
    const rect = rectOf(room);
    const exterior: Record<Side, boolean> = {
        front: near(rect.minY, level.minY),
        right: near(rect.maxX, level.maxX),
        back: near(rect.maxY, level.maxY),
        left: near(rect.minX, level.minX),
    };

    return SIDES.filter((side) => exterior[side]);
}

export function sideLength(room: StructureRoom, side: Side): number {
    return side === "front" || side === "back" ? room.width_m : room.depth_m;
}

export function levelRects(rooms: StructureRoom[]): Map<number, Rect> {
    const levels = new Map<number, Rect>();

    for (const room of rooms) {
        const level = levels.get(room.plan_id);
        levels.set(room.plan_id, level ? unionOf([level, rectOf(room)]) : rectOf(room));
    }

    return levels;
}

export function placeOpenings(rooms: StructureRoom[]): Map<string, Opening[]> {
    const levels = levelRects(rooms);
    const ground = Math.min(...rooms.map((room) => room.base_m));
    const placed = new Map<string, Opening[]>();
    let doorPlaced = false;

    for (const room of rooms) {
        const level = levels.get(room.plan_id);
        const openings: Opening[] = [];
        const fitsWindow = room.height_m >= WINDOW_SILL_M + WINDOW_SIZE_M + 0.3;
        const fitsDoor = room.height_m >= DOOR_HEIGHT_M + 0.1;

        for (const side of level === undefined ? [] : exteriorSides(room, level)) {
            const length = sideLength(room, side);

            if (length < WINDOW_SIZE_M + 0.6) {
                continue;
            }

            const slots = Math.max(1, Math.floor(length / WINDOW_SPACING_M));

            for (let slot = 0; slot < slots; slot += 1) {
                const center = ((slot + 0.5) * length) / slots;
                const isDoor =
                    !doorPlaced &&
                    fitsDoor &&
                    side === "front" &&
                    slot === 0 &&
                    room.base_m === ground;

                if (isDoor) {
                    doorPlaced = true;
                    openings.push({
                        kind: "door",
                        side,
                        center,
                        width: DOOR_WIDTH_M,
                        height: DOOR_HEIGHT_M,
                        sill: 0,
                    });
                } else if (fitsWindow) {
                    openings.push({
                        kind: "window",
                        side,
                        center,
                        width: WINDOW_SIZE_M,
                        height: WINDOW_SIZE_M,
                        sill: WINDOW_SILL_M,
                    });
                }
            }
        }

        placed.set(elementKey(room), openings);
    }

    return placed;
}

/** A gable roof overhangs and rises to a ridge; a flat one is a slab with a parapet. */
export function roofShape(rooms: StructureRoom[], kind: RoofKind = "gable"): RoofShape | null {
    if (rooms.length === 0) {
        return null;
    }

    const topBase = Math.max(...rooms.map((room) => room.base_m));
    const top = rooms.filter((room) => room.base_m === topBase);
    const area = unionOf(top.map(rectOf));
    const width = area.maxX - area.minX;
    const depth = area.maxY - area.minY;
    const alongX = width >= depth;
    const flat = kind === "flat";
    const overhang = flat ? SLAB_OVERHANG_M : ROOF_OVERHANG_M;
    const span = (alongX ? depth : width) + 2 * overhang;

    return {
        area,
        eaves: Math.max(...top.map((room) => room.base_m + room.height_m)),
        alongX,
        span,
        length: (alongX ? width : depth) + 2 * overhang,
        rise: flat ? PARAPET_HEIGHT_M : Math.max(0.8, span * 0.28),
        flat,
        overhang,
    };
}
