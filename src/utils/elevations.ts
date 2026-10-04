import type { Structure } from "../types/api";
import { planLevels } from "./building";
import {
    elementKey,
    placeOpenings,
    rectOf,
    roofShape,
    unionOf,
    type Rect,
    type Side,
} from "./openings";

export interface DrawingBox {
    label: string;
    from: number;
    to: number;
    base: number;
    height: number;
}

export interface DrawingOpening {
    kind: "window" | "door";
    from: number;
    to: number;
    base: number;
    height: number;
}

export interface DrawingRoof {
    from: number;
    to: number;
    base: number;
    rise: number;
    gable: boolean;
}

export interface Drawing {
    width: number;
    height: number;
    boxes: DrawingBox[];
    openings: DrawingOpening[];
    roof: DrawingRoof;
    marks: number[];
}

function across(side: Side): boolean {
    return side === "front" || side === "back";
}

function span(rect: Rect, overall: Rect, side: Side): [number, number] {
    switch (side) {
        case "front":
            return [rect.minX - overall.minX, rect.maxX - overall.minX];
        case "back":
            return [overall.maxX - rect.maxX, overall.maxX - rect.minX];
        case "right":
            return [rect.minY - overall.minY, rect.maxY - overall.minY];
        case "left":
            return [overall.maxY - rect.maxY, overall.maxY - rect.minY];
    }
}

function levelMarks(heights: number[]): number[] {
    return [...new Set(heights.map((height) => Number(height.toFixed(2))))].sort(
        (first, second) => first - second,
    );
}

export function facade(structure: Structure, side: Side): Drawing | null {
    const shape = roofShape(structure.rooms, structure.roof);

    if (shape === null) {
        return null;
    }

    const overall = unionOf(structure.rooms.map(rectOf));
    const levels = planLevels(structure).filter((level) => level.rooms.length > 0);
    const openings = placeOpenings(structure.rooms);
    const drawn: DrawingOpening[] = [];

    for (const room of structure.rooms) {
        const rect = rectOf(room);

        for (const opening of openings.get(elementKey(room)) ?? []) {
            if (opening.side !== side) {
                continue;
            }

            const middle = across(side) ? rect.minX + opening.center : rect.minY + opening.center;
            const point: Rect = across(side)
                ? { ...rect, minX: middle - opening.width / 2, maxX: middle + opening.width / 2 }
                : { ...rect, minY: middle - opening.width / 2, maxY: middle + opening.width / 2 };
            const [from, to] = span(point, overall, side);

            drawn.push({
                kind: opening.kind,
                from,
                to,
                base: room.base_m + opening.sill,
                height: opening.height,
            });
        }
    }

    const [roofFrom, roofTo] = span(shape.area, overall, side);

    return {
        width: across(side) ? overall.maxX - overall.minX : overall.maxY - overall.minY,
        height: shape.eaves + shape.rise,
        boxes: levels.map((level) => {
            const [from, to] = span(unionOf(level.rooms.map(rectOf)), overall, side);

            return { label: level.title, from, to, base: level.base, height: level.height };
        }),
        openings: drawn,
        roof: {
            from: roofFrom - shape.overhang,
            to: roofTo + shape.overhang,
            base: shape.eaves,
            rise: shape.rise,
            gable: !shape.flat && across(side) !== shape.alongX,
        },
        marks: levelMarks([
            ...levels.map((level) => level.base),
            shape.eaves,
            shape.eaves + shape.rise,
        ]),
    };
}

export function section(structure: Structure): Drawing | null {
    const shape = roofShape(structure.rooms, structure.roof);

    if (shape === null) {
        return null;
    }

    const overall = unionOf(structure.rooms.map(rectOf));
    const cut = (overall.minX + overall.maxX) / 2;
    const crossed = structure.rooms.filter((room) => {
        const rect = rectOf(room);

        return rect.minX <= cut && cut < rect.maxX;
    });
    const [roofFrom, roofTo] = span(shape.area, overall, "right");

    return {
        width: overall.maxY - overall.minY,
        height: shape.eaves + shape.rise,
        boxes: crossed.map((room) => {
            const [from, to] = span(rectOf(room), overall, "right");

            return { label: room.name, from, to, base: room.base_m, height: room.height_m };
        }),
        openings: [],
        roof: {
            from: roofFrom - shape.overhang,
            to: roofTo + shape.overhang,
            base: shape.eaves,
            rise: shape.rise,
            gable: !shape.flat && shape.alongX,
        },
        marks: levelMarks([
            ...crossed.map((room) => room.base_m),
            shape.eaves,
            shape.eaves + shape.rise,
        ]),
    };
}
