import type { Terrain } from "../types/api";

export interface Point {
    x: number;
    y: number;
}

export interface Bounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export function footprint(terrain: Terrain): Point[] | null {
    if (terrain.points.length >= 3) {
        return terrain.points.map((point) => ({ x: point.x_m, y: point.y_m }));
    }

    if (terrain.width_m !== null && terrain.length_m !== null) {
        return [
            { x: 0, y: 0 },
            { x: terrain.width_m, y: 0 },
            { x: terrain.width_m, y: terrain.length_m },
            { x: 0, y: terrain.length_m },
        ];
    }

    return null;
}

export function polygonArea(points: Point[]): number {
    let total = 0;

    points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        total += point.x * next.y - next.x * point.y;
    });

    return Math.abs(total) / 2;
}

export function bounds(points: Point[]): Bounds {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
    };
}

export function frontElevation(points: Point[], slopePercent: number): Point[] {
    const { minY } = bounds(points);

    return points.map((point) => ({
        x: point.x,
        y: ((point.y - minY) * slopePercent) / 100,
    }));
}

export type ParsedPoints = { points: Point[] } | { error: string };

export function parsePoints(text: string): ParsedPoints {
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    const points: Point[] = [];

    for (const [index, line] of lines.entries()) {
        const parts = line.split(/[;\s]+/).filter((part) => part !== "");
        const [x, y] = parts.map((part) => Number(part.replace(",", ".")));

        if (parts.length !== 2 || !Number.isFinite(x) || !Number.isFinite(y)) {
            return { error: `Línea ${index + 1}: escribe dos números, por ejemplo «15 30».` };
        }

        points.push({ x, y });
    }

    if (points.length > 0 && points.length < 3) {
        return { error: "Un lote necesita al menos tres vértices." };
    }

    if (points.length > 50) {
        return { error: "Un lote admite como máximo 50 vértices." };
    }

    if (points.length >= 3 && polygonArea(points) === 0) {
        return { error: "Los vértices no encierran ningún área." };
    }

    return { points };
}

export function formatPoints(points: Point[]): string {
    return points.map((point) => `${point.x} ${point.y}`).join("\n");
}
