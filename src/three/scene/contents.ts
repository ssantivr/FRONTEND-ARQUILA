import type { GridHelper, Group, Mesh, Object3D } from "three";

import type { ElementColors } from "../../utils/elementColors";
import type { ElementSurfaces } from "../../utils/surfaceMaterials";
import type { ScenePalette } from "../lightingPalette";
import type { ElementMesh, OverlayMesh } from "./elements";

/**
 * What is on stage and how it should look. The scene graph fills it; layers, appearance and
 * selection read it, each from its own module, so that none of them depends on the others.
 */
export interface SceneContents {
    palette: ScenePalette;
    model: Group | null;
    elements: ElementMesh[];
    overlays: OverlayMesh[];
    roof: Mesh | null;
    environment: Group | null;
    lotEdges: Group | null;
    grid: GridHelper | null;
    asset: Object3D | null;
    levelBases: number[];
    selectedKey: string | null;
    hoveredKey: string | null;
    colors: ElementColors | null;
    surfaces: ElementSurfaces;
    highlight: ReadonlySet<string> | null;
}

export function createSceneContents(palette: ScenePalette): SceneContents {
    return {
        palette,
        model: null,
        elements: [],
        overlays: [],
        roof: null,
        environment: null,
        lotEdges: null,
        grid: null,
        asset: null,
        levelBases: [],
        selectedKey: null,
        hoveredKey: null,
        colors: null,
        surfaces: {},
        highlight: null,
    };
}
