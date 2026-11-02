import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAsync } from "../hooks/useAsync";
import { useEditHistory } from "../hooks/useEditHistory";
import { roomsApi, spatialApi, structureApi, walkthroughApi } from "../services/api";
import { apiUrl } from "../services/http";
import { appState, useProjectState } from "../state/appState";
import { useProjectSave } from "../state/projectSave";
import { showToast } from "../state/toasts";
import { useTheme } from "../state/theme";
import {
    SCENE_PALETTES,
    createStructureViewer,
    elementKey,
    isSpace,
    overlayKey,
    type Layers,
    type OverlayLayers,
    type Projection,
    type StructureViewer as Viewer,
    type ViewName,
} from "../three/BuildingSceneManager";
import { sceneLighting } from "../three/lightingPalette";
import type { LightingSettings, SolarSite } from "../utils/lighting";
import type {
    RoofKind,
    SpatialElement,
    SpatialLayer,
    Structure,
    StructureElement,
    StructureRoom,
} from "../types/api";
import {
    alertColors,
    costColors,
    estimateCosts,
    findAlerts,
    kindColors,
    type ElementColors,
} from "../utils/elementColors";
import { snapTo } from "../utils/snap";
import { DEFAULT_SURFACE, surfaceOf, type SurfaceMaterialId } from "../utils/surfaceMaterials";
import { RoomWorksPanel } from "./RoomWorksPanel";
import { ColorPanel } from "./viewer/ColorPanel";
import { InspectorPanel } from "./viewer/InspectorPanel";
import { ObjectTree } from "./viewer/ObjectTree";
import { railTools } from "./viewer/railTools";
import { ShortcutsDialog } from "./viewer/ShortcutsDialog";
import { ToolRail } from "./viewer/ToolRail";
import { ISOLATION_CUT_PERCENT, TOUR_STEP_MS, tourStops } from "./viewer/tourStops";
import { geometryOf, type RoomGeometry } from "./viewer/TransformPanel";
import { useFrameInsets } from "./viewer/useFrameInsets";
import { usePreviewQuality } from "./viewer/usePreviewQuality";
import { useSceneSync } from "./viewer/useSceneSync";
import { useViewerShortcuts } from "./viewer/useViewerShortcuts";
import { WorkspaceBar } from "./viewer/WorkspaceBar";
import { ScenePanel } from "./viewer/ScenePanel";
import { StatusBar } from "./viewer/StatusBar";
import { Toolbar } from "./viewer/Toolbar";
import { ViewBar } from "./viewer/ViewBar";
import { ViewerBoundary, ViewerProblem } from "./viewer/ViewerBoundary";
import { ViewGizmo, type OrbitListener } from "./viewer/ViewGizmo";
import { VIEWS, itemLabel } from "./viewer/labels";
import { ErrorState } from "./ui/ErrorState";

const TABLET_QUERY = "(min-width: 721px) and (max-width: 1024px)";

type AssetState = "loading" | "ready" | "error";

const ASSET_NOTES: Record<AssetState, string> = {
    loading: "Cargando el modelo 3D del cuarto…",
    ready: "Modelo 3D del cuarto cargado.",
    error: "No se pudo cargar el modelo 3D del cuarto.",
};

function assetUrl(reference: string | null): string | null {
    if (reference === null) {
        return null;
    }

    if (reference.startsWith("https://")) {
        return reference;
    }

    return reference.startsWith("/api/v1/") ? apiUrl(reference) : null;
}

const NO_ELEMENTS: SpatialElement[] = [];
const ALL_WORK_LAYERS: OverlayLayers = { structure: true, installations: true, finishes: true };
const TOUR_START_AZIMUTH = 0.6;
const TOUR_TURN = 0.7;
const TOOL_CUT_PERCENT = 60;
const ALL_LAYERS: Layers = { rooms: true, roof: true, environment: true, grid: true };

interface StructureViewerProps {
    structure: Structure;
    walkthrough?: boolean;
    /** Only the scene, without panels: to show the model on another screen. */
    preview?: boolean;
    /** Presentation light chosen on another screen; without it the scene follows the theme. */
    lighting?: LightingSettings;
    /** Coordinates of the lot, so that the presentation light is the real sun over it. */
    site?: SolarSite | null;
    /** Hands the engine to the screen that shows the viewer, and `null` when it is gone. */
    onEngine?: (engine: Viewer | null) => void;
    /** Shown at the start of the workspace bar; the project tab leaves it out (its head says it). */
    projectName?: string;
    /** Asks the host to load the model again after a room was moved or resized. */
    onStructureChange?: () => void;
    /** Added at the end of the workspace bar. */
    barExtra?: ReactNode;
}

/**
 * The 3D viewer with its own safety net: if drawing the model fails, or the browser takes the
 * graphics context away, the scene is replaced by an explanation and a button that rebuilds it.
 */
export function StructureViewer(props: StructureViewerProps) {
    const [attempt, setAttempt] = useState(0);
    const [lost, setLost] = useState(false);

    function retry() {
        setLost(false);
        setAttempt((current) => current + 1);
    }

    if (lost) {
        return props.preview === true ? null : (
            <ViewerProblem
                title="El modelo 3D se detuvo"
                text="El navegador liberó la memoria gráfica, algo que pasa al suspender el equipo o con muchas pestañas abiertas. Tus datos están a salvo."
                onRetry={retry}
            />
        );
    }

    return (
        <ViewerBoundary key={attempt} silent={props.preview} onRetry={retry}>
            <ViewerScene {...props} onContextLost={() => setLost(true)} />
        </ViewerBoundary>
    );
}

function ViewerScene({
    structure,
    walkthrough: startInside = false,
    preview = false,
    lighting,
    site = null,
    onEngine,
    projectName,
    onStructureChange,
    barExtra,
    onContextLost,
}: StructureViewerProps & { onContextLost: () => void }) {
    const reportLost = useRef(onContextLost);
    reportLost.current = onContextLost;
    const reportEngine = useRef(onEngine);
    reportEngine.current = onEngine;
    const lit = useMemo(
        () => (lighting === undefined ? null : sceneLighting(lighting, site)),
        [lighting, site],
    );
    const entered = useRef(false);
    const stage = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    // On a tablet the side panels would cover half the model, so they start folded there.
    const wide = () =>
        typeof window.matchMedia !== "function" || !window.matchMedia(TABLET_QUERY).matches;
    const [treeOpen, setTreeOpen] = useState(wide);
    const [inspectorOpen, setInspectorOpen] = useState(wide);
    const [snap, setSnap] = useState(0.25);
    const [moving, setMoving] = useState(false);
    const [objectQuery, setObjectQuery] = useState("");
    const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => new Set());

    function toggleHidden(key: string) {
        setHiddenKeys((previous) => {
            const next = new Set(previous);

            if (!next.delete(key)) {
                next.add(key);
            }

            return next;
        });
    }
    // A presentation shows the building, not the drawing aids.
    const [layers, setLayers] = useState(
        lighting === undefined ? ALL_LAYERS : { ...ALL_LAYERS, grid: false },
    );
    const [view, setView] = useState<ViewName>("isometric");
    const [zoom, setZoom] = useState(100);
    const orbitListener = useRef<OrbitListener | null>(null);
    const [projection, setProjection] = useState<Projection>("perspective");
    const [isolation, setIsolation] = useState<string | null>(null);
    const [touring, setTouring] = useState(false);
    const [cut, setCut] = useState(100);
    const [highlight, setHighlight] = useState<SpatialLayer | null>(null);
    const [workLayers, setWorkLayers] = useState(ALL_WORK_LAYERS);
    const [explode, setExplode] = useState(0);
    const [sun, setSun] = useState(0);
    const [pickedId, setPickedId] = useState<number | null>(null);
    const [inside, setInside] = useState(false);
    const [assetState, setAssetState] = useState<AssetState | null>(null);
    const [help, setHelp] = useState(false);
    const [reason, setReason] = useState<string | null>(null);
    const projectId = structure.project_id;
    const theme = useTheme();
    const quality = usePreviewQuality();
    const save = useProjectSave(projectId);
    const history = useEditHistory(projectId);
    const reload = useRef(onStructureChange);
    reload.current = onStructureChange;
    const colorMode = useProjectState(projectId, (state) => state.colorMode);
    const materials = useProjectState(projectId, (state) => state.materials);
    const recommendations = useProjectState(projectId, (state) => state.recommendations);
    const selection = useProjectState(projectId, (state) => state.selection);
    const surfaces = useProjectState(projectId, (state) => state.surfaces);
    const roof = useProjectState(projectId, (state) => state.roof);
    const selectedKey = selection === null ? null : elementKey(selection);
    const elements = useMemo<StructureElement[]>(
        () => [...structure.rooms, ...structure.components],
        [structure],
    );
    const costs = useMemo(() => estimateCosts(elements, materials), [elements, materials]);
    const alerts = useMemo(
        () => findAlerts(elements, recommendations),
        [elements, recommendations],
    );
    const colors = useMemo<ElementColors | null>(() => {
        if (colorMode === "kind") {
            return kindColors(elements);
        }

        if (colorMode === "cost") {
            return costColors(costs);
        }

        return colorMode === "alerts" ? alertColors(alerts) : null;
    }, [colorMode, elements, costs, alerts]);
    const selected = elements.find((element) => elementKey(element) === selectedKey) ?? null;
    const rooms = useMemo(
        () =>
            structure.rooms
                .filter((room) => room.kind === "room")
                .sort((a, b) => a.base_m - b.base_m),
        [structure],
    );
    const spatial = useAsync(() => spatialApi.get(projectId), [projectId, structure]);
    const walkthrough = useAsync(() => walkthroughApi.get(projectId), [projectId, structure]);
    const roomAssets = useAsync(() => spatialApi.rooms(projectId), [projectId, structure]);
    const works = spatial.data?.elements ?? NO_ELEMENTS;
    const steps = walkthrough.data?.steps;
    const stops = useMemo(() => tourStops(rooms, steps), [rooms, steps]);
    const isolatedRoom = rooms.find((room) => elementKey(room) === isolation) ?? null;
    const isolatedKey = isolatedRoom === null ? null : isolation;
    const stopIndex = stops.findIndex((stop) => stop.key === isolatedKey);
    const currentStop = stopIndex === -1 ? null : stops[stopIndex];
    const picked = works.find((item) => item.id === pickedId) ?? null;
    const highlighted = useMemo<ReadonlySet<string> | null>(() => {
        if (highlight === null) {
            return null;
        }

        return new Set(
            elements
                .filter((element) =>
                    highlight === "structure"
                        ? !isSpace(element)
                        : highlight === "finishes" &&
                          surfaceOf(surfaces, elementKey(element), element.kind) !==
                              DEFAULT_SURFACE[element.kind],
                )
                .map(elementKey),
        );
    }, [highlight, elements, surfaces]);
    const nothingToHighlight =
        highlight === "installations"
            ? !works.some((item) => item.layer === "installations")
            : highlighted !== null && highlighted.size === 0;

    function setSelectedKey(key: string | null) {
        appState.select(projectId, elements.find((element) => elementKey(element) === key) ?? null);
    }

    function pick(key: string | null) {
        const work = works.find((item) => overlayKey(item.id) === key);

        setPickedId(work?.id ?? null);

        if (work === undefined) {
            setSelectedKey(key);
        }
    }

    /** The model changes at once; if the server says no, it goes back and the error is shown. */
    function putSurface(
        element: StructureElement,
        surface: SurfaceMaterialId,
        back: SurfaceMaterialId,
    ) {
        return async () => {
            appState.setSurface(projectId, elementKey(element), surface);

            try {
                await structureApi.setSurface(projectId, element, surface);
            } catch (reason) {
                appState.setSurface(projectId, elementKey(element), back);
                throw reason;
            }
        };
    }

    function changeSurface(element: StructureElement, surface: SurfaceMaterialId) {
        const previous = surfaceOf(surfaces, elementKey(element), element.kind);

        void history.run({
            label: `material de ${itemLabel(element)}`,
            apply: putSurface(element, surface, previous),
            revert: putSurface(element, previous, surface),
        });
    }

    function putRoof(kind: RoofKind, back: RoofKind) {
        return async () => {
            appState.setRoof(projectId, kind);

            try {
                await structureApi.setRoof(projectId, kind);
            } catch (reason) {
                appState.setRoof(projectId, back);
                throw reason;
            }
        };
    }

    function changeRoof(next: RoofKind) {
        void history.run({
            label: "cubierta",
            apply: putRoof(next, roof),
            revert: putRoof(roof, next),
        });
    }

    /** Moves or resizes a room with PATCH /rooms/{id}; the model is then loaded again. */
    function putRoom(room: StructureRoom, geometry: RoomGeometry) {
        return async () => {
            await roomsApi.update(room.id, geometry);
            reload.current?.();
        };
    }

    function changeRoom(room: StructureRoom, next: RoomGeometry, label: string) {
        const before = geometryOf(room);

        void history.run({ label, apply: putRoom(room, next), revert: putRoom(room, before) });
    }

    function visit(key: string | null, stop = stops.findIndex((item) => item.key === key)) {
        setIsolation(key);
        setPickedId(null);

        if (key === null) {
            setTouring(false);
            setInside(false);
            setCut(100);
        } else {
            setSelectedKey(key);
            setCut((current) =>
                stop !== -1 ? stops[stop].cut : current === 100 ? ISOLATION_CUT_PERCENT : current,
            );
        }

        viewer.current?.isolate(key);

        if (inside && key !== null) {
            return;
        }

        // Each stop turns the camera a little, so the walkthrough circles the building.
        viewer.current?.focus(
            key,
            key === null || stop === -1 ? undefined : TOUR_START_AZIMUTH + stop * TOUR_TURN,
        );
    }

    function step(delta: number) {
        if (stops.length > 0) {
            const next = stopIndex === -1 ? 0 : (stopIndex + delta + stops.length) % stops.length;

            visit(stops[next].key, next);
        }
    }

    function toggleInside() {
        if (inside) {
            viewer.current?.focus(isolatedKey);
        }

        setInside(!inside);
    }

    function toggleTour() {
        if (!touring && isolatedKey === null) {
            step(1);
        }

        setTouring(!touring);
    }

    /** Isolates the selected room; pressed again on the isolated one, shows the whole model. */
    const roomSelected = selected !== null && selected.kind === "room";
    const somethingSelected = selected !== null || picked !== null;

    function toggleIsolation() {
        visit(roomSelected && selectedKey !== isolatedKey ? selectedKey : null);
    }

    function focusSelection() {
        viewer.current?.focus(picked === null ? selectedKey : overlayKey(picked.id));
    }

    /** Leaves one level at a time: the interior view, then the isolated room, then the selection. */
    function stepBack() {
        if (inside) {
            toggleInside();
        } else if (isolatedKey !== null) {
            visit(null);
        } else {
            setSelectedKey(null);
            setPickedId(null);
        }
    }

    const selectedRoom: StructureRoom | null =
        selected !== null && selected.kind === "room" ? selected : null;

    function nudgeSelected(dx: number, dy: number) {
        if (selectedRoom !== null) {
            const now = geometryOf(selectedRoom);

            changeRoom(
                selectedRoom,
                {
                    ...now,
                    x_m: snapTo(now.x_m + dx * snap, snap),
                    y_m: snapTo(now.y_m + dy * snap, snap),
                },
                `mover ${selectedRoom.name}`,
            );
        }
    }

    const tools = railTools({
        moving,
        roomSelected,
        somethingSelected,
        isolationPressed: isolatedKey !== null && (!roomSelected || selectedKey === isolatedKey),
        roomIsolated: isolatedKey !== null,
        cutActive: cut < 100,
        inside,
        onMove: () => setMoving(!moving),
        onFocus: focusSelection,
        onIsolate: toggleIsolation,
        onCut: () => setCut(cut === 100 ? TOOL_CUT_PERCENT : 100),
        onInside: toggleInside,
        onCapture: downloadCapture,
        onHelp: () => setHelp(true),
    });

    const tip =
        reason !== null
            ? reason
            : inside || isolatedKey !== null
              ? "Esc vuelve un paso atrás"
              : roomSelected
                ? "I aísla el cuarto · F lo enfoca"
                : somethingSelected
                  ? "F enfoca lo seleccionado · Esc lo suelta"
                  : "Clic para seleccionar · 1 a 4 cambian la vista · ? muestra los atajos";

    useViewerShortcuts(stage, !preview, {
        disabled: unsupported,
        moving: moving && selectedRoom !== null,
        roomSelected: selectedRoom !== null,
        somethingSelected,
        roomIsolated: isolatedKey !== null,
        historyBusy: history.working,
        undo: () => void history.undo(),
        redo: () => void history.redo(),
        nudge: nudgeSelected,
        toggleMoving: () => setMoving(!moving),
        chooseView,
        focusSelection,
        toggleIsolation,
        stepBack,
        showHelp: () => setHelp(true),
    });

    const selectByKey = useRef(pick);
    selectByKey.current = pick;

    const advance = useRef(step);
    advance.current = step;

    const enter = useRef(visit);
    enter.current = visit;

    const stopsReady = !walkthrough.loading;
    const firstStop = stops[0]?.key ?? null;

    // Opened as a walkthrough, the viewer goes straight into the first stop.
    useEffect(() => {
        if (startInside && stopsReady && firstStop !== null && !entered.current) {
            entered.current = true;
            enter.current(firstStop, 0);
            setInside(true);
        }
    }, [startInside, stopsReady, firstStop]);

    useEffect(() => {
        if (container.current === null) {
            return;
        }

        try {
            viewer.current = createStructureViewer(container.current, {
                onSelect: (key) => selectByKey.current(key),
                onZoom: setZoom,
                onOrbit: (azimuth, elevation) => orbitListener.current?.(azimuth, elevation),
                onAsset: setAssetState,
                onContextLost: () => reportLost.current(),
            });
        } catch {
            setUnsupported(true);
            return;
        }

        reportEngine.current?.(viewer.current);

        return () => {
            reportEngine.current?.(null);
            viewer.current?.dispose();
            viewer.current = null;
        };
    }, []);

    useFrameInsets(stage, container, viewer, !preview, {
        tree: treeOpen,
        inspector: inspectorOpen,
        treeShown: isolatedRoom === null,
    });

    useEffect(() => {
        void appState.refresh(projectId);
    }, [projectId]);

    const meshUrl = assetUrl(
        roomAssets.data?.find((room) => room.id === isolatedRoom?.id)?.mesh_ref ?? null,
    );

    useSceneSync(viewer, {
        structure,
        projectId,
        elements,
        quality,
        untouched: isolation === null && selectedKey === null && lighting === undefined,
        roof,
        selectedKey,
        colors,
        surfaces,
        layers,
        hiddenKeys,
        sun,
        lit,
        palette: lit?.palette ?? SCENE_PALETTES[theme],
        projection,
        isolatedKey,
        cut,
        highlighted,
        works,
        workLayers,
        explode,
        inside,
        pose: currentStop?.camera ?? null,
        meshUrl,
        onAssetLoading: (url) => setAssetState(url === null ? null : "loading"),
    });

    useEffect(() => {
        setReason(null);
    }, [selectedKey, isolatedKey, pickedId]);

    const stopDuration = currentStop?.durationMs ?? TOUR_STEP_MS;

    useEffect(() => {
        if (!touring) {
            return;
        }

        const timer = window.setTimeout(() => advance.current(1), stopDuration);

        return () => window.clearTimeout(timer);
    }, [touring, isolatedKey, stopDuration]);

    function chooseView(next: ViewName) {
        setView(next);
        viewer.current?.setView(next);
    }

    function downloadCapture() {
        const image = viewer.current?.capture();

        if (typeof image !== "string" || !image.startsWith("data:image/")) {
            showToast("No se pudo guardar la imagen del modelo. Inténtalo de nuevo.", "error");

            return;
        }

        const link = document.createElement("a");

        link.href = image;
        link.download = `arquila-proyecto-${projectId}.png`;
        link.click();
        showToast("Imagen del modelo guardada en tus descargas.");
    }

    function toggleFullscreen() {
        if (document.fullscreenElement === null) {
            stage.current?.requestFullscreen().catch(() => undefined);
        } else {
            document.exitFullscreen().catch(() => undefined);
        }
    }

    // Mirrors the engine's rule: the roof goes with the rooms of the top floor.
    const topBase = Math.max(...elements.filter(isSpace).map((element) => element.base_m));
    const roofHiddenWithRooms = elements.some(
        (element) =>
            isSpace(element) && element.base_m === topBase && hiddenKeys.has(elementKey(element)),
    );
    const wanted = objectQuery.trim().toLowerCase();
    const visibleElements =
        wanted === ""
            ? elements
            : elements.filter((element) => itemLabel(element).toLowerCase().includes(wanted));

    if (unsupported) {
        if (preview) {
            return null;
        }

        return (
            <ErrorState
                message={
                    <>Este navegador no puede mostrar gráficos 3D (WebGL no está disponible).</>
                }
            />
        );
    }

    return (
        <div
            className={
                preview
                    ? "structure-stage structure-stage-preview"
                    : [
                          "structure-stage ws3d",
                          treeOpen ? "ws3d-tree" : "",
                          inspectorOpen ? "ws3d-inspector" : "",
                      ]
                          .filter(Boolean)
                          .join(" ")
            }
            ref={stage}
            data-viewer-keys={preview ? undefined : ""}
        >
            <div
                ref={container}
                className="structure-viewer"
                role="img"
                aria-label={`Modelo 3D con ${structure.terrains.length} terrenos, ${structure.rooms.length} espacios y ${structure.components.length} componentes estructurales`}
            />
            {/* The panels over the scene are dark in both themes, like an instrument panel. */}
            {!preview && (
                <div className="hud-layer" data-theme="dark">
                    <WorkspaceBar
                        projectName={projectName}
                        save={save.state}
                        undoLabel={history.undoLabel}
                        redoLabel={history.redoLabel}
                        working={history.working}
                        onUndo={() => void history.undo()}
                        onRedo={() => void history.redo()}
                        tree={treeOpen}
                        onToggleTree={() => setTreeOpen((open) => !open)}
                        inspector={inspectorOpen}
                        onToggleInspector={() => setInspectorOpen((open) => !open)}
                        extra={barExtra}
                    />
                    <ToolRail tools={tools} onUnavailable={setReason} />
                    <p className="visually-hidden" role="status">
                        {reason}
                    </p>
                    {isolatedRoom === null ? (
                        <ObjectTree
                            elements={elements}
                            visibleElements={visibleElements}
                            query={objectQuery}
                            onQuery={setObjectQuery}
                            selectedKey={selectedKey}
                            onSelect={setSelectedKey}
                            hiddenKeys={hiddenKeys}
                            onToggleHidden={toggleHidden}
                            roofHiddenWithRooms={roofHiddenWithRooms}
                        />
                    ) : (
                        <RoomWorksPanel
                            projectId={projectId}
                            roomId={isolatedRoom.id}
                            title={currentStop?.title ?? isolatedRoom.name}
                            description={currentStop?.description ?? null}
                            elements={works.filter((item) => item.room_id === isolatedRoom.id)}
                            logs={(walkthrough.data?.renovation_logs ?? []).filter(
                                (log) => log.room_id === isolatedRoom.id,
                            )}
                            unavailable={spatial.error ?? walkthrough.error}
                            assetNote={assetState === null ? null : ASSET_NOTES[assetState]}
                            onChanged={walkthrough.reload}
                            onFocus={(item) => {
                                setPickedId(item.id);
                                viewer.current?.focus(overlayKey(item.id));
                            }}
                        />
                    )}
                    <div className="hud-dock">
                        <InspectorPanel
                            picked={picked}
                            selected={selected}
                            selectedRoom={selectedRoom}
                            surfaces={surfaces}
                            cost={selected === null ? undefined : costs.get(elementKey(selected))}
                            alerts={
                                selected === null ? [] : (alerts.get(elementKey(selected)) ?? [])
                            }
                            snap={snap}
                            onSnap={setSnap}
                            busy={history.working}
                            saveError={save.state === "error" ? save.message : null}
                            onSurface={changeSurface}
                            onRoom={changeRoom}
                        />
                        <ScenePanel
                            layers={layers}
                            onLayers={setLayers}
                            cut={cut}
                            onCut={setCut}
                            explode={explode}
                            onExplode={setExplode}
                            sun={sun}
                            onSun={setSun}
                            roof={roof}
                            onRoof={changeRoof}
                        />
                        <ColorPanel
                            colorMode={colorMode}
                            onColorMode={(mode) => appState.setColorMode(projectId, mode)}
                            costCount={costs.size}
                            alertCount={alerts.size}
                            workLayers={workLayers}
                            onWorkLayers={setWorkLayers}
                            workCounts={spatial.data?.counts}
                            highlight={highlight}
                            onHighlight={setHighlight}
                            nothingToHighlight={nothingToHighlight}
                        />
                    </div>
                    <ViewGizmo listener={orbitListener} />
                    <div className="hud-cambar">
                        <ViewBar
                            view={view}
                            onView={chooseView}
                            zoom={zoom}
                            onZoom={(factor) => viewer.current?.zoomBy(factor)}
                            projection={projection}
                            onProjection={setProjection}
                        />
                        <Toolbar
                            onReset={() => chooseView(view)}
                            onFullscreen={toggleFullscreen}
                            hasStops={stops.length > 0}
                            touring={touring}
                            onToggleTour={toggleTour}
                            onStep={step}
                            roomLabel={
                                isolatedRoom === null
                                    ? null
                                    : currentStop === null
                                      ? isolatedRoom.name
                                      : `${currentStop.title} · ${stopIndex + 1} de ${stops.length}`
                            }
                            onShowAll={() => visit(null)}
                        />
                    </div>
                    <StatusBar
                        selection={selected === null ? "Sin selección" : itemLabel(selected)}
                        camera={VIEWS.find((item) => item.id === view)?.label ?? ""}
                        projection={projection}
                        zoom={zoom}
                        tip={tip}
                    />
                    {help && (
                        <ShortcutsDialog
                            container={
                                document.fullscreenElement === stage.current ? stage.current : null
                            }
                            onClose={() => setHelp(false)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
