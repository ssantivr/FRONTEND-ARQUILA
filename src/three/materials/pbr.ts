import {
    DataTexture,
    LinearFilter,
    LinearMipmapLinearFilter,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    type Material,
    type Plane,
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import type { StructureElement } from "../../types/api";
import { DEFAULT_SURFACE, SURFACE_MATERIALS } from "../../utils/surfaceMaterials";
import type { Resources } from "../engine/resources";
import type { ScenePalette } from "../lightingPalette";
import { buildPatterns, disposePatterns, type Pattern, type Patterns } from "../patterns";

export const ROOF_COLOR = 0x8a4f43;
export const SLAB_COLOR = 0xb9c0c8;
export const DOOR_COLOR = 0x4a3526;
export const EDGE_COLOR = 0x1b1410;
export const MINERAL_ACCENT = 0x89968c;
export const TERRACOTTA_ACCENT = 0xd66a3d;
export const SELECTION_COLOR = 0xd66a3d;
export const PATTERN_BUMP = 1.4;
export const GRAIN_BUMP = 2;

const TERRAIN_COLOR = 0x5d8a4e;
const GLASS_COLOR = 0x7fb4dc;
const FRAME_COLOR = 0x1c1f24;
const WINDOW_LIGHT = 0xffc27a;
const OUTLINE_WIDTH_PX = 3;
const LOT_EDGE_WIDTH_PX = 2;
const NEON_BOOST = 3;
const LOT_EDGE_BOOST = 1.5;
const GRAIN_SIZE_PX = 128;
const GRAIN_TILE_M = 1.5;

export function buildGrain(): DataTexture {
    const size = GRAIN_SIZE_PX;
    const coarse = size / 8;
    const data = new Uint8Array(size * size * 4);
    let seed = 7;
    const random = () => {
        seed = (seed * 16807) % 2147483647;

        return seed / 2147483647;
    };
    const blotches = Array.from({ length: coarse * coarse }, random);

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const blotch = blotches[Math.floor(y / 8) * coarse + Math.floor(x / 8)];
            const value = 255 * (0.7 + 0.12 * blotch + 0.18 * random());

            data.fill(value, (y * size + x) * 4, (y * size + x) * 4 + 3);
            data[(y * size + x) * 4 + 3] = 255;
        }
    }

    const texture = new DataTexture(data, size, size);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.setScalar(1 / GRAIN_TILE_M);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
}

export function standard(color: number, roughness: number, metalness = 0): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
}

/** A white material that shows a generated pattern: its colours come from the map. */
export function patterned(pattern: Pattern, roughness: number): MeshStandardMaterial {
    const material = standard(0xffffff, roughness);

    material.map = pattern.map;
    material.bumpMap = pattern.bump;
    material.bumpScale = PATTERN_BUMP;

    return material;
}

export function buildMaterial(element: StructureElement): MeshStandardMaterial {
    const surface = SURFACE_MATERIALS[DEFAULT_SURFACE[element.kind]];

    if (element.kind === "room") {
        return new MeshPhysicalMaterial({
            color: surface.color,
            roughness: surface.roughness,
            metalness: surface.metalness,
            clearcoat: 0.15,
            clearcoatRoughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
        });
    }

    return standard(surface.color, surface.roughness, surface.metalness);
}

function shared<Shared extends Material>(material: Shared): Shared {
    material.userData.shared = true;

    return material;
}

/** What every model of the viewer draws with; it lives as long as the engine. */
export interface SceneKit {
    grain: DataTexture;
    patterns: Patterns;
    glass: MeshPhysicalMaterial;
    frame: MeshPhysicalMaterial;
    outline: LineMaterial;
    lotEdge: LineMaterial;
}

export function createSceneKit(resources: Resources, cutPlanes: Plane[]): SceneKit {
    const patterns = buildPatterns(ROOF_COLOR, TERRAIN_COLOR);
    const outline = shared(new LineMaterial({ linewidth: OUTLINE_WIDTH_PX }));

    outline.clippingPlanes = cutPlanes;
    resources.track({ dispose: () => disposePatterns(patterns) });

    return {
        grain: resources.track(buildGrain()),
        patterns,
        glass: resources.track(
            shared(
                new MeshPhysicalMaterial({
                    color: GLASS_COLOR,
                    transparent: true,
                    opacity: 0.4,
                    roughness: 0.08,
                    metalness: 0.25,
                    clearcoat: 1,
                    clearcoatRoughness: 0.05,
                    emissive: WINDOW_LIGHT,
                    emissiveIntensity: 0,
                    depthWrite: false,
                }),
            ),
        ),
        frame: resources.track(
            shared(
                new MeshPhysicalMaterial({
                    color: FRAME_COLOR,
                    roughness: 0.35,
                    metalness: 0.9,
                    clearcoat: 0.4,
                    clearcoatRoughness: 0.3,
                }),
            ),
        ),
        outline: resources.track(outline),
        lotEdge: resources.track(shared(new LineMaterial({ linewidth: LOT_EDGE_WIDTH_PX }))),
    };
}

export function applyPaletteToKit(kit: SceneKit, palette: ScenePalette): void {
    kit.outline.color.setHex(SELECTION_COLOR).multiplyScalar(1 + NEON_BOOST * palette.glow);
    kit.lotEdge.color.setHex(SELECTION_COLOR).multiplyScalar(1 + LOT_EDGE_BOOST * palette.glow);
    kit.glass.emissiveIntensity = palette.windowGlow;
    kit.glass.opacity = palette.glassOpacity;
}
