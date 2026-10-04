import type {
    Material,
    Recommendation,
    RecommendationPriority,
    StructureElement,
} from "../types/api";
import { elementKey } from "./openings";

export type ColorMode = "realistic" | "kind" | "cost" | "alerts";
export type ElementColors = ReadonlyMap<string, number>;

export const LOW_COLOR = 0x6fa8d6;
export const HIGH_COLOR = 0xb3261e;

export const KIND_COLORS: Record<StructureElement["kind"], number> = {
    room: 0x6f9bc4,
    volume: 0x8d99a8,
    column: 0xb5533c,
    beam: 0xc9962b,
    wall: 0x7d6aa8,
};

export const PRIORITY_COLORS: Record<RecommendationPriority, number> = {
    high: 0xb3261e,
    medium: 0xc9962b,
    low: 0x6fa8d6,
};

const PRIORITY_ORDER: RecommendationPriority[] = ["high", "medium", "low"];

export function cssColor(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

export function mixColor(from: number, to: number, amount: number): number {
    const ratio = Math.min(Math.max(amount, 0), 1);
    const channel = (shift: number) => {
        const start = (from >> shift) & 0xff;
        const end = (to >> shift) & 0xff;

        return Math.round(start + (end - start) * ratio) << shift;
    };

    return channel(16) | channel(8) | channel(0);
}

export function elementVolume(element: StructureElement): number {
    return element.width_m * element.depth_m * element.height_m;
}

export function kindColors(elements: StructureElement[]): Map<string, number> {
    return new Map(elements.map((element) => [elementKey(element), KIND_COLORS[element.kind]]));
}

/** Splits the project's material budget across the elements by their share of the volume. */
export function estimateCosts(
    elements: StructureElement[],
    materials: Material[],
): Map<string, number> {
    const budget = materials.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
    const volume = elements.reduce((sum, element) => sum + elementVolume(element), 0);
    const costs = new Map<string, number>();

    if (budget <= 0 || volume <= 0) {
        return costs;
    }

    for (const element of elements) {
        costs.set(elementKey(element), (budget * elementVolume(element)) / volume);
    }

    return costs;
}

export function costColors(costs: ReadonlyMap<string, number>): Map<string, number> {
    const highest = Math.max(0, ...costs.values());
    const colors = new Map<string, number>();

    for (const [key, cost] of costs) {
        colors.set(key, mixColor(LOW_COLOR, HIGH_COLOR, highest === 0 ? 0 : cost / highest));
    }

    return colors;
}

function mentions(text: string, name: string): boolean {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (escaped === "") {
        return false;
    }

    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

/** Links each element to the recommendations that mention it by name. */
export function findAlerts(
    elements: StructureElement[],
    recommendations: Recommendation[],
): Map<string, Recommendation[]> {
    const alerts = new Map<string, Recommendation[]>();

    for (const element of elements) {
        const matches = recommendations.filter((item) => mentions(item.content, element.name));

        if (matches.length > 0) {
            alerts.set(elementKey(element), matches);
        }
    }

    return alerts;
}

export function topPriority(recommendations: Recommendation[]): RecommendationPriority {
    return (
        PRIORITY_ORDER.find((priority) =>
            recommendations.some((item) => item.priority === priority),
        ) ?? "low"
    );
}

export function alertColors(alerts: ReadonlyMap<string, Recommendation[]>): Map<string, number> {
    const colors = new Map<string, number>();

    for (const [key, matches] of alerts) {
        colors.set(key, PRIORITY_COLORS[topPriority(matches)]);
    }

    return colors;
}
