import { useEffect, useMemo, useRef, useState } from "react";

import { errorMessage, useAsync } from "../hooks/useAsync";
import { spatialApi, structureApi, walkthroughApi } from "../services/api";
import { apiUrl } from "../services/http";
import { appState, useProjectState } from "../state/appState";
import { useTheme } from "../state/theme";
import {
    SCENE_PALETTES,
    createStructureViewer,
    elementKey,
    isSpace,
    overlayKey,
    type CameraPose,
    type Layers,
    type OverlayLayers,
    type Projection,
    type StructureViewer as Viewer,
    type ViewName,
} from "../three/BuildingSceneManager";
import { sceneLighting } from "../three/lightingPalette";
import type { LightingSettings } from "../utils/lighting";
import type {
    RecommendationPriority,
    RoofKind,
    SpatialElement,
    SpatialLayer,
    Structure,
    StructureElement,
} from "../types/api";
import {
    HIGH_COLOR,
    KIND_COLORS,
    LOW_COLOR,
    PRIORITY_COLORS,
    alertColors,
    costColors,
    cssColor,
    estimateCosts,
    findAlerts,
    kindColors,
    type ColorMode,
    type ElementColors,
} from "../utils/elementColors";
import { formatMoney, formatNumber } from "../utils/format";
import {
    DEFAULT_SURFACE,
    SURFACE_MATERIALS,
    SURFACE_MATERIAL_IDS,
    savedSurfaces,
    surfaceOf,
    type SurfaceMaterialId,
} from "../utils/surfaceMaterials";
import {
    RoomWorksPanel,
    WORK_LAYERS,
    WORK_STATUS_LABELS,
    layerLabel,
    workSwatch,
} from "./RoomWorksPanel";
import { ObjectTree } from "./viewer/ObjectTree";
import { ScenePanel } from "./viewer/ScenePanel";
import { StatusBar } from "./viewer/StatusBar";
import { Toolbar } from "./viewer/Toolbar";
import { ViewBar } from "./viewer/ViewBar";
import { ViewGizmo, type OrbitListener } from "./viewer/ViewGizmo";
import { KIND_LABELS, VIEWS, itemLabel, type SaveState } from "./viewer/labels";

const TABLET_QUERY = "(min-width: 721px) and (max-width: 1024px)";

const COLOR_MODES: { id: ColorMode; label: string }[] = [
    { id: "realistic", label: "Realista" },
    { id: "kind", label: "Tipo" },
    { id: "cost", label: "Coste" },
    { id: "alerts", label: "Alertas" },
];

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
    high: "Prioridad alta",
    medium: "Prioridad media",
    low: "Prioridad baja",
};

const KIND_LEGEND = (Object.keys(KIND_LABELS) as StructureElement["kind"][]).map((kind) => ({
    label: KIND_LABELS[kind],
    swatch: cssColor(KIND_COLORS[kind]),
}));

const COST_LEGEND = [
    {
        label: "De menor a mayor coste estimado",
        swatch: `linear-gradient(90deg, ${cssColor(LOW_COLOR)}, ${cssColor(HIGH_COLOR)})`,
    },
];

const ALERT_LEGEND = (Object.keys(PRIORITY_LABELS) as RecommendationPriority[]).map((priority) => ({
    label: PRIORITY_LABELS[priority],
    swatch: cssColor(PRIORITY_COLORS[priority]),
}));

const HIGHLIGHTS: Record<SpatialLayer, { title: string; empty: string }> = {
    structure: {
        title: "Resalta columnas, vigas y muros",
        empty: "El proyecto no tiene componentes estructurales.",
    },
    installations: {
        title: "Atenúa el modelo para dejar a la vista las instalaciones",
        empty: "El proyecto no tiene instalaciones registradas.",
    },
    finishes: {
        title: "Resalta los elementos con un material asignado",
        empty: "Ningún elemento tiene un material distinto al predeterminado.",
    },
};

interface TourStop {
    key: string;
    title: string;
    description: string | null;
    durationMs: number;
    cut: number;
    camera: CameraPose | null;
}

type AssetState = "loading" | "ready" | "error";

const ASSET_NOTES: Record<AssetState, string> = {
    loading: "Cargando el modelo 3D del cuarto…",
    ready: "Modelo 3D del cuarto cargado.",
    error: "No se pudo cargar el modelo 3D del cuarto.",
};

function isPoint(value: unknown): boolean {
    return (
        Array.isArray(value) &&
        value.length === 3 &&
        value.every((item) => typeof item === "number")
    );
}

function readPose(value: unknown): CameraPose | null {
    const pose = value as Partial<CameraPose> | null | undefined;

    return typeof pose === "object" &&
        pose !== null &&
        isPoint(pose.position) &&
        isPoint(pose.target)
        ? (pose as CameraPose)
        : null;
}

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
const TOUR_STEP_MS = 5000;
const TOUR_START_AZIMUTH = 0.6;
const TOUR_TURN = 0.7;
const ISOLATION_CUT_PERCENT = 80;
const ALL_LAYERS: Layers = { rooms: true, roof: true, environment: true, grid: true };

interface StructureViewerProps {
    structure: Structure;
    walkthrough?: boolean;
    /** Only the scene, without panels: to show the model on another screen. */
    preview?: boolean;
    /** Presentation light chosen on another screen; without it the scene follows the theme. */
    lighting?: LightingSettings;
    /** Hands the engine to the screen that shows the viewer, and `null` when it is gone. */
    onEngine?: (engine: Viewer | null) => void;
}

export function StructureViewer({
    structure,
    walkthrough: startInside = false,
    preview = false,
    lighting,
    onEngine,
}: StructureViewerProps) {
    const reportEngine = useRef(onEngine);
    reportEngine.current = onEngine;
    const lit = useMemo(
        () => (lighting === undefined ? null : sceneLighting(lighting)),
        [lighting],
    );
    const entered = useRef(false);
    const stage = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    // On a tablet the side panels would cover half the model, so they start folded there.
    const [panels, setPanels] = useState(
        () => typeof window.matchMedia !== "function" || !window.matchMedia(TABLET_QUERY).matches,
    );
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
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState<SaveState>("idle");
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
    const projectId = structure.project_id;
    const theme = useTheme();
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
    const stops = useMemo<TourStop[]>(() => {
        const planned = (steps ?? []).flatMap((item) => {
            const room = rooms.find((candidate) => candidate.id === item.room_id);
            const cut = item.view_config.cut_fraction;

            return room === undefined
                ? []
                : [
                      {
                          key: elementKey(room),
                          title: item.title,
                          description: item.description,
                          durationMs: item.duration_ms,
                          cut:
                              typeof cut === "number"
                                  ? Math.round(cut * 100)
                                  : ISOLATION_CUT_PERCENT,
                          camera: readPose(item.view_config.camera),
                      },
                  ];
        });

        return planned.length > 0
            ? planned
            : rooms.map((room) => ({
                  key: elementKey(room),
                  title: room.name,
                  description: null,
                  durationMs: TOUR_STEP_MS,
                  cut: ISOLATION_CUT_PERCENT,
                  camera: null,
              }));
    }, [rooms, steps]);
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

    function changeSurface(element: StructureElement, surface: SurfaceMaterialId) {
        const key = elementKey(element);
        const previous = surfaceOf(surfaces, key, element.kind);

        setSaveError(null);
        setSaving("saving");
        appState.setSurface(projectId, key, surface);
        structureApi
            .setSurface(projectId, element, surface)
            .then(() => setSaving("saved"))
            .catch((reason: unknown) => {
                appState.setSurface(projectId, key, previous);
                setSaving("error");
                setSaveError(`No se guardó el material: ${errorMessage(reason)}`);
            });
    }

    function changeRoof(next: RoofKind) {
        const previous = roof;

        setSaveError(null);
        setSaving("saving");
        appState.setRoof(projectId, next);
        structureApi
            .setRoof(projectId, next)
            .then(() => setSaving("saved"))
            .catch((reason: unknown) => {
                appState.setRoof(projectId, previous);
                setSaving("error");
                setSaveError(`No se guardó la cubierta: ${errorMessage(reason)}`);
            });
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

    const selectedCost = selected === null ? undefined : costs.get(elementKey(selected));
    const selectedAlerts = selected === null ? [] : (alerts.get(elementKey(selected)) ?? []);
    const legend =
        colorMode === "kind" ? KIND_LEGEND : colorMode === "cost" ? COST_LEGEND : ALERT_LEGEND;
    const colorNote =
        colorMode === "cost" && costs.size === 0
            ? "Registra materiales con cantidad y coste para ver el reparto."
            : colorMode === "alerts" && alerts.size === 0
              ? "Ninguna recomendación menciona un elemento por su nombre."
              : null;

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

    useEffect(() => {
        void appState.refresh(projectId);
    }, [projectId]);

    useEffect(() => {
        viewer.current?.show(structure);
    }, [structure]);

    useEffect(() => {
        appState.setSurfaces(projectId, savedSurfaces(elements));
        appState.setRoof(projectId, structure.roof);
    }, [projectId, elements, structure.roof]);

    useEffect(() => {
        viewer.current?.setRoof(roof);
    }, [roof, structure]);

    useEffect(() => {
        setSaveError(null);
    }, [selectedKey]);

    useEffect(() => {
        viewer.current?.select(selectedKey);
    }, [selectedKey, structure]);

    useEffect(() => {
        viewer.current?.setColors(colors);
    }, [colors]);

    useEffect(() => {
        viewer.current?.setSurfaces(surfaces);
    }, [surfaces, structure]);

    useEffect(() => {
        viewer.current?.setLayers(layers);
    }, [layers]);

    useEffect(() => {
        viewer.current?.setHidden(hiddenKeys);
    }, [hiddenKeys, structure]);

    useEffect(() => {
        if (lit === null) {
            viewer.current?.setSun(sun);
        } else {
            viewer.current?.setSun(lit.azimuth, lit.elevation);
            viewer.current?.setExposure(lit.exposure);
            viewer.current?.setShadows(lit.shadows);
        }
    }, [sun, lit, structure]);

    useEffect(() => {
        viewer.current?.setProjection(projection);
    }, [projection, structure]);

    useEffect(() => {
        viewer.current?.isolate(isolatedKey);
    }, [isolatedKey, structure]);

    useEffect(() => {
        viewer.current?.setCutaway(cut / 100);
    }, [cut, structure]);

    useEffect(() => {
        viewer.current?.setHighlight(highlighted);
    }, [highlighted, structure]);

    useEffect(() => {
        viewer.current?.setOverlays(works);
    }, [works]);

    useEffect(() => {
        viewer.current?.setOverlayLayers(workLayers);
    }, [workLayers]);

    useEffect(() => {
        viewer.current?.setExplode(explode / 100);
    }, [explode]);

    const pose = currentStop?.camera ?? null;

    useEffect(() => {
        viewer.current?.enterRoom(inside ? isolatedKey : null, pose ?? undefined);
    }, [inside, isolatedKey, pose, structure]);

    const meshUrl = assetUrl(
        roomAssets.data?.find((room) => room.id === isolatedRoom?.id)?.mesh_ref ?? null,
    );

    useEffect(() => {
        setAssetState(meshUrl === null ? null : "loading");
        viewer.current?.setAsset(meshUrl);
    }, [meshUrl, structure]);

    const stopDuration = currentStop?.durationMs ?? TOUR_STEP_MS;

    useEffect(() => {
        if (!touring) {
            return;
        }

        const timer = window.setTimeout(() => advance.current(1), stopDuration);

        return () => window.clearTimeout(timer);
    }, [touring, isolatedKey, stopDuration]);

    useEffect(() => {
        viewer.current?.setPalette(lit?.palette ?? SCENE_PALETTES[theme]);
    }, [theme, lit, structure]);

    function chooseView(next: ViewName) {
        setView(next);
        viewer.current?.setView(next);
    }

    function downloadCapture() {
        const image = viewer.current?.capture();

        if (image === undefined) {
            return;
        }

        const link = document.createElement("a");

        link.href = image;
        link.download = `arquila-proyecto-${projectId}.png`;
        link.click();
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
            <p className="message message-error" role="alert">
                Este navegador no puede mostrar gráficos 3D (WebGL no está disponible).
            </p>
        );
    }

    return (
        <div
            className={preview ? "structure-stage structure-stage-preview" : "structure-stage"}
            ref={stage}
        >
            <div
                ref={container}
                className="structure-viewer"
                role="img"
                aria-label={`Modelo 3D con ${structure.terrains.length} terrenos, ${structure.rooms.length} espacios y ${structure.components.length} componentes estructurales`}
            />
            {/* The panels over the scene are dark in both themes, like an instrument panel. */}
            {!preview && (
                <div className={panels ? "hud-layer" : "hud-layer hud-layer-min"} data-theme="dark">
                    <ViewBar
                        view={view}
                        onView={chooseView}
                        zoom={zoom}
                        onZoom={(factor) => viewer.current?.zoomBy(factor)}
                        projection={projection}
                        onProjection={setProjection}
                        panels={panels}
                        onTogglePanels={() => setPanels((visible) => !visible)}
                    />
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
                        <aside
                            className="hud hud-inspector"
                            aria-live="polite"
                            aria-label="Inspector"
                        >
                            <details open>
                                <summary>Inspector</summary>
                                {picked !== null && (
                                    <dl className="hud-picked">
                                        <dt>Elemento</dt>
                                        <dd>{picked.name}</dd>
                                        <dt>Capa</dt>
                                        <dd>
                                            <span
                                                className="hud-swatch"
                                                style={{ background: workSwatch(picked) }}
                                            />
                                            {layerLabel(picked.layer)}
                                        </dd>
                                        <dt>Estado</dt>
                                        <dd>{WORK_STATUS_LABELS[picked.work_status]}</dd>
                                        <dt>Medidas</dt>
                                        <dd>
                                            {formatNumber(picked.max_x_m - picked.min_x_m)} ×{" "}
                                            {formatNumber(picked.max_y_m - picked.min_y_m)} ×{" "}
                                            {formatNumber(picked.max_z_m - picked.min_z_m)} m
                                        </dd>
                                        <dt>Altura de la base</dt>
                                        <dd>+{formatNumber(picked.min_z_m)} m</dd>
                                    </dl>
                                )}
                                {selected === null ? (
                                    picked === null && (
                                        <p>
                                            Haz clic en un cuarto, un componente o una instalación
                                            para inspeccionarlo, o doble clic para acercar la cámara
                                            a él.
                                        </p>
                                    )
                                ) : (
                                    <dl>
                                        <dt>Nombre</dt>
                                        <dd>{selected.name}</dd>
                                        <dt>Tipo</dt>
                                        <dd>{KIND_LABELS[selected.kind]}</dd>
                                        <dt className="hud-wide">
                                            <label htmlFor="inspector-surface">Material</label>
                                        </dt>
                                        <dd className="hud-wide">
                                            <select
                                                id="inspector-surface"
                                                value={surfaceOf(
                                                    surfaces,
                                                    elementKey(selected),
                                                    selected.kind,
                                                )}
                                                onChange={(event) =>
                                                    changeSurface(
                                                        selected,
                                                        event.target.value as SurfaceMaterialId,
                                                    )
                                                }
                                            >
                                                {SURFACE_MATERIAL_IDS.map((id) => (
                                                    <option key={id} value={id}>
                                                        {SURFACE_MATERIALS[id].label}
                                                    </option>
                                                ))}
                                            </select>
                                        </dd>
                                        <dt>Plano</dt>
                                        <dd>{selected.plan_title}</dd>
                                        <dt>Nivel</dt>
                                        <dd>{selected.level ?? "—"}</dd>
                                        <dt>Medidas</dt>
                                        <dd>
                                            {formatNumber(selected.width_m)} ×{" "}
                                            {formatNumber(selected.depth_m)} ×{" "}
                                            {formatNumber(selected.height_m)} m
                                        </dd>
                                        {isSpace(selected) && (
                                            <>
                                                <dt>Área</dt>
                                                <dd>
                                                    {formatNumber(
                                                        selected.width_m * selected.depth_m,
                                                    )}{" "}
                                                    m²
                                                </dd>
                                            </>
                                        )}
                                        <dt>Volumen</dt>
                                        <dd>
                                            {formatNumber(
                                                selected.width_m *
                                                    selected.depth_m *
                                                    selected.height_m,
                                            )}{" "}
                                            m³
                                        </dd>
                                        <dt>Altura de la base</dt>
                                        <dd>+{formatNumber(selected.base_m)} m</dd>
                                        {selectedCost !== undefined && (
                                            <>
                                                <dt>Coste estimado</dt>
                                                <dd>{formatMoney(selectedCost)}</dd>
                                            </>
                                        )}
                                    </dl>
                                )}
                                {selected !== null && (
                                    <button
                                        type="button"
                                        className="hud-item"
                                        title="Acerca la cámara al elemento seleccionado"
                                        onClick={() => viewer.current?.focus(selectedKey)}
                                    >
                                        Enfocar
                                    </button>
                                )}
                                {selected !== null && selected.kind === "room" && (
                                    <button
                                        type="button"
                                        className="hud-item"
                                        aria-pressed={selectedKey === isolatedKey}
                                        title="Oculta el resto del modelo y deja solo este cuarto con su estructura"
                                        onClick={() =>
                                            visit(selectedKey === isolatedKey ? null : selectedKey)
                                        }
                                    >
                                        Aislar cuarto
                                    </button>
                                )}
                                {saveError !== null && (
                                    <p className="message message-error" role="alert">
                                        {saveError}
                                    </p>
                                )}
                                {selectedAlerts.length > 0 && (
                                    <ul className="hud-alerts">
                                        {selectedAlerts.map((alert) => (
                                            <li key={alert.id}>
                                                <span
                                                    className="hud-swatch"
                                                    style={{
                                                        background: cssColor(
                                                            PRIORITY_COLORS[alert.priority],
                                                        ),
                                                    }}
                                                />
                                                {alert.content}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </details>
                        </aside>
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
                        <aside className="hud hud-colors" aria-label="Color del modelo">
                            <details>
                                <summary>
                                    Color ·{" "}
                                    {COLOR_MODES.find((mode) => mode.id === colorMode)?.label}
                                </summary>
                                <div className="hud-modes" role="group" aria-label="Modo de color">
                                    {COLOR_MODES.map((mode) => (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            className="hud-item"
                                            aria-pressed={mode.id === colorMode}
                                            onClick={() =>
                                                appState.setColorMode(projectId, mode.id)
                                            }
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                                {colorMode !== "realistic" && (
                                    <ul className="hud-legend">
                                        {legend.map((item) => (
                                            <li key={item.label}>
                                                <span
                                                    className="hud-swatch"
                                                    style={{ background: item.swatch }}
                                                />
                                                {item.label}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {colorMode === "cost" && costs.size > 0 && (
                                    <p>
                                        Reparto del presupuesto de materiales según el volumen de
                                        cada elemento.
                                    </p>
                                )}
                                {colorNote !== null && <p>{colorNote}</p>}
                                <h4>Capas de obra</h4>
                                <div
                                    className="hud-work-layers"
                                    role="group"
                                    aria-label="Capas de obra"
                                >
                                    {WORK_LAYERS.map((layer) => (
                                        <div key={layer.id}>
                                            <label
                                                className="checkbox"
                                                title={`Muestra u oculta los elementos de ${layer.label.toLowerCase()} registrados`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={workLayers[layer.id]}
                                                    onChange={(event) =>
                                                        setWorkLayers({
                                                            ...workLayers,
                                                            [layer.id]: event.target.checked,
                                                        })
                                                    }
                                                />
                                                <span
                                                    className="hud-swatch"
                                                    style={{ background: layer.swatch }}
                                                />
                                                {layer.label}
                                                <span className="hud-count">
                                                    {spatial.data?.counts[layer.id] ?? 0}
                                                </span>
                                            </label>
                                            <button
                                                type="button"
                                                className="hud-item"
                                                aria-pressed={layer.id === highlight}
                                                title={HIGHLIGHTS[layer.id].title}
                                                onClick={() =>
                                                    setHighlight(
                                                        layer.id === highlight ? null : layer.id,
                                                    )
                                                }
                                            >
                                                Resaltar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {highlight !== null && nothingToHighlight && (
                                    <p>{HIGHLIGHTS[highlight].empty}</p>
                                )}
                            </details>
                        </aside>
                    </div>
                    <ViewGizmo listener={orbitListener} />
                    <Toolbar
                        onReset={() => chooseView(view)}
                        onFullscreen={toggleFullscreen}
                        onDownload={downloadCapture}
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
                        inside={inside}
                        onToggleInside={toggleInside}
                        onShowAll={() => visit(null)}
                    />
                    <StatusBar
                        selection={selected === null ? "Sin selección" : itemLabel(selected)}
                        camera={VIEWS.find((item) => item.id === view)?.label ?? ""}
                        projection={projection}
                        zoom={zoom}
                        saving={saving}
                    />
                </div>
            )}
        </div>
    );
}
