import type { Material } from "../types/api";

export const NO_CATEGORY = "Sin categoría";

export interface CategoryCost {
    category: string;
    amount: number;
    /** Part of the total, from 0 to 100, rounded to a whole number. */
    share: number;
}

/** What a material costs: its quantity by its unit cost. */
export function materialCost(material: Pick<Material, "quantity" | "unit_cost">): number {
    return material.quantity * material.unit_cost;
}

/**
 * Adds up the cost of the materials of each category, from the most to the least expensive.
 * A material without a category goes under «Sin categoría». One pass over the list: O(n).
 */
export function costByCategory(materials: Material[]): CategoryCost[] {
    const totals = new Map<string, number>();

    for (const material of materials) {
        const category = material.category ?? NO_CATEGORY;

        totals.set(category, (totals.get(category) ?? 0) + materialCost(material));
    }

    const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);

    return [...totals.entries()]
        .sort((first, second) => second[1] - first[1])
        .map(([category, amount]) => ({
            category,
            amount,
            share: total > 0 ? Math.round((amount / total) * 100) : 0,
        }));
}
