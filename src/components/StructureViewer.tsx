import { useEffect, useMemo, useRef, useState } from "react";

import { errorMessage } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import { appState, useProjectState } from "../state/appState";
import { useTheme } from "../state/theme";
import {
    SCENE_PALETTES,
    createStructureViewer,
    elementKey,
    isSpace,
    type LayerName,
    type Layers,
    type StructureViewer as Viewer,
    type ViewName,
} from "../three/structureViewer";
import type { RecommendationPriority, RoofKind, Structure, StructureElement } from "../types/api";
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
    SURFACE_MATERIALS,
    SURFACE_MATERIAL_IDS,
    savedSurfaces,
    surfaceOf,
    type SurfaceMaterialId,
} from "../utils/surfaceMaterials";

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

    function setSelectedKey(key: string | null) {
        appState.select(projectId, elements.find((element) => elementKey(element) === key) ?? null);
    }

    /** Shows the new material at once and puts the old one back if it cannot be saved. */
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

    const selectByKey = useRef(setSelectedKey);
    selectByKey.current = setSelectedKey;

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
            <aside className="hud hud-levels" aria-label="Niveles del modelo">
                <h3>Niveles</h3>
                {elements.length === 0 && (
                    <p>Agrega cuartos a un plano, o ponle un nivel numérico, para verlo aquí.</p>
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
                                    onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                                >
                                    {itemLabel(element)}
                                </button>
                            );
                        })}
                    </section>
                ))}
            </aside>
            <aside className="hud hud-inspector" aria-live="polite" aria-label="Inspector">
                <h3>Inspector</h3>
                {selected === null ? (
                    <p>Haz clic en un cuarto o en un componente para inspeccionarlo.</p>
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
            </aside>
            <div className="hud hud-toolbar">
                <button type="button" className="hud-item" onClick={() => chooseView(view)}>
                    Restablecer vista
                </button>
                <button type="button" className="hud-item" onClick={toggleFullscreen}>
                    Pantalla completa
                </button>
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
