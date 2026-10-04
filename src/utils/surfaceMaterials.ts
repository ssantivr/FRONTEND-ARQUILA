import type { StructureElement, SurfaceMaterialId } from "../types/api";
import { elementKey } from "./openings";

export type { SurfaceMaterialId };

export interface SurfaceMaterial {
    label: string;
    color: number;
    roughness: number;
    metalness: number;
    opacity: number;
}

/** The surface material chosen for each element, by element key. */
export type ElementSurfaces = Readonly<Record<string, SurfaceMaterialId>>;

export const SURFACE_MATERIALS: Record<SurfaceMaterialId, SurfaceMaterial> = {
    concrete: { label: "Concreto", color: 0xaab4bf, roughness: 0.85, metalness: 0, opacity: 1 },
    brick: { label: "Ladrillo", color: 0xa9583f, roughness: 0.75, metalness: 0, opacity: 1 },
    plaster: { label: "Revoque", color: 0x8d6a5a, roughness: 0.8, metalness: 0, opacity: 1 },
    glass: {
        label: "Vidrio arquitectónico",
        color: 0x9fc4dc,
        roughness: 0.1,
        metalness: 0.8,
        opacity: 0.4,
    },
    steel: { label: "Acero", color: 0x8a939e, roughness: 0.35, metalness: 0.9, opacity: 1 },
    wood: { label: "Madera", color: 0x9c6b3f, roughness: 0.7, metalness: 0, opacity: 1 },
    stone: { label: "Piedra", color: 0x7d7a73, roughness: 0.9, metalness: 0, opacity: 1 },
};

export const SURFACE_MATERIAL_IDS = Object.keys(SURFACE_MATERIALS) as SurfaceMaterialId[];

export const DEFAULT_SURFACE: Record<StructureElement["kind"], SurfaceMaterialId> = {
    room: "brick",
    volume: "plaster",
    column: "concrete",
    beam: "concrete",
    wall: "concrete",
};

/** Collects the materials the backend has saved for the given elements. */
export function savedSurfaces(elements: StructureElement[]): ElementSurfaces {
    const surfaces: Record<string, SurfaceMaterialId> = {};

    for (const element of elements) {
        if (element.surface !== null) {
            surfaces[elementKey(element)] = element.surface;
        }
    }

    return surfaces;
}

export function surfaceOf(
    surfaces: ElementSurfaces,
    key: string,
    kind: StructureElement["kind"],
): SurfaceMaterialId {
    return surfaces[key] ?? DEFAULT_SURFACE[kind];
}
