import { describe, expect, it } from "vitest";

import type { Material, Recommendation, StructureComponent, StructureRoom } from "../types/api";
import {
    HIGH_COLOR,
    KIND_COLORS,
    LOW_COLOR,
    PRIORITY_COLORS,
    alertColors,
    costColors,
    cssColor,
    estimateCosts,
    findAlerts,
    kindColors,
    mixColor,
} from "./elementColors";

function room(overrides: Partial<StructureRoom>): StructureRoom {
    return {
        kind: "room",
        id: 1,
        plan_id: 1,
        plan_title: "Ground",
        name: "Hall",
        level: "0",
        x_m: 2,
        y_m: 2,
        base_m: 0,
        width_m: 4,
        depth_m: 4,
        height_m: 3,
        surface: null,
        ...overrides,
    };
}

function column(overrides: Partial<StructureComponent>): StructureComponent {
    return { ...room({}), kind: "column", name: "C1", width_m: 1, depth_m: 1, ...overrides };
}

function material(quantity: number, unitCost: number): Material {
    return {
        id: 1,
        project_id: 1,
        name: "Concrete",
        category: null,
        unit: "m3",
        quantity,
        unit_cost: unitCost,
        created_at: "",
    };
}

function recommendation(overrides: Partial<Recommendation>): Recommendation {
    return {
        id: 1,
        project_id: 1,
        category: "structure",
        content: "",
        source: "ai",
        priority: "low",
        created_at: "",
        ...overrides,
    };
}

describe("mixColor", () => {
    it("returns the ends of the ramp and clamps the amount", () => {
        expect(mixColor(LOW_COLOR, HIGH_COLOR, 0)).toBe(LOW_COLOR);
        expect(mixColor(LOW_COLOR, HIGH_COLOR, 1)).toBe(HIGH_COLOR);
        expect(mixColor(LOW_COLOR, HIGH_COLOR, 3)).toBe(HIGH_COLOR);
        expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    });
});

describe("cssColor", () => {
    it("pads short values", () => {
        expect(cssColor(0x00f0ff)).toBe("#00f0ff");
    });
});

describe("kindColors", () => {
    it("colors each element by its kind", () => {
        const colors = kindColors([room({}), column({})]);

        expect(colors.get("room-1")).toBe(KIND_COLORS.room);
        expect(colors.get("column-1")).toBe(KIND_COLORS.column);
    });
});

describe("estimateCosts", () => {
    it("splits the budget by volume share", () => {
        const costs = estimateCosts([room({}), column({})], [material(10, 51)]);

        expect(costs.get("room-1")).toBeCloseTo(480);
        expect(costs.get("column-1")).toBeCloseTo(30);
    });

    it("returns nothing without a budget", () => {
        expect(estimateCosts([room({})], []).size).toBe(0);
    });
});

describe("costColors", () => {
    it("gives the most expensive element the high color", () => {
        const colors = costColors(
            new Map([
                ["a", 100],
                ["b", 0],
            ]),
        );

        expect(colors.get("a")).toBe(HIGH_COLOR);
        expect(colors.get("b")).toBe(LOW_COLOR);
    });
});

describe("findAlerts", () => {
    const elements = [column({}), column({ id: 2, name: "C10" })];

    it("matches whole names without regard to case", () => {
        const alerts = findAlerts(elements, [
            recommendation({ content: "Revisar la columna c10, está muy esbelta." }),
        ]);

        expect([...alerts.keys()]).toEqual(["column-2"]);
    });

    it("colors by the highest priority that mentions the element", () => {
        const alerts = findAlerts(elements, [
            recommendation({ content: "C1 lejos del eje." }),
            recommendation({ id: 2, content: "Reforzar C1.", priority: "high" }),
        ]);

        expect(alertColors(alerts).get("column-1")).toBe(PRIORITY_COLORS.high);
    });
});
