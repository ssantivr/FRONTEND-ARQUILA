import type { LineBasicMaterial } from "three";

import type { StructureElement } from "../../types/api";
import { SURFACE_MATERIALS, surfaceOf } from "../../utils/surfaceMaterials";
import { EDGE_COLOR, GRAIN_BUMP, PATTERN_BUMP, SELECTION_COLOR } from "../materials/pbr";
import type { SceneKit } from "../materials/pbr";
import type { SceneContents } from "./contents";

const HOVER_COLOR = 0x7552ff;
const MUTED_COLOR = 0x39414d;
const GHOST_OPACITY = 0.3;
const HIGHLIGHT_GLOW = 0.45;

/** Colour, relief and glow of every element, from its surface and the state of the viewer. */
export function paintElements(
    contents: SceneContents,
    { grain, patterns }: Pick<SceneKit, "grain" | "patterns">,
): void {
    const { highlight, hoveredKey, selectedKey, surfaces } = contents;
    // The materials mode shows the finishes, so data colours give way to them.
    const flat = contents.renderMode === "materials";
    const colors = flat ? null : contents.colors;

    for (const mesh of contents.elements) {
        const key = mesh.userData.key as string;

        const surfaceId = surfaceOf(surfaces, key, mesh.userData.kind as StructureElement["kind"]);
        const surface = SURFACE_MATERIALS[surfaceId];
        const dimmed = highlight !== null && !highlight.has(key);
        const opacity = dimmed ? GHOST_OPACITY : colors === null ? surface.opacity : 1;
        // Brick, wood and stone are drawn with their pattern; the map carries the colours,
        // so the material goes white under it. Data colours and dimming use flat colour.
        const pattern = colors === null && !dimmed ? (patterns.surfaces[surfaceId] ?? null) : null;

        mesh.material.color.setHex(
            dimmed
                ? MUTED_COLOR
                : colors !== null
                  ? (colors.get(key) ?? MUTED_COLOR)
                  : pattern !== null
                    ? 0xffffff
                    : surface.color,
        );
        mesh.material.roughness = surface.roughness;
        mesh.material.metalness = surface.metalness;
        mesh.material.opacity = opacity;

        const relief =
            pattern !== null ? pattern.bump : colors === null && surface.grain > 0 ? grain : null;
        const map = pattern === null ? null : pattern.map;

        if (mesh.material.bumpMap !== relief || mesh.material.map !== map) {
            mesh.material.map = map;
            mesh.material.bumpMap = relief;
            mesh.material.roughnessMap = pattern === null ? relief : null;
            mesh.material.needsUpdate = true;
        }

        mesh.material.bumpScale = pattern === null ? surface.grain * GRAIN_BUMP : PATTERN_BUMP;

        if (mesh.material.transparent !== opacity < 1) {
            mesh.material.transparent = opacity < 1;
            mesh.material.needsUpdate = true;
        }

        const edges = mesh.userData.edges as LineBasicMaterial;
        const selected = key === selectedKey;

        edges.color.setHex(selected ? SELECTION_COLOR : EDGE_COLOR);
        edges.opacity = selected ? 1 : 0.6;
        const hovered = !selected && key === hoveredKey;
        const marked = highlight !== null && !dimmed;

        mesh.material.emissive.setHex(hovered ? HOVER_COLOR : marked ? SELECTION_COLOR : 0x000000);
        mesh.material.emissiveIntensity = !hovered && marked ? HIGHLIGHT_GLOW : 0.2;

        // Unlit finishes: the surface colour and pattern are emitted as they are and the lit
        // colour goes black, so light, shadow and reflections no longer change them. The
        // selection stays visible through the edge colour.
        if (flat) {
            mesh.material.emissive.copy(mesh.material.color);
            mesh.material.emissiveIntensity = 1;
            mesh.material.color.setHex(0x000000);
            mesh.material.roughness = 1;
            mesh.material.metalness = 0;
        }

        const emissiveMap = flat ? mesh.material.map : null;

        if (mesh.material.emissiveMap !== emissiveMap) {
            mesh.material.emissiveMap = emissiveMap;
            mesh.material.needsUpdate = true;
        }
    }
}
