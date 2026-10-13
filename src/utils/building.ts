import type { Structure, StructureComponent, StructureRoom } from "../types/api";
import { polygonArea } from "./geometry";
import { coveredArea, sharedArea, type Rectangle } from "./polygons";

export interface PlanLevel {
    planId: number;
    title: string;
    base: number;
    height: number;
    area: number;
    rooms: StructureRoom[];
    components: StructureComponent[];
}

/** Two rooms of the same level that occupy part of the same ground. */
export interface RoomOverlap {
    level: string;
    first: string;
    second: string;
    /** The ground they share, in square metres. */
    area: number;
}

export interface BuildingIndicators {
    lotArea: number | null;
    footprint: number;
    builtArea: number;
    freeArea: number | null;
    cos: number | null;
    cus: number | null;
    levels: number;
    height: number;
    /** Rooms drawn one over another. Their shared ground is counted once in every figure. */
    overlaps: RoomOverlap[];
}

/** A room below this overlap is two rooms sharing a wall drawn a hair too far, not a mistake. */
const OVERLAP_TOLERANCE_M2 = 0.01;

function groundOf(room: StructureRoom): Rectangle {
    return { x: room.x_m, y: room.y_m, width: room.width_m, depth: room.depth_m };
}

/**
 * The pairs of rooms of each level that overlap, the largest overlap first. Every pair of a
 * level is compared: O(n²) per level, with the handful of rooms a level has.
 */
export function roomOverlaps(levels: PlanLevel[]): RoomOverlap[] {
    const found: RoomOverlap[] = [];

    for (const level of levels) {
        level.rooms.forEach((first, index) => {
            for (const second of level.rooms.slice(index + 1)) {
                const area = sharedArea(groundOf(first), groundOf(second));

                if (area > OVERLAP_TOLERANCE_M2) {
                    found.push({
                        level: level.title,
                        first: first.name,
                        second: second.name,
                        area,
                    });
                }
            }
        });
    }

    return found.sort((first, second) => second.area - first.area);
}

export function planLevels(structure: Structure): PlanLevel[] {
    const levels = new Map<number, PlanLevel>();

    function levelOf(element: StructureRoom | StructureComponent): PlanLevel {
        let level = levels.get(element.plan_id);

        if (level === undefined) {
            level = {
                planId: element.plan_id,
                title: element.plan_title,
                base: Infinity,
                height: 0,
                area: 0,
                rooms: [],
                components: [],
            };
            levels.set(element.plan_id, level);
        }

        return level;
    }

    for (const room of structure.rooms) {
        const level = levelOf(room);

        level.rooms.push(room);
    }

    for (const component of structure.components) {
        levelOf(component).components.push(component);
    }

    for (const level of levels.values()) {
        // The ground the level covers: two rooms that overlap do not count their shared part twice.
        level.area = coveredArea(level.rooms.map(groundOf));

        const standing = [
            ...level.rooms,
            ...level.components.filter((component) => component.kind !== "beam"),
        ];
        const elements = standing.length > 0 ? standing : level.components;

        level.base = Math.min(...elements.map((element) => element.base_m));
        level.height =
            Math.max(...elements.map((element) => element.base_m + element.height_m)) - level.base;
    }

    return [...levels.values()].sort((first, second) => first.base - second.base);
}

export function buildingIndicators(structure: Structure): BuildingIndicators | null {
    const levels = planLevels(structure).filter((level) => level.rooms.length > 0);

    if (levels.length === 0) {
        return null;
    }

    const lot = structure.terrains[0];
    const lotArea =
        lot === undefined
            ? null
            : polygonArea(lot.outline.map((point) => ({ x: point.x_m, y: point.y_m })));
    const footprint = levels[0].area;
    const builtArea = levels.reduce((sum, level) => sum + level.area, 0);
    const top = levels[levels.length - 1];

    return {
        lotArea,
        footprint,
        builtArea,
        freeArea: lotArea === null ? null : lotArea - footprint,
        cos: lotArea === null ? null : footprint / lotArea,
        cus: lotArea === null ? null : builtArea / lotArea,
        levels: levels.length,
        height: top.base + top.height,
        overlaps: roomOverlaps(levels),
    };
}
