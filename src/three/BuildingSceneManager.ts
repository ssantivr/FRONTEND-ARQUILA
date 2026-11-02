import { MathUtils, Vector3 } from "three";

import type { RoofKind, SpatialElement, Structure } from "../types/api";
import type { ElementColors } from "../utils/elementColors";
import { elementKey } from "../utils/openings";
import type { ElementSurfaces } from "../utils/surfaceMaterials";
import type { Projection, ViewName } from "./camera/views";
import { createExperienceEngine, type StillJob } from "./engine/ExperienceEngine";
import type { PreviewQuality } from "./engine/quality";
import { SCENE_PALETTES, type ScenePalette } from "./lightingPalette";
import { applyPaletteToKit, createSceneKit } from "./materials/pbr";
import { paintElements } from "./scene/appearance";
import { createSceneContents } from "./scene/contents";
import { isSpace, overlayKey } from "./scene/elements";
import {
    createLayerManager,
    type LayerName,
    type Layers,
    type OverlayLayers,
} from "./scene/layers";
import { createSceneGraph, type CameraPose, type PlanPoint } from "./scene/sceneGraph";
import { createSelection } from "./scene/selection";

export type {
    CameraPose,
    LayerName,
    Layers,
    OverlayLayers,
    PlanPoint,
    Projection,
    ScenePalette,
    StillJob,
    ViewName,
};
export { SCENE_PALETTES, elementKey, isSpace, overlayKey };

export interface StructureViewer {
    show: (structure: Structure) => void;
    select: (key: string | null) => void;
    setColors: (colors: ElementColors | null) => void;
    setSurfaces: (surfaces: ElementSurfaces) => void;
    setRoof: (roof: RoofKind) => void;
    setLayers: (layers: Layers) => void;
    setHidden: (keys: ReadonlySet<string>) => void;
    setPalette: (palette: ScenePalette) => void;
    setView: (view: ViewName) => void;
    /** Width covered by panels over each side of the scene, so framing leaves the model clear. */
    setFrameInsets: (left: number, right: number) => void;
    isolate: (key: string | null) => void;
    setCutaway: (fraction: number) => void;
    setHighlight: (keys: ReadonlySet<string> | null) => void;
    setOverlays: (items: SpatialElement[]) => void;
    setOverlayLayers: (layers: OverlayLayers) => void;
    setExplode: (fraction: number) => void;
    enterRoom: (key: string | null, pose?: CameraPose) => void;
    setAsset: (url: string | null) => void;
    focus: (key: string | null, azimuth?: number) => void;
    zoomBy: (factor: number) => void;
    /**
     * Turns the sun around the model; 0 is its default bearing. With an elevation, in degrees
     * above the horizon, it also raises or lowers it.
     */
    setSun: (degrees: number, elevation?: number) => void;
    /** Tone mapping exposure; 1 is the default. */
    setExposure: (exposure: number) => void;
    setShadows: (enabled: boolean) => void;
    /** Pixel ratio, shadow resolution and post-processing, from `preview_quality`. */
    setQuality: (quality: PreviewQuality) => void;
    /** Draws the current view and returns it as a PNG data URL. */
    capture: () => string;
    /**
     * Draws the current view at another size, as the average of several frames, and returns it
     * on a canvas; `null` if it was cancelled.
     */
    renderStill: (job: StillJob) => Promise<HTMLCanvasElement | null>;
    /** Longest side, in pixels, of an image or shadow map this device can draw. */
    maxImageSize: number;
    /** Switches between the perspective camera and a real orthographic one, keeping the framing. */
    setProjection: (projection: Projection) => void;
    dispose: () => void;
}

export interface ViewerEvents {
    onSelect: (key: string | null) => void;
    onZoom: (percent: number) => void;
    /** Where the camera looks, in whole degrees: around the vertical axis, and above the horizon. */
    onOrbit: (azimuth: number, elevation: number) => void;
    onAsset: (state: "ready" | "error") => void;
    /** The browser took the graphics context away (driver reset, too many contexts, sleep). */
    onContextLost?: () => void;
}

/**
 * The viewer of a project's model: it puts the engine and the scene modules together and turns
 * what the screen asks for into calls to them. The work happens in `engine/` and `scene/`.
 */
export function createStructureViewer(
    container: HTMLElement,
    events: ViewerEvents,
): StructureViewer {
    const palette = SCENE_PALETTES.dark;
    const contents = createSceneContents(palette);
    const gaze = new Vector3();
    let lastZoom = 0;
    let lastOrbit = "";
    let framed = false;
    let insetLeft = 0;
    let insetRight = 0;

    const engine = createExperienceEngine(container, {
        palette,
        onCameraChange: () => {
            reportZoom();
            reportOrbit();
        },
        onViewport: () => {
            applyFill();

            if (contents.model !== null) {
                fitLimits();
                reportZoom();
            }
        },
        onStep: (time, elapsed) => {
            engine.rig.update(time);

            if (graph.stepExplode(elapsed)) {
                engine.invalidate();
            }

            selection.flushHover();
        },
        onContextLost: () => events.onContextLost?.(),
    });
    const { rig, lights } = engine;
    const kit = createSceneKit(engine.resources, engine.cutPlanes);
    const layers = createLayerManager(contents, engine.cutPlane);
    const graph = createSceneGraph(contents, engine, kit, layers);
    const selection = createSelection(contents, engine, kit.outline, paint, (key) =>
        events.onSelect(key),
    );

    engine.trackLineMaterials(kit.outline, kit.lotEdge);

    function paint(): void {
        paintElements(contents, kit);
        engine.invalidate();
    }

    function reportZoom(): void {
        const percent = rig.zoomPercent();

        if (percent !== lastZoom) {
            lastZoom = percent;
            events.onZoom(percent);
        }
    }

    function reportOrbit(): void {
        engine.activeCamera().getWorldDirection(gaze);

        const azimuth = Math.round(MathUtils.radToDeg(Math.atan2(gaze.x, gaze.z)));
        const elevation = Math.round(MathUtils.radToDeg(Math.asin(MathUtils.clamp(gaze.y, -1, 1))));
        const orbit = `${azimuth}/${elevation}`;

        if (orbit !== lastOrbit) {
            lastOrbit = orbit;
            events.onOrbit(azimuth, elevation);
        }
    }

    function applyFill(): void {
        const width = engine.width();

        if (width > 0) {
            rig.setFill((width - insetLeft - insetRight) / width);
        }
    }

    function fitLimits(): void {
        rig.fit(engine.bounds);
        lights.fit(engine.bounds);
    }

    function applyPalette(): void {
        engine.applyPalette(contents.palette);
        applyPaletteToKit(kit, contents.palette);
    }

    function setView(view: ViewName): void {
        rig.frame(view, framed);
        reportZoom();
    }

    function show(structure: Structure): void {
        selection.removeOutline();
        graph.clear();
        graph.build(structure);

        contents.hoveredKey = null;
        engine.resize();
        fitLimits();
        graph.rebuildOverlays();
        selection.outline();
        paint();

        if (!framed) {
            setView("isometric");
            framed = true;
        }

        reportZoom();
    }

    function changing<Arguments extends unknown[]>(
        action: (...values: Arguments) => void,
    ): (...values: Arguments) => void {
        return (...values) => {
            action(...values);
            engine.invalidate();
        };
    }

    selection.attach();
    applyPalette();
    engine.start();

    return {
        show: changing(show),
        select: changing(selection.select),
        setColors: changing((colors) => {
            contents.colors = colors;
            paint();
        }),
        setSurfaces: changing((surfaces) => {
            contents.surfaces = surfaces;
            paint();
        }),
        setRoof: changing(graph.setRoof),
        setLayers: changing(layers.setLayers),
        setHidden: changing(layers.setHidden),
        setPalette: changing((next) => {
            if (next === contents.palette) {
                return;
            }

            contents.palette = next;
            applyPalette();

            if (contents.model !== null) {
                graph.buildBackdrop();
                layers.apply();
            }
        }),
        setView: changing(setView),
        setFrameInsets: changing((left, right) => {
            insetLeft = Math.max(0, left);
            insetRight = Math.max(0, right);
            applyFill();

            if (contents.model !== null) {
                fitLimits();
                reportZoom();
            }
        }),
        isolate: changing(layers.isolate),
        setCutaway: changing(layers.setCutaway),
        setHighlight: changing((keys) => {
            contents.highlight = keys;
            paint();
        }),
        setOverlays: changing(graph.setOverlays),
        setOverlayLayers: changing(layers.setOverlayLayers),
        setExplode: changing(graph.setExplode),
        enterRoom: changing(graph.enterRoom),
        setAsset: changing((url) => graph.setAsset(url, events.onAsset)),
        focus: changing(selection.focus),
        zoomBy: changing(rig.zoomBy),
        setSun: changing((degrees, elevation) => {
            lights.setSun(degrees, elevation);

            if (contents.model !== null) {
                fitLimits();
            }
        }),
        setExposure: changing(engine.setExposure),
        setShadows: changing(lights.setShadows),
        setQuality: changing(engine.setQuality),
        capture: engine.capture,
        renderStill: engine.renderStill,
        maxImageSize: engine.maxImageSize,
        setProjection: changing(engine.setProjection),
        dispose: () => {
            engine.stop();
            selection.detach();
            selection.removeOutline();
            graph.clear();
            engine.dispose();
        },
    };
}
