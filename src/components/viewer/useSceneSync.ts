import { useEffect, useRef, type RefObject } from "react";

import { appState } from "../../state/appState";
import { saveThumbnail, shrinkCapture } from "../../state/thumbnails";
import {
    type CameraPose,
    type Layers,
    type OverlayLayers,
    type Projection,
    type ScenePalette,
    type StructureViewer as Viewer,
} from "../../three/BuildingSceneManager";
import type { PreviewQuality } from "../../three/engine/quality";
import type { SceneLighting } from "../../three/lightingPalette";
import type { RoofKind, SpatialElement, Structure, StructureElement } from "../../types/api";
import type { ElementColors } from "../../utils/elementColors";
import { savedSurfaces, type ElementSurfaces } from "../../utils/surfaceMaterials";

// The model needs a moment to settle (shadows, textures) before its picture is taken.
const THUMBNAIL_DELAY_MS = 2000;

interface SceneState {
    structure: Structure;
    projectId: number;
    elements: StructureElement[];
    quality: PreviewQuality;
    /** Whether the model is as it opens, which is the only state worth a project picture. */
    untouched: boolean;
    roof: RoofKind;
    selectedKey: string | null;
    colors: ElementColors | null;
    surfaces: ElementSurfaces;
    layers: Layers;
    hiddenKeys: ReadonlySet<string>;
    sun: number;
    lit: SceneLighting | null;
    palette: ScenePalette;
    projection: Projection;
    isolatedKey: string | null;
    cut: number;
    highlighted: ReadonlySet<string> | null;
    works: SpatialElement[];
    workLayers: OverlayLayers;
    explode: number;
    inside: boolean;
    pose: CameraPose | null;
    meshUrl: string | null;
    onAssetLoading: (url: string | null) => void;
}

/** Keeps the engine in step with what the screen holds: one effect for each thing it can show. */
export function useSceneSync(viewer: RefObject<Viewer | null>, state: SceneState): void {
    const { structure, projectId, elements, quality, untouched, roof, selectedKey } = state;
    const { colors, surfaces, layers, hiddenKeys, sun, lit, palette, projection } = state;
    const { isolatedKey, cut, highlighted, works, workLayers, explode, inside, pose } = state;
    const { meshUrl } = state;
    const canPicture = useRef(untouched);
    const assetLoading = useRef(state.onAssetLoading);

    canPicture.current = untouched;
    assetLoading.current = state.onAssetLoading;

    useEffect(() => {
        viewer.current?.setQuality(quality);
    }, [viewer, quality]);

    useEffect(() => {
        viewer.current?.show(structure);
    }, [viewer, structure]);

    // Once the model is on screen its picture is kept for the project cards. It is taken only of
    // the whole model as it opens: not of an isolated room, a selection or a presentation light.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const image = canPicture.current ? viewer.current?.capture() : undefined;

            if (typeof image === "string") {
                void shrinkCapture(image).then((thumbnail) => {
                    if (thumbnail !== null) {
                        saveThumbnail(projectId, thumbnail);
                    }
                });
            }
        }, THUMBNAIL_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [viewer, structure, projectId]);

    useEffect(() => {
        appState.setSurfaces(projectId, savedSurfaces(elements));
        appState.setRoof(projectId, structure.roof);
    }, [projectId, elements, structure.roof]);

    useEffect(() => {
        viewer.current?.setRoof(roof);
    }, [viewer, roof, structure]);

    useEffect(() => {
        viewer.current?.select(selectedKey);
    }, [viewer, selectedKey, structure]);

    useEffect(() => {
        viewer.current?.setColors(colors);
    }, [viewer, colors]);

    useEffect(() => {
        viewer.current?.setSurfaces(surfaces);
    }, [viewer, surfaces, structure]);

    useEffect(() => {
        viewer.current?.setLayers(layers);
    }, [viewer, layers]);

    useEffect(() => {
        viewer.current?.setHidden(hiddenKeys);
    }, [viewer, hiddenKeys, structure]);

    useEffect(() => {
        if (lit === null) {
            viewer.current?.setSun(sun);
        } else {
            viewer.current?.setSun(lit.azimuth, lit.elevation);
            viewer.current?.setExposure(lit.exposure);
            viewer.current?.setShadows(lit.shadows);
        }
    }, [viewer, sun, lit, structure]);

    useEffect(() => {
        viewer.current?.setProjection(projection);
    }, [viewer, projection, structure]);

    useEffect(() => {
        viewer.current?.isolate(isolatedKey);
    }, [viewer, isolatedKey, structure]);

    useEffect(() => {
        viewer.current?.setCutaway(cut / 100);
    }, [viewer, cut, structure]);

    useEffect(() => {
        viewer.current?.setHighlight(highlighted);
    }, [viewer, highlighted, structure]);

    useEffect(() => {
        viewer.current?.setOverlays(works);
    }, [viewer, works]);

    useEffect(() => {
        viewer.current?.setOverlayLayers(workLayers);
    }, [viewer, workLayers]);

    useEffect(() => {
        viewer.current?.setExplode(explode / 100);
    }, [viewer, explode]);

    useEffect(() => {
        viewer.current?.enterRoom(inside ? isolatedKey : null, pose ?? undefined);
    }, [viewer, inside, isolatedKey, pose, structure]);

    useEffect(() => {
        assetLoading.current(meshUrl);
        viewer.current?.setAsset(meshUrl);
    }, [viewer, meshUrl, structure]);

    useEffect(() => {
        viewer.current?.setPalette(palette);
    }, [viewer, palette, structure]);
}
