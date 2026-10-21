import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAsync } from "../hooks/useAsync";
import { useEditHistory } from "../hooks/useEditHistory";
import { roomsApi, spatialApi, structureApi, walkthroughApi } from "../services/api";
import { apiUrl } from "../services/http";
import { appState, useProjectState } from "../state/appState";
import { useProjectSave } from "../state/projectSave";
import { saveThumbnail, shrinkCapture } from "../state/thumbnails";
import { showToast } from "../state/toasts";
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
import type { LightingSettings, SolarSite } from "../utils/lighting";
import type {
    RecommendationPriority,
    RoofKind,
    SpatialElement,
    SpatialLayer,
    Structure,
    StructureElement,
    StructureRoom,
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
import { snapTo } from "../utils/snap";
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
import { ShortcutsDialog } from "./viewer/ShortcutsDialog";
import { focusAllowsShortcuts, shortcutsBlocked } from "./viewer/shortcuts";
import { ToolRail, type RailTool } from "./viewer/ToolRail";
import { TransformPanel, geometryOf, type RoomGeometry } from "./viewer/TransformPanel";
import { WorkspaceBar } from "./viewer/WorkspaceBar";
import { ScenePanel } from "./viewer/ScenePanel";
import { StatusBar } from "./viewer/StatusBar";
import { Toolbar } from "./viewer/Toolbar";
import { ViewBar } from "./viewer/ViewBar";
import { ViewerBoundary, ViewerProblem } from "./viewer/ViewerBoundary";
import { ViewGizmo, type OrbitListener } from "./viewer/ViewGizmo";
import { KIND_LABELS, VIEWS, itemLabel } from "./viewer/labels";

const TABLET_QUERY = "(min-width: 721px) and (max-width: 1024px)";

const COLOR_MODES: { id: ColorMode; label: string }[] = [
    { id: "realistic", label: "Realista" },
    { id: "kind", label: "Tipo" },
    { id: "cost", label: "Costo" },
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
        label: "De menor a mayor costo estimado",
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
const TOOL_CUT_PERCENT = 60;
// The model needs a moment to settle (shadows, textures) before its picture is taken.
const THUMBNAIL_DELAY_MS = 2000;
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

    function toggleCut() {
        setCut(cut === 100 ? TOOL_CUT_PERCENT : 100);
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

    const tools: RailTool[] = [
        {
            id: "move",
            label: "Mover cuarto",
            icon: "move",
            shortcut: "M",
            pressed: moving && selectedRoom !== null,
            unavailable:
                selectedRoom === null
                    ? "Selecciona un cuarto para moverlo; columnas, vigas y muros se editan en su tabla"
                    : undefined,
            onUse: () => setMoving(!moving),
        },
        {
            id: "focus",
            label: "Enfocar",
            icon: "focus",
            shortcut: "F",
            unavailable: somethingSelected ? undefined : "Selecciona un elemento para enfocarlo",
            onUse: focusSelection,
        },
        {
            id: "isolate",
            label: "Aislar cuarto",
            icon: "isolate",
            shortcut: "I",
            pressed: isolatedKey !== null && (!roomSelected || selectedKey === isolatedKey),
            unavailable:
                roomSelected || isolatedKey !== null
                    ? undefined
                    : "Selecciona un cuarto para aislarlo",
            onUse: toggleIsolation,
        },
        {
            id: "cut",
            label: "Corte",
            icon: "cut",
            pressed: cut < 100,
            unavailable: inside ? "Sal de la vista interior para usar el corte" : undefined,
            onUse: toggleCut,
        },
        {
            id: "inside",
            label: "Vista interior",
            icon: "interior",
            pressed: inside,
            unavailable:
                isolatedKey === null
                    ? "Aísla un cuarto para entrar a la vista interior"
                    : undefined,
            onUse: toggleInside,
        },
        {
            id: "capture",
            label: "Guardar imagen",
            icon: "download",
            onUse: downloadCapture,
        },
        {
            id: "help",
            label: "Atajos de teclado",
            icon: "keyboard",
            shortcut: "?",
            onUse: () => setHelp(true),
        },
    ];

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

    const handleKey = useRef<(event: KeyboardEvent) => void>(() => undefined);
    handleKey.current = (event) => {
        if (unsupported || !focusAllowsShortcuts(stage.current)) {
            return;
        }

        const key = event.key?.toLowerCase();

        if ((event.ctrlKey || event.metaKey) && !event.altKey && (key === "z" || key === "y")) {
            event.preventDefault();

            if (key === "y" || event.shiftKey) {
                void history.redo();
            } else {
                void history.undo();
            }

            return;
        }

        if (shortcutsBlocked(event)) {
            return;
        }

        const arrows: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, 1],
            ArrowDown: [0, -1],
        };

        if (moving && selectedRoom !== null && event.key in arrows) {
            event.preventDefault();

            if (!history.working) {
                nudgeSelected(...arrows[event.key]);
            }

            return;
        }

        if (key === "m") {
            if (selectedRoom !== null) {
                setMoving(!moving);
                event.preventDefault();
            }

            return;
        }

        const viewIndex = ["1", "2", "3", "4"].indexOf(event.key);

        if (viewIndex !== -1) {
            chooseView(VIEWS[viewIndex].id);
        } else if (event.key === "f" || event.key === "F") {
            if (somethingSelected) {
                focusSelection();
            }
        } else if (event.key === "i" || event.key === "I") {
            if (roomSelected || isolatedKey !== null) {
                toggleIsolation();
            }
        } else if (event.key === "Escape") {
            stepBack();
        } else if (event.key === "?") {
            setHelp(true);
        } else {
            return;
        }

        event.preventDefault();
    };

    useEffect(() => {
        if (preview) {
            return;
        }

        function onKeyDown(event: KeyboardEvent) {
            handleKey.current(event);
        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [preview]);

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
            ? "Registra materiales con cantidad y costo para ver el reparto."
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

    // The scene takes the rest of the window below where it starts, and the camera frames the
    // model in the room that the panels over each side leave free.
    const treeShown = isolatedRoom === null;

    useEffect(() => {
        const host = stage.current;
        const scene = container.current;

        if (preview || host === null || scene === null) {
            return;
        }

        function measure(host: HTMLDivElement, scene: HTMLDivElement): void {
            const top = host.getBoundingClientRect().top + window.scrollY;
            const box = scene.getBoundingClientRect();
            let left = 0;
            let right = 0;

            host.style.setProperty("--viewer-top", `${Math.round(top)}px`);

            for (const panel of host.querySelectorAll<HTMLElement>(".hud-layer > *")) {
                const rect = panel.getBoundingClientRect();
                const middle = (rect.left + rect.right) / 2 - box.left;

                if (rect.width === 0 || rect.height < box.height * 0.3) {
                    continue;
                }

                if (middle < box.width * 0.4) {
                    left = Math.max(left, rect.right - box.left);
                } else if (middle > box.width * 0.6) {
                    right = Math.max(right, box.right - rect.left);
                }
            }

            viewer.current?.setFrameInsets(left, right);
        }

        measure(host, scene);

        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(() => measure(host, scene));

        observer.observe(host);
        host.querySelectorAll(".hud-layer > *").forEach((panel) => observer.observe(panel));

        return () => observer.disconnect();
    }, [preview, treeOpen, inspectorOpen, treeShown]);

    useEffect(() => {
        void appState.refresh(projectId);
    }, [projectId]);

    useEffect(() => {
        viewer.current?.show(structure);
    }, [structure]);

    const untouched = isolation === null && selectedKey === null && lighting === undefined;
    const canPicture = useRef(untouched);
    canPicture.current = untouched;

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
    }, [structure, projectId]);

    useEffect(() => {
        appState.setSurfaces(projectId, savedSurfaces(elements));
        appState.setRoof(projectId, structure.roof);
    }, [projectId, elements, structure.roof]);

    useEffect(() => {
        viewer.current?.setRoof(roof);
    }, [roof, structure]);

    useEffect(() => {
        setReason(null);
    }, [selectedKey, isolatedKey, pickedId]);

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
            <p className="message message-error" role="alert">
                Este navegador no puede mostrar gráficos 3D (WebGL no está disponible).
            </p>
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
                                        <dd className="numeric">
                                            {formatNumber(picked.max_x_m - picked.min_x_m)} ×{" "}
                                            {formatNumber(picked.max_y_m - picked.min_y_m)} ×{" "}
                                            {formatNumber(picked.max_z_m - picked.min_z_m)} m
                                        </dd>
                                        <dt>Altura de la base</dt>
                                        <dd className="numeric">
                                            +{formatNumber(picked.min_z_m)} m
                                        </dd>
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
                                        <dd className="numeric">{selected.level ?? "—"}</dd>
                                        <dt>Medidas</dt>
                                        <dd className="numeric">
                                            {formatNumber(selected.width_m)} ×{" "}
                                            {formatNumber(selected.depth_m)} ×{" "}
                                            {formatNumber(selected.height_m)} m
                                        </dd>
                                        {isSpace(selected) && (
                                            <>
                                                <dt>Área</dt>
                                                <dd className="numeric">
                                                    {formatNumber(
                                                        selected.width_m * selected.depth_m,
                                                    )}{" "}
                                                    m²
                                                </dd>
                                            </>
                                        )}
                                        <dt>Volumen</dt>
                                        <dd className="numeric">
                                            {formatNumber(
                                                selected.width_m *
                                                    selected.depth_m *
                                                    selected.height_m,
                                            )}{" "}
                                            m³
                                        </dd>
                                        <dt>Altura de la base</dt>
                                        <dd className="numeric">
                                            +{formatNumber(selected.base_m)} m
                                        </dd>
                                        {selectedCost !== undefined && (
                                            <>
                                                <dt>Costo estimado</dt>
                                                <dd className="numeric">
                                                    {formatMoney(selectedCost)}
                                                </dd>
                                            </>
                                        )}
                                    </dl>
                                )}
                                {selectedRoom !== null && (
                                    <TransformPanel
                                        room={selectedRoom}
                                        snap={snap}
                                        onSnap={setSnap}
                                        busy={history.working}
                                        onCommit={(next, label) =>
                                            changeRoom(selectedRoom, next, label)
                                        }
                                    />
                                )}
                                {selected !== null && selectedRoom === null && (
                                    <p className="hud-note-quiet">
                                        Solo los cuartos se mueven y se redimensionan aquí.
                                        {selected.kind === "volume"
                                            ? " Un volumen sale de un plano sin cuartos: se cambia agregando cuartos."
                                            : " Columnas, vigas y muros se editan en su tabla, en la pestaña Modelo 3D del proyecto."}
                                    </p>
                                )}
                                {save.state === "error" && save.message !== null && (
                                    <p className="message message-error" role="alert">
                                        {save.message}
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
