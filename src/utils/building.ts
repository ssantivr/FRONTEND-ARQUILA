import type { Structure, StructureComponent, StructureRoom } from "../types/api";
import { polygonArea } from "./geometry";

export interface PlanLevel {
    planId: number;
    title: string;
    base: number;
    height: number;
    area: number;
    rooms: StructureRoom[];
    components: StructureComponent[];
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
        level.area += room.width_m * room.depth_m;
    }

    for (const component of structure.components) {
        levelOf(component).components.push(component);
    }

    for (const level of levels.values()) {
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
    };
}
