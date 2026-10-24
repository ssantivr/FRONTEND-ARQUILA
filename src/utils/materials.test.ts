import { describe, expect, it } from "vitest";

import type { Material } from "../types/api";
import { NO_CATEGORY, costByCategory, materialCost } from "./materials";

function material(id: number, category: string | null, quantity: number, unitCost: number) {
    return {
        id,
        project_id: 1,
        name: `Material ${id}`,
        category,
        unit: "u",
        quantity,
        unit_cost: unitCost,
    } as Material;
}

describe("costByCategory", () => {
    it("adds up each category and orders them from the most expensive", () => {
        const result = costByCategory([
            material(1, "Acabados", 10, 20),
            material(2, "Estructura", 100, 5),
            material(3, "Acabados", 5, 20),
        ]);

        expect(result).toEqual([
            { category: "Estructura", amount: 500, share: 63 },
            { category: "Acabados", amount: 300, share: 38 },
        ]);
    });

    it("groups the materials without a category under their own name", () => {
        expect(costByCategory([material(1, null, 2, 50)])).toEqual([
            { category: NO_CATEGORY, amount: 100, share: 100 },
        ]);
    });

    it("gives no share when nothing costs anything, instead of dividing by zero", () => {
        expect(costByCategory([material(1, "Acabados", 0, 20)])).toEqual([
            { category: "Acabados", amount: 0, share: 0 },
        ]);
        expect(costByCategory([])).toEqual([]);
    });
});

describe("materialCost", () => {
    it("multiplies the quantity by the unit cost", () => {
        expect(materialCost({ quantity: 120, unit_cost: 22 })).toBe(2640);
    });
});
