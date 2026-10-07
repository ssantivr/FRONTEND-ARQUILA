import { useEffect, useMemo, useRef, useState } from "react";

import { errorMessage, useAsync } from "../hooks/useAsync";
import { spatialApi, structureApi, walkthroughApi } from "../services/api";
import { appState, useProjectState } from "../state/appState";
import { useTheme } from "../state/theme";
import {
    SCENE_PALETTES,
    createStructureViewer,
    elementKey,
    isSpace,
    overlayKey,
    type LayerName,
    type Layers,
    type OverlayLayers,
    type StructureViewer as Viewer,
    type ViewName,
} from "../three/BuildingSceneManager";
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

interface Level {
    planId: number;
    title: string;
    base: number;
    elements: StructureElement[];
}

const KIND_LABELS: Record<StructureElement["kind"], string> = {
    room: "Cuarto",
    volume: "Volumen sin cuartos",
    column: "Columna",
    beam: "Viga",
    wall: "Muro",
};

const VIEWS: { id: ViewName; label: string }[] = [
    { id: "isometric", label: "Isométrica" },
    { id: "front", label: "Frontal" },
    { id: "side", label: "Lateral" },
    { id: "top", label: "Superior" },
];

const LAYERS: { id: LayerName; label: string }[] = [
    { id: "rooms", label: "Cuartos" },
    { id: "roof", label: "Techo" },
    { id: "environment", label: "Árboles" },
    { id: "grid", label: "Cuadrícula" },
];

const ROOFS: { id: RoofKind; label: string }[] = [
    { id: "gable", label: "A dos aguas" },
    { id: "flat", label: "Plana" },
];

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
}

const NO_ELEMENTS: SpatialElement[] = [];
const ALL_WORK_LAYERS: OverlayLayers = { structure: true, installations: true, finishes: true };
const TOUR_STEP_MS = 5000;
const TOUR_START_AZIMUTH = 0.6;
const TOUR_TURN = 0.7;
const EXPLODE_STEP_PERCENT = 5;
const ISOLATION_CUT_PERCENT = 80;
const CUT_MIN_PERCENT = 10;
const CUT_STEP_PERCENT = 5;
const ALL_LAYERS: Layers = { rooms: true, roof: true, environment: true, grid: true };
const ZOOM_STEP = 1.25;

function groupByLevel(elements: StructureElement[]): Level[] {
    const levels = new Map<number, Level>();

    for (const element of elements) {
        const level = levels.get(element.plan_id);

        if (level === undefined) {
            levels.set(element.plan_id, {
                planId: element.plan_id,
                title: element.plan_title,
                base: element.base_m,
                elements: [element],
            });
        } else {
            level.base = Math.min(level.base, element.base_m);
            level.elements.push(element);
        }
    }

    return [...levels.values()].sort((a, b) => a.base - b.base);
}

function itemLabel(element: StructureElement): string {
    if (element.kind === "volume") {
        return "Volumen del nivel";
    }

    return isSpace(element) ? element.name : `${KIND_LABELS[element.kind]} · ${element.name}`;
}

export function StructureViewer({ structure }: { structure: Structure }) {
    const stage = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    const [layers, setLayers] = useState(ALL_LAYERS);
    const [view, setView] = useState<ViewName>("isometric");
    const [zoom, setZoom] = useState(100);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isolation, setIsolation] = useState<string | null>(null);
    const [touring, setTouring] = useState(false);
    const [cut, setCut] = useState(100);
    const [highlight, setHighlight] = useState<SpatialLayer | null>(null);
    const [workLayers, setWorkLayers] = useState(ALL_WORK_LAYERS);
    const [explode, setExplode] = useState(0);
    const [pickedId, setPickedId] = useState<number | null>(null);
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
        appState.setSurface(projectId, key, surface);
        structureApi.setSurface(projectId, element, surface).catch((reason: unknown) => {
            appState.setSurface(projectId, key, previous);
            setSaveError(`No se guardó el material: ${errorMessage(reason)}`);
        });
    }

    function changeRoof(next: RoofKind) {
        const previous = roof;

        setSaveError(null);
        appState.setRoof(projectId, next);
        structureApi.setRoof(projectId, next).catch((reason: unknown) => {
            appState.setRoof(projectId, previous);
            setSaveError(`No se guardó la cubierta: ${errorMessage(reason)}`);
        });
    }

    function visit(key: string | null, stop = stops.findIndex((item) => item.key === key)) {
        setIsolation(key);
        setPickedId(null);

        if (key === null) {
            setTouring(false);
            setCut(100);
        } else {
            setSelectedKey(key);
            setCut((current) =>
                stop !== -1 ? stops[stop].cut : current === 100 ? ISOLATION_CUT_PERCENT : current,
            );
        }

        viewer.current?.isolate(key);
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
            });
        } catch {
            setUnsupported(true);
            return;
        }

        return () => {
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

    const stopDuration = currentStop?.durationMs ?? TOUR_STEP_MS;

    useEffect(() => {
        if (!touring) {
            return;
        }

        const timer = window.setTimeout(() => advance.current(1), stopDuration);

        return () => window.clearTimeout(timer);
    }, [touring, isolatedKey, stopDuration]);

    useEffect(() => {
        viewer.current?.setPalette(SCENE_PALETTES[theme]);
    }, [theme, structure]);

    function chooseView(next: ViewName) {
        setView(next);
        viewer.current?.setView(next);
    }

    function toggleFullscreen() {
        if (document.fullscreenElement === null) {
            stage.current?.requestFullscreen().catch(() => undefined);
        } else {
            document.exitFullscreen().catch(() => undefined);
        }
    }

    if (unsupported) {
        return (
            <p className="message message-error" role="alert">
                Este navegador no puede mostrar gráficos 3D (WebGL no está disponible).
            </p>
        );
    }

    return (
        <div className="structure-stage" ref={stage}>
            <div
                ref={container}
                className="structure-viewer"
                role="img"
                aria-label={`Modelo 3D con ${structure.terrains.length} terrenos, ${structure.rooms.length} espacios y ${structure.components.length} componentes estructurales`}
            />
            <div className="hud hud-views" role="group" aria-label="Vista de la cámara">
                {VIEWS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className="hud-item"
                        aria-pressed={item.id === view}
                        onClick={() => chooseView(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
                <button
                    type="button"
                    className="hud-item"
                    aria-label="Acercar"
                    onClick={() => viewer.current?.zoomBy(ZOOM_STEP)}
                >
                    +
                </button>
                <button
                    type="button"
                    className="hud-item"
                    aria-label="Alejar"
                    onClick={() => viewer.current?.zoomBy(1 / ZOOM_STEP)}
                >
                    −
                </button>
                <span className="hud-readout">Zoom {zoom} %</span>
            </div>
            {isolatedRoom === null ? (
                <aside className="hud hud-levels" aria-label="Niveles del modelo">
                    <h3>Niveles</h3>
                    {elements.length === 0 && (
                        <p>
                            Agrega cuartos a un plano, o ponle un nivel numérico, para verlo aquí.
                        </p>
                    )}
                    {groupByLevel(elements).map((level) => (
                        <section key={level.planId}>
                            <h4>{level.title}</h4>
                            {level.elements.map((element) => {
                                const key = elementKey(element);

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className="hud-item"
                                        aria-pressed={key === selectedKey}
                                        onClick={() =>
                                            setSelectedKey(key === selectedKey ? null : key)
                                        }
                                    >
                                        {itemLabel(element)}
                                    </button>
                                );
                            })}
                        </section>
                    ))}
                </aside>
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
                    onChanged={walkthrough.reload}
                    onFocus={(item) => {
                        setPickedId(item.id);
                        viewer.current?.focus(overlayKey(item.id));
                    }}
                />
            )}
            <aside className="hud hud-inspector" aria-live="polite" aria-label="Inspector">
                <h3>Inspector</h3>
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
                            Haz clic en un cuarto, un componente o una instalación para
                            inspeccionarlo, o doble clic para acercar la cámara a él.
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
                                value={surfaceOf(surfaces, elementKey(selected), selected.kind)}
                                onChange={(event) =>
                                    changeSurface(selected, event.target.value as SurfaceMaterialId)
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
                            {formatNumber(selected.width_m)} × {formatNumber(selected.depth_m)} ×{" "}
                            {formatNumber(selected.height_m)} m
                        </dd>
                        {isSpace(selected) && (
                            <>
                                <dt>Área</dt>
                                <dd>{formatNumber(selected.width_m * selected.depth_m)} m²</dd>
                            </>
                        )}
                        <dt>Volumen</dt>
                        <dd>
                            {formatNumber(selected.width_m * selected.depth_m * selected.height_m)}{" "}
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
                        onClick={() => visit(selectedKey === isolatedKey ? null : selectedKey)}
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
                                        background: cssColor(PRIORITY_COLORS[alert.priority]),
                                    }}
                                />
                                {alert.content}
                            </li>
                        ))}
                    </ul>
                )}
            </aside>
            <aside className="hud hud-colors" aria-label="Color del modelo">
                <h3>Color</h3>
                <div className="hud-modes" role="group" aria-label="Modo de color">
                    {COLOR_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            className="hud-item"
                            aria-pressed={mode.id === colorMode}
                            onClick={() => appState.setColorMode(projectId, mode.id)}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
                {colorMode !== "realistic" && (
                    <ul className="hud-legend">
                        {legend.map((item) => (
                            <li key={item.label}>
                                <span className="hud-swatch" style={{ background: item.swatch }} />
                                {item.label}
                            </li>
                        ))}
                    </ul>
                )}
                {colorMode === "cost" && costs.size > 0 && (
                    <p>Reparto del presupuesto de materiales según el volumen de cada elemento.</p>
                )}
                {colorNote !== null && <p>{colorNote}</p>}
                <h4>Capas de obra</h4>
                <div className="hud-work-layers" role="group" aria-label="Capas de obra">
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
                                <span className="hud-swatch" style={{ background: layer.swatch }} />
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
                                    setHighlight(layer.id === highlight ? null : layer.id)
                                }
                            >
                                Resaltar
                            </button>
                        </div>
                    ))}
                </div>
                {highlight !== null && nothingToHighlight && <p>{HIGHLIGHTS[highlight].empty}</p>}
            </aside>
            <div className="hud hud-toolbar">
                <button
                    type="button"
                    className="hud-item"
                    title="Vuelve a encuadrar todo el modelo"
                    onClick={() => chooseView(view)}
                >
                    Restablecer vista
                </button>
                <button type="button" className="hud-item" onClick={toggleFullscreen}>
                    Pantalla completa
                </button>
                {stops.length > 0 && (
                    <div className="hud-tour" role="group" aria-label="Corrida de interior">
                        <button
                            type="button"
                            className="hud-item"
                            aria-pressed={touring}
                            title="Recorre los cuartos uno por uno, aislando cada uno y mostrando lo que se va a hacer"
                            onClick={toggleTour}
                        >
                            Corrida de interior
                        </button>
                        <button
                            type="button"
                            className="hud-item"
                            aria-label="Cuarto anterior"
                            onClick={() => step(-1)}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="hud-item"
                            aria-label="Cuarto siguiente"
                            onClick={() => step(1)}
                        >
                            ›
                        </button>
                        {isolatedRoom !== null && (
                            <>
                                <span className="hud-readout">
                                    {currentStop === null
                                        ? isolatedRoom.name
                                        : `${currentStop.title} · ${stopIndex + 1} de ${stops.length}`}
                                </span>
                                <button
                                    type="button"
                                    className="hud-item"
                                    title="Vuelve a mostrar todo el modelo"
                                    onClick={() => visit(null)}
                                >
                                    Ver todo
                                </button>
                            </>
                        )}
                    </div>
                )}
                <label
                    className="hud-field"
                    title="Corta el modelo a una altura para ver su interior"
                >
                    Corte
                    <input
                        type="range"
                        min={CUT_MIN_PERCENT}
                        max={100}
                        step={CUT_STEP_PERCENT}
                        value={cut}
                        aria-valuetext={cut === 100 ? "Sin corte" : `${cut} % de la altura`}
                        onChange={(event) => setCut(Number(event.target.value))}
                    />
                </label>
                <label className="hud-field" title="Separa los niveles para ver cada planta">
                    Despiece
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={EXPLODE_STEP_PERCENT}
                        value={explode}
                        aria-valuetext={explode === 0 ? "Sin despiece" : `${explode} %`}
                        onChange={(event) => setExplode(Number(event.target.value))}
                    />
                </label>
                {LAYERS.map((layer) => (
                    <label key={layer.id} className="checkbox">
                        <input
                            type="checkbox"
                            checked={layers[layer.id]}
                            onChange={(event) =>
                                setLayers({ ...layers, [layer.id]: event.target.checked })
                            }
                        />
                        {layer.label}
                    </label>
                ))}
                <label className="hud-field">
                    Cubierta
                    <select
                        value={roof}
                        onChange={(event) => changeRoof(event.target.value as RoofKind)}
                    >
                        {ROOFS.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    );
}
